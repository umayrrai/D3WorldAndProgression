import {
  cellKey,
  ENTRY,
  type GameEvent,
  type GameState,
  RECIPES,
  type Terrain,
  terrainOf,
} from "../core/mod.ts";

function element(id: string): HTMLElement {
  return document.getElementById(id)!;
}

// Item and recipe ids are written bone_axe; the page says "bone axe".
function label(id: string): string {
  return id.replaceAll("_", " ");
}

function listItems(items: Record<string, number>): string {
  return Object.entries(items)
    .map(([item, count]) => `${count} ${label(item)}`)
    .join(", ");
}

function describe(event: GameEvent): string {
  switch (event.type) {
    case "moved":
      return `moved to ${event.to.x}, ${event.to.y}`;
    case "blocked": {
      // ENTRY is fixed data, so reading it here never shows the future.
      const entry = ENTRY[event.terrain];
      const needs = typeof entry === "object"
        ? ` (you need a ${label(entry.item)})`
        : "";
      return `blocked by ${event.terrain} at ${event.toward.x}, ${event.toward.y}${needs}`;
    }
    case "gathered":
      return `gathered ${event.amount} ${event.item} from ${event.terrain}`;
    case "gatherFailed":
      return event.terrain === "barren"
        ? "nothing left to gather here"
        : `nothing to gather from ${event.terrain}`;
    case "crafted":
      return `made a ${label(event.made)}`;
    case "craftFailed":
      return event.reason === "unknown"
        ? `there is no recipe called ${event.recipe}`
        : `cannot make a ${label(event.recipe)}: need ${
          listItems(event.missing)
        } more`;
  }
}

// The readout, as ordinary page elements that CSS can style and that assistive
// tools can read. It changes only as events play.
export class Hud {
  private readonly seed: number;
  // Changed cells, built only from events that have played. The core may already
  // be ahead of what the player has seen, so the HUD never asks it.
  private readonly changed: Record<string, Terrain>;

  constructor(state: GameState) {
    this.seed = state.seed;
    this.changed = { ...state.changed };
    this.showPosition(state.player.x, state.player.y);
    this.showInventory(state.inventory);
    this.showRecipes();
  }

  show(event: GameEvent) {
    element("live").textContent = describe(event);
    if (event.type === "moved") this.showPosition(event.to.x, event.to.y);
    if (event.type === "gathered") {
      this.changed[cellKey(event.at)] = event.now;
      this.showPosition(event.at.x, event.at.y);

      this.showInventory(event.inventory);
    }
    // Crafting changes the inventory too, and the event carries the new one.
    if (event.type === "crafted") this.showInventory(event.inventory);
  }

  private showInventory(inventory: Record<string, number>) {
    const rows = Object.entries(inventory).map(([item, count]) => {
      const row = document.createElement("li");
      row.textContent = `${label(item)}: ${count}`;
      return row;
    });
    element("inventory").replaceChildren(...rows);
  }

  // The recipe table never changes during play, so reading it here is not
  // reading the future. The number is the key that crafts it.
  private showRecipes() {
    const rows = Object.entries(RECIPES).map(([id, recipe], index) => {
      const row = document.createElement("li");
      const tools = recipe.tools
        ? ` (with ${Object.keys(recipe.tools).map(label).join(", ")})`
        : "";
      row.textContent = `${index + 1}: ${label(id)} = ${
        listItems(recipe.needs)
      }${tools}`;
      return row;
    });
    element("recipes").replaceChildren(...rows);
  }

  private showPosition(x: number, y: number) {
    element("position").textContent = `${x}, ${y}`;
    element("terrain").textContent = terrainOf(this.seed, this.changed, {
      x,
      y,
    });
  }
}
