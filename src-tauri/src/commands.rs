use base64::engine::general_purpose;
use base64::engine::Engine as _;
use chrono::Utc;
use serde_json::{json, Value};
use std::fs::{read_to_string, File};
use std::io::Write;
use std::path::PathBuf;

use crate::scan::scan_project_sessions;
use crate::utils::file::get_sessions_path;

fn get_cache_dir() -> Result<PathBuf, String> {
    let sessions_dir = get_sessions_path()?;
    let cache_dir = sessions_dir
        .parent()
        .ok_or("Could not get parent of sessions directory")?
        .join("scan_cache");
    std::fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("Failed to create cache dir: {}", e))?;
    Ok(cache_dir)
}

fn get_cache_path_for_project(project_path: &str) -> Result<PathBuf, String> {
    let encoded = general_purpose::STANDARD.encode(project_path);
    Ok(get_cache_dir()?.join(format!("{}.json", encoded)))
}

fn save_project_cache(project_path: &str, sessions: &Vec<Value>) -> Result<(), String> {
    let cache_path = get_cache_path_for_project(project_path)?;
    let data = json!({
        "last_scanned": Utc::now().to_rfc3339(),
        "sessions": sessions
    });
    let json_str = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Failed to serialize cache JSON: {}", e))?;
    let mut file =
        File::create(&cache_path).map_err(|e| format!("Failed to create cache file: {}", e))?;
    file.write_all(json_str.as_bytes())
        .map_err(|e| format!("Failed to write cache file: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn get_project_sessions(project_path: String) -> Result<Value, String> {
    let cache_path = get_cache_path_for_project(&project_path)?;
    if cache_path.exists() {
        let cache_str =
            read_to_string(&cache_path).map_err(|e| format!("Failed to read cache: {}", e))?;
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
pub async fn update_cache_title(
    project_path: String,
    session_path: String,
    preview: String,
) -> Result<(), String> {
    let cache_path = get_cache_path_for_project(&project_path)?;
    if cache_path.exists() {
        let mut cache_json: Value = serde_json::from_str(
            &read_to_string(&cache_path).map_err(|e| format!("Failed to read cache: {}", e))?,
        )
        .map_err(|e| format!("Failed to parse cache: {}", e))?;

        if let Some(arr) = cache_json["sessions"].as_array_mut() {
            for item in arr.iter_mut() {
                if item["path"].as_str() == Some(&session_path) {
                    let truncated_text: String = preview.chars().take(50).collect();
                    item["preview"] = json!(truncated_text);
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
pub async fn delete_cache_file(project_path: String) -> Result<(), String> {
    let cache_path = get_cache_path_for_project(&project_path)?;
    std::fs::remove_file(&cache_path).map_err(|e| format!("Failed to delete cache: {}", e))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_session_file(project_path: String, session_path: String) -> Result<(), String> {
    std::fs::remove_file(&session_path).map_err(|e| format!("Failed to delete session: {}", e))?;

    // Update cache
    let cache_path = get_cache_path_for_project(&project_path)?;
    if cache_path.exists() {
        let mut cache_json: Value = serde_json::from_str(
            &read_to_string(&cache_path).map_err(|e| format!("Failed to read cache: {}", e))?,
        )
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

#[tauri::command]
pub async fn delete_sessions_files(
    project_path: String,
    session_paths: Vec<String>,
) -> Result<(), String> {
    for session_path in &session_paths {
        std::fs::remove_file(session_path)
            .map_err(|e| format!("Failed to delete session {}: {}", session_path, e))?;
    }

    // Update cache
    let cache_path = get_cache_path_for_project(&project_path)?;
    if cache_path.exists() {
        let mut cache_json: Value = serde_json::from_str(
            &read_to_string(&cache_path).map_err(|e| format!("Failed to read cache: {}", e))?,
        )
        .map_err(|e| format!("Failed to parse cache: {}", e))?;
        if let Some(arr) = cache_json["sessions"].as_array_mut() {
            arr.retain(|item| {
                !session_paths
                    .iter()
                    .any(|p| p.as_str() == item["path"].as_str().unwrap_or_default())
            });
        }
        let new_str = serde_json::to_string_pretty(&cache_json)
            .map_err(|e| format!("Failed to serialize updated cache: {}", e))?;
        std::fs::write(&cache_path, new_str)
            .map_err(|e| format!("Failed to update cache: {}", e))?;
    }

    Ok(())
}
