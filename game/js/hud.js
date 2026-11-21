// hud.js — DOM HUD updates for SHADOW PROTOCOL.
// The top bar shows cores, the detection eye, alarm pips, timer and level.

export class Hud {
  constructor() {
    this.el = {
      cores: document.getElementById('hud-cores'),
      eye: document.getElementById('hud-eye-fill'),
      eyeWrap: document.getElementById('hud-eye'),
      alarm: document.getElementById('hud-alarm'),
      timer: document.getElementById('hud-timer'),
      level: document.getElementById('hud-level'),
      objective: document.getElementById('hud-objective'),
      message: document.getElementById('hud-message'),
      hidden: document.getElementById('hud-hidden'),
    };
    this._msgTimer = 0;
  }

  setLevel(name, objective) {
    if (this.el.level) this.el.level.textContent = name;
    if (this.el.objective) this.el.objective.textContent = objective;
  }

  // cores: {taken, total}; suspicion 0..1; alarm 0..3; seconds elapsed.
  update(cores, suspicion, alarm, seconds, hidden) {
    if (this.el.cores) {
      let s = '';
      for (let i = 0; i < cores.total; i++) s += i < cores.taken ? '◆' : '◇';
      this.el.cores.textContent = s + '  ' + cores.taken + ' / ' + cores.total;
    }
    if (this.el.eye) {
      this.el.eye.style.width = Math.round(suspicion * 100) + '%';
      const hue = suspicion < 0.5 ? 'yellow' : suspicion < 0.85 ? 'orange' : 'red';
      this.el.eye.style.background = hue === 'yellow' ? '#ffd640' : hue === 'orange' ? '#ff9e2c' : '#ff4030';
    }
    if (this.el.eyeWrap) {
      this.el.eyeWrap.classList.toggle('hot', suspicion > 0.7);
    }
    if (this.el.alarm) {
      let pips = '';
      for (let i = 0; i < 3; i++) pips += i < alarm ? '●' : '○';
      this.el.alarm.textContent = 'ALARM ' + pips;
      this.el.alarm.classList.toggle('lit', alarm > 0);
    }
    if (this.el.timer) {
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      this.el.timer.textContent = m + ':' + String(s).padStart(2, '0');
    }
    if (this.el.hidden) {
      this.el.hidden.style.visibility = hidden ? 'visible' : 'hidden';
    }
  }

  message(text, seconds) {
    if (!this.el.message) return;
    this.el.message.textContent = text;
    this.el.message.style.opacity = '1';
    this._msgTimer = seconds || 2.2;
  }

  tick(dt) {
    if (this._msgTimer > 0) {
      this._msgTimer -= dt;
      if (this._msgTimer <= 0 && this.el.message) this.el.message.style.opacity = '0';
    }
  }
}

// Rating names for the level-complete screen.
export function ratingFor(timesSpotted, caught) {
  if (caught) return 'SPOTTED';
  if (timesSpotted === 0) return 'GHOST';
  return 'SHADOW';
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ':' + String(s).padStart(2, '0');
}
