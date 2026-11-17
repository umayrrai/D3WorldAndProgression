import {
  cellKey,
  type GameEvent,
  type GameState,
  type Terrain,
  terrainOf,
} from "../core/mod.ts";

function element(id: string): HTMLElement {
  return document.getElementById(id)!;
}

function describe(event: GameEvent): string {
  switch (event.type) {
    case "moved":
      return `moved to ${event.to.x}, ${event.to.y}`;
    case "blocked":
      return `blocked by ${event.terrain} at ${event.toward.x}, ${event.toward.y}`;
    case "gathered":
      return `gathered ${event.amount} ${event.item} from ${event.terrain}`;
    case "gatherFailed":
      return event.terrain === "barren"
        ? "nothing left to gather here"
        : `nothing to gather from ${event.terrain}`;
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
  }

  show(event: GameEvent) {
    element("live").textContent = describe(event);
    if (event.type === "moved") this.showPosition(event.to.x, event.to.y);
    if (event.type === "gathered") {
      this.changed[cellKey(event.at)] = event.now;
      this.showPosition(event.at.x, event.at.y);

      const rows = Object.entries(event.inventory).map(([item, count]) => {
        const row = document.createElement("li");
        row.textContent = `${item}: ${count}`;
        return row;
      });
      element("inventory").replaceChildren(...rows);
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
