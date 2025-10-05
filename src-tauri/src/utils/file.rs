use std::path::{Path, PathBuf};
use walkdir::WalkDir;

pub fn get_sessions_path() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    Ok(home_dir.join(".codex").join("sessions"))
}

pub fn scan_jsonl_files<P: AsRef<Path>>(dir_path: P) -> impl Iterator<Item = walkdir::DirEntry> {
    WalkDir::new(dir_path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter(|e| e.path().extension().and_then(|s| s.to_str()) == Some("jsonl"))
}