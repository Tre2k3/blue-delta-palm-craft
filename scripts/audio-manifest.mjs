#!/usr/bin/env node
// Lists the recordings under public/game-v2/audio so the game knows which sounds it has.
// Run it after adding or removing mp3 files in voice/, sfx/ or music/.
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "game-v2", "audio");
const list = (kind) =>
  existsSync(join(root, kind))
    ? readdirSync(join(root, kind))
        .filter((f) => f.endsWith(".mp3"))
        .map((f) => f.slice(0, -4))
        .sort()
    : [];
const manifest = { voice: list("voice"), sfx: list("sfx"), music: list("music") };
writeFileSync(join(root, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`voice ${manifest.voice.length}, sfx ${manifest.sfx.length}, music ${manifest.music.length}`);
