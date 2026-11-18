import { assertEquals } from "@std/assert";
import {
  apply,
  type Command,
  type Direction,
  type GameEvent,
  newGame,
} from "./mod.ts";

function commands(): Command[] {
  const walk: Direction[] = ["east", "east", "south", "south", "west", "north"];
  // A long enough walk to bump into terrain as well as cross it.
  return Array.from({ length: 300 }, (_, i) => ({
    type: "move",
    direction: walk[(i * i + i) % walk.length],
  }));
}

function play(seed: number) {
  const state = newGame(seed);
  const events: GameEvent[] = [];
  for (const command of commands()) {
    events.push(...apply(state, command));
  }
  return { state, events };
}

Deno.test("same seed and commands give identical state and events", () => {
  const first = play(121);
  // Let the clock tick, so that a stored timestamp cannot match by luck.
  const start = Date.now();
  while (Date.now() === start);
  const second = play(121);

  assertEquals(first, second);
});

Deno.test("state and events survive a trip through JSON", () => {
  const played = play(121);

  assertEquals(JSON.parse(JSON.stringify(played)), played);
});

// A longer game: walk, gather and craft, so that inventory and recipes are
// covered by the same promise as movement.
function playWithCrafting(seed: number) {
  const state = newGame(seed);
  const events: GameEvent[] = [];
  const directions: Direction[] = ["east", "south", "west", "north"];
  const crafts = ["boat", "bone_axe", "torch", "nonsense"];
  for (let i = 0; i < 400; i++) {
    const command: Command = i % 7 === 3
      ? { type: "craft", recipe: crafts[i % crafts.length] }
      : i % 3 === 0
      ? { type: "gather" }
      : { type: "move", direction: directions[(i * i + i) % 4] };
    events.push(...apply(state, command));
  }
  return { state, events };
}

Deno.test("gathering and crafting are deterministic too", () => {
  const first = playWithCrafting(121);
  const second = playWithCrafting(121);

  assertEquals(first, second);
  assertEquals(first.events.some((event) => event.type === "gathered"), true);
  assertEquals(JSON.parse(JSON.stringify(first)), first);
});
