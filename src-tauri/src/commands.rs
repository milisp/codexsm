use crate::utils::file::{get_sessions_path, scan_jsonl_files};

#[tauri::command]
pub async fn get_session_files() -> Result<Vec<String>, String> {
    let sessions_dir = get_sessions_path()?;

    if !sessions_dir.exists() {
        return Ok(vec![]);
    }
    let session_files = scan_jsonl_files(&sessions_dir)
        .map(|entry| entry.path().to_string_lossy().to_string())
        .collect::<Vec<_>>();

    Ok(session_files)
}