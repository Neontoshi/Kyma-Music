const GRADIENTS = [
  "linear-gradient(135deg, #1d3a12 0%, #070a05 100%)",
  "linear-gradient(135deg, #122b45 0%, #05080b 100%)",
  "linear-gradient(135deg, #3d1414 0%, #0b0505 100%)",
  "linear-gradient(135deg, #1f1f1f 0%, #060606 100%)",
  "linear-gradient(135deg, #2a4a1c 0%, #0a0f06 100%)",
  "linear-gradient(135deg, #1a3450 0%, #06090d 100%)",
  "linear-gradient(135deg, #4a1a1a 0%, #0d0606 100%)",
  "linear-gradient(135deg, #333333 0%, #0a0a0a 100%)",
  "linear-gradient(135deg, #26402a 0%, #070b08 100%)",
  "linear-gradient(135deg, #2a3540 0%, #07090b 100%)",
];

const ALBUM_GRADIENTS = [
  "linear-gradient(135deg, #14280d 0%, #050704 100%)",
  "linear-gradient(135deg, #0d1d2e 0%, #040609 100%)",
  "linear-gradient(135deg, #2b0e0e 0%, #080404 100%)",
  "linear-gradient(135deg, #161616 0%, #050505 100%)",
  "linear-gradient(135deg, #1c3113 0%, #070a05 100%)",
];

const hashSeed = (seed: string): number =>
  seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);

/** Deterministic gradient for a seed; random when no seed is provided. */
export const randomGradient = (seed?: string): string => {
  const index = seed
    ? hashSeed(seed) % GRADIENTS.length
    : Math.floor(Math.random() * GRADIENTS.length);
  return GRADIENTS[index];
};

/** Darker gradient used for album artwork placeholders. */
export const albumGradient = (seed: string): string =>
  ALBUM_GRADIENTS[hashSeed(seed) % ALBUM_GRADIENTS.length];
