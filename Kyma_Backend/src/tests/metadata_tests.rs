// Kyma_Backend/src/tests/metadata_tests.rs
use crate::commands::metadata::extract_metadata;

#[test]
fn test_extract_metadata_nonexistent_file_returns_filename_fallback() {
    let result = extract_metadata("/nonexistent/path/song.mp3");
    assert!(result.is_ok());
    let song = result.unwrap();
    assert_eq!(song.title, "song"); // Filename without extension
    assert_eq!(song.artist, "Unknown");
}

#[test]
fn test_extract_metadata_empty_path_returns_default() {
    let result = extract_metadata("");
    assert!(result.is_ok());
    let song = result.unwrap();
    // Empty path returns "Unknown" because there's no filename to extract
    assert_eq!(song.title, "Unknown");
}

#[test]
fn test_extract_metadata_invalid_extension_returns_filename_fallback() {
    let result = extract_metadata("/tmp/test.txt");
    assert!(result.is_ok());
    let song = result.unwrap();
    assert_eq!(song.title, "test"); // Filename without extension
    assert_eq!(song.artist, "Unknown");
}
