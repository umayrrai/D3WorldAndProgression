import { assertEquals } from "@std/assert";
import {
  apply,
  cellKey,
  type Direction,
  type GameEvent,
  isPassable,
  terrainNow,
  YIELDS,
} from "./mod.ts";
import { stateOn } from "./test_helpers.ts";

const SEED = 121;

Deno.test("gathering wood unlocks after crafting a six-bone axe", () => {
  const state = stateOn(SEED, "trees");
  const at = { ...state.player };
  const yielded = YIELDS.trees!;
  assertEquals(isPassable("trees", state.inventory), true);
  assertEquals(apply(state, { type: "gather" }), [{
    type: "gatherFailed",
    at,
    terrain: "trees",
    requires: "bone_axe",
  }]);
  assertEquals(state.inventory, {});
  assertEquals(state.changed, {});

  state.inventory.bone = 5;
  assertEquals(apply(state, { type: "craft", recipe: "bone_axe" }), [{
    type: "craftFailed",
    recipe: "bone_axe",
    reason: "missing",
    missing: { bone: 1 },
  }]);
  state.inventory.bone++;
  apply(state, { type: "craft", recipe: "bone_axe" });

  const events = apply(state, { type: "gather" });

  const inventory = { bone_axe: 1, [yielded.item]: yielded.amount };
  assertEquals(state.inventory, inventory);
  assertEquals(events, [{
    type: "gathered",
    at,
    terrain: "trees",
    item: yielded.item,
    amount: yielded.amount,
    inventory,
    now: "barren",
  }]);
});

Deno.test("gathering wood uses up the tree tile", () => {
  const state = stateOn(SEED, "trees");
  state.inventory.bone_axe = 1;
  const at = { ...state.player };

  const first = apply(state, { type: "gather" });

  assertEquals(state.inventory, { bone_axe: 1, wood: 1 });
  assertEquals(terrainNow(state, at), "barren");
  assertEquals(first, [{
    type: "gathered",
    at,
    terrain: "trees",
    item: "wood",
    amount: 1,
    inventory: { bone_axe: 1, wood: 1 },
    now: "barren",
  }]);

  const afterFirst = JSON.parse(JSON.stringify(state));
  const second = apply(state, { type: "gather" });

  assertEquals(second, [{ type: "gatherFailed", at, terrain: "barren" }]);
  assertEquals(state, afterFirst);
});

Deno.test("a gather event keeps its inventory after another gather", () => {
  const state = stateOn(SEED, "trees");
  state.inventory.bone_axe = 1;
  const [first] = apply(state, { type: "gather" });

  if (first?.type !== "gathered") {
    throw new Error("Expected the first gather to succeed");
  }

  // Set up a different resource tile while keeping the same inventory.
  state.player = stateOn(SEED, "bones").player;
  apply(state, { type: "gather" });

  assertEquals(state.inventory, { bone_axe: 1, wood: 1, bone: 1 });
  assertEquals(first.inventory, { bone_axe: 1, wood: 1 });
});

Deno.test("every terrain that yields something gives its row", () => {
  for (const terrain of ["bones", "trees", "river"] as const) {
    const state = stateOn(SEED, terrain);
    const yielded = YIELDS[terrain]!;
    if (yielded.requires) state.inventory[yielded.requires] = 1;
    if (terrain === "river") state.inventory.boat = 1;

    apply(state, { type: "gather" });

    assertEquals(state.inventory[yielded.item], yielded.amount, terrain);
  }
});

Deno.test("gathering twice from one cell gives nothing the second time", () => {
  const state = stateOn(SEED, "bones");
  const at = { ...state.player };
  apply(state, { type: "gather" });
  const afterFirst = JSON.parse(JSON.stringify(state));

  const second = apply(state, { type: "gather" });

  assertEquals(second, [{ type: "gatherFailed", at, terrain: "barren" }]);
  assertEquals(state, afterFirst);
});

Deno.test("a failed gather changes nothing", () => {
  const state = stateOn(SEED, "spikes");
  const snapshot = JSON.parse(JSON.stringify(state));
  const at = { ...state.player };

  const events = apply(state, { type: "gather" });

  assertEquals(state, snapshot);
  assertEquals(events, [{ type: "gatherFailed", at, terrain: "spikes" }]);
});

Deno.test("saved state holds only the cells that changed", () => {
  const state = stateOn(SEED, "bones");
  apply(state, { type: "gather" });

  assertEquals(Object.keys(state.changed), [cellKey(state.player)]);
  assertEquals(JSON.parse(JSON.stringify(state)), state);
});

Deno.test("a gathered cell stays changed after walking away and back", () => {
  const state = stateOn(SEED, "bones");
  const start = { ...state.player };
  apply(state, { type: "gather" });
  const back: Record<Direction, Direction> = {
    north: "south",
    south: "north",
    east: "west",
    west: "east",
  };

  let walked = false;
  for (const direction of Object.keys(back) as Direction[]) {
    const events: GameEvent[] = apply(state, { type: "move", direction });
    if (events[0].type !== "moved") continue;
    apply(state, { type: "move", direction: back[direction] });
    walked = true;
    break;
  }

  assertEquals(walked, true, "the player had a passable neighbour");
  assertEquals(state.player, start);
  assertEquals(terrainNow(state, start), "barren");
  assertEquals(isPassable(terrainNow(state, start), {}), true);
});
