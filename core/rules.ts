// The rules of the game. There is no clock here: a command updates the state at
// once, and the events it returns are a record of what happened. Whoever called
// apply() decides how, or whether, to show them over time.

import { MONOLITH_RECIPE_ID, type Recipe, RECIPES } from "./recipes.ts";
import {
  DEPLETED,
  isPassable,
  type Terrain,
  terrainAt,
  YIELDS,
} from "./terrain.ts";

export type Cell = { x: number; y: number };

export type Direction = "north" | "south" | "east" | "west";

// Plain data that survives JSON. Terrain is absent because the seed can recompute
// it: besides the seed, only what the player has caused belongs here.
export type GameState = {
  seed: number;
  player: Cell;
  // Item name -> how many the player holds. An item never held is absent.
  inventory: Record<string, number>;
  // Only the cells the player has changed, keyed by cellKey, with what each is now.
  changed: Record<string, Terrain>;
  ended: boolean;
};

export function cellKey({ x, y }: Cell): string {
  return `${x},${y}`;
}

export function terrainOf(
  seed: number,
  changed: Record<string, Terrain>,
  cell: Cell,
): Terrain {
  return changed[cellKey(cell)] ?? terrainAt(seed, cell.x, cell.y);
}

export function terrainNow(state: GameState, cell: Cell): Terrain {
  return terrainOf(state.seed, state.changed, cell);
}

// Command: https://gameprogrammingpatterns.com/command.html
export type Command =
  | { type: "move"; direction: Direction }
  | { type: "gather" }
  | { type: "craft"; recipe: string };

// Domain Event: https://martinfowler.com/eaaDev/DomainEvent.html
export type GameEvent =
  | { type: "moved"; from: Cell; to: Cell }
  | { type: "blocked"; at: Cell; toward: Cell; terrain: Terrain }
  | {
    type: "gathered";
    at: Cell;
    terrain: Terrain;
    item: string;
    amount: number;
    inventory: Record<string, number>;
    // What the cell became, so the client can redraw it without asking the core.
    now: Terrain;
  }
  | { type: "gatherFailed"; at: Cell; terrain: Terrain; requires?: string }
  | {
    type: "crafted";
    recipe: string;
    made: string;
    // A copy, like the one in "gathered": the state's inventory keeps changing.
    inventory: Record<string, number>;
  }
  | {
    type: "craftFailed";
    recipe: string;
    // Why: no such recipe, or items short. missing says how many of each.
    reason: "unknown" | "missing" | "owned";
    missing: Record<string, number>;
  }
  | { type: "ended" };

const STEPS: Record<Direction, Cell> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
};

// Singleton, avoided on purpose: tests make as many games as they need. https://gameprogrammingpatterns.com/singleton.html
export function newGame(seed: number): GameState {
  return {
    seed,
    player: { x: 0, y: 0 },
    inventory: {},
    changed: {},
    ended: false,
  };
}

// The single way in. It updates the state it is given and returns the events.
export function apply(state: GameState, command: Command): GameEvent[] {
  if (state.ended) return [];
  switch (command.type) {
    case "move":
      return move(state, command.direction);
    case "gather":
      return gather(state);
    case "craft":
      return craft(state, command.recipe);
  }
}

function move(state: GameState, direction: Direction): GameEvent[] {
  const step = STEPS[direction];
  // Events are retained and played back later, while state keeps changing. So an
  // event gets cells of its own, never an object that state still holds.
  // Aliasing Bug: https://martinfowler.com/bliki/AliasingBug.html
  // Cells in events act as a Value Object: https://martinfowler.com/bliki/ValueObject.html
  const from = { ...state.player };
  const to = { x: from.x + step.x, y: from.y + step.y };
  const terrain = terrainNow(state, to);
  if (!isPassable(terrain, state.inventory)) {
    return [{ type: "blocked", at: from, toward: to, terrain }];
  }
  state.player.x = to.x;
  state.player.y = to.y;
  return [{ type: "moved", from, to }];
}

// Gather from the cell the player stands on if entry and gathering are allowed.
function gather(state: GameState): GameEvent[] {
  const at = { ...state.player };
  const terrain = terrainNow(state, at);
  const yielded = YIELDS[terrain];
  if (!yielded || !isPassable(terrain, state.inventory)) {
    return [{ type: "gatherFailed", at, terrain }];
  }
  const requiredTool = yielded.requires;
  if (requiredTool && (state.inventory[requiredTool] ?? 0) <= 0) {
    return [{ type: "gatherFailed", at, terrain, requires: requiredTool }];
  }
  state.inventory[yielded.item] = (state.inventory[yielded.item] ?? 0) +
    yielded.amount;
  state.changed[cellKey(at)] = DEPLETED;
  return [{
    type: "gathered",
    at,
    terrain,
    item: yielded.item,
    amount: yielded.amount,
    inventory: { ...state.inventory },
    now: DEPLETED,
  }];
}

export function missingItems(
  recipe: Recipe,
  inventory: Readonly<GameState["inventory"]>,
): Record<string, number> {
  const missing = new Map<string, number>();
  for (const wants of [recipe.needs, recipe.tools ?? {}]) {
    for (const [item, amount] of Object.entries(wants)) {
      const held = Object.hasOwn(inventory, item) ? inventory[item] : 0;
      const short = amount - held;
      if (short > (missing.get(item) ?? 0)) missing.set(item, short);
    }
  }
  return Object.fromEntries(missing);
}

// Make a recipe's item. Everything is checked before anything is changed, so a
// failed craft leaves the state exactly as it was.
function craft(state: GameState, id: string): GameEvent[] {
  const recipe = Object.hasOwn(RECIPES, id) ? RECIPES[id] : undefined;
  if (!recipe) {
    return [{
      type: "craftFailed",
      recipe: id,
      reason: "unknown",
      missing: {},
    }];
  }
  // Checked before the missing items: a player who has an axe should hear that,
  // not what an axe would cost.
  if (recipe.once && (state.inventory[recipe.makes] ?? 0) > 0) {
    return [{ type: "craftFailed", recipe: id, reason: "owned", missing: {} }];
  }

  const missing = missingItems(recipe, state.inventory);
  if (Object.keys(missing).length > 0) {
    return [{ type: "craftFailed", recipe: id, reason: "missing", missing }];
  }
  for (const [item, amount] of Object.entries(recipe.needs)) {
    const left = state.inventory[item] - amount;
    // An item that runs out is absent again, as if never held.
    if (left > 0) state.inventory[item] = left;
    else delete state.inventory[item];
  }
  state.inventory[recipe.makes] = (state.inventory[recipe.makes] ?? 0) + 1;
  const crafted: GameEvent = {
    type: "crafted",
    recipe: id,
    made: recipe.makes,
    inventory: { ...state.inventory },
  };
  if (id === MONOLITH_RECIPE_ID) {
    state.ended = true;
    return [crafted, { type: "ended" }];
  }
  return [crafted];
}
