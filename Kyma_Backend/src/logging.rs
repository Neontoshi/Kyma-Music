// src/logging.rs
use chrono::Local;
use std::fs::{self, File};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Logger {
    file: Mutex<Option<File>>,
    log_path: PathBuf,
}

impl Logger {
    pub fn new() -> Self {
        let log_dir = dirs::data_local_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("."))
            .join("Kyma")
            .join("logs");

        // Create logs directory if it doesn't exist
        let _ = fs::create_dir_all(&log_dir);

        // Create log filename with timestamp
        let timestamp = Local::now().format("%Y-%m-%d_%H-%M-%S");
        let log_path = log_dir.join(format!("Kyma_{}.log", timestamp));

        // Try to create the log file
        let file = File::create(&log_path).ok();

        println!("📝 Log file created at: {:?}", log_path);

        Self {
            file: Mutex::new(file),
            log_path,
        }
    }

    pub fn log(&self, level: &str, target: &str, message: &str) {
        let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
        let log_line = format!("[{}] [{}] [{}] {}\n", timestamp, level, target, message);

        // Print to console (for development)
        print!("{}", log_line);

        // Write to file
        if let Ok(mut file_guard) = self.file.lock() {
            if let Some(file) = file_guard.as_mut() {
                let _ = file.write_all(log_line.as_bytes());
                let _ = file.flush();
            }
        }
    }

    pub fn get_log_path(&self) -> PathBuf {
        self.log_path.clone()
    }
}

// Use OnceLock for safe global access (Rust 1.70+)
use std::sync::OnceLock;

static LOGGER: OnceLock<Logger> = OnceLock::new();

pub fn init() {
    LOGGER.get_or_init(|| Logger::new());
}

pub fn get_logger() -> &'static Logger {
    init();
    LOGGER.get().unwrap()
}

pub fn log_event(level: &str, target: &str, message: &str) {
    get_logger().log(level, target, message);
}

pub fn get_log_path() -> PathBuf {
    get_logger().log_path.clone()
}

// Helper macros for easier logging
#[macro_export]
macro_rules! user_action {
    ($target:expr, $($arg:tt)*) => {
        $crate::logging::log_event("ACTION", $target, &format!($($arg)*))
    };
}

#[macro_export]
macro_rules! user_error {
    ($target:expr, $($arg:tt)*) => {
        $crate::logging::log_event("ERROR", $target, &format!($($arg)*))
    };
}

#[macro_export]
macro_rules! user_info {
    ($target:expr, $($arg:tt)*) => {
        $crate::logging::log_event("INFO", $target, &format!($($arg)*))
    };
}
