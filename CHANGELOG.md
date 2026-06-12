# Changelog

All notable changes to Kyma will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-12

### 🚀 Added

#### Core Features
- **Local Music Library** - Scan folders and play local audio files (MP3, FLAC, WAV, OGG, M4A, AAC)
- **YouTube Integration** - Search, stream, and discover music from YouTube
- **SoundCloud Integration** - Search and stream tracks from SoundCloud
- **Internet Radio** - Browse 1000+ stations by genre, search, and save favorites
- **Podcasts & Audiobooks** - Dedicated sections for spoken-word content
- **Playlists** - Create, edit, and manage custom playlists with emoji covers
- **Queue System** - Add songs to queue, play next, reorder, and clear

#### Discovery
- **For You Page** - Personalized recommendations based on listening habits
- **Explore Page** - Trending music, similar artists, and genre charts
- **Artist Following** - Follow artists and get updates on new releases
- **Recently Played** - Track history with timestamps

#### Audio Experience
- **Audio Visualizer** - Real-time butterchurn-powered visualizations
- **Gapless Playback** - Seamless transition between tracks
- **Crossfade Support** - Smooth audio blending between songs
- **Volume Control** - Per-app volume with mute support
- **Progress Slider** - Seek with visual buffering indicator

#### UI & UX
- **Multiple Views** - List and grid layouts for library
- **Dark/Light Themes** - Multiple color schemes including Neon Noir
- **System Tray** - Play/pause, next, previous, show, and quit controls
- **Keyboard Shortcuts** - Media keys support
- **Toast Notifications** - Non-intrusive feedback for actions
- **Resume Playback** - Continue where you left off after app restart

#### Data & Privacy
- **Local Database** - SQLite storage, no cloud dependencies
- **No Telemetry** - Zero analytics, tracking, or data collection
- **Token Obfuscation** - Credentials stored with XOR obfuscation
- **Offline First** - Downloaded tracks available without internet

### 🔧 Changed

- **Logging System** - Replaced ad-hoc logging with structured `tracing` framework
- **Mutex Implementation** - Switched from `std::Mutex` to `parking_lot::Mutex` for deadlock prevention
- **Database Migrations** - Added versioning system with rollback support
- **Audio Engine** - Migrated from MPV to pure Rust (Symphonia + CPAL)
- **Frontend State** - Replaced context API with Zustand for better performance

### 🐛 Fixed

- Like button persistence across app restarts
- Progress slider visual glitches during seek
- Download checkmark not persisting after app restart
- Stream cache polluting local library display
- Queue position not updating when playing from queue modal
- Buffer underruns causing audio dropouts
- YouTube stream URLs expiring mid-playback (auto-refresh)
- SoundCloud HLS stream resolution

### 🛡️ Security

- **Input Validation** - Video ID sanitization for YouTube and SoundCloud
- **Path Sanitization** - Canonicalization to prevent directory traversal
- **Content Filtering** - Non-English content filtering for better recommendations
- **Request Rate Limiting** - Prevent API abuse

### 🧪 Testing

- 41 unit and integration tests
- Mock yt-dlp for CI pipeline
- SQLite in-memory database for test isolation
- GitHub Actions CI workflow

### 📦 Dependencies

#### Backend (Rust)
- `tauri` - 2.0 (desktop framework)
- `symphonia` - Audio decoding
- `cpal` - Audio output
- `sqlx` - Database ORM
- `tokio` - Async runtime

#### Frontend (TypeScript/React)
- `react` - 18.3
- `zustand` - State management
- `tailwindcss` - Styling
- `framer-motion` - Animations
- `butterchurn` - Audio visualizer

### ⚠️ Known Issues / Outside Factors

#### Linux Audio Support
For full audio compatibility (especially Bluetooth headphones), ensure PulseAudio is installed:

```bash
sudo apt install pulseaudio pulseaudio-module-bluetooth
