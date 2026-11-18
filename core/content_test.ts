import { assert, assertEquals } from "@std/assert";
import { canReach } from "./can_reach.ts";
import { ENTRY, RECIPES, YIELDS } from "./mod.ts";

// Content tests look at the game's data, not its rules: they fail when someone
// adds a recipe or a barrier that can never work. The fixpoint itself, and what
// it does with broken tables, is tested in can_reach_test.ts.

Deno.test("every item a recipe needs can be obtained", () => {
  const { reached } = canReach(RECIPES, YIELDS, ENTRY);

  for (const [id, recipe] of Object.entries(RECIPES)) {
    const inputs = [
      ...Object.keys(recipe.needs),
      ...Object.keys(recipe.tools ?? {}),
    ];
    for (const item of inputs) {
      assert(reached.has(item), `${id} needs ${item}, which has no source`);
    }
  }
});

Deno.test("every barrier can be opened by something the player can get", () => {
  const { reached, entered } = canReach(RECIPES, YIELDS, ENTRY);

  for (const [terrain, rule] of Object.entries(ENTRY)) {
    if (rule === "never") continue;
    assert(entered.has(terrain), `${terrain} can never be entered`);
    if (rule !== "free") {
      assert(reached.has(rule.item), `${terrain} needs ${rule.item}`);
    }
  }
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
