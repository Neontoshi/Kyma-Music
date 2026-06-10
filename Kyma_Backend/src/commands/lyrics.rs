use reqwest;
use serde::Serialize;

#[derive(Serialize)]
pub struct LrcLine {
    pub time: f64,
    pub text: String,
}

const GENIUS_TOKEN: &str = "JzOn4sdKk7RBK5gHRqyleFxfX11UVwbci5iG2FSwmz3dFPHqXqO-BxOdwFHoHbum";

#[tauri::command]
pub async fn fetch_genius_lyrics(title: String, artist: String) -> Result<Vec<LrcLine>, String> {
    let client = reqwest::Client::new();

    // Search
    let search_url = format!(
        "https://api.genius.com/search?q={}",
        urlencoding::encode(&format!("{} {}", title, artist))
    );
    let resp = client
        .get(&search_url)
        .header("Authorization", format!("Bearer {}", GENIUS_TOKEN))
        .send()
        .await
        .map_err(|e| e.to_string())?;
    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;

    let hits = json["response"]["hits"].as_array().ok_or("No results")?;
    if hits.is_empty() {
        return Err("No matches".into());
    }

    // Find best match
    let song_url = hits[0]["result"]["url"].as_str().ok_or("No URL")?;

    // Scrape
    let html = client
        .get(song_url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;

    // Extract lyrics div
    let lyrics = html
        .split(r#"<div class="lyrics">"#)
        .nth(1)
        .or_else(|| html.split(r#"<div data-lyrics-container="true">"#).nth(1))
        .and_then(|s| s.split("</div>").next())
        .unwrap_or("");

    let clean = lyrics
        .replace("<br/>", "\n")
        .replace("<br />", "\n")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&#x27;", "'")
        .replace("&quot;", "\"");

    // Strip HTML tags
    let clean = regex::Regex::new(r"<[^>]+>")
        .unwrap()
        .replace_all(&clean, "");

    Ok(clean
        .lines()
        .filter(|l| !l.trim().is_empty())
        .enumerate()
        .map(|(i, text)| LrcLine {
            time: i as f64 * 4.0,
            text: text.trim().to_string(),
        })
        .collect())
}
