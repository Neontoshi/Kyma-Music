import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";

export default defineConfig(async () => ({
  plugins: [
    react(),
    {
      name: "copy-remote",
      writeBundle() {
        const src = resolve(__dirname, "remote", "index.html");
        const destDir = resolve(__dirname, "dist", "remote");
        if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
        copyFileSync(src, resolve(destDir, "index.html"));
      },
    },
  ],
  base: "./",
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
}));
