// The rules of the game. There is no clock here: a command updates the state at
// once, and the events it returns are a record of what happened. Whoever called
// apply() decides how, or whether, to show them over time.

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
  | { type: "gather" };

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
    // What the cell became, so the client can redraw it without asking the core.
    now: Terrain;
  }
  | { type: "gatherFailed"; at: Cell; terrain: Terrain };

const STEPS: Record<Direction, Cell> = {
  north: { x: 0, y: -1 },
  south: { x: 0, y: 1 },
  east: { x: 1, y: 0 },
  west: { x: -1, y: 0 },
};

// Singleton, avoided on purpose: tests make as many games as they need. https://gameprogrammingpatterns.com/singleton.html
export function newGame(seed: number): GameState {
  return { seed, player: { x: 0, y: 0 }, inventory: {}, changed: {} };
}

// The single way in. It updates the state it is given and returns the events.
export function apply(state: GameState, command: Command): GameEvent[] {
  switch (command.type) {
    case "move":
      return move(state, command.direction);
    case "gather":
      return gather(state);
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
  const terrain = terrainAt(state.seed, to.x, to.y);
  if (!isPassable(terrain)) {
    return [{ type: "blocked", at: from, toward: to, terrain }];
  }
  state.player.x = to.x;
  state.player.y = to.y;
  return [{ type: "moved", from, to }];
}

// Gather from the cell the player stands on. A cell that yields nothing, or one
// already gathered, fails and changes nothing.
function gather(state: GameState): GameEvent[] {
  const at = { ...state.player };
  const terrain = terrainNow(state, at);
  const yielded = YIELDS[terrain];
  if (!yielded) return [{ type: "gatherFailed", at, terrain }];
  state.inventory[yielded.item] = (state.inventory[yielded.item] ?? 0) +
    yielded.amount;
  state.changed[cellKey(at)] = DEPLETED;
  return [{
    type: "gathered",
    at,
    terrain,
    item: yielded.item,
    amount: yielded.amount,
    now: DEPLETED,
  }];
}
