use crate::models::song::Song;
use crate::user_action;
use crate::user_error;
use crate::KymaError;
use lofty::picture::PictureType;
use lofty::prelude::*;

// Helper function for safe string truncation (handles Unicode correctly)
fn safe_truncate(s: &str, max_chars: usize) -> String {
    if s.chars().count() > max_chars {
        s.chars().take(max_chars).collect::<String>() + "..."
    } else {
        s.to_string()
    }
}

pub fn extract_metadata(file_path: &str) -> Result<Song, KymaError> {
    // Extract just the filename for logging (avoid long paths)
    let _file_name = std::path::Path::new(file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(file_path);

    let start_time = std::time::Instant::now();

    let mut song = Song::new(file_path.to_string());

    if let Ok(tagged_file) = lofty::read_from_path(file_path) {
        if let Some(tag) = tagged_file.primary_tag() {
            song.title = tag.title().as_deref().unwrap_or("Unknown").to_string();
            song.artist = tag.artist().as_deref().unwrap_or("Unknown").to_string();
            song.album = tag.album().as_deref().unwrap_or("Unknown").to_string();
            song.genre = tag.genre().as_deref().map(|g| g.to_string());
            song.year = tag.year().map(|y| y as i32);
            song.track_number = tag.track();
        } else if let Some(tag) = tagged_file.first_tag() {
            song.title = tag.title().as_deref().unwrap_or("Unknown").to_string();
            song.artist = tag.artist().as_deref().unwrap_or("Unknown").to_string();
            song.album = tag.album().as_deref().unwrap_or("Unknown").to_string();
        }

        if let Some(tag) = tagged_file.primary_tag() {
            for picture in tag.pictures() {
                if picture.pic_type() == PictureType::CoverFront {
                    song.artwork = Some(picture.data().to_vec());
                    break;
                }
            }
        }

        let properties = tagged_file.properties();
        song.duration = properties.duration().as_secs_f64();
    }

    // Symphonia fallback — triggers for broken duration OR missing metadata
    let needs_duration = song.duration < 1.0;
    let needs_metadata = song.title == "Unknown" && song.artist == "Unknown";

    if needs_duration || needs_metadata {
        if let Some((title, artist, album, duration)) = extract_metadata_symphonia(file_path) {
            if needs_metadata {
                if title != "Unknown" {
                    song.title = title;
                }
                if !artist.is_empty() && artist != "Unknown" {
                    song.artist = artist;
                }
                if !album.is_empty() {
                    song.album = album;
                }
            }
            if needs_duration && duration > 0.0 {
                song.duration = duration;
            }
        }
    }

    // Final filename fallback if everything else failed
    let used_filename_fallback = song.title == "Unknown";
    if song.title == "Unknown" {
        let file_stem = std::path::Path::new(file_path)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Unknown")
            .to_string();
        if let Some(dash_pos) = file_stem.find(" - ") {
            song.artist = file_stem[..dash_pos].to_string();
            song.title = file_stem[dash_pos + 3..].to_string();
        } else {
            song.title = file_stem;
        }
    }

    let elapsed = start_time.elapsed();
    // FIX: Use safe_truncate instead of byte slicing
    let title_log = safe_truncate(&song.title, 50);

    if used_filename_fallback {
        user_action!(
            "METADATA",
            "Extracted (filename fallback): {} - {} in {:.2}ms",
            title_log,
            song.artist,
            elapsed.as_secs_f64() * 1000.0
        );
    } else {
        user_action!(
            "METADATA",
            "Extracted: {} - {} in {:.2}ms",
            title_log,
            song.artist,
            elapsed.as_secs_f64() * 1000.0
        );
    }

    Ok(song)
}

fn extract_metadata_symphonia(file_path: &str) -> Option<(String, String, String, f64)> {
    // Extract just the filename for logging
    let file_name = std::path::Path::new(file_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(file_path);

    use symphonia::core::formats::FormatOptions;
    use symphonia::core::io::MediaSourceStream;
    use symphonia::core::meta::{MetadataOptions, StandardTagKey};
    use symphonia::core::probe::Hint;

    let file = match std::fs::File::open(file_path) {
        Ok(f) => f,
        Err(e) => {
            user_error!(
                "METADATA",
                "Failed to open {} for symphonia: {}",
                file_name,
                e
            );
            return None;
        }
    };
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    let mut hint = Hint::new();
    let ext = std::path::Path::new(file_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");
    hint.with_extension(ext);

    let format_opts = FormatOptions {
        enable_gapless: true,
        ..Default::default()
    };

    let mut probed = match symphonia::default::get_probe().format(
        &hint,
        mss,
        &format_opts,
        &MetadataOptions::default(),
    ) {
        Ok(p) => p,
        Err(e) => {
            user_error!("METADATA", "Failed to probe {}: {}", file_name, e);
            return None;
        }
    };

    // Duration from track codec params
    let duration = {
        let format = &probed.format;
        format
            .tracks()
            .iter()
            .find_map(|t| {
                t.codec_params
                    .time_base
                    .zip(t.codec_params.n_frames)
                    .map(|(tb, frames)| frames as f64 * tb.numer as f64 / tb.denom as f64)
            })
            .unwrap_or(0.0)
    };

    let mut title = String::new();
    let mut artist = String::new();
    let mut album = String::new();

    // M4A/MP4 stores tags inside the format container — check there first
    {
        let format = &mut probed.format;
        let meta = format.metadata();
        if let Some(current) = meta.current() {
            for tag in current.tags() {
                if let Some(key) = &tag.std_key {
                    match key {
                        StandardTagKey::TrackTitle => title = tag.value.to_string(),
                        StandardTagKey::Artist => artist = tag.value.to_string(),
                        StandardTagKey::Album => album = tag.value.to_string(),
                        _ => {}
                    }
                }
            }
        }
    }

    // Also check probe-level metadata
    if title.is_empty() {
        if let Some(metadata) = probed.metadata.get() {
            if let Some(current) = metadata.current() {
                for tag in current.tags() {
                    if let Some(key) = &tag.std_key {
                        match key {
                            StandardTagKey::TrackTitle => title = tag.value.to_string(),
                            StandardTagKey::Artist => artist = tag.value.to_string(),
                            StandardTagKey::Album => album = tag.value.to_string(),
                            _ => {}
                        }
                    }
                }
            }
        }
    }

    // Filename as last resort for title
    if title.is_empty() {
        title = std::path::Path::new(file_path)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Unknown")
            .to_string();
    }

    // Only log if we actually found something
    if !title.is_empty() && title != "Unknown" {
        // FIX: Use safe_truncate instead of byte slicing
        let title_log = safe_truncate(&title, 40);
        user_action!(
            "METADATA",
            "Symphonia fallback found: {} - {} (duration: {:.2}s)",
            title_log,
            artist,
            duration
        );
    }

    Some((title, artist, album, duration))
}
