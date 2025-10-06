mod commands;
mod utils;
mod config;

use commands::{get_project_sessions, update_cache_title, delete_session_file};
use config::read_codex_config;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_project_sessions,
            delete_session_file,
            update_cache_title,
            read_codex_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
