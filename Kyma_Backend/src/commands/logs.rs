// src/commands/logs.rs
use crate::logging;
use crate::user_action;
use crate::user_error;

#[tauri::command]
pub async fn get_log_file_path() -> Result<String, String> {
    let path = logging::get_log_path();
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn read_logs(lines: Option<usize>) -> Result<String, String> {
    let path = logging::get_log_path();
    let content =
        std::fs::read_to_string(&path).map_err(|e| format!("Failed to read log file: {}", e))?;

    let lines_to_take = lines.unwrap_or(500);
    let all_lines: Vec<&str> = content.lines().collect();

    let start_idx = if all_lines.len() > lines_to_take {
        all_lines.len() - lines_to_take
    } else {
        0
    };

    let last_lines = &all_lines[start_idx..];
    Ok(last_lines.join("\n"))
}

#[tauri::command]
pub async fn log_frontend(
    level: String,
    message: String,
    data: Option<String>,
    _app_handle: tauri::AppHandle,
) -> Result<(), String> {
    let log_level = level.to_uppercase();
    let log_data = data.as_deref().unwrap_or("{}");

    match log_level.as_str() {
        "ERROR" => {
            user_error!("FRONTEND", "{} | {}", message, log_data);
        }
        "WARN" => {
            user_action!("FRONTEND", "WARNING: {} | {}", message, log_data);
        }
        "INFO" | "DEBUG" => {
            user_action!("FRONTEND", "{}: {} | {}", log_level, message, log_data);
        }
        _ => {
            user_action!("FRONTEND", "{}: {}", message, log_data);
        }
    }

    // Also print to console for development
    println!("[FRONTEND] [{}] {} | {}", log_level, message, log_data);

    Ok(())
}
