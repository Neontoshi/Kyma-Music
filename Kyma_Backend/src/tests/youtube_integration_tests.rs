// Kyma_Backend/src/tests/youtube_integration_tests.rs
use crate::commands::youtube::youtube_search;

fn use_mock_ytdlp() {
    let mock_path = std::env::current_dir()
        .unwrap()
        .join("tests/fixtures/mock-yt-dlp");
    std::env::set_var("Kyma_MOCK_YTDLP", mock_path.to_str().unwrap());
}

#[tokio::test]
async fn test_youtube_search_returns_results() {
    use_mock_ytdlp();

    let results = youtube_search("test".to_string(), None, None)
        .await
        .unwrap();
    assert_eq!(results.len(), 3);

    let titles: Vec<&str> = results.iter().map(|s| s.title.as_str()).collect();
    assert!(titles.contains(&"Rick Astley - Never Gonna Give You Up"));
    assert!(titles.contains(&"PSY - GANGNAM STYLE"));
    assert!(titles.contains(&"Luis Fonsi - Despacito ft. Daddy Yankee"));
    assert_eq!(results[0].source, "youtube");
}

#[tokio::test]
async fn test_search_empty_query_returns_empty() {
    use_mock_ytdlp();

    let results = youtube_search("   ".to_string(), None, None).await.unwrap();
    assert!(results.is_empty());
}

#[tokio::test]
async fn test_search_handles_special_characters() {
    use_mock_ytdlp();

    let results = youtube_search("test & query <script>".to_string(), None, None)
        .await
        .unwrap();
    assert!(!results.is_empty());
}
