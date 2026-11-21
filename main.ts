// main.ts — builds the make.fun dossier for SHADOW PROTOCOL.
// Copies game/ and screenshots/ into the output directory, builds the
// dossier with the kit's buildDossier, writes dossier.json, and exits 0.
// Node 22, standard library only. Deterministic: two runs write
// byte-identical dossier.json files.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository directory: the grader's bot directory first, then the
// legacy override, then the directory this file lives in. The working
// directory is never used to find the repo, because the grader runs
// this file from a different working directory.
const repoDir = resolve(
  process.env.MAKEFUN_BOT_DIR ||
    process.env.MAKEFUN_REPO_DIR ||
    dirname(fileURLToPath(import.meta.url)),
);
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || join(process.cwd(), 'output'));

mkdirSync(outDir, { recursive: true });
cpSync(join(repoDir, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(repoDir, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});

writeFileSync(join(outDir, 'dossier.json'), dossier);

process.exitCode = 0;
