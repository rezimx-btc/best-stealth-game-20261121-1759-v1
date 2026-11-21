// input.js — keyboard and mouse input state for SHADOW PROTOCOL.

export class Input {
  constructor() {
    this.up = false;
    this.down = false;
    this.left = false;
    this.right = false;
    this.sneak = false;
    this.pressed = new Set(); // keys pressed since last consume
    this.mouse = { x: 0, y: 0, clicked: false };
    this._onKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      this.pressed.add(e.key.toLowerCase());
      this._update(e.key.toLowerCase(), true);
    };
    this._onKeyUp = (e) => this._update(e.key.toLowerCase(), false);
    this._onMouse = (e) => {
      const rect = e.target.getBoundingClientRect ? e.target.getBoundingClientRect() : null;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.clicked = true;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousedown', this._onMouse);
  }

  _update(key, down) {
    if (key === 'w' || key === 'arrowup') this.up = down;
    if (key === 's' || key === 'arrowdown') this.down = down;
    if (key === 'a' || key === 'arrowleft') this.left = down;
    if (key === 'd' || key === 'arrowright') this.right = down;
    if (key === 'shift') this.sneak = down;
  }

  // True once per physical press; call every frame to clear stale presses.
  wasPressed(key) {
    const k = key.toLowerCase();
    if (this.pressed.has(k)) {
      this.pressed.delete(k);
      return true;
    }
    return false;
  }

  consumeClick() {
    const c = this.mouse.clicked;
    this.mouse.clicked = false;
    return c;
  }

  endFrame() {
    this.pressed.clear();
  }
}

// Key labels shown on the title screen, kept in one place.
export const CONTROL_LINES = [
  'WASD / Arrows — move',
  'Shift — sneak (slow, quiet, harder to spot)',
  'E — grab a data core',
  'R — restart level   P — pause   M — mute',
  'Enter — start',
];
