// The world is a pure function of a seed and coordinates. Nothing here is stored,
// so the world can be effectively unbounded while saved state stays small.
// "barren" is never produced by terrainAt: it is what a cell becomes after the
// player has gathered from it, so it lives in the player's changes, not the seed.

export type Terrain = "bones" | "trees" | "river" | "spikes" | "barren";

// Type Object: what each terrain yields is a row of data, not an if statement.
// null means there is nothing to gather. Items are plain strings so that recipes
// can name any item without touching a union.
// https://gameprogrammingpatterns.com/type-object.html
export type Yield = { item: string; amount: number };

export const YIELDS: Record<Terrain, Yield | null> = {
  bones: { item: "bone", amount: 1 },
  trees: { item: "wood", amount: 1 },
  river: { item: "tar", amount: 1 },
  spikes: null,
  barren: null,
};

// What a gathered cell turns into.
export const DEPLETED: Terrain = "barren";

export function terrainAt(seed: number, x: number, y: number): Terrain {
  const raw = 0.65 * noise(seed, x, y, 9) + 0.35 * noise(seed + 1, x, y, 3);
  // Every game starts at the origin, so flatten the land there. Otherwise some
  // seeds would start inside a lake or walled into a pocket.
  const height = 0.5 + (raw - 0.5) * Math.min(1, Math.hypot(x, y) / 10);
  if (height < 0.3) return "river";
  if (height > 0.7) return "spikes";
  return noise(seed + 2, x, y, 6) < 0.45 ? "trees" : "bones";
}

// What a terrain asks of a player who wants to stand on it. Data, like YIELDS:
// "free" is open to anyone, "never" is a permanent wall, and { item } is a barrier
// that opens for a player holding that item. The opener is never used up.
export type Entry = "free" | "never" | { item: string };

export const ENTRY: Record<Terrain, Entry> = {
  bones: "free",
  trees: "free",
  river: { item: "boat" }, // The River also yields tar: the rarest material.
  spikes: "never",
  barren: "free",
};

// May a player holding `held` stand here? Pass {} for a player with nothing.
export function isPassable(
  terrain: Terrain,
  held: Record<string, number>,
): boolean {
  const entry = ENTRY[terrain];
  if (entry === "free") return true;
  if (entry === "never") return false;
  return (held[entry.item] ?? 0) > 0;
}

// Value noise: random numbers at coarse grid points, blended between them, so
// that terrain forms regions instead of static.
function noise(seed: number, x: number, y: number, scale: number): number {
  const left = Math.floor(x / scale);
  const top = Math.floor(y / scale);
  const blendX = smooth(x / scale - left);
  const blendY = smooth(y / scale - top);
  return mix(
    mix(gridValue(seed, left, top), gridValue(seed, left + 1, top), blendX),
    mix(
      gridValue(seed, left, top + 1),
      gridValue(seed, left + 1, top + 1),
      blendX,
    ),
    blendY,
  );
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// A hash, not a generator: the same inputs give the same number in [0, 1), with
// no memory of earlier calls.
function gridValue(seed: number, x: number, y: number): number {
  let hash = Math.imul(seed, 0x9e3779b1) ^ Math.imul(x, 0x85ebca6b) ^
    Math.imul(y, 0xc2b2ae35);
  hash = Math.imul(hash ^ (hash >>> 15), 0x2c1b3c6d);
  hash = Math.imul(hash ^ (hash >>> 12), 0x297a2d39);
  return ((hash ^ (hash >>> 15)) >>> 0) / 2 ** 32;
}
