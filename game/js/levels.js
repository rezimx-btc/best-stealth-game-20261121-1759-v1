// levels.js — the three levels of SHADOW PROTOCOL.
// Each level is a tile map plus guard patrol routes.
// Map legend: '#' wall, 'C' tall crate (blocks sight and movement),
// 'S' shadow zone (hides the player), 'o' data core, 'X' exit,
// 'P' player start, '.' open floor. Tile size is 40 px, maps are 24 x 15.

export const TILE = 40;
export const COLS = 24;
export const ROWS = 15;

const L1 = [
  '########################',
  '#..........#...........#',
  '#..P....C...#.....o....#',
  '#..........#...........#',
  '#..CC......#.....C.....#',
  '#..........#...........#',
  '#....C...........C.....#',
  '#......................#',
  '#..S.......#.....S.....#',
  '#..........#...........#',
  '#.....C....#.....C.....#',
  '#..........#...........#',
  '#..o.......#.....o.....#',
  '#..........#.....X.....#',
  '########################',
];

const L2 = [
  '########################',
  '#....C.......#.....o...#',
  '#..P........#..........#',
  '#....S.......#...C.....#',
  '#..........C#..........#',
  '#....C.......#...S.....#',
  '#..........#...........#',
  '#..o...C....#..C.......#',
  '#..........#...........#',
  '#....S.......#...C.....#',
  '#..........C#..........#',
  '#....C.......#...S.....#',
  '#..........#...........#',
  '#....o......#....X.....#',
  '########################',
];

const L3 = [
  '########################',
  '#..P..#....C#....#..o..#',
  '#.....#.....#.....#....#',
  '#..C..#..S...#..C..#.C.#',
  '#.....#.....#.....#....#',
  '#..o..#..C...#....#..S.#',
  '#..............C.......#',
  '#..S...................#',
  '#.....#..C...#..S..#...#',
  '#.....#.....#.....#..C.#',
  '#..C..#..S...#....#....#',
  '#.....#.....#..C..#..S.#',
  '#..o..#.....#.....#....#',
  '#.....#..C...#....#..X.#',
  '########################',
];

// Guard routes are waypoint lists in tile coordinates [col, row].
// A guard walks its loop; `scan` makes it pause and look around at a waypoint.
export const LEVELS = [
  {
    name: 'Level 1 — The Lobby',
    short: 'The Lobby',
    map: L1,
    intro: 'Learn the cones. Crates block sight. Grab 3 cores, reach the exit.',
    guards: [
      { path: [[4, 2], [9, 2], [9, 6], [4, 6]], speed: 52, scan: 0 },
      { path: [[16, 9], [21, 9], [21, 12], [16, 12]], speed: 52, scan: 0 },
    ],
  },
  {
    name: 'Level 2 — The Gallery',
    short: 'The Gallery',
    map: L2,
    intro: 'Crossing patrols. Shadow zones hide you. Noise draws guards.',
    guards: [
      { path: [[3, 1], [10, 1], [10, 6], [3, 6]], speed: 58, scan: 0 },
      { path: [[14, 2], [21, 2], [21, 7], [14, 7]], speed: 58, scan: 0 },
      { path: [[6, 12], [10, 12], [10, 8], [6, 8]], speed: 62, scan: 1.2 },
    ],
  },
  {
    name: 'Level 3 — The Vault',
    short: 'The Vault',
    map: L3,
    intro: 'Tight corridors. One guard pauses and scans. Cores are far apart.',
    guards: [
      { path: [[2, 1], [5, 1], [5, 6], [2, 6]], speed: 60, scan: 0 },
      { path: [[9, 2], [11, 2], [11, 8], [10, 8]], speed: 60, scan: 1.6 },
      { path: [[15, 1], [18, 1], [20, 6], [16, 6]], speed: 64, scan: 0 },
      { path: [[9, 12], [15, 12], [15, 9], [9, 9]], speed: 64, scan: 1.2 },
    ],
  },
];

// Parse a map into walls, crates, shadow zones, cores, exit and player start.
export function parseLevel(def) {
  const walls = new Set();
  const crates = new Set();
  const shadows = new Set();
  const cores = [];
  let exit = null;
  let player = { x: 1.5 * TILE, y: 1.5 * TILE };
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = def.map[r][c];
      const key = c + ',' + r;
      if (ch === '#') walls.add(key);
      else if (ch === 'C') crates.add(key);
      else if (ch === 'S') shadows.add(key);
      else if (ch === 'o') cores.push({ x: (c + 0.5) * TILE, y: (r + 0.5) * TILE, taken: false });
      else if (ch === 'X') exit = { x: (c + 0.5) * TILE, y: (r + 0.5) * TILE };
      else if (ch === 'P') player = { x: (c + 0.5) * TILE, y: (r + 0.5) * TILE };
    }
  }
  return { walls, crates, shadows, cores, exit, player };
}

export function isSolid(level, col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return true;
  const key = col + ',' + row;
  return level.walls.has(key) || level.crates.has(key);
}

// True when the straight segment between two points is not blocked by a
// wall or a tall crate. Sampled in small steps along the segment.
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x0 + dx * t;
    const py = y0 + dy * t;
    if (isSolid(level, Math.floor(px / TILE), Math.floor(py / TILE))) return false;
  }
  return true;
}

export function inShadow(level, x, y) {
  return level.shadows.has(Math.floor(x / TILE) + ',' + Math.floor(y / TILE));
}

// Centre of a tile in pixels, for guard waypoints and scene staging.
export function tileCenter(col, row) {
  return { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
}

// Quick self-check used by the boot code: every map row is COLS wide and
// every level has exactly 3 cores and one exit.
export function validateLevels() {
  for (const def of LEVELS) {
    if (def.map.length !== ROWS) return 'level ' + def.name + ': wrong row count';
    for (const row of def.map) if (row.length !== COLS) return 'level ' + def.name + ': row not ' + COLS + ' wide';
    const parsed = parseLevel(def);
    if (parsed.cores.length !== 3) return 'level ' + def.name + ': ' + parsed.cores.length + ' cores';
    if (!parsed.exit) return 'level ' + def.name + ': no exit';
  }
  return null;
}
