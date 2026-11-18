import { apply, type Command, type Direction, RECIPES } from "../core/mod.ts";
import type { GameState } from "../core/mod.ts";
import type { Presenter } from "./presenter.ts";

const ARROWS: Record<string, Direction> = {
  ArrowUp: "north",
  ArrowDown: "south",
  ArrowLeft: "west",
  ArrowRight: "east",
};

// Input in, core in the middle, presenter out. None of those three knows the others,
// which makes this a Mediator: https://refactoring.guru/design-patterns/mediator
// There is no frame loop here: a command runs on a key press or when playback ends.
export class Controller {
  readonly recorded: Command[] = [];
  private readonly state: GameState;
  private readonly presenter: Presenter;
  // A tap made during a walk, kept until the presenter is free.
  private pressed: Command | null = null;
  private held: Direction[] = [];
  constructor(state: GameState, presenter: Presenter) {
    this.state = state;
    this.presenter = presenter;
    presenter.onIdle = () => this.next();
    addEventListener("keydown", (event) => this.keyDown(event));
    addEventListener("keyup", (event) => this.keyUp(event));
    addEventListener("blur", () => this.held = []);
  }

  submit(command: Command) {
    this.pressed = command;
    this.next();
  }

  private keyDown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    // G gathers from the cell the player stands on. A letter, not Space or Enter,
    // which a focused button keeps for itself.
    if (event.key === "g" || event.key === "G") {
      if (event.repeat) return;
      this.submit({ type: "gather" });
      return;
    }
    // 1, 2, 3, ... craft the recipes in the order the page lists them.
    const recipe = /^[1-9]$/.test(event.key)
      ? Object.keys(RECIPES)[Number(event.key) - 1]
      : undefined;
    if (recipe) {
      if (event.repeat) return;
      this.submit({ type: "craft", recipe });
      return;
    }
    const direction = ARROWS[event.key];
    if (!direction) return;
    // Otherwise arrow keys would also scroll the page.
    event.preventDefault();
    if (event.repeat) return;
    this.held.push(direction);
    this.submit({ type: "move", direction });
  }

  private keyUp(event: KeyboardEvent) {
    this.held = this.held.filter((direction) =>
      direction !== ARROWS[event.key]
    );
  }

  private next() {
    // While the presenter is busy, input waits and the core hears nothing. The
    // busy state lives here in game/: the core never learns about animation.
    if (this.presenter.busy) return;

    const held = this.held.at(-1);
    const command: Command | null = this.pressed ??
      (held ? { type: "move", direction: held } : null);
    this.pressed = null;
    if (!command) return;

    // Playing nothing would report idle at once, and a held key would land back
    // here until the stack overflowed. No events means there is nothing to wait for.
    this.recorded.push(command);
    const events = apply(this.state, command);
    if (events.length > 0) this.presenter.play(events);
  }
}
