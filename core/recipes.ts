// What the player can make. Like YIELDS, this data drives the common craft rule.
// Type Object: https://gameprogrammingpatterns.com/type-object.html

export type Recipe = {
  // Items used up by crafting, and how many of each.
  needs: Record<string, number>;
  // Items that must be held but are kept, like an axe. Optional.
  tools?: Record<string, number>;
  // The one item this makes.
  makes: string;
};

export const MONOLITH_RECIPE_ID = "monolith";

// The order of these rows is the order the page lists them and the number keys
// (1, 2, 3, ...) choose them. Ids are plain strings: items are not a union.
export const RECIPES: Record<string, Recipe> = {
  bone_axe: { needs: { bone: 6 }, makes: "bone_axe" },
  boat: { needs: { wood: 4, bone: 2 }, makes: "boat" },
  torch: {
    needs: { wood: 1, tar: 2 },
    makes: "torch",
  },
  [MONOLITH_RECIPE_ID]: {
    needs: { tar: 4, torch: 3, bone: 4 },
    makes: "monolith",
  },
};
