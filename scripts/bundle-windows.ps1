# bundle-windows.ps1 - Downloads and bundles dependencies for Kyma Windows build
param(
    [string]$OutputDir = ".\Kyma-win64"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Kyma Windows Bundle Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Create output directory
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# Download URLs
$MpvUrl = "https://sourceforge.net/projects/mpv-player-windows/files/64bit/mpv-x86_64-20240505-git-1270c3f.7z/download"
$YtDlpUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
$FfmpegUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"

Write-Host ""
Write-Host "[1/4] Downloading mpv..." -ForegroundColor Yellow
$mpvZip = "$env:TEMP\mpv.7z"
Invoke-WebRequest -Uri $MpvUrl -OutFile $mpvZip -UseBasicParsing

Write-Host "[2/4] Extracting mpv..." -ForegroundColor Yellow
# Need 7-Zip to extract .7z files
if (-not (Get-Command 7z -ErrorAction SilentlyContinue)) {
    Write-Host "Installing 7-Zip..." -ForegroundColor Yellow
    winget install --id 7zip.7zip -e --accept-source-agreements --accept-package-agreements
}
& "7z" x $mpvZip -o"$env:TEMP\mpv" -y | Out-Null
Copy-Item "$env:TEMP\mpv\mpv-x86_64-*\mpv.exe" -Destination $OutputDir -Force

Write-Host "[3/4] Downloading yt-dlp..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $YtDlpUrl -OutFile "$OutputDir\yt-dlp.exe" -UseBasicParsing

Write-Host "[4/4] Downloading ffmpeg..." -ForegroundColor Yellow
$ffmpegZip = "$env:TEMP\ffmpeg.zip"
Invoke-WebRequest -Uri $FfmpegUrl -OutFile $ffmpegZip -UseBasicParsing
Expand-Archive -Path $ffmpegZip -DestinationPath "$env:TEMP\ffmpeg" -Force
Copy-Item "$env:TEMP\ffmpeg\ffmpeg-*\bin\ffmpeg.exe" -Destination $OutputDir -Force

# Clean up temp files
Remove-Item $mpvZip -Force -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\mpv" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item $ffmpegZip -Force -ErrorAction SilentlyContinue
Remove-Item "$env:TEMP\ffmpeg" -Recurse -Force -ErrorAction SilentlyContinue

# Copy the compiled exe
Write-Host "Copying kyma.exe..." -ForegroundColor Yellow
if (Test-Path "target\release\kyma.exe") {
    Copy-Item "target\release\kyma.exe" -Destination $OutputDir -Force
} elseif (Test-Path "..\target\release\kyma.exe") {
    Copy-Item "..\target\release\kyma.exe" -Destination $OutputDir -Force
} else {
    Write-Host "WARNING: kyma.exe not found! Build it first." -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Bundle complete!" -ForegroundColor Green
Write-Host "Output directory: $OutputDir" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "To run Kyma:"
Write-Host "  cd $OutputDir"
Write-Host "  .\kyma.exe"
