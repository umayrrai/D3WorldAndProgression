import { assertEquals } from "@std/assert";
import { apply, type GameState, newGame, RECIPES } from "./mod.ts";

const SEED = 121;

function holding(inventory: Record<string, number>): GameState {
  const state = newGame(SEED);
  state.inventory = { ...inventory };
  return state;
}

Deno.test("crafting uses up the needs and adds what it makes", () => {
  const state = holding({ wood: 3, bone: 1 });

  const events = apply(state, { type: "craft", recipe: "boat" });

  assertEquals(state.inventory, { wood: 1, boat: 1 });
  assertEquals(events, [{
    type: "crafted",
    recipe: "boat",
    made: "boat",
    inventory: { wood: 1, boat: 1 },
  }]);
});

Deno.test("a craft that is short says what is missing and changes nothing", () => {
  const state = holding({ wood: 1, bone: 1 });
  const snapshot = JSON.parse(JSON.stringify(state));

  const events = apply(state, { type: "craft", recipe: "boat" });

  assertEquals(state, snapshot);
  assertEquals(events, [{
    type: "craftFailed",
    recipe: "boat",
    reason: "missing",
    missing: { wood: 1 },
  }]);
});

Deno.test("an unknown recipe fails and changes nothing", () => {
  const state = holding({ wood: 5 });
  const snapshot = JSON.parse(JSON.stringify(state));

  // "toString" is on every object: it must not count as a recipe.
  for (const recipe of ["nonsense", "toString"]) {
    const events = apply(state, { type: "craft", recipe });
    assertEquals(events, [{
      type: "craftFailed",
      recipe,
      reason: "unknown",
      missing: {},
    }]);
  }
  assertEquals(state, snapshot);
});

Deno.test("a tool must be held but is not used up", () => {
  const withoutAxe = holding({ wood: 1, tar: 1 });
  const snapshot = JSON.parse(JSON.stringify(withoutAxe));

  const refused = apply(withoutAxe, { type: "craft", recipe: "torch" });

  assertEquals(withoutAxe, snapshot);
  assertEquals(refused, [{
    type: "craftFailed",
    recipe: "torch",
    reason: "missing",
    missing: { bone_axe: 1 },
  }]);

  const withAxe = holding({ wood: 1, tar: 1, bone_axe: 1 });
  apply(withAxe, { type: "craft", recipe: "torch" });

  assertEquals(withAxe.inventory, { bone_axe: 1, torch: 1 });
});

Deno.test("an item used up entirely is absent, not zero", () => {
  const state = holding({ wood: 2, bone: 1 });

  apply(state, { type: "craft", recipe: "boat" });

  assertEquals("wood" in state.inventory, false);
  assertEquals("bone" in state.inventory, false);
});

Deno.test("a crafted event keeps its inventory after the state moves on", () => {
  const state = holding({ wood: 4, bone: 3 });
  const [first] = apply(state, { type: "craft", recipe: "boat" });

  apply(state, { type: "craft", recipe: "bone_axe" });

  if (first.type !== "crafted") throw new Error("Expected the boat to be made");
  assertEquals(first.inventory, { wood: 2, bone: 2, boat: 1 });
});

Deno.test("a new recipe row works with no new rule code", () => {
  RECIPES.test_charm = { needs: { bone: 1 }, makes: "charm" };
  try {
    const state = holding({ bone: 2 });

    const events = apply(state, { type: "craft", recipe: "test_charm" });

    assertEquals(state.inventory, { bone: 1, charm: 1 });
    assertEquals(events[0].type, "crafted");
  } finally {
    delete RECIPES.test_charm;
  }
});
