use crate::commands::youtube::YtError;
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
pub enum KymaError {
    #[error("Failed to read file: {0}")]
    FileReadError(String),

    #[error("Audio playback error: {0}")]
    PlaybackError(String),

    #[error("Metadata extraction failed: {0}")]
    MetadataError(String),

    #[error("Failed to scan directory: {0}")]
    ScanError(String),

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Invalid path: {0}")]
    InvalidPath(String),
}

impl From<std::io::Error> for KymaError {
    fn from(err: std::io::Error) -> Self {
        KymaError::FileReadError(err.to_string())
    }
}

impl From<lofty::error::LoftyError> for KymaError {
    fn from(err: lofty::error::LoftyError) -> Self {
        KymaError::MetadataError(err.to_string())
    }
}

impl From<sqlx::Error> for KymaError {
    fn from(err: sqlx::Error) -> Self {
        KymaError::DatabaseError(err.to_string())
    }
}

impl From<String> for KymaError {
    fn from(err: String) -> Self {
        KymaError::PlaybackError(err)
    }
}

impl From<YtError> for KymaError {
    fn from(err: YtError) -> Self {
        KymaError::PlaybackError(err.to_string())
    }
}
