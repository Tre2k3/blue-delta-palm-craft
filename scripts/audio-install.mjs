#!/usr/bin/env node
/**
 * Files a folder of recordings into the game.
 *
 *   node scripts/audio-install.mjs <folder of mp3/wav files> [--dry]
 *
 * A file is told apart by its name alone, wherever it sits in the folder:
 *   sfx-<name>     an effect          -> public/game-v2/audio/sfx/<name>.mp3
 *   music-<name>   a song             -> public/game-v2/audio/music/<name>.mp3
 *   anything else  a spoken line      -> public/game-v2/audio/voice/<name>.mp3
 * A trailing " (2)", "_2" or "-take2" is ignored, so a second download of the same line
 * replaces the first. Names the game has no use for are listed and left alone.
 *
 * Spoken lines and effects have the silence cut off both ends and are brought to one
 * loudness. Songs are brought to one loudness and have their end folded into their start,
 * so the loop has no seam. Needs ffmpeg.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const out = join(root, "public/game-v2/audio");
const [, , from, flag] = process.argv;
if (!from || !existsSync(from)) {
  console.error("usage: node scripts/audio-install.mjs <folder> [--dry]");
  process.exit(1);
}
const dry = flag === "--dry";

/** Every name the game asks for, read out of its own source. */
function wanted() {
  const read = (p) => readFileSync(join(root, p), "utf8");
  const game = read("src/game-v2/game.ts");
  const story = read("src/game-v2/play/story.ts");
  const hoops = read("src/game-v2/play/hoops.ts");
  const audio = read("src/game-v2/core/audio.ts");
  const voice = new Set();
  for (const m of game.matchAll(/"((?:k|og|unc|call)-[a-z0-9-]+)"/g)) voice.add(m[1]);
  for (const m of story.matchAll(/\{ id: "([a-z]+)"[^\n]*who: "/g)) voice.add(`step-${m[1]}`);
  for (const m of hoops.matchAll(/\{ name: "([^"]+)", skill:/g)) voice.add(`rival-${m[1].toLowerCase().replace(/[^a-z]+/g, "-")}`);
  const sfx = new Set([...audio.matchAll(/this\.one\("([a-z]+)"/g)].map((m) => m[1]));
  sfx.add("go").add("countdown");
  const music = new Set(["title", "race", "radio", "court", "bowl", "funhouse", "hq", "river", "beale", "city-day", "city-night"]);
  return { voice, sfx, music };
}

function walk(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) found.push(...walk(p));
    else if (/\.(mp3|wav|m4a|ogg|flac|aac)$/i.test(name)) found.push(p);
  }
  return found;
}

const ff = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "ignore", "inherit"] });
const seconds = (p) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]).toString().trim());

const TRIM = "silenceremove=start_periods=1:start_threshold=-46dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-46dB:start_silence=0.06,areverse";

const want = wanted();
const done = { voice: [], sfx: [], music: [] };
const unknown = [];
// Oldest first, so a later take of the same line is the one that stays.
const files = walk(resolve(from)).sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs);
for (const file of files) {
  const stem = basename(file, extname(file))
    .toLowerCase()
    .trim()
    .replace(/\s*\(\d+\)$/, "")
    .replace(/[-_ ]take[-_ ]?\d+$/, "")
    .replace(/_\d+$/, "")
    .replace(/\s+/g, "-");
  const kind = stem.startsWith("sfx-") ? "sfx" : stem.startsWith("music-") ? "music" : "voice";
  const id = kind === "voice" ? stem : stem.replace(/^(sfx|music)-/, "");
  if (!want[kind].has(id)) {
    unknown.push(basename(file));
    continue;
  }
  const to = join(out, kind, `${id}.mp3`);
  if (!dry) {
    mkdirSync(join(out, kind), { recursive: true });
    if (kind === "voice") ff(["-i", file, "-af", `${TRIM},loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:d=0.01`, "-ac", "1", "-ar", "44100", "-b:a", "96k", to]);
    else if (kind === "sfx") ff(["-i", file, "-af", `${TRIM},loudnorm=I=-15:TP=-1.5:LRA=11,afade=t=in:d=0.004`, "-t", "5", "-ac", "2", "-ar", "44100", "-b:a", "128k", to]);
    else {
      // The last two seconds are laid under the first two, so the end runs into the start.
      const len = seconds(file);
      const fold = Math.min(2, len / 6);
      const body = (len - fold).toFixed(3);
      ff([
        "-i", file,
        "-filter_complex",
        `[0:a]asplit=2[x][y];[x]atrim=start=${body},asetpts=PTS-STARTPTS[tail];[y]atrim=end=${body},asetpts=PTS-STARTPTS[body];[tail]afade=t=out:st=0:d=${fold.toFixed(3)}:curve=qsin[t];[body]afade=t=in:st=0:d=${fold.toFixed(3)}:curve=qsin[b];[t][b]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-17:TP=-1.5:LRA=13[a]`,
        "-map", "[a]", "-ac", "2", "-ar", "44100", "-b:a", "128k", to,
      ]);
    }
  }
  done[kind] = done[kind].filter((x) => x !== id).concat(id);
}

for (const kind of ["voice", "sfx", "music"]) {
  const missing = [...want[kind]].filter((id) => !existsSync(join(out, kind, `${id}.mp3`)) && !done[kind].includes(id));
  console.log(`${kind}: filed ${done[kind].length}${done[kind].length ? ` (${done[kind].join(", ")})` : ""}`);
  console.log(`  still made up by the game: ${missing.length ? missing.join(", ") : "none"}`);
}
if (unknown.length) console.log(`not used (the name matches nothing the game asks for): ${unknown.join(", ")}`);
if (!dry) execFileSync("node", [join(root, "scripts/audio-manifest.mjs")], { stdio: "inherit" });
