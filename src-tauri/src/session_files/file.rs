use serde_json::Value;
use std::path::{Path, PathBuf};

pub fn get_sessions_path() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir().ok_or("Could not find home directory")?;
    Ok(home_dir.join(".codex").join("sessions"))
}

pub fn read_first_line<P: AsRef<Path>>(file_path: P) -> Result<String, String> {
    use std::fs::File;
    use std::io::{BufRead, BufReader};

    let file = File::open(&file_path)
        .map_err(|e| format!("Failed to open file {:?}: {}", file_path.as_ref(), e))?;
    let reader = BufReader::new(file);
    reader
        .lines()
        .next()
        .transpose()
        .map_err(|e| {
            format!(
                "Failed to read first line from {:?}: {}",
                file_path.as_ref(),
                e
            )
        })?
        .ok_or_else(|| format!("File {:?} is empty", file_path.as_ref()))
}

pub struct SessionInfo {
    pub session_id: String,
    pub user_message: Option<String>,
}

pub fn get_session_info<P: AsRef<Path>>(file_path: P) -> Result<SessionInfo, String> {
    use std::fs::File;
    use std::io::{BufRead, BufReader};

    let file = File::open(&file_path)
        .map_err(|e| format!("Failed to open file {:?}: {}", file_path.as_ref(), e))?;
    let reader = BufReader::new(file);
    let mut lines = reader.lines();

    let mut session_id: Option<String> = None;
    let mut user_message: Option<String> = None;

    // Read the first line for session_id
    if let Some(Ok(line)) = lines.next() {
        if let Ok(value) = serde_json::from_str::<Value>(&line) {
            if let Some(payload_obj) = value.get("payload") {
                if let Some(id_value) = payload_obj.get("id") {
                    if let Some(id_str) = id_value.as_str() {
                        session_id = Some(id_str.to_string());
                    }
                }
            }
        }
    }

    // Iterate through subsequent lines for the first user_message
    for line_result in lines {
        if let Ok(line) = line_result {
            if let Ok(value) = serde_json::from_str::<Value>(&line) {
                if let Some(type_val) = value.get("type") {
                    if type_val.as_str() == Some("event_msg") {
                        if let Some(payload_obj) = value.get("payload") {
                            if let Some(msg_type_val) = payload_obj.get("type") {
                                if msg_type_val.as_str() == Some("user_message") {
                                    if let Some(message_val) = payload_obj.get("message") {
                                        if let Some(message_str) = message_val.as_str() {
                                            user_message = Some(message_str.to_string());
                                            break; // Found the first user_message, stop searching
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    let final_session_id = session_id
        .ok_or_else(|| format!("Could not extract session_id from {:?}", file_path.as_ref()))?;

    Ok(SessionInfo {
        session_id: final_session_id,
        user_message,
    })
}
