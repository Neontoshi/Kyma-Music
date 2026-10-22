const HUES = [280, 200, 340, 40, 160, 100, 10, 260, 320, 180];

const hashSeed = (seed: string): number =>
  seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);

/** Deterministic gradient for a seed; random when no seed is provided. */
export const randomGradient = (seed?: string): string => {
  const h = seed
    ? HUES[hashSeed(seed) % HUES.length]
    : HUES[Math.floor(Math.random() * HUES.length)];
  return `linear-gradient(135deg, hsl(${h}, 45%, 32%), hsl(${h + 30}, 38%, 18%))`;
};

/** Darker gradient used for album artwork placeholders. */
export const albumGradient = (seed: string): string => {
  const h = HUES[hashSeed(seed) % HUES.length];
  return `linear-gradient(135deg, hsl(${h}, 40%, 22%), hsl(${h + 30}, 35%, 10%))`;
};
