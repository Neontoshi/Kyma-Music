import { useEffect, useState } from "react";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export const useUpdater = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateVersion, setUpdateVersion] = useState("");
  const [checking, setChecking] = useState(false);

  const checkForUpdates = async () => {
    setChecking(true);
    try {
      const update = await check();
      if (update) {
        setUpdateAvailable(true);
        setUpdateVersion(update.version);

        // Ask user to update
        const confirmed = confirm(
          `Update ${update.version} is available!\n\nDownload and install now?`,
        );

        if (confirmed) {
          await update.downloadAndInstall();
          await relaunch();
        }
      }
    } catch (error) {
      console.error("Update check failed:", error);
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

  return { updateAvailable, updateVersion, checking, checkForUpdates };
};
