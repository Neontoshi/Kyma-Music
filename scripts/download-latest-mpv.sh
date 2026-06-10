#!/bin/bash
# This script fetches the latest mpv Windows build from zhongfly's releases

echo "Fetching latest mpv release info..."

# Get the latest release URL from GitHub API
LATEST_URL=$(curl -s https://api.github.com/repos/zhongfly/mpv-winbuild/releases/latest | grep "browser_download_url.*7z" | grep -v "debug" | head -1 | cut -d '"' -f 4)

if [ -n "$LATEST_URL" ]; then
    echo "Found latest release: $LATEST_URL"
    echo "Downloading..."
    wget --show-progress "$LATEST_URL" -O /tmp/mpv-latest.7z

    echo "Extracting mpv.exe..."
    7z x /tmp/mpv-latest.7z -o/tmp/mpv -y > /dev/null
    find /tmp/mpv -name "mpv.exe" -exec cp {} Kyma-win64/ \;

    echo "Done! mpv.exe is in Kyma-win64/"

    # Cleanup
    rm -f /tmp/mpv-latest.7z
    rm -rf /tmp/mpv
else
    echo "Could not find a valid download URL from GitHub API."
    echo "You may need to visit https://github.com/zhongfly/mpv-winbuild/releases manually."
fi
