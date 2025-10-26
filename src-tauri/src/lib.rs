mod config;
mod session_files;
mod terminal;

use config::read_codex_config;
use session_files::{
    delete::{delete_cache_file, delete_session_file, delete_sessions_files},
    save::get_project_sessions,
    scan::scan_projects,
    update::update_cache_title,
};
use terminal::open_terminal_with_command;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            scan_projects,
            get_project_sessions,
            delete_session_file,
            update_cache_title,
            read_codex_config,
            open_terminal_with_command,
            delete_cache_file,
            delete_sessions_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
