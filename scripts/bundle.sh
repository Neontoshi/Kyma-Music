#!/bin/bash
# Complete Windows bundle creator

set -e

BUNDLE_DIR="Kyma-win64"
echo "========================================"
echo "Creating Kyma Windows Bundle"
echo "========================================"

# Create bundle directory
mkdir -p "$BUNDLE_DIR"

# Download dependencies (if not already present)
if [ ! -f "$BUNDLE_DIR/yt-dlp.exe" ]; then
    echo "Downloading yt-dlp..."
    wget -q --show-progress "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe" -O "$BUNDLE_DIR/yt-dlp.exe"
fi

if [ ! -f "$BUNDLE_DIR/ffmpeg.exe" ]; then
    echo "Downloading ffmpeg..."
    wget -q --show-progress "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip" -O /tmp/ffmpeg.zip
    unzip -q /tmp/ffmpeg.zip -d /tmp/ffmpeg
    find /tmp/ffmpeg -name "ffmpeg.exe" -exec cp {} "$BUNDLE_DIR/" \;
    rm -f /tmp/ffmpeg.zip
    rm -rf /tmp/ffmpeg
fi

if [ ! -f "$BUNDLE_DIR/mpv.exe" ]; then
    echo "Downloading mpv..."
    ./scripts/download-latest-mpv.sh
fi

# Copy kyma.exe if available
if [ -f "target/x86_64-pc-windows-msvc/release/kyma.exe" ]; then
    cp target/x86_64-pc-windows-msvc/release/kyma.exe "$BUNDLE_DIR/"
elif [ -f "../target/x86_64-pc-windows-msvc/release/kyma.exe" ]; then
    cp ../target/x86_64-pc-windows-msvc/release/kyma.exe "$BUNDLE_DIR/"
else
    echo "WARNING: kyma.exe not found!"
    echo "Place your Windows build in $BUNDLE_DIR/"
fi

# Create launcher script
cat > "$BUNDLE_DIR/run-kyma.bat" << 'BAT'
@echo off
title Kyma
echo ========================================
echo Kyma Music Player
echo ========================================
echo.
kyma.exe
pause
BAT

# Create README
cat > "$BUNDLE_DIR/README.txt" << 'README'
========================================
Kyma for Windows
========================================

Quick Start:
1. Double-click run-kyma.bat
2. Or run kyma.exe directly

Requirements:
- Windows 10 or later
- WebView2 Runtime (usually pre-installed)

Included dependencies:
- mpv.exe (audio playback)
- yt-dlp.exe (YouTube/SoundCloud)
- ffmpeg.exe (audio processing)

Troubleshooting:
- If you see "missing DLL" errors, install Visual C++ Redistributable
- Make sure all files are in the SAME folder
README

echo ""
echo "========================================"
echo "Bundle complete! Files in $BUNDLE_DIR:"
echo "========================================"
ls -la "$BUNDLE_DIR/"
echo ""
echo "Total size: $(du -sh "$BUNDLE_DIR/" | cut -f1)"
