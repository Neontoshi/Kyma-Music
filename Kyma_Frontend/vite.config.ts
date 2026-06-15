import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig(async () => ({
  plugins: [react()],
  base: "./",
  clearScreen: false,
  resolve: {
    alias: {
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
      input: {
        main: resolve(__dirname, "index.html"),
        remote: resolve(__dirname, "remote/index.html"),
      },
      output: {
        manualChunks: {
          butterchunk: ["butterchurn", "butterchurn-presets"],
        },
      },
    },
  },
}));
