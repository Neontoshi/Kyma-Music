// src/lib/butterchurn-presets-shim.ts
// Normalizes butterchurn-presets across Vite dev (CJS interop via esbuild)
// and Vite build (Rollup UMD named-export path) in a "type: module" project.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mod: any = await import("butterchurn-presets").then((m) => {
  // Rollup build: named export 'butterchurnPresets' on the namespace
  if (m.butterchurnPresets?.getPresets) return m.butterchurnPresets;
  // Vite dev esbuild interop: default export is the function
  if ((m as any).default?.getPresets) return (m as any).default;
  // Fallback: namespace itself has getPresets
  if ((m as any).getPresets) return m;
  return m;
});

export const getPresets: () => Record<string, unknown> =
  mod.getPresets.bind(mod);
export default mod;
