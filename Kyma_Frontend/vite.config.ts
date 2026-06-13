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
  resolve: {
    alias: {
      // Direct path to the UMD bundle for consistent resolution
      "butterchurn-presets": resolve(
        __dirname,
        "node_modules/butterchurn-presets/lib/butterchurnPresets.min.js",
      ),
    },
  },
  optimizeDeps: {
    include: ["butterchurn", "butterchurn-presets"],
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
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
    commonjsOptions: {
      include: [/butterchurn/, /node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          butterchunk: ["butterchurn", "butterchurn-presets"],
        },
      },
    },
  },
}));
