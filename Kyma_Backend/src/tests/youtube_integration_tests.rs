// Kyma_Backend/src/tests/youtube_integration_tests.rs
use crate::commands::youtube::youtube_search;

#[tokio::test]
async fn test_youtube_search_returns_results() {
    let mock_path = std::env::current_dir()
        .unwrap()
        .join("tests/fixtures/mock-yt-dlp");

    std::env::set_var("Kyma_MOCK_YTDLP", mock_path.to_str().unwrap());

    let results = youtube_search("test".to_string()).await.unwrap();
    assert!(!results.is_empty());
    assert_eq!(results.len(), 3);

    let titles: Vec<&str> = results.iter().map(|s| s.title.as_str()).collect();
    assert!(titles.contains(&"Rick Astley - Never Gonna Give You Up"));
    assert!(titles.contains(&"PSY - GANGNAM STYLE"));
    assert!(titles.contains(&"Luis Fonsi - Despacito ft. Daddy Yankee"));
    assert_eq!(results[0].source, "youtube");
}
