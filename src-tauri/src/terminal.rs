use std::process::Command;
use tauri::command;

#[command]
pub fn open_terminal_with_command(command: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        Command::new("powershell")
            .args(["-NoExit", "-Command", &command])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("osascript")
            .arg("-e")
            .arg(format!(
                "tell application \"Terminal\" to do script \"{}\"",
                command
            ))
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("gnome-terminal")
            .args(["--", "bash", "-c", &format!("{}; exec bash", command)])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
