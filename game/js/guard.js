// guard.js — guard AI for SHADOW PROTOCOL.
// States: PATROL -> SUSPICIOUS -> ALERT -> SEARCH -> RETURN -> PATROL.
// A guard only catches the player by touching it while ALERT. Being seen
// fills suspicion first, and suspicion decays out of sight, so the player
// can always recover.

import { TILE, hasLineOfSight, inShadow } from './levels.js';

export const CONE_RANGE = 175;
export const CONE_HALF = 0.62; // radians, about 35 degrees each side

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function angleLerp(a, b, t) {
  return a + angleDiff(b, a) * t;
}

export class Guard {
  constructor(def) {
    this.path = def.path.map(([c, r]) => ({ x: (c + 0.5) * TILE, y: (r + 0.5) * TILE }));
    this.x = this.path[0].x;
    this.y = this.path[0].y;
    this.wp = 1 % this.path.length;
    this.speed = def.speed || 55;
    this.scanPause = def.scan || 0;
    this.dir = 0;
    this.state = 'PATROL';
    this.suspicion = 0;
    this.loseTimer = 0;
    this.searchTimer = 0;
    this.scanTimer = 0;
    this.lookAngle = 0;
    this.lastSeen = { x: this.x, y: this.y };
    this.waitTimer = 0;
    this.chaseSpeed = this.speed * 1.85;
    this.nearMissCooldown = 0;
    this.stepPhase = Math.random() * Math.PI * 2;
  }

  // Can this guard see the player right now? Shadow zones hide the player
  // completely; otherwise the player must be inside the cone with a clear
  // line of sight. Sneaking shrinks the effective detection range.
  canSee(level, player) {
    if (inShadow(level, player.x, player.y)) return 0;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    const range = player.sneaking ? CONE_RANGE * 0.62 : CONE_RANGE;
    if (dist > range) return 0;
    const ang = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(ang, this.dir)) > CONE_HALF) return 0;
    if (!hasLineOfSight(level, this.x, this.y, player.x, player.y)) return 0;
    // Closer and standing still in the open is easier to spot.
    const closeness = 1 - dist / range;
    return 0.55 + closeness * 0.75;
  }

  // The player is just inside the cone's edge, unseen: a near miss.
  nearMiss(level, player) {
    if (this.nearMissCooldown > 0) return false;
    if (inShadow(level, player.x, player.y)) return false;
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CONE_RANGE + 34 || dist < 30) return false;
    const ang = Math.atan2(dy, dx);
    const off = Math.abs(angleDiff(ang, this.dir));
    if (off < CONE_HALF || off > CONE_HALF + 0.3) return false;
    if (!hasLineOfSight(level, this.x, this.y, player.x, player.y)) return false;
    return true;
  }

  hearNoise(x, y, radius) {
    if (this.state === 'ALERT') return;
    const dist = Math.hypot(x - this.x, y - this.y);
    if (dist > radius) return;
    this.dir = Math.atan2(y - this.y, x - this.x);
    if (this.state === 'PATROL' || this.state === 'RETURN') {
      this.state = 'SUSPICIOUS';
      this.suspicion = Math.max(this.suspicion, 0.45);
    }
  }

  update(dt, level, player, events) {
    this.nearMissCooldown = Math.max(0, this.nearMissCooldown - dt);
    const seen = this.canSee(level, player);
    if (seen > 0 && this.state !== 'ALERT') {
      this.suspicion += seen * dt * 0.9;
      this.lastSeen = { x: player.x, y: player.y };
      this.dir = angleLerp(this.dir, Math.atan2(player.y - this.y, player.x - this.x), Math.min(1, dt * 6));
      if (this.suspicion >= 1) {
        this.state = 'ALERT';
        this.suspicion = 1;
        events.onAlert(this);
      }
    } else if (this.state !== 'ALERT') {
      this.suspicion = Math.max(0, this.suspicion - dt * 0.35);
      if (this.suspicion < 0.35 && this.state === 'SUSPICIOUS') this.state = 'PATROL';
    }

    if (this.state === 'PATROL') {
      this.walkToward(dt, level, this.path[this.wp]);
      if (this.arrived(this.path[this.wp])) {
        this.wp = (this.wp + 1) % this.path.length;
        if (this.scanPause > 0) {
          this.state = 'SCAN';
          this.scanTimer = this.scanPause;
          this.lookAngle = this.dir;
        }
      }
    } else if (this.state === 'SCAN') {
      this.scanTimer -= dt;
      this.dir += dt * 1.4;
      if (this.scanTimer <= 0) this.state = 'PATROL';
    } else if (this.state === 'SUSPICIOUS') {
      // Stand and stare toward the last seen spot.
      this.dir = angleLerp(this.dir, Math.atan2(this.lastSeen.y - this.y, this.lastSeen.x - this.x), Math.min(1, dt * 4));
    } else if (this.state === 'ALERT') {
      this.dir = Math.atan2(player.y - this.y, player.x - this.x);
      this.walkToward(dt, level, player, this.chaseSpeed);
      if (seen > 0) {
        this.lastSeen = { x: player.x, y: player.y };
        this.loseTimer = 0;
      } else {
        this.loseTimer += dt;
        if (this.loseTimer > 2.5) {
          this.state = 'SEARCH';
          this.searchTimer = 4;
        }
      }
      const d = Math.hypot(player.x - this.x, player.y - this.y);
      if (d < 22) events.onCaught(this);
    } else if (this.state === 'SEARCH') {
      this.searchTimer -= dt;
      if (this.walkToward(dt, level, this.lastSeen)) {
        this.dir += dt * 2.2; // look around the last seen spot
      }
      if (this.searchTimer <= 0) this.state = 'RETURN';
    } else if (this.state === 'RETURN') {
      // Walk back to the nearest waypoint, then resume the loop.
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < this.path.length; i++) {
        const d = Math.hypot(this.path[i].x - this.x, this.path[i].y - this.y);
        if (d < bestD) { bestD = d; best = i; }
      }
      if (this.walkToward(dt, level, this.path[best])) {
        this.wp = (best + 1) % this.path.length;
        this.state = 'PATROL';
      }
    }

    if (this.state === 'PATROL' && this.nearMiss(level, player)) {
      this.nearMissCooldown = 4;
      events.onNearMiss(this);
    }
  }

  arrived(target) {
    return Math.hypot(target.x - this.x, target.y - this.y) < 6;
  }

  // Walk toward a target, sliding along walls. Returns true on arrival.
  walkToward(dt, level, target, speed) {
    const sp = speed || this.speed;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return true;
    const nx = this.x + (dx / dist) * sp * dt;
    const ny = this.y + (dy / dist) * sp * dt;
    this.dir = Math.atan2(dy, dx);
    if (!this.blocked(level, nx, this.y)) this.x = nx;
    if (!this.blocked(level, this.x, ny)) this.y = ny;
    return Math.hypot(target.x - this.x, target.y - this.y) < 6;
  }

  blocked(level, x, y) {
    const r = 12;
    for (const [ox, oy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
      const col = Math.floor((x + ox) / TILE);
      const row = Math.floor((y + oy) / TILE);
      const key = col + ',' + row;
      if (col < 0 || row < 0 || col >= 24 || row >= 15) return true;
      if (level.walls.has(key) || level.crates.has(key)) return true;
    }
    return false;
  }
}

// Guard colour helpers, shared by the renderer and the HUD.
export function coneColor(state) {
  if (state === 'ALERT') return 'rgba(255, 64, 48, 0.34)';
  if (state === 'SUSPICIOUS' || state === 'SEARCH') return 'rgba(255, 158, 44, 0.30)';
  return 'rgba(255, 214, 64, 0.22)';
}

export function guardColor(state) {
  if (state === 'ALERT') return '#ff4030';
  if (state === 'SUSPICIOUS' || state === 'SEARCH') return '#ff9e2c';
  return '#ffb02e';
}

export function guardMark(state) {
  if (state === 'ALERT') return '!';
  if (state === 'SUSPICIOUS' || state === 'SEARCH') return '?';
  return '';
}
