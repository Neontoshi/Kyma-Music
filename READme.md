# LauvPlayer

A modern desktop music player built with Tauri, React, and Rust.

## Features

- **Local Music Library** — scan folders, browse by artist/album/genre
- **YouTube & SoundCloud** — search and stream directly
- **Internet Radio** — browse by genre, save favorites
- **Podcasts & Audiobooks** — discover and play long-form content
- **For You** — genre-based discovery with smart queries
- **Explore Trending** — billboard charts and new releases
- **Playlists** — create, edit, and manage custom playlists
- **Liked Songs** — heart any track, persists forever
- **Downloads** — save YouTube/SoundCloud tracks to your music folder
- **Audio Visualizer** — butterchurn presets with fullscreen mode
- **Cross-Platform** — Linux (PipeWire), macOS (CoreAudio), Windows (WASAPI)

## Install

### Linux
```bash
# Requires: mpv, yt-dlp
sudo apt install mpv yt-dlp
cargo install --path Lauv_Backend
