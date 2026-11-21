# Shadow Protocol

[![make.fun](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/rezimx-btc/best-stealth-game-20261121-1759-v1/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/rezimx-btc/best-stealth-game-20261121-1759-v1/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759)

A complete original top-down stealth game. You are Wren, a courier breaking
into the Meridian Archive, a private vault facility, to recover 3 data cores
per level and reach the exit unseen.

## How it plays

- **Top-down view, 3 levels** — The Lobby, The Gallery, The Vault — each a
  different layout with its own guard patrols.
- **Guards with vision cones** — cones are blocked by walls and tall crates.
  Guards patrol, get suspicious ("?"), go alert ("!") and chase, search the
  last seen spot, then return to patrol. Suspicion decays out of sight, so
  you can recover.
- **Cover** — tall crates block sight and movement; shadow zones hide you
  completely (a HIDDEN tag shows while you hide there).
- **Noise and footsteps** — moving loud emits a visible noise ring that
  guards turn toward; sneaking (Shift) is slow, quiet and harder to spot.
  Footsteps tick and kick up dust puffs.
- **Near miss** — a cone edge passing close without detecting you ticks the
  alarm up one notch and flashes CLOSE!
- **Objectives** — grab 3 glowing data cores (E), then the exit door opens;
  reach it to finish. Ratings: GHOST (never seen), SHADOW (seen but
  escaped), SPOTTED (caught).
- **Sound** — all procedural WebAudio: footstep ticks, pickup chime,
  suspicion riser, alert sting, win/lose motifs. No audio files.

## Controls

WASD / arrows — move · Shift — sneak · E — grab core · R — restart level ·
P — pause · M — mute · Enter — start. Mouse clicks the menu buttons.

## Run it

Serve `game/` with any static HTTP server and open `game/index.html` in
desktop Chrome. No build step, no network requests, no external assets:
all art is drawn in code and all sound is synthesized.

## Screenshot helper

The page accepts `?scene=cover`, `?scene=hide`, `?scene=alarm` or
`?scene=exit` in the URL. Each stages a real gameplay moment with the same
game code (player, guard, objective and alarm positions only) so the
screenshots can be taken of genuine play. It changes no gameplay rules.

## Structure

- `game/js/main.js` — boot, game loop, state machine
- `game/js/levels.js` — the three level definitions
- `game/js/guard.js` — guard AI: patrol, cone, suspicion, chase, search
- `game/js/player.js` — player movement, sneak, noise, pickup
- `game/js/render.js` — all drawing
- `game/js/audio.js` — procedural WebAudio sounds
- `game/js/input.js` — keyboard and mouse input
- `game/js/hud.js` — DOM HUD updates
- `main.ts` — builds the make.fun dossier (`node main.ts`)

Built from scratch for the "Make the best stealth game" bounty on make.fun.
Original game, art and sound — no commercial names, characters, art or levels.
