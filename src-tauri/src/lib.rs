mod commands;
mod config;
mod utils;
mod terminal;

use commands::{get_project_sessions, update_cache_title, delete_session_file, scan_projects, delete_cache_file};
use config::read_codex_config;
use terminal::open_terminal_with_command;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            scan_projects,
            get_project_sessions,
            delete_session_file,
            update_cache_title,
            read_codex_config,
            open_terminal_with_command,
            delete_cache_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
