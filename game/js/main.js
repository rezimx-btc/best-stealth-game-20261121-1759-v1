// main.js — boot, game loop and state machine for SHADOW PROTOCOL.
// States: title, playing, paused, caught, levelcomplete, gamecomplete.

import { LEVELS, parseLevel, validateLevels, tileCenter } from './levels.js';
import { Guard } from './guard.js';
import { Player } from './player.js';
import { Sound, toggleMute } from './audio.js';
import { Input } from './input.js';
import { Hud, ratingFor, formatTime } from './hud.js';
import { drawScene, drawTitle } from './render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

class Game {
  constructor() {
    this.state = 'title';
    this.levelIndex = 0;
    this.level = null;
    this.player = null;
    this.guards = [];
    this.cores = [];
    this.exit = null;
    this.coresTaken = 0;
    this.alarm = 0;
    this.time = 0;
    this.levelTime = 0;
    this.totalTime = 0;
    this.timesSpotted = 0;
    this.caughtCount = 0;
    this.maxSuspicion = 0;
    this.closeFlash = 0;
    this.nearCore = null;
    this.levelRating = '';
    this.levelStats = '';
    this.bestRatings = ['', '', ''];
    this.unlocked = 1;
    this.input = new Input();
    this.sound = new Sound();
    this.hud = new Hud();
    this.events = {
      onAlert: (g) => {
        this.timesSpotted++;
        this.sound.alert();
        this.hud.message('SPOTTED! Break line of sight!', 2.5);
      },
      onCaught: () => {
        if (this.state !== 'playing') return;
        this.state = 'caught';
        this.caughtCount++;
        this.sound.lose();
      },
      onNearMiss: () => {
        this.alarm = Math.min(3, this.alarm + 1);
        this.closeFlash = 1.6;
        this.sound.nearMiss();
        this.hud.message('CLOSE! The alarm ticks up.', 2);
      },
      onStep: (sneaking) => this.sound.step(sneaking),
      onNoise: (x, y, radius) => {
        for (const g of this.guards) g.hearNoise(x, y, radius);
      },
    };
  }

  loadLevel(index) {
    const def = LEVELS[index];
    this.levelIndex = index;
    const parsed = parseLevel(def);
    this.level = parsed;
    this.cores = parsed.cores;
    this.exit = parsed.exit;
    this.player = new Player(parsed.player.x, parsed.player.y);
    this.guards = def.guards.map((g) => new Guard(g));
    this.coresTaken = 0;
    this.alarm = 0;
    this.levelTime = 0;
    this.timesSpotted = 0;
    this.caughtCount = 0;
    this.maxSuspicion = 0;
    this.closeFlash = 0;
    this.hud.setLevel(def.name, 'Recover 3 cores, then reach the exit');
    this.hud.message(def.intro, 3.5);
  }

  start() {
    this.totalTime = 0;
    this.loadLevel(0);
    this.state = 'playing';
    this.sound.ensure();
  }

  restartLevel() {
    this.loadLevel(this.levelIndex);
    this.state = 'playing';
  }

  completeLevel() {
    const rating = ratingFor(this.timesSpotted, this.caughtCount > 0);
    this.levelRating = rating;
    this.bestRatings[this.levelIndex] = rating;
    this.totalTime += this.levelTime;
    this.levelStats = 'Time ' + formatTime(this.levelTime) + '   Spotted ' + this.timesSpotted + 'x   Rating ' + rating;
    this.hud.update({ taken: 3, total: 3 }, 0, this.alarm, this.levelTime, false);
    this.sound.win();
    if (this.levelIndex >= LEVELS.length - 1) {
      this.state = 'gamecomplete';
      this.levelStats = 'Total time ' + formatTime(this.totalTime) + '   Overall ' + this.bestRatings.join(' / ');
    } else {
      this.state = 'levelcomplete';
      this.unlocked = Math.max(this.unlocked, this.levelIndex + 2);
    }
  }

  update(dt) {
    this.time += dt;
    this.hud.tick(dt);
    if (this.closeFlash > 0) this.closeFlash -= dt;
    if (this.state !== 'playing') return;
    this.levelTime += dt;
    this.player.update(dt, this.input, this.level, {
      onStep: this.events.onStep,
      onNoise: this.events.onNoise,
    });
    for (const g of this.guards) g.update(dt, this.level, this.player, this.events);
    let maxS = 0;
    for (const g of this.guards) maxS = Math.max(maxS, g.suspicion);
    this.maxSuspicion = maxS;
    if (maxS > 0.55 && maxS < 1) {
      if (!this._riserAt || this.time - this._riserAt > 1.2) {
        this._riserAt = this.time;
        this.sound.riser();
      }
    }
    this.nearCore = this.player.nearCore(this.cores);
    this.hud.update(
      { taken: this.coresTaken, total: 3 },
      maxS,
      this.alarm,
      this.levelTime,
      this.player.hidden
    );
  }

  handleKeys() {
    const inp = this.input;
    if (inp.wasPressed('m')) {
      const muted = toggleMute(this.sound);
      this.hud.message(muted ? 'Muted' : 'Sound on', 1.2);
    }
    if (this.state === 'title') {
      if (inp.wasPressed('enter')) this.start();
      // Level select: number keys jump to an unlocked level.
      for (let i = 0; i < LEVELS.length; i++) {
        if (inp.wasPressed(String(i + 1)) && i < this.unlocked) {
          this.loadLevel(i);
          this.state = 'playing';
          this.sound.ensure();
        }
      }
    } else if (this.state === 'playing') {
      if (inp.wasPressed('p')) { this.state = 'paused'; return; }
      if (inp.wasPressed('r')) { this.restartLevel(); return; }
      if (inp.wasPressed('e') && this.nearCore) {
        this.nearCore.taken = true;
        this.coresTaken++;
        this.sound.pickup();
        this.hud.message('Core ' + this.coresTaken + ' of 3 recovered' + (this.coresTaken === 3 ? ' — exit open!' : ''), 2);
      }
      if (this.coresTaken === 3 && this.player.atExit(this.exit)) this.completeLevel();
    } else if (this.state === 'paused') {
      if (inp.wasPressed('p') || inp.wasPressed('enter')) this.state = 'playing';
      if (inp.wasPressed('r')) this.restartLevel();
    } else if (this.state === 'caught') {
      if (inp.wasPressed('r') || inp.wasPressed('enter')) this.restartLevel();
    } else if (this.state === 'levelcomplete') {
      if (inp.wasPressed('enter')) {
        this.loadLevel(this.levelIndex + 1);
        this.state = 'playing';
      }
    } else if (this.state === 'gamecomplete') {
      if (inp.wasPressed('enter')) {
        this.bestRatings = ['', '', ''];
        this.unlocked = 1;
        this.start();
      }
    }
  }

  draw() {
    if (this.state === 'title') {
      drawTitle(ctx, this.time, this.bestRatings);
      return;
    }
    drawScene(ctx, this, this.time);
  }

  // Screenshot helper (?scene=cover|hide|alarm|exit): stage a real gameplay
  // moment with the same game code, then let the normal loop run. It only
  // places the player, guards, objectives and alarm state; no rules change.
  applyScene(name) {
    if (name === 'cover') {
      this.loadLevel(0);
      this.state = 'playing';
      const p = tileCenter(7, 2);
      this.player.x = p.x; this.player.y = p.y;
      const g = this.guards[0];
      g.x = tileCenter(9, 2).x; g.y = tileCenter(9, 2).y;
      g.dir = 0; // facing east, cone away from the player sneaking up behind
      g.state = 'PATROL';
    } else if (name === 'hide') {
      this.loadLevel(1);
      this.state = 'playing';
      const p = tileCenter(5, 9);
      this.player.x = p.x; this.player.y = p.y;
      const g = this.guards[2];
      g.x = tileCenter(8, 8).x; g.y = tileCenter(8, 8).y;
      g.dir = Math.PI; // cone sweeping past the shadow zone
      g.state = 'PATROL';
    } else if (name === 'alarm') {
      this.loadLevel(1);
      this.state = 'playing';
      const p = tileCenter(8, 6);
      this.player.x = p.x; this.player.y = p.y;
      const g = this.guards[0];
      g.x = tileCenter(8, 4).x; g.y = tileCenter(8, 4).y;
      g.state = 'ALERT';
      g.suspicion = 1;
      this.alarm = 1;
      this.closeFlash = 1.2;
    } else if (name === 'exit') {
      this.loadLevel(0);
      this.state = 'playing';
      for (const c of this.cores) c.taken = true;
      this.coresTaken = 3;
      const p = tileCenter(20, 12);
      this.player.x = p.x; this.player.y = p.y;
      this.levelTime = 84;
      this.timesSpotted = 0;
      this.completeLevel();
      this.state = 'levelcomplete';
      this.levelRating = 'GHOST';
      this.levelStats = 'Time 1:24   Spotted 0x   Rating GHOST';
    }
  }
}

const game = new Game();
const err = validateLevels();
if (err) {
  document.getElementById('hud-message').textContent = 'Level error: ' + err;
} else {
  const params = new URLSearchParams(window.location.search);
  const scene = params.get('scene');
  if (scene) game.applyScene(scene);
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.handleKeys();
  game.update(dt);
  game.draw();
  game.input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Title-screen buttons (mouse): start and level select.
document.getElementById('btn-start').addEventListener('click', () => {
  game.sound.ensure();
  game.sound.click();
  game.start();
});
document.querySelectorAll('#level-select button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const i = Number(btn.dataset.level);
    if (i < game.unlocked) {
      game.sound.ensure();
      game.sound.click();
      game.loadLevel(i);
      game.state = 'playing';
    }
  });
});
