import { newGame, type Terrain, terrainAt } from "./mod.ts";
import type { GameState, Recipe, Yield } from "./mod.ts";

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

// Every item the player could ever hold: what terrain yields, plus whatever a
// recipe can make once all of its inputs are obtainable. It repeats until nothing
// new appears, so a recipe that needs its own output never becomes obtainable.
// Fixpoint: https://en.wikipedia.org/wiki/Fixed_point_(mathematics)
export function obtainableItems(
  recipes: Record<string, Recipe>,
  yields: Record<string, Yield | null>,
): Set<string> {
  const have = new Set<string>();
  for (const yielded of Object.values(yields)) {
    if (yielded) have.add(yielded.item);
  }
  let grew = true;
  while (grew) {
    grew = false;
    for (const recipe of Object.values(recipes)) {
      const inputs = [
        ...Object.keys(recipe.needs),
        ...Object.keys(recipe.tools ?? {}),
      ];
      if (!have.has(recipe.makes) && inputs.every((item) => have.has(item))) {
        have.add(recipe.makes);
        grew = true;
      }
    }
  }
  return have;
}
