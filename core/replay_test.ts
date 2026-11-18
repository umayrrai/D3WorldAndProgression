import { assertEquals } from "@std/assert";
import {
  apply,
  type Command,
  type GameEvent,
  MONOLITH_RECIPE_ID,
  newGame,
  RECIPES,
} from "./mod.ts";
import run from "./run.json" with { type: "json" };

const { seed } = run;
const commands = run.commands as Command[];

function replay() {
  const state = newGame(seed);
  const events = commands.map((command) => apply(state, command));
  return { state, events };
}

Deno.test("the recorded run ends with a Monolith and replays identically", () => {
  const first = replay();
  const monolith = RECIPES[MONOLITH_RECIPE_ID].makes;
  const ending: GameEvent[] = [
    {
      type: "crafted",
      recipe: MONOLITH_RECIPE_ID,
      made: monolith,
      inventory: first.state.inventory,
    },
    { type: "ended" },
  ];
  assertEquals(first.events.at(-1), ending);
  assertEquals(first.state.ended, true);
  assertEquals(first.state.inventory[monolith], 1);

  // Let the clock tick so that a stored timestamp cannot match by luck.
  const start = Date.now();
  while (Date.now() === start);
  const second = replay();

  assertEquals(second, first);
});
