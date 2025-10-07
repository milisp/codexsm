use crate::utils::file::{get_sessions_path, scan_jsonl_files, read_first_line, get_session_info};
use chrono::{NaiveDateTime, Utc};
use serde_json::{Value, json};
use std::fs::{File, read_to_string};
use std::io::Write;
use std::path::PathBuf;

fn get_cache_dir() -> Result<PathBuf, String> {
    let sessions_dir = get_sessions_path()?;
    let cache_dir = sessions_dir.parent()
        .ok_or("Could not get parent of sessions directory")?
        .join("scan_cache");
    std::fs::create_dir_all(&cache_dir).map_err(|e| format!("Failed to create cache dir: {}", e))?;
    Ok(cache_dir)
}

fn get_cache_path_for_project(project_path: &str) -> Result<PathBuf, String> {
    let encoded = base64::encode(project_path);
    Ok(get_cache_dir()?.join(format!("{}.json", encoded)))
}

fn extract_datetime(path_str: &str) -> Option<NaiveDateTime> {
    let parts: Vec<&str> = path_str.split('/').collect();
    if parts.len() < 5 {
        return None;
    }
    let year = parts[parts.len() - 4];
    let month = parts[parts.len() - 3];
    let day = parts[parts.len() - 2];
    let filename = parts.last().unwrap_or(&"");
    let time_part = filename
        .split('T')
        .nth(1)
        .and_then(|s| Some(s.split('-').take(3).collect::<Vec<_>>().join("-")))
        .unwrap_or_default();
    let datetime_str = format!("{}-{}-{}T{}", year, month, day, time_part);
    NaiveDateTime::parse_from_str(&datetime_str, "%Y-%m-%dT%H-%M-%S").ok()
}

fn scan_project_sessions(project_path: &str) -> Result<Vec<Value>, String> {
    let sessions_dir = get_sessions_path()?;
    let mut results = Vec::new();

    for entry in scan_jsonl_files(&sessions_dir) {
        let file_path = entry.path().to_string_lossy().to_string();
        match read_first_line(entry.path()) {
            Ok(line) => {
                if let Ok(value) = serde_json::from_str::<Value>(&line) {
                    if value["payload"]["cwd"].as_str() == Some(project_path) {
                        if let Ok(info) = get_session_info(entry.path()) {
                            let original_text = info.user_message.unwrap_or_default();
                            let truncated_text: String = original_text.chars().take(50).collect();
                            results.push(json!({
                                "path": file_path,
                                "session_id": info.session_id,
                                "text": truncated_text
                            }));
                        }
                    }
                }
            }
            Err(e) => eprintln!("Failed to read first line: {}", e),
        }
    }

    results.sort_by(|a, b| {
        let a_dt = extract_datetime(a["path"].as_str().unwrap_or_default());
        let b_dt = extract_datetime(b["path"].as_str().unwrap_or_default());
        match (a_dt, b_dt) {
            (Some(a_dt), Some(b_dt)) => b_dt.cmp(&a_dt),
            (Some(_), None) => std::cmp::Ordering::Less,
            (None, Some(_)) => std::cmp::Ordering::Greater,
            (None, None) => a["path"].as_str().cmp(&b["path"].as_str()),
        }
    });

    Ok(results)
}

fn save_project_cache(project_path: &str, sessions: &Vec<Value>) -> Result<(), String> {
    let cache_path = get_cache_path_for_project(project_path)?;
    let data = json!({
        "last_scanned": Utc::now().to_rfc3339(),
        "sessions": sessions
    });
    let json_str = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Failed to serialize cache JSON: {}", e))?;
    let mut file = File::create(&cache_path)
        .map_err(|e| format!("Failed to create cache file: {}", e))?;
    file.write_all(json_str.as_bytes())
        .map_err(|e| format!("Failed to write cache file: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn get_project_sessions(project_path: String) -> Result<Value, String> {
    let cache_path = get_cache_path_for_project(&project_path)?;
    if cache_path.exists() {
        let cache_str = read_to_string(&cache_path)
            .map_err(|e| format!("Failed to read cache: {}", e))?;
        if let Ok(json_val) = serde_json::from_str::<Value>(&cache_str) {
            if let Some(sessions) = json_val.get("sessions") {
                return Ok(json!({ "sessions": sessions }));
            }
        }
    }
    let sessions = scan_project_sessions(&project_path)?;
    save_project_cache(&project_path, &sessions)?;
    Ok(json!({ "sessions": sessions }))
}

#[tauri::command]
pub async fn update_cache_title(project_path: String, session_path: String, new_text: String) -> Result<(), String> {
    let cache_path = get_cache_path_for_project(&project_path)?;
    if cache_path.exists() {
        let mut cache_json: Value = serde_json::from_str(
            &read_to_string(&cache_path).map_err(|e| format!("Failed to read cache: {}", e))?
        ).map_err(|e| format!("Failed to parse cache: {}", e))?;
        
        if let Some(arr) = cache_json["sessions"].as_array_mut() {
            for item in arr.iter_mut() {
                if item["path"].as_str() == Some(&session_path) {
                    let truncated_text: String = new_text.chars().take(50).collect();
                    item["text"] = json!(truncated_text);
                    break;
                }
            }
        }

        let new_str = serde_json::to_string_pretty(&cache_json)
            .map_err(|e| format!("Failed to serialize updated cache: {}", e))?;
        std::fs::write(&cache_path, new_str)
            .map_err(|e| format!("Failed to update cache: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn delete_session_file(project_path: String, session_path: String) -> Result<(), String> {
    std::fs::remove_file(&session_path)
        .map_err(|e| format!("Failed to delete session: {}", e))?;

    // Update cache
    let cache_path = get_cache_path_for_project(&project_path)?;
    if cache_path.exists() {
        let mut cache_json: Value = serde_json::from_str(&read_to_string(&cache_path).map_err(|e| format!("Failed to read cache: {}", e))?)
            .map_err(|e| format!("Failed to parse cache: {}", e))?;
        if let Some(arr) = cache_json["sessions"].as_array_mut() {
            arr.retain(|item| item["path"].as_str() != Some(&session_path));
        }
        let new_str = serde_json::to_string_pretty(&cache_json)
            .map_err(|e| format!("Failed to serialize updated cache: {}", e))?;
        std::fs::write(&cache_path, new_str)
            .map_err(|e| format!("Failed to update cache: {}", e))?;
    }

    Ok(())
}
