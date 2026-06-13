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

  const checkForUpdates = async () => {
    setChecking(true);
    try {
      // Get current version from tauri config
      const currentVersion = await getCurrentVersion();

      // Fetch latest release from GitHub
      const response = await fetch(
        "https://api.github.com/repos/Neontoshi/Kyma/releases/latest",
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const release: GitHubRelease = await response.json();
      const latestVersion = release.tag_name.replace(/^v/, "");

      // Compare versions
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
    } finally {
      setChecking(false);
    }
  };

  // Auto-check on app start (after 5 seconds)
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
    checkForUpdates,
  };
};

// Helper: Get current version from the backend
async function getCurrentVersion(): Promise<string> {
  try {
    // Try to get version from tauri commands
    const { tauriCommands } = await import("../../services/tauriBridge");
    const version = await tauriCommands.getAppVersion();
    return version || "1.0.0";
  } catch {
    // Fallback - you might want to store this in a constant
    return "1.0.0";
  }
}

// Helper: Compare semantic versions
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
