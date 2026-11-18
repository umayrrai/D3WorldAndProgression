import {
  cellKey,
  ENTRY,
  type GameEvent,
  type GameState,
  missingItems,
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
      if (event.requires) {
        return `you need a ${
          label(event.requires)
        } to gather from ${event.terrain}`;
      }
      return event.terrain === "barren"
        ? "nothing left to gather here"
        : `nothing to gather from ${event.terrain}`;
    case "crafted":
      return `made a ${label(event.made)}`;
    case "ended":
      return "The Monolith marks your way out.";
    case "craftFailed":
      if (event.reason === "unknown") {
        return `there is no recipe called ${event.recipe}`;
      }
      if (event.reason === "owned") {
        return `you already have a ${label(event.recipe)}`;
      }
      return `cannot make a ${label(event.recipe)}: need ${
        listItems(event.missing)
      } more`;
  }
}

// The readout, as ordinary page elements that CSS can style and that assistive
// tools can read. The readout follows events, and recipe readiness updates
// after the controller has drained input and playback.
export class Hud {
  private readonly seed: number;
  private readonly recipeButtons = new Map<string, HTMLButtonElement>();
  // Changed cells, built only from events that have played. The core may already
  // be ahead of what the player has seen, so the HUD never asks it.
  private readonly changed: Record<string, Terrain>;

  constructor(state: GameState) {
    this.seed = state.seed;
    this.changed = { ...state.changed };
    this.showPosition(state.player.x, state.player.y);
    this.showInventory(state.inventory);
  }

  show(event: GameEvent) {
    const message = describe(event);
    element("live").textContent = message;
    if (event.type === "ended") {
      const banner = element("win-banner");
      banner.textContent = message;
      banner.hidden = false;
    }
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

  bindRecipes(craft: (id: string) => void) {
    const list = element("recipes");
    for (const id of Object.keys(RECIPES)) {
      const row = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      this.recipeButtons.set(id, button);
      button.addEventListener("click", (event) => {
        craft(id);
        if (event.detail > 0) button.blur();
      });
      row.append(button);
      list.append(row);
    }
  }

  updateRecipes(inventory: Readonly<GameState["inventory"]>) {
    for (const [id, button] of this.recipeButtons) {
      const recipe = RECIPES[id];
      const name = label(id);
      const missing = listItems(missingItems(recipe, inventory));
      let status = missing ? `Missing ${missing}` : "Ready";
      if (recipe.once && (inventory[recipe.makes] ?? 0) > 0) {
        status = "Already owned";
      }
      const text = `${name.charAt(0).toUpperCase()}${name.slice(1)} - ${
        listItems(recipe.needs)
      } - ${status}`;
      if (button.textContent !== text) button.textContent = text;
    }
  }

  private showPosition(x: number, y: number) {
    element("position").textContent = `${x}, ${y}`;
    element("terrain").textContent = terrainOf(this.seed, this.changed, {
      x,
      y,
    });
  }
}
