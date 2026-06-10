// Kyma_Backend/src/tests/search_query_tests.rs
use crate::commands::youtube::youtube_search;

#[tokio::test]
async fn test_search_empty_query_returns_empty() {
    let mock_path = std::env::current_dir()
        .unwrap()
        .join("tests/fixtures/mock-yt-dlp");
    std::env::set_var("Kyma_MOCK_YTDLP", mock_path.to_str().unwrap());

    let results = youtube_search("".to_string()).await.unwrap();
    assert!(results.is_empty());
}

#[tokio::test]
async fn test_search_filters_short_videos() {
    let mock_path = std::env::current_dir()
        .unwrap()
        .join("tests/fixtures/mock-yt-dlp");
    std::env::set_var("Kyma_MOCK_YTDLP", mock_path.to_str().unwrap());

    let results = youtube_search("test".to_string()).await.unwrap();
    // All mock results have duration > 20s, so none should be filtered
    assert_eq!(results.len(), 3);
}

#[tokio::test]
async fn test_search_handles_special_characters() {
    let mock_path = std::env::current_dir()
        .unwrap()
        .join("tests/fixtures/mock-yt-dlp");
    std::env::set_var("Kyma_MOCK_YTDLP", mock_path.to_str().unwrap());

    // Should not crash with special chars
    let results = youtube_search("test & query <script>".to_string())
        .await
        .unwrap();
    assert!(!results.is_empty());
}
