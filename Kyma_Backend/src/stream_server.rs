use crate::user_action;
use crate::user_error;
use axum::{
    extract::Path,
    http::{header, Request, StatusCode},
    response::Response,
    routing::get,
    Router,
};
use std::path::PathBuf;
use tokio::fs::File;
use tokio::io::{AsyncReadExt, AsyncSeekExt};
use tokio_util::io::ReaderStream;

pub fn stream_router() -> Router {
    Router::new().route("/stream/{video_id}", get(stream_handler))
}

async fn stream_handler(
    Path(video_id): Path<String>,
    req: Request<axum::body::Body>,
) -> Result<Response<axum::body::Body>, StatusCode> {
    // Sanitize — alphanumeric, dash, underscore, forward slash only
    if !video_id
        .chars()
        .all(|c| c.is_alphanumeric() || c == '-' || c == '_')
    {
        user_error!("STREAM", "Invalid video ID format: {}", video_id);
        return Err(StatusCode::BAD_REQUEST);
    }

    // Only allow access to files in the temp directory with Kyma_yt_ prefix
    let temp_dir = std::env::temp_dir();
    let path: PathBuf = temp_dir.join(format!("Kyma_yt_{video_id}.mp3"));
    let ready_path: PathBuf = temp_dir.join(format!("Kyma_yt_{video_id}.mp3.ready"));

    // Verify the resolved path is still within temp_dir (symlink protection)
    if let Ok(canonical) = path.canonicalize() {
        if !canonical.starts_with(&temp_dir) {
            user_error!("STREAM", "Path traversal attempt: {}", path.display());
            tracing::warn!("Path traversal attempt via symlink: {}", path.display());
            return Err(StatusCode::FORBIDDEN);
        }
    }

    if !path.exists() {
        user_error!("STREAM", "File not found for video ID: {}", video_id);
        return Err(StatusCode::NOT_FOUND);
    }

    let file_len = path.metadata().map(|m| m.len()).unwrap_or(0);
    let is_complete = ready_path.exists();

    // File appeared but has no usable data yet — tell the client to retry.
    if file_len < 1024 && !is_complete {
        user_action!("STREAM", "File not ready yet for video: {}", video_id);
        return Response::builder()
            .status(StatusCode::SERVICE_UNAVAILABLE)
            .header(header::RETRY_AFTER, "1")
            .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
            .body(axum::body::Body::from("File not ready yet"))
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR);
    }

    let content_type = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|ext| match ext {
            "mp3" => "audio/mpeg",
            "webm" => "audio/webm",
            "m4a" => "audio/mp4",
            "ogg" => "audio/ogg",
            _ => "audio/mpeg",
        })
        .unwrap_or("audio/mpeg");

    let range_header = req.headers().get(header::RANGE);
    let (start, end) = match range_header {
        Some(val) => {
            let range_str = val.to_str().unwrap_or("");
            user_action!("STREAM", "Range request for {}: {}", video_id, range_str);
            parse_range(range_str, file_len)
        }
        None => (0, file_len.saturating_sub(1)),
    };

    // Range starts beyond what we have — 416 Range Not Satisfiable.
    if start >= file_len {
        user_error!(
            "STREAM",
            "Invalid range for {}: start={} >= len={}",
            video_id,
            start,
            file_len
        );
        return Response::builder()
            .status(StatusCode::RANGE_NOT_SATISFIABLE)
            .header(header::CONTENT_RANGE, format!("bytes */{file_len}"))
            .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
            .body(axum::body::Body::empty())
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR);
    }

    let chunk_size = end - start + 1;
    let available = file_len.saturating_sub(start);
    let to_read = chunk_size.min(available);

    let mut file = File::open(&path).await.map_err(|_| StatusCode::NOT_FOUND)?;
    file.seek(std::io::SeekFrom::Start(start))
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let limited = file.take(to_read);
    let stream = ReaderStream::new(limited);
    let body = axum::body::Body::from_stream(stream);

    let is_range_request = range_header.is_some();
    let status = if is_range_request {
        StatusCode::PARTIAL_CONTENT
    } else {
        StatusCode::OK
    };

    let mut builder = Response::builder()
        .status(status)
        .header(header::CONTENT_TYPE, content_type)
        .header(header::ACCEPT_RANGES, "bytes")
        .header(header::CONTENT_LENGTH, to_read)
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .header(header::CACHE_CONTROL, "no-cache");

    // Content-Range must only appear on 206 Partial Content.
    if is_range_request {
        builder = builder.header(
            header::CONTENT_RANGE,
            format!("bytes {start}-{}/{file_len}", start + to_read - 1),
        );
    }

    builder
        .body(body)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

/// Parse a `bytes=START-END` or `bytes=START-` range header.
fn parse_range(range: &str, file_len: u64) -> (u64, u64) {
    let default = (0, file_len.saturating_sub(1));
    let Some(s) = range.strip_prefix("bytes=") else {
        return default;
    };
    let mut parts = s.splitn(2, '-');
    let start = parts
        .next()
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(0);
    let end = parts
        .next()
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(file_len.saturating_sub(1))
        .min(file_len.saturating_sub(1));
    (start, end)
}
