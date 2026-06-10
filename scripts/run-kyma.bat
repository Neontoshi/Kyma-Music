@echo off
title Kyma

echo ========================================
echo Kyma Music Player
echo ========================================
echo.

REM Check if dependencies exist
if not exist "mpv.exe" (
    echo ERROR: mpv.exe not found!
    echo Please run bundle-windows.ps1 first.
    pause
    exit /b 1
)

if not exist "yt-dlp.exe" (
    echo ERROR: yt-dlp.exe not found!
    pause
    exit /b 1
)

if not exist "ffmpeg.exe" (
    echo ERROR: ffmpeg.exe not found!
    pause
    exit /b 1
)

echo All dependencies found!
echo Starting Kyma...
echo.

REM Run the app
kyma.exe

pause
