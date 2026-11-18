import { assertEquals } from "@std/assert";
import { apply, isPassable, newGame, terrainNow } from "./mod.ts";
import { besideTerrain } from "./test_helpers.ts";

const SEED = 121;

Deno.test("who may stand where depends on what the player holds", () => {
  assertEquals(isPassable("river", {}), false);
  assertEquals(isPassable("river", { wood: 9 }), false);
  assertEquals(isPassable("river", { boat: 1 }), true);
  assertEquals(isPassable("spikes", { boat: 1 }), false);
  assertEquals(isPassable("bones", {}), true);
});

Deno.test("a river is shut before the boat is crafted and open after", () => {
  const state = besideTerrain(SEED, "river");
  const start = { ...state.player };
  const target = { x: start.x + 1, y: start.y };
  const snapshot = JSON.parse(JSON.stringify(state));

  const shut = apply(state, { type: "move", direction: "east" });

  assertEquals(state, snapshot);
  assertEquals(shut, [{
    type: "blocked",
    at: start,
    toward: target,
    terrain: "river",
  }]);

  state.inventory = { wood: 2, bone: 1 };
  apply(state, { type: "craft", recipe: "boat" });
  const open = apply(state, { type: "move", direction: "east" });

  assertEquals(open, [{ type: "moved", from: start, to: target }]);
  assertEquals(state.player, target);
});

Deno.test("the boat is not used up by crossing", () => {
  const state = besideTerrain(SEED, "river");
  state.inventory = { boat: 1 };

  apply(state, { type: "move", direction: "east" });

  assertEquals(state.inventory, { boat: 1 });
});

Deno.test("gathering in the river gives tar and leaves barren land", () => {
  const state = besideTerrain(SEED, "river");
  state.inventory = { boat: 1 };
  apply(state, { type: "move", direction: "east" });
  const here = { ...state.player };

  const events = apply(state, { type: "gather" });

  assertEquals(events[0].type, "gathered");
  assertEquals(state.inventory, { boat: 1, tar: 1 });
  assertEquals(terrainNow(state, here), "barren");
});

Deno.test("a gathered river cell is dry land, open even without the boat", () => {
  // This is what move reading the current terrain, not the seed's, makes true.
  const state = besideTerrain(SEED, "river");
  state.inventory = { boat: 1 };
  apply(state, { type: "move", direction: "east" });
  apply(state, { type: "gather" });
  apply(state, { type: "move", direction: "west" });
  delete state.inventory.boat;

  const events = apply(state, { type: "move", direction: "east" });

  assertEquals(events[0].type, "moved");
});

Deno.test("spikes stay shut even for a player holding a boat", () => {
  const state = besideTerrain(SEED, "spikes");
  state.inventory = { boat: 1, bone_axe: 1, torch: 1 };
  const snapshot = JSON.parse(JSON.stringify(state));

  const events = apply(state, { type: "move", direction: "east" });

  assertEquals(events[0].type, "blocked");
  assertEquals(state, snapshot);
});

Deno.test("a new game starts with the river shut", () => {
  assertEquals(newGame(SEED).inventory, {});
});
