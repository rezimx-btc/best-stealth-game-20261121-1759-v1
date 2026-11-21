// audio.js — procedural WebAudio sounds for SHADOW PROTOCOL.
// Everything is synthesized in code: no audio files, no network.

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  tone(freq, dur, type, vol, when, slideTo) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + (when || 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // Soft footstep tick; quieter and lower while sneaking.
  step(sneaking) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(sneaking ? 140 : 190, t0);
    osc.frequency.exponentialRampToValueAtTime(70, t0 + 0.06);
    g.gain.setValueAtTime(sneaking ? 0.05 : 0.11, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.09);
  }

  pickup() {
    this.tone(660, 0.12, 'sine', 0.22, 0);
    this.tone(990, 0.18, 'sine', 0.2, 0.09);
    this.tone(1320, 0.22, 'sine', 0.16, 0.18);
  }

  // Rising riser while suspicion climbs.
  riser() {
    this.tone(220, 0.5, 'sawtooth', 0.07, 0, 520);
  }

  // Sharp alert sting when a guard goes ALERT.
  alert() {
    this.tone(440, 0.16, 'square', 0.14, 0);
    this.tone(415, 0.22, 'square', 0.14, 0.14);
    this.tone(620, 0.3, 'square', 0.12, 0.3);
  }

  nearMiss() {
    this.tone(880, 0.09, 'square', 0.1, 0);
    this.tone(660, 0.12, 'square', 0.1, 0.08);
  }

  win() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.2, i * 0.13));
  }

  lose() {
    this.tone(330, 0.3, 'sawtooth', 0.14, 0, 165);
    this.tone(220, 0.45, 'sawtooth', 0.12, 0.28, 110);
  }

  click() {
    this.tone(700, 0.05, 'sine', 0.12, 0);
  }
}

// Mute toggle helper: M flips the flag and returns the new state.
export function toggleMute(sound) {
  sound.setMuted(!sound.muted);
  return sound.muted;
}
