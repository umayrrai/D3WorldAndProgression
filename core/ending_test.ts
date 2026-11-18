import { assertEquals } from "@std/assert";
import {
  apply,
  BEACON_RECIPE_ID,
  type Command,
  newGame,
  RECIPES,
} from "./mod.ts";

Deno.test("crafting the Beacon ends the game and freezes the state", () => {
  const state = newGame(121);
  const { needs, makes } = RECIPES[BEACON_RECIPE_ID];
  state.inventory = { ...needs };

  const events = apply(state, { type: "craft", recipe: BEACON_RECIPE_ID });
  const inventory = { [makes]: 1 };
  assertEquals(events, [
    { type: "crafted", recipe: BEACON_RECIPE_ID, made: makes, inventory },
    { type: "ended" },
  ]);
  assertEquals(state.inventory, inventory);
  assertEquals(state.ended, true);

  const finished = JSON.parse(JSON.stringify(state));
  const commands: Command[] = [
    { type: "move", direction: "east" },
    { type: "gather" },
    { type: "craft", recipe: BEACON_RECIPE_ID },
  ];
  for (const command of commands) {
    assertEquals(apply(state, command), []);
    assertEquals(state, finished);
  }
});

Deno.test("a failed Beacon craft leaves the game active", () => {
  const state = newGame(121);
  const before = JSON.parse(JSON.stringify(state));

  assertEquals(apply(state, { type: "craft", recipe: BEACON_RECIPE_ID }), [{
    type: "craftFailed",
    recipe: BEACON_RECIPE_ID,
    reason: "missing",
    missing: RECIPES[BEACON_RECIPE_ID].needs,
  }]);
  assertEquals(state.ended, false);
  assertEquals(state, before);
});
