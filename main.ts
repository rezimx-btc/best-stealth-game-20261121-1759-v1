// main.ts — builds the make.fun dossier for SHADOW PROTOCOL.
// Reads the repository directory and the output directory from the
// environment, copies game/ and screenshots/ into the output directory,
// builds the dossier with the kit's buildDossier, writes dossier.json,
// and exits 0. Node 22, standard library only. Deterministic: run it
// twice and the output bytes are identical.

import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const repoDir = resolve(process.env.MAKEFUN_REPO_DIR || process.cwd());
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

// Exit code: success. The dossier is written; the coordinator handles
// the GitHub repo and the submit from here.
process.exitCode = 0;
