use super::get::get_cache_path_for_project;
use serde_json::{json, Value};
use std::fs::read_to_string;

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
