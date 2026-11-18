import { isPassable, newGame, type Terrain, terrainAt } from "./mod.ts";
import type { GameState } from "./mod.ts";

// A new game with the player standing on a cell whose seed terrain is `terrain`.
export function stateOn(seed: number, terrain: Terrain): GameState {
  for (let y = -100; y <= 100; y++) {
    for (let x = -100; x <= 100; x++) {
      if (terrainAt(seed, x, y) === terrain) {
        const state = newGame(seed);
        state.player = { x, y };
        return state;
      }
    }
  }
  throw new Error(`Found no ${terrain} cell for seed ${seed}.`);
}

// A new game with the player on a cell open to anyone, directly west of a cell
// whose seed terrain is `terrain`. It searches rows and columns, not only one row,
// because a barrier may be nowhere along a single row.
export function besideTerrain(seed: number, terrain: Terrain): GameState {
  for (let y = -100; y <= 100; y++) {
    for (let x = -100; x <= 100; x++) {
      if (
        isPassable(terrainAt(seed, x, y), {}) &&
        terrainAt(seed, x + 1, y) === terrain
      ) {
        const state = newGame(seed);
        state.player = { x, y };
        return state;
      }
    }
  }
  throw new Error(`Found no cell beside ${terrain} for seed ${seed}.`);
}
