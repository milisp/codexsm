use crate::utils::file::{get_session_info, get_sessions_path, read_first_line, scan_jsonl_files};
use crate::utils::{count_lines, extract_datetime};
use serde_json::{json, Value};
use std::collections::HashSet;

pub fn scan_project_sessions(project_path: &str) -> Result<Vec<Value>, String> {
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
                                "conversationId": info.session_id,
                                "preview": truncated_text
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

#[tauri::command]
pub async fn scan_projects() -> Result<Vec<Value>, String> {
    let sessions_dir = get_sessions_path()?;
    let mut unique_projects = HashSet::new();

    for entry in scan_jsonl_files(&sessions_dir) {
        let file_path = entry.path().to_path_buf();

        match count_lines(&file_path) {
            Ok(line_count) if line_count < 4 => {
                eprintln!("Deleting file with {} lines: {:?}", line_count, file_path);
                if let Err(e) = std::fs::remove_file(&file_path) {
                    eprintln!("Failed to delete file {:?}: {}", file_path, e);
                }
                continue;
            }
            Ok(_) => { /* File has enough lines, proceed */ }
            Err(e) => {
                eprintln!("Failed to count lines for {:?}: {}", file_path, e);
                continue;
            }
        }

        let mut project_path: Option<String> = None;
        match read_first_line(file_path.clone()) {
            Ok(line) => {
                if let Ok(value) = serde_json::from_str::<Value>(&line) {
                    if let Some(cwd) = value["payload"]["cwd"].as_str() {
                        project_path = Some(cwd.to_string());
                    }
                }
            }
            Err(e) => eprintln!("Failed to read first line for {:?}: {}", file_path, e),
        }

        if let Some(cwd) = project_path {
            unique_projects.insert(cwd);
        }
    }

    let results: Vec<Value> = unique_projects
        .into_iter()
        .map(|path| {
            json!({
                "path": path,
                "trust_level": Some("no"),
            })
        })
        .collect();

    Ok(results)
}
