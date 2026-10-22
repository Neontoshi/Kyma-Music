use crate::commands::media::YtError;

pub fn validate_video_id(id: &str) -> Result<(), YtError> {
    if id.is_empty() {
        return Err(YtError::InvalidId("empty ID".into()));
    }
    if id.len() > 32 {
        return Err(YtError::InvalidId("ID too long".into()));
    }
    if !id
        .chars()
        .all(|c| c.is_alphanumeric() || c == '-' || c == '_')
    {
        return Err(YtError::InvalidId(id.to_string()));
    }
    Ok(())
}
