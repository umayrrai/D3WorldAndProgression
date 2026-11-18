import { assertEquals } from "@std/assert";
import { canReach } from "./can_reach.ts";
import { ENTRY, RECIPES, YIELDS } from "./mod.ts";

// Worked by hand, with the real table. Bare hands enter bones and trees, which
// give bone and wood. Pass 1: the boat and the bone axe are ready, so both are
// made, and the boat opens the river, which gives tar. Still pass 1, as the
// procedure adds as it goes: the torch needs wood, tar and the axe, so it is made.
// Pass 2: nothing new. Everything is reachable, and nothing is left over.
Deno.test("the real table reaches everything, including the tar behind the river", () => {
  const reach = canReach(RECIPES, YIELDS, ENTRY);

  assertEquals(reach.unreachable, []);
  assertEquals(
    [...reach.reached].sort(),
    ["bone", "bone_axe", "boat", "tar", "torch", "wood"].sort(),
  );
  assertEquals(reach.entered.has("river"), true);
  assertEquals(reach.entered.has("spikes"), false);
});

Deno.test("a recipe that needs its own output is reported as unreachable", () => {
  // Like the sunstone: it needs itself, so it can never be the first one made.
  const table = {
    ...RECIPES,
    sunstone: { needs: { sunstone: 1, wood: 1 }, makes: "sunstone" },
  };

  const reach = canReach(table, YIELDS, ENTRY);

  assertEquals(reach.unreachable, ["sunstone"]);
  assertEquals(reach.reached.has("sunstone"), false);
});

Deno.test("an output reachable another way does not make its recipe reachable", () => {
  // Wood can be gathered, but this recipe also makes wood and needs a moonstone.
  const table = {
    ...RECIPES,
    chant: { needs: { moonstone: 1 }, makes: "wood" },
  };

  const reach = canReach(table, YIELDS, ENTRY);

  assertEquals(reach.reached.has("wood"), true);
  assertEquals(reach.unreachable, ["chant"]);
});

Deno.test("without a recipe for the boat, the tar behind the river is unreachable", () => {
  const { boat: _boat, ...withoutBoat } = RECIPES;

  const reach = canReach(withoutBoat, YIELDS, ENTRY);

  assertEquals(reach.reached.has("tar"), false);
  assertEquals(reach.entered.has("river"), false);
  assertEquals(reach.unreachable, ["torch"]);
});

Deno.test("a barrier opened only by what lies behind it stays shut", () => {
  // The river now needs tar, and tar comes only from the river.
  const entry = { ...ENTRY, river: { item: "tar" } };

  const reach = canReach(RECIPES, YIELDS, entry);

  assertEquals(reach.entered.has("river"), false);
  assertEquals(reach.reached.has("tar"), false);
  assertEquals(reach.unreachable, ["torch"]);
});
