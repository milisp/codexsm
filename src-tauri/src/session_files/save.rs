use super::get::get_cache_path_for_project;
use super::scan::scan_project_sessions_incremental;
use chrono::{DateTime, Utc};
use serde_json::{json, Value};
use std::fs::{read_to_string, File};
use std::io::Write;

pub fn save_project_cache(project_path: &str, sessions: &Vec<Value>) -> Result<(), String> {
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

fn load_cache(project_path: &str) -> Result<Option<(DateTime<Utc>, Vec<Value>)>, String> {
    let cache_path = get_cache_path_for_project(project_path)?;
    if !cache_path.exists() {
        return Ok(None);
    }

    let cache_str =
        read_to_string(&cache_path).map_err(|e| format!("Failed to read cache: {}", e))?;
    let json_val: Value = serde_json::from_str(&cache_str)
        .map_err(|e| format!("Failed to parse cache JSON: {}", e))?;

    let last_scanned = json_val["last_scanned"]
        .as_str()
        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.with_timezone(&Utc));

    let sessions = json_val["sessions"]
        .as_array()
        .map(|arr| arr.clone())
        .unwrap_or_default();

    match last_scanned {
        Some(dt) => Ok(Some((dt, sessions))),
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn get_project_sessions(project_path: String) -> Result<Value, String> {
    // Try to load existing cache
    match load_cache(&project_path)? {
        Some((last_scanned, mut cached_sessions)) => {
            // Incremental scan: only scan files modified after last_scanned
            let new_sessions =
                scan_project_sessions_incremental(&project_path, Some(last_scanned))?;

            // Merge: Remove old sessions that were re-scanned, then add new ones
            let new_ids: std::collections::HashSet<_> = new_sessions
                .iter()
                .filter_map(|s| s["conversationId"].as_str())
                .collect();

            cached_sessions
                .retain(|s| !new_ids.contains(s["conversationId"].as_str().unwrap_or_default()));

            cached_sessions.extend(new_sessions);

            // Re-sort by date
            cached_sessions.sort_by(|a, b| {
                use super::utils::extract_datetime;
                let a_dt = extract_datetime(a["path"].as_str().unwrap_or_default());
                let b_dt = extract_datetime(b["path"].as_str().unwrap_or_default());
                match (a_dt, b_dt) {
                    (Some(a_dt), Some(b_dt)) => b_dt.cmp(&a_dt),
                    (Some(_), None) => std::cmp::Ordering::Less,
                    (None, Some(_)) => std::cmp::Ordering::Greater,
                    (None, None) => a["path"].as_str().cmp(&b["path"].as_str()),
                }
            });

            // Save updated cache
            save_project_cache(&project_path, &cached_sessions)?;
            Ok(json!({ "sessions": cached_sessions }))
        }
        None => {
            // No cache exists, do full scan
            let sessions = scan_project_sessions_incremental(&project_path, None)?;
            save_project_cache(&project_path, &sessions)?;
            Ok(json!({ "sessions": sessions }))
        }
    }
}
