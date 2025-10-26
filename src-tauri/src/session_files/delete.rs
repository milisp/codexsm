use super::get::get_cache_path_for_project;
use serde_json::Value;
use std::fs::read_to_string;

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
