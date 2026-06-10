# Changelog

## [0.1.0] - 2026-06-01

### Added
- Local music library with folder scanning
- YouTube and SoundCloud search and streaming
- Internet radio stations with genre filtering
- Podcast and audiobook browsing
- For You page with genre-based discovery
- Explore trending page
- Create and manage playlists
- Like/favorite songs with persistence
- Download YouTube/SoundCloud tracks
- Artist following and browsing
- Audio visualizer with butterchurn presets
- System tray with play/pause/next controls
- Resume playback on app restart
- Delete songs from library and disk
- Cross-platform audio (Linux/PipeWire, macOS/CoreAudio, Windows/WASAPI)
- yt-dlp graceful degradation
- MPV crash recovery with auto-restart

### Security
- Video ID sanitization (YouTube + SoundCloud)
- Path canonicalization to prevent traversal
- Token obfuscation for stored credentials
- Non-English content filtering

### Testing
- 41 unit and integration tests
- CI pipeline on GitHub Actions
- Mock yt-dlp for test runs

### Changed
- Standardized logging with tracing
- Replaced std Mutex with parking_lot for deadlock detection
- Database migration versioning with rollback

### Fixed
- Like button persistence across app restarts
- Progress slider drag and seek
- Download checkmark persistence
- Stream cache not polluting library

### Outside factors (Linux only for audio support or rther for headphones to work well )
- sudo apt install pulseaudio pulseaudio-module-bluetooth
