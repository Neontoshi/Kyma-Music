import { useEffect, useState } from "react";
import { logger } from "../../services/logger";

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
  }>;
}

export const useUpdater = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateVersion, setUpdateVersion] = useState("");
  const [updateUrl, setUpdateUrl] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const checkForUpdates = async () => {
    setChecking(true);
    try {
      const currentVersion = await getCurrentVersion();

      const response = await fetch(
        "https://api.github.com/repos/Neontoshi/Kyma-Music/releases/latest",
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const release: GitHubRelease = await response.json();
      const latestVersion = release.tag_name.replace(/^v/, "");

      if (compareVersions(latestVersion, currentVersion) > 0) {
        setUpdateAvailable(true);
        setUpdateVersion(release.tag_name);
        setUpdateUrl(release.html_url);
        setUpdateNotes(release.body || "No release notes available.");

        logger.logUI("Updater", "update_available", {
          current: currentVersion,
          latest: latestVersion,
        });
      } else {
        logger.logUI("Updater", "no_update", {
          current: currentVersion,
          latest: latestVersion,
        });
      }
    } catch (error) {
      console.error("Update check failed:", error);
      logger.logUI("Updater", "check_failed", {
        error: String(error),
      });
      throw error;
    } finally {
      setChecking(false);
    }
  };

  const downloadAndInstall = async () => {
    setDownloading(true);
    setDownloadProgress(0);

    try {
      const response = await fetch(
        "https://api.github.com/repos/Neontoshi/Kyma-Music/releases/latest",
      );
      const release: GitHubRelease = await response.json();

      const asset = findPlatformAsset(release.assets);

      if (!asset) {
        throw new Error("No compatible download found for your platform");
      }

      logger.logUI("Updater", "downloading", {
        asset: asset.name,
        size: asset.size,
      });

      const filePath = await downloadFile(
        asset.browser_download_url,
        asset.name,
        (progress) => {
          setDownloadProgress(progress);
        },
      );

      logger.logUI("Updater", "download_complete", { path: filePath });

      await installUpdate(filePath);
    } catch (error) {
      console.error("Download/Install failed:", error);
      logger.logUI("Updater", "install_failed", {
        error: String(error),
      });
      throw error;
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      checkForUpdates();
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return {
    updateAvailable,
    updateVersion,
    updateUrl,
    updateNotes,
    checking,
    downloading,
    downloadProgress,
    checkForUpdates,
    downloadAndInstall,
  };
};

async function getCurrentVersion(): Promise<string> {
  try {
    const { tauriCommands } = await import("../../services/tauriBridge");
    const version = await tauriCommands.getAppVersion();
    return version || "1.0.0";
  } catch {
    return "1.1.7";
  }
}

function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map(Number);
  const partsB = b.split(".").map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA > numB) return 1;
    if (numA < numB) return -1;
  }
  return 0;
}

function findPlatformAsset(
  assets: Array<{ name: string; browser_download_url: string; size: number }>,
) {
  const isWindows = navigator.platform.includes("Win");
  const isMac = navigator.platform.includes("Mac");
  const isLinux = navigator.platform.includes("Linux");

  // Windows - prefer .exe, fallback to .msi
  if (isWindows) {
    for (const asset of assets) {
      const name = asset.name.toLowerCase();
      if (name.endsWith(".exe")) return asset;
    }
    for (const asset of assets) {
      const name = asset.name.toLowerCase();
      if (name.endsWith(".msi")) return asset;
    }
  }

  // macOS - prefer .dmg, fallback to .app
  if (isMac) {
    for (const asset of assets) {
      const name = asset.name.toLowerCase();
      if (name.endsWith(".dmg")) return asset;
    }
    for (const asset of assets) {
      const name = asset.name.toLowerCase();
      if (name.endsWith(".app")) return asset;
    }
  }

  // Linux - prefer .deb, fallback to .rpm or .AppImage
  if (isLinux) {
    for (const asset of assets) {
      const name = asset.name.toLowerCase();
      if (name.endsWith(".deb")) return asset;
    }
    for (const asset of assets) {
      const name = asset.name.toLowerCase();
      if (name.endsWith(".rpm") || name.endsWith(".appimage")) return asset;
    }
  }

  return null;
}

async function downloadFile(
  url: string,
  filename: string,
  onProgress: (progress: number) => void,
): Promise<string> {
  onProgress(10);

  const { tauriCommands } = await import("../../services/tauriBridge");

  onProgress(50);
  const filePath = await tauriCommands.downloadUpdate(url, filename);

  onProgress(100);

  return filePath;
}

async function installUpdate(filePath: string) {
  const { tauriCommands } = await import("../../services/tauriBridge");
  await tauriCommands.installUpdate(filePath);
}
