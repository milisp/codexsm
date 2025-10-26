use base64::engine::general_purpose;
use base64::engine::Engine as _;
use std::path::PathBuf;

use super::file::get_sessions_path;

pub fn get_cache_dir() -> Result<PathBuf, String> {
    let sessions_dir = get_sessions_path()?;
    let cache_dir = sessions_dir
        .parent()
        .ok_or("Could not get parent of sessions directory")?
        .join("scan_cache");
    std::fs::create_dir_all(&cache_dir)
        .map_err(|e| format!("Failed to create cache dir: {}", e))?;
    Ok(cache_dir)
}

pub fn get_cache_path_for_project(project_path: &str) -> Result<PathBuf, String> {
    let encoded = general_purpose::STANDARD.encode(project_path);
    Ok(get_cache_dir()?.join(format!("{}.json", encoded)))
}
