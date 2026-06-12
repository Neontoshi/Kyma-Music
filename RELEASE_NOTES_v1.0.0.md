<div align="center">

<img src="Kyma_Backend/icons/icon.png" width="100" alt="Kyma Logo" />

# 🌊 Kyma v1.0.0

### The first wave.

*June 2026 · Initial Release*

</div>

---

Kyma is officially out. This is the first public release — a privacy-first, cross-platform desktop music player built with Rust and Tauri 2.0. No subscriptions. No telemetry. No cloud. Just music.

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
| 🖥️ | **Cross-platform** | Native builds for Windows, Linux, and macOS |
| 🔒 | **Privacy First** | Zero telemetry — all data stays on your machine |

---

## 🐧 Installation — Linux (`.deb`)

```bash
sudo dpkg -i kyma_1.0.0_amd64.deb
```

Then launch Kyma from your applications menu or run:

```bash
kyma
```

### Requirements

- Ubuntu 20.04+ or any Debian-based distro
- `yt-dlp` for streaming support:

```bash
sudo apt install yt-dlp
```

---

## ⚠️ Known Limitations

This is v1.0.0 — a solid foundation with a few rough edges still to smooth out:

- Podcast sync is local only — no cross-device support yet
- SoundCloud search may be slower depending on `yt-dlp` response times
- Some album art may not load for obscure local files with missing metadata

---

## 🐛 Found a Bug?

Open an issue at [github.com/Neontoshi/Kyma/issues](https://github.com/Neontoshi/Kyma/issues) and include:

- Your OS and version
- Steps to reproduce
- Logs from `~/.local/share/Kyma/logs/`

---

## 🗺️ What's Next

- [ ] Windows & macOS releases
- [ ] Lyrics display (lrclib integration)
- [ ] Queue management improvements
- [ ] Remote control via Kyma Cast
- [ ] EQ and audio effects

---

<div align="center">

Built with 🦀 Rust by [Neontoshi](https://github.com/Neontoshi)

*No subscriptions. No tracking. Just music.*

</div>
