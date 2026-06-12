<div align="center">
  
  <img src="Kyma_Backend/icons/icon.png" width="120" alt="Kyma Logo" />
  
  # 🎵 Kyma
  
  ### Experience music waves at premium — for free.
  
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Rust](https://img.shields.io/badge/Rust-1.80+-orange.svg)](https://www.rust-lang.org)
  [![Tauri](https://img.shields.io/badge/Tauri-2.0-purple.svg)](https://tauri.app)
  [![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org)
  
  *Local library + online streaming + radio + podcasts.*
  *No subscriptions. Your data stays local.*
  
  [Download](#-download) • [Features](#-features) • [Screenshots](#-screenshots) • [Building](#-building-from-source)
  
</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🎵 **Local Library** | Scan and play your local music files |
| 🌊 **Streaming** | YouTube & SoundCloud integration |
| 📻 **Radio** | Thousands of internet radio stations |
| 🎙️ **Podcasts** | Subscribe and listen to podcasts |
| ❤️ **Liked Songs** | Save your favorites |
| 📋 **Playlists** | Create and manage custom playlists |
| 🔍 **Search** | Search your library and online sources |
| 🖥️ **Cross-platform** | Windows, Linux, macOS |
| 🔒 **Privacy First** | No telemetry, no tracking, data stays local |

---

## 📸 Screenshots

<div align="center">
  
  | Home | Now Playing | Library |
  |------|-------------|---------|
  | ![Home](screenshots/home.png) | ![Now Playing](screenshots/nowplaying.png) | ![Library](screenshots/library.png) |
  
  | Search | Albums | Settings |
  |-------|--------|----------|
  | ![Search](screenshots/search.png) | ![Albums](screenshots/albums.png) | ![Settings](screenshots/settings.png) |

</div>

---

## 🚀 Download

| Platform | Download |
|----------|----------|
| 🐧 Linux | [Download .deb](https://github.com/Neontoshi/Kyma/releases) |
| 🪟 Windows | [Download .exe](https://github.com/Neontoshi/Kyma/releases) |
| 🍎 macOS | [Download .dmg](https://github.com/Neontoshi/Kyma/releases) |

*Or build from source (see below)*

---

## 🛠️ Building from Source

### Prerequisites

- **Rust** (latest stable)
- **Node.js** (v18+)
- **yt-dlp** (for streaming)

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install yt-dlp
pip install yt-dlp

# Or on Linux:
sudo apt install yt-dlp
