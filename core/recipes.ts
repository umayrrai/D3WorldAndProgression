// What the player can make. Like YIELDS, this is data: a new recipe is a new row
// here, and the craft rule in rules.ts never changes for it.
// Type Object: https://gameprogrammingpatterns.com/type-object.html

export type Recipe = {
  // Items used up by crafting, and how many of each.
  needs: Record<string, number>;
  // Items that must be held but are kept, like an axe. Optional.
  tools?: Record<string, number>;
  // The one item this makes.
  makes: string;
};

// The order of these rows is the order the page lists them and the number keys
// (1, 2, 3, ...) choose them. Ids are plain strings: items are not a union.
export const RECIPES: Record<string, Recipe> = {
  boat: { needs: { wood: 2, bone: 1 }, makes: "boat" },
  bone_axe: { needs: { bone: 2, wood: 1 }, makes: "bone_axe" },
  torch: {
    needs: { wood: 1, tar: 1 },
    tools: { bone_axe: 1 },
    makes: "torch",
  },
};
