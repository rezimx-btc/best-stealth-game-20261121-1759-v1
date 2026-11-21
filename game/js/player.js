// player.js — Wren, the courier. Movement, sneaking, noise, core pickup.

import { TILE, inShadow } from './levels.js';

export const PLAYER_RADIUS = 11;

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.dir = 0;
    this.sneaking = false;
    this.moving = false;
    this.speed = 118;
    this.sneakSpeed = 58;
    this.noiseTimer = 0;
    this.stepTimer = 0;
    this.hidden = false;
    this.rings = []; // expanding noise rings {x, y, r, max, alpha}
    this.puffs = []; // footstep dust {x, y, life}
  }

  update(dt, input, level, events) {
    let mx = 0;
    let my = 0;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    this.sneaking = !!input.sneak;
    this.moving = mx !== 0 || my !== 0;
    if (this.moving) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      this.dir = Math.atan2(my, mx);
      const sp = this.sneaking ? this.sneakSpeed : this.speed;
      const nx = this.x + mx * sp * dt;
      const ny = this.y + my * sp * dt;
      if (!this.blocked(level, nx, this.y)) this.x = nx;
      if (!this.blocked(level, this.x, ny)) this.y = ny;

      // Footsteps: small ticks, dust puffs, and a noise ring when loud.
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = this.sneaking ? 0.55 : 0.34;
        this.puffs.push({ x: this.x, y: this.y, life: 0.5 });
        events.onStep(this.sneaking);
        if (!this.sneaking) {
          this.noiseTimer -= dt;
          this.rings.push({ x: this.x, y: this.y, r: 8, max: 96, alpha: 0.55 });
          events.onNoise(this.x, this.y, 96);
        }
      }
    }
    this.hidden = inShadow(level, this.x, this.y);
    for (const ring of this.rings) ring.r += dt * 190;
    this.rings = this.rings.filter((r) => r.r < r.max);
    for (const p of this.puffs) p.life -= dt;
    this.puffs = this.puffs.filter((p) => p.life > 0);
  }

  blocked(level, x, y) {
    const r = PLAYER_RADIUS;
    for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
      const col = Math.floor((x + ox) / TILE);
      const row = Math.floor((y + oy) / TILE);
      const key = col + ',' + row;
      if (col < 0 || row < 0 || col >= 24 || row >= 15) return true;
      if (level.walls.has(key) || level.crates.has(key)) return true;
    }
    return false;
  }

  // Nearest untaken core within reach, for the E prompt.
  nearCore(cores) {
    let best = null;
    let bestD = 46;
    for (const c of cores) {
      if (c.taken) continue;
      const d = Math.hypot(c.x - this.x, c.y - this.y);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  atExit(exit) {
    return exit && Math.hypot(exit.x - this.x, exit.y - this.y) < 30;
  }
}

// The noise ring the player shows while moving loud: its radius is the
// distance a guard can hear, so the player can read the risk at a glance.
export function noiseRadius(sneaking) {
  return sneaking ? 0 : 96;
}
