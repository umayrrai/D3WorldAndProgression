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

Deno.test("gathering from trees adds what the table says and reports it", () => {
  const state = stateOn(SEED, "trees");
  const at = { ...state.player };
  const yielded = YIELDS.trees!;

  const events = apply(state, { type: "gather" });

  assertEquals(state.inventory, { [yielded.item]: yielded.amount });
  assertEquals(events, [{
    type: "gathered",
    at,
    terrain: "trees",
    item: yielded.item,
    amount: yielded.amount,
    now: "barren",
  }]);
});

Deno.test("every terrain that yields something gives its row", () => {
  for (const terrain of ["bones", "trees", "river"] as const) {
    const state = stateOn(SEED, terrain);
    const yielded = YIELDS[terrain]!;

    apply(state, { type: "gather" });

    assertEquals(state.inventory[yielded.item], yielded.amount, terrain);
  }
});

Deno.test("gathering twice from one cell gives nothing the second time", () => {
  const state = stateOn(SEED, "trees");
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
  const state = stateOn(SEED, "trees");
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
  assertEquals(isPassable(terrainNow(state, start)), true);
});
