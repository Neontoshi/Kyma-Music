use crate::commands::media::YtError;

pub fn validate_sc_id(id: &str) -> Result<(), YtError> {
    if id.is_empty() {
        return Err(YtError::InvalidId("empty ID".into()));
    }
    if id.len() > 2048 {
        return Err(YtError::InvalidId("ID too long".into()));
    }
    if id.contains("..") {
        return Err(YtError::InvalidId("path traversal blocked".into()));
    }
    if let Some(pos) = id.find("//") {
        if !id[..pos].ends_with(':') {
            return Err(YtError::InvalidId("path traversal blocked".into()));
        }
    }
    if id.contains("\\\\") {
        return Err(YtError::InvalidId("path traversal blocked".into()));
    }
    Ok(())
}
