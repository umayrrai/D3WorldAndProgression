import { assert, assertEquals } from "@std/assert";
import { RECIPES, YIELDS } from "./mod.ts";
import { obtainableItems } from "./test_helpers.ts";

// Content tests look at the game's data, not its rules: they fail when someone
// adds a recipe that can never be made.

Deno.test("every item a recipe needs can be obtained", () => {
  const obtainable = obtainableItems(RECIPES, YIELDS);

  for (const [id, recipe] of Object.entries(RECIPES)) {
    const inputs = [
      ...Object.keys(recipe.needs),
      ...Object.keys(recipe.tools ?? {}),
    ];
    for (const item of inputs) {
      assert(obtainable.has(item), `${id} needs ${item}, which has no source`);
    }
    assert(obtainable.has(recipe.makes), `${id} can never be made`);
  }
});

Deno.test("a recipe that needs its own output is reported as unobtainable", () => {
  // This guards the checker itself: without it, the test above could never fail.
  const circular = {
    loop: { needs: { loop_item: 1 }, makes: "loop_item" },
    needs_loop: { needs: { loop_item: 1 }, makes: "other" },
  };

  const obtainable = obtainableItems(circular, YIELDS);

  assertEquals(obtainable.has("loop_item"), false);
  assertEquals(obtainable.has("other"), false);
});

Deno.test("a recipe with an item nothing provides is reported", () => {
  const orphan = { odd: { needs: { moonstone: 1 }, makes: "ring" } };

  assertEquals(obtainableItems(orphan, YIELDS).has("ring"), false);
});

Deno.test("no recipe makes an item that terrain already gives", () => {
  // Two ways to get one item would make the table ambiguous to read.
  const gathered = new Set(
    Object.values(YIELDS).flatMap((yielded) => yielded ? [yielded.item] : []),
  );
  for (const [id, recipe] of Object.entries(RECIPES)) {
    assertEquals(gathered.has(recipe.makes), false, `${id} makes a raw item`);
  }
});
