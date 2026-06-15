<div align="center">
<img src="Kyma_Backend/icons/icon.png" width="100" alt="Kyma Logo" />

# 🌊 Kyma v1.1.9
### The first wave.
*June 2026 · Initial Release*
</div>

---

Kyma is officially out. This is the first public release, a privacy-first, cross-platform desktop music player built with Rust and Tauri 2.0. No subscriptions. No telemetry. No cloud. Just music.

---

## ✨ What's Included

| &nbsp; | Feature | Description |
|--------|---------|-------------|
| 🎵 | **Local Library** | Scan and play your personal music collection with full metadata support |
| 🌊 | **YouTube & SoundCloud** | Search and stream without opening a browser |
| 📻 | **Internet Radio** | Thousands of live stations worldwide |
| 🎙️ | **Podcasts** | Subscribe, download, and track listening progress |
| ❤️ | **Liked Songs & Playlists** | Manage favourites across all sources in one place |
| 🔍 | **Universal Search** | Local and online results in a single query |
| 🖥️ | **Cross-platform** | Native builds for Windows, macOS, and Linux |
| 🔒 | **Privacy First** | Zero telemetry — all data stays on your machine |

---

## 💻 Installation

### 🪟 Windows

Download **`Kyma_1.1.9_x64-setup.exe`** from the [releases page](https://github.com/Neontoshi/Kyma-Music/releases/tag/v1.1.9) and run the installer.

For streaming support, install `yt-dlp`:

```powershell
winget install yt-dlp.yt-dlp
```

**Requirements:** Windows 10 or later (64-bit)

---

### 🍎 macOS

Download the appropriate `.dmg` for your machine from the [releases page](https://github.com/Neontoshi/Kyma-Music/releases/tag/v1.1.9):

| Mac | File |
|-----|------|
| Apple Silicon (M1/M2/M3) | `Kyma_1.1.9_aarch64.dmg` |
| Intel | `Kyma_1.1.9_x64.dmg` |

Open the `.dmg`, drag Kyma to your Applications folder, and launch it.

For streaming support, install `yt-dlp`:

```bash
brew install yt-dlp
```

**Requirements:** macOS 11 (Big Sur) or later

---

### 🐧 Linux (`.deb`)

Download **`Kyma_1.1.9_amd64.deb`** from the [releases page](https://github.com/Neontoshi/Kyma-Music/releases/tag/v1.1.9) or install directly:

```bash
sudo dpkg -i Kyma_1.1.9_amd64.deb
```

For streaming support:

```bash
sudo apt install yt-dlp
```

**Requirements:** Ubuntu 20.04+ or any Debian-based distro

---

## ⚠️ Known Limitations

This is v1.1.9 — a solid foundation with a few rough edges still to smooth out:

- Podcast sync is local only — no cross-device support yet
- SoundCloud search may be slower depending on `yt-dlp` response times
- Some album art may not load for obscure local files with missing metadata

---

## 🐛 Found a Bug?

Open an issue at [github.com/Neontoshi/Kyma-Music/issues](https://github.com/Neontoshi/Kyma-Music/issues) and include:

- Your OS and version
- Steps to reproduce
- Logs from:
  - **Linux:** `~/.local/share/Kyma/logs/`
  - **Windows:** `%APPDATA%\Kyma\logs\`
  - **macOS:** `~/Library/Application Support/Kyma/logs/`

---

## 🗺️ What's Next

- [ ] Lyrics display (lrclib integration)
- [ ] Queue management improvements
- [ ] Remote control via Kyma Cast
- [ ] EQ and audio effects

---

<div align="center">

Built with 🦀 Rust by [Neontoshi](https://github.com/Neontoshi)

*No subscriptions. No tracking. Just music.*

</div>
