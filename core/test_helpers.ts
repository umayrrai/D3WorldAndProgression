import { newGame, type Terrain, terrainAt } from "./mod.ts";
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
