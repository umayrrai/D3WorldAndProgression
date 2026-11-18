// What can the player ever get? A fixpoint: repeat until a pass changes nothing.
// It takes the tables as parameters, so a test can feed it a broken table, and it
// names no item or terrain of its own. Amounts are ignored: this asks what is
// possible, not how long it takes.
// It checks the tables, not any one seed's map: it assumes every terrain in the
// table appears in the world within reach.

import type { Recipe } from "./recipes.ts";
import type { Entry, Yield } from "./terrain.ts";

export type Reach = {
  // Every item the player can ever hold.
  reached: Set<string>;
  // The ids of the recipes the player can ever complete.
  made: Set<string>;
  // The terrains the player can ever stand on.
  entered: Set<string>;
  // The recipes that can never be completed.
  unreachable: string[];
};

export function canReach(
  recipes: Record<string, Recipe>,
  yields: Record<string, Yield | null>,
  entry: Record<string, Entry>,
): Reach {
  // reached and made are kept apart: an output can be reachable another way, such
  // as by gathering, while its own recipe can never be made.
  const reached = new Set<string>();
  const made = new Set<string>();
  const entered = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;

    // Entry and gathering can unlock separately, as with walking through trees
    // before crafting the axe to gather wood.
    for (const [terrain, rule] of Object.entries(entry)) {
      if (entered.has(terrain)) continue;
      const open = rule === "free" ||
        (rule !== "never" && reached.has(rule.item));
      if (!open) continue;
      entered.add(terrain);
      changed = true;
    }

    for (const [terrain, yielded] of Object.entries(yields)) {
      if (!yielded || reached.has(yielded.item) || !entered.has(terrain)) {
        continue;
      }
      if (yielded.requires && !reached.has(yielded.requires)) continue;
      reached.add(yielded.item);
      changed = true;
    }

    for (const [id, recipe] of Object.entries(recipes)) {
      if (made.has(id)) continue;
      const inputs = [
        ...Object.keys(recipe.needs),
        ...Object.keys(recipe.tools ?? {}),
      ];
      if (inputs.every((item) => reached.has(item))) {
        made.add(id);
        reached.add(recipe.makes);
        changed = true;
      }
    }
  }
  const unreachable = Object.keys(recipes).filter((id) => !made.has(id));
  return { reached, made, entered, unreachable };
}
