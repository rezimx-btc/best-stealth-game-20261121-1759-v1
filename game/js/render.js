// render.js — all drawing for SHADOW PROTOCOL.
// Dark slate floor with grid and stains, raised walls, distinct crates,
// dark-blue shadow zones, translucent vision cones, high-contrast figures.

import { TILE, COLS, ROWS } from './levels.js';
import { CONE_RANGE, CONE_HALF, coneColor, guardColor, guardMark } from './guard.js';

const W = COLS * TILE;
const H = ROWS * TILE;

function conePath(ctx, g) {
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.arc(g.x, g.y, CONE_RANGE, g.dir - CONE_HALF, g.dir + CONE_HALF);
  ctx.closePath();
}

// Vision cone clipped by walls: draw the wedge in short ray steps so
// walls and crates cut the cone short, the way sight really works.
function drawCone(ctx, level, g) {
  const steps = 26;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  for (let i = 0; i <= steps; i++) {
    const a = g.dir - CONE_HALF + (CONE_HALF * 2 * i) / steps;
    let r = CONE_RANGE;
    for (let d = 14; d <= CONE_RANGE; d += 10) {
      const px = g.x + Math.cos(a) * d;
      const py = g.y + Math.sin(a) * d;
      const col = Math.floor(px / TILE);
      const row = Math.floor(py / TILE);
      const key = col + ',' + row;
      if (col < 0 || row < 0 || col >= COLS || row >= ROWS || level.walls.has(key) || level.crates.has(key)) {
        r = d - 6;
        break;
      }
    }
    ctx.lineTo(g.x + Math.cos(a) * r, g.y + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = coneColor(g.state);
  ctx.fill();
  ctx.strokeStyle = coneColor(g.state).replace(/0\.\d+\)/, '0.55)');
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawFloor(ctx, level, time) {
  ctx.fillStyle = '#1b2230';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * TILE, 0); ctx.lineTo(c * TILE, H); ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * TILE); ctx.lineTo(W, r * TILE); ctx.stroke();
  }
  // Stains: fixed pseudo-random blotches, seeded by tile position.
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const seed = (c * 73 + r * 149) % 97;
      if (seed < 14 && !level.walls.has(c + ',' + r)) {
        ctx.fillStyle = 'rgba(0,0,0,0.16)';
        ctx.beginPath();
        ctx.ellipse((c + 0.5) * TILE, (r + 0.5) * TILE, 12 + (seed % 9), 8 + (seed % 6), seed, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // Warm lit pools on open floor, away from shadow zones.
  for (const [c, r] of [[6, 3], [17, 5], [10, 11], [20, 11]]) {
    const grad = ctx.createRadialGradient(c * TILE, r * TILE, 8, c * TILE, r * TILE, 150);
    grad.addColorStop(0, 'rgba(255, 196, 110, 0.07)');
    grad.addColorStop(1, 'rgba(255, 196, 110, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(c * TILE - 150, r * TILE - 150, 300, 300);
  }
  void time;
}

function drawShadows(ctx, level, playerHidden, time) {
  for (const key of level.shadows) {
    const [c, r] = key.split(',').map(Number);
    const x = c * TILE;
    const y = r * TILE;
    ctx.fillStyle = 'rgba(24, 52, 110, 0.55)';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.strokeStyle = 'rgba(90, 140, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    // Faint shimmer, stronger when the player hides inside.
    const shimmer = 0.05 + 0.03 * Math.sin(time * 2 + c + r);
    ctx.fillStyle = 'rgba(140, 180, 255, ' + shimmer.toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(x + TILE / 2, y + TILE / 2, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  void playerHidden;
}

function drawWalls(ctx, level) {
  for (const key of level.walls) {
    const [c, r] = key.split(',').map(Number);
    const x = c * TILE;
    const y = r * TILE;
    ctx.fillStyle = '#3a4557';
    ctx.fillRect(x, y, TILE, TILE);
    ctx.fillStyle = '#5b6b84';
    ctx.fillRect(x, y, TILE, 6);
    ctx.strokeStyle = '#141a26';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
  }
}

function drawCrates(ctx, level) {
  for (const key of level.crates) {
    const [c, r] = key.split(',').map(Number);
    const x = c * TILE + 3;
    const y = r * TILE + 3;
    const s = TILE - 6;
    ctx.fillStyle = '#6b4a1f';
    ctx.fillRect(x, y, s, s);
    ctx.fillStyle = '#8a6228';
    ctx.fillRect(x, y, s, 7);
    ctx.strokeStyle = '#2c1e08';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x + s, y + s);
    ctx.moveTo(x + s, y); ctx.lineTo(x, y + s);
    ctx.stroke();
  }
}

function drawExit(ctx, exit, open, time) {
  if (!exit) return;
  const pulse = open ? 0.75 + 0.25 * Math.sin(time * 4) : 0.4;
  const grad = ctx.createRadialGradient(exit.x, exit.y, 4, exit.x, exit.y, 64);
  grad.addColorStop(0, 'rgba(46, 255, 120, ' + (0.55 * pulse).toFixed(3) + ')');
  grad.addColorStop(1, 'rgba(46, 255, 120, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(exit.x - 64, exit.y - 64, 128, 128);
  ctx.fillStyle = open ? '#2eff78' : '#1d7a44';
  ctx.fillRect(exit.x - 18, exit.y - 18, 36, 36);
  ctx.strokeStyle = open ? '#c8ffe0' : '#0e3d22';
  ctx.lineWidth = 2;
  ctx.strokeRect(exit.x - 18, exit.y - 18, 36, 36);
  ctx.fillStyle = '#062b16';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', exit.x, exit.y);
}

function drawCores(ctx, cores, time) {
  for (const core of cores) {
    if (core.taken) continue;
    const pulse = 0.7 + 0.3 * Math.sin(time * 3 + core.x);
    const grad = ctx.createRadialGradient(core.x, core.y, 2, core.x, core.y, 34);
    grad.addColorStop(0, 'rgba(64, 230, 255, ' + (0.5 * pulse).toFixed(3) + ')');
    grad.addColorStop(1, 'rgba(64, 230, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(core.x - 34, core.y - 34, 68, 68);
    ctx.save();
    ctx.translate(core.x, core.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#40e6ff';
    ctx.fillRect(-8, -8, 16, 16);
    ctx.strokeStyle = '#d8fbff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-8, -8, 16, 16);
    ctx.restore();
  }
}

function drawGuard(ctx, g, time) {
  const col = guardColor(g.state);
  ctx.beginPath();
  ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
  ctx.fillStyle = col;
  ctx.fill();
  ctx.strokeStyle = '#1a0d00';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Direction tick: a small nose showing where the guard faces.
  ctx.beginPath();
  ctx.moveTo(g.x + Math.cos(g.dir) * 13, g.y + Math.sin(g.dir) * 13);
  ctx.lineTo(g.x + Math.cos(g.dir) * 20, g.y + Math.sin(g.dir) * 20);
  ctx.strokeStyle = '#fff2d0';
  ctx.lineWidth = 3;
  ctx.stroke();
  // Eyes.
  const ex = Math.cos(g.dir + Math.PI / 2);
  const ey = Math.sin(g.dir + Math.PI / 2);
  ctx.fillStyle = '#1a0d00';
  ctx.beginPath(); ctx.arc(g.x + ex * 5 + Math.cos(g.dir) * 4, g.y + ey * 5 + Math.sin(g.dir) * 4, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(g.x - ex * 5 + Math.cos(g.dir) * 4, g.y - ey * 5 + Math.sin(g.dir) * 4, 2, 0, Math.PI * 2); ctx.fill();
  const mark = guardMark(g.state);
  if (mark) {
    const bob = Math.sin(time * 5) * 2;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = g.state === 'ALERT' ? '#ff4030' : '#ffd640';
    ctx.fillText(mark, g.x, g.y - 26 + bob);
  }
  // Suspicion arc above the guard while it is filling.
  if (g.suspicion > 0.05 && g.state !== 'ALERT') {
    ctx.beginPath();
    ctx.arc(g.x, g.y, 18, -Math.PI / 2, -Math.PI / 2 + g.suspicion * Math.PI * 2);
    ctx.strokeStyle = g.suspicion > 0.7 ? '#ff4030' : '#ffd640';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
}

function drawPlayer(ctx, p, time) {
  // Dust puffs at the feet.
  for (const puff of p.puffs) {
    ctx.fillStyle = 'rgba(200, 210, 230, ' + (puff.life * 0.5).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(puff.x, puff.y + 6, 3 + (0.5 - puff.life) * 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Noise rings while moving loud.
  for (const ring of p.rings) {
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, ' + (ring.alpha * (1 - ring.r / ring.max)).toFixed(3) + ')';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Small ring showing the noise radius while moving loud.
  if (p.moving && !p.sneaking) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 96, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  const bob = p.moving ? Math.sin(time * 10) * 1.5 : 0;
  ctx.beginPath();
  ctx.arc(p.x, p.y + bob, 11, 0, Math.PI * 2);
  ctx.fillStyle = '#19d3e6';
  ctx.fill();
  ctx.strokeStyle = '#062a30';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.dir) * 11, p.y + Math.sin(p.dir) * 11);
  ctx.lineTo(p.x + Math.cos(p.dir) * 17, p.y + Math.sin(p.dir) * 17);
  ctx.strokeStyle = '#e8fbff';
  ctx.lineWidth = 3;
  ctx.stroke();
  if (p.sneaking) {
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('SNEAK', p.x, p.y - 20);
  }
}

function drawEdgeArrow(ctx, player, target) {
  if (!target) return;
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 220) return; // on screen nearby: no arrow needed
  const ang = Math.atan2(dy, dx);
  const ax = player.x + Math.cos(ang) * 52;
  const ay = player.y + Math.sin(ang) * 52;
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(ang);
  ctx.fillStyle = target.exit ? '#2eff78' : '#40e6ff';
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-8, -8);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-8, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBanner(ctx, text, sub, color) {
  ctx.fillStyle = 'rgba(6, 10, 18, 0.78)';
  ctx.fillRect(0, H / 2 - 64, W, 128);
  ctx.fillStyle = color;
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, W / 2, H / 2 - 18);
  ctx.fillStyle = '#dfe7f2';
  ctx.font = '18px sans-serif';
  ctx.fillText(sub, W / 2, H / 2 + 26);
}

// Main scene draw. `game` carries level, player, guards, cores, exit,
// alarm, flashes and the current state.
export function drawScene(ctx, game, time) {
  ctx.clearRect(0, 0, W, H);
  drawFloor(ctx, game.level, time);
  drawShadows(ctx, game.level, game.player.hidden, time);
  drawExit(ctx, game.exit, game.coresTaken === 3, time);
  drawCores(ctx, game.cores, time);
  for (const g of game.guards) drawCone(ctx, game.level, g);
  drawWalls(ctx, game.level);
  drawCrates(ctx, game.level);
  for (const g of game.guards) drawGuard(ctx, g, time);
  drawPlayer(ctx, game.player, time);

  // Edge arrow toward the next core, or the exit once all cores are taken.
  const target = game.coresTaken < 3
    ? game.cores.find((c) => !c.taken)
    : game.exit ? { x: game.exit.x, y: game.exit.y, exit: true } : null;
  drawEdgeArrow(ctx, game.player, target);

  // HIDDEN tag while the player hides in a shadow zone.
  if (game.player.hidden) {
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9db8ff';
    ctx.fillText('◉ HIDDEN', game.player.x, game.player.y - 30);
  }
  // Near-core prompt.
  if (game.nearCore && game.state === 'playing') {
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#40e6ff';
    ctx.fillText('Press E — grab core', game.player.x, game.player.y - 30);
  }
  // CLOSE! flash after a near miss.
  if (game.closeFlash > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.closeFlash);
    ctx.fillStyle = '#ff9e2c';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLOSE!', W / 2, 52);
    ctx.restore();
  }
  // State banners.
  if (game.state === 'caught') {
    drawBanner(ctx, 'SPOTTED!', 'The guard caught you. Press R to retry.', '#ff4030');
  } else if (game.state === 'levelcomplete') {
    drawBanner(ctx, game.levelRating + ' — LEVEL CLEAR', game.levelStats + '   Press Enter for the next level.', '#2eff78');
  } else if (game.state === 'gamecomplete') {
    drawBanner(ctx, 'ALL CORES RECOVERED', game.levelStats + '   Press Enter to play again.', '#2eff78');
  } else if (game.state === 'paused') {
    drawBanner(ctx, 'PAUSED', 'Press P to resume. R restarts the level.', '#ffd640');
  }
}

export function drawTitle(ctx, time, bestRatings) {
  ctx.fillStyle = '#0d1320';
  ctx.fillRect(0, 0, W, H);
  // Decorative floor grid and a sweeping cone behind the title.
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(c * TILE, 0); ctx.lineTo(c * TILE, H); ctx.stroke(); }
  for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(0, r * TILE); ctx.lineTo(W, r * TILE); ctx.stroke(); }
  ctx.save();
  ctx.translate(720, 300);
  ctx.rotate(Math.sin(time * 0.4) * 0.5);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 220, -0.62, 0.62);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 214, 64, 0.10)';
  ctx.fill();
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#40e6ff';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('SHADOW', W / 2, 190);
  ctx.fillStyle = '#ffd640';
  ctx.fillText('PROTOCOL', W / 2, 258);
  ctx.fillStyle = '#dfe7f2';
  ctx.font = '18px sans-serif';
  ctx.fillText('Break into the Meridian Archive. Recover 3 data cores per level.', W / 2, 306);
  ctx.fillText('Reach the exit unseen. Guards patrol — their cones are your enemy.', W / 2, 332);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#9fb2cc';
  const lines = [
    'WASD / Arrows — move      Shift — sneak (slow, quiet, harder to spot)',
    'E — grab a core      R — restart level      P — pause      M — mute',
  ];
  lines.forEach((l, i) => ctx.fillText(l, W / 2, 392 + i * 26));
  ctx.fillStyle = '#2eff78';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Press Enter to start', W / 2, 470);
  ctx.fillStyle = '#9fb2cc';
  ctx.font = '15px sans-serif';
  const ratings = bestRatings.map((r, i) => 'Level ' + (i + 1) + ': ' + (r || '—')).join('    ');
  ctx.fillText(ratings, W / 2, 512);
}
