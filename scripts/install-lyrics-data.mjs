import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const songPacksRoot = path.join(repoRoot, "song-packs");
const realSongPacksRoot = fs.realpathSync(songPacksRoot);
const MAX_TIMING_BYTES = 4 * 1024 * 1024;
const MAX_LYRICS_BYTES = 512 * 1024;
const V2_SCHEMA = "music-effect.lyrics-timing.v2";

const isInside = (parent, child) => {
  const baseKey = process.platform === "win32" ? parent.toLowerCase() : parent;
  const targetKey = process.platform === "win32" ? child.toLowerCase() : child;
  return targetKey === baseKey || targetKey.startsWith(`${baseKey}${path.sep}`);
};

const parseArgs = (args) => {
  const opts = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    if (key === "force" || key === "dry-run") {
      opts[key] = true;
      continue;
    }
    opts[key] = args[i + 1] ?? "";
    i += 1;
  }
  return opts;
};

const usage = () => `Usage:
  npm run song:lyrics:install -- --id <song-id> --timing <timing-v2.json> [--lyrics <lyrics.txt>] [--name <file-id>] [--force]

Examples:
  npm run song:lyrics:install -- --id monitoring --timing C:\\Users\\kawai\\Downloads\\monitoring.lyrics-timing.v2.with-lyrics.json
  npm run song:lyrics:install -- --id ope --timing .\\tmp\\ope.timing.v2.json --lyrics .\\tmp\\ope.lyrics.txt --name live --force`;

const assertSongId = (id) => {
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(id)) {
    throw new Error("Use --id with lowercase letters, numbers, dot, underscore, or hyphen.");
  }
};

const assertFile = (filePath, label, maxBytes) => {
  if (!filePath) throw new Error(`${label} is required.\n\n${usage()}`);
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
  const stat = fs.lstatSync(resolved);
  if (!stat.isFile()) {
    throw new Error(`${label} must be a file: ${filePath}`);
  }
  if (stat.isSymbolicLink()) {
    throw new Error(`${label} must not be a symlink: ${filePath}`);
  }
  if (stat.size > maxBytes) {
    throw new Error(`${label} is too large: ${filePath}`);
  }
  return resolved;
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));

const assertSongRoot = (id) => {
  const root = path.join(songPacksRoot, id);
  if (!fs.existsSync(root)) {
    throw new Error(`Song pack not found: ${path.relative(repoRoot, root)}`);
  }
  if (fs.lstatSync(root).isSymbolicLink()) {
    throw new Error(`Refusing symlinked song pack: ${path.relative(repoRoot, root)}`);
  }
  const realRoot = fs.realpathSync(root);
  if (!isInside(realSongPacksRoot, realRoot)) {
    throw new Error(`Song pack escapes song-packs: ${id}`);
  }
  return { root, realRoot };
};

const assertWritablePath = (filePath, realSongRoot) => {
  const parentPath = path.dirname(filePath);
  fs.mkdirSync(parentPath, { recursive: true });
  if (fs.lstatSync(parentPath).isSymbolicLink()) {
    throw new Error(`Refusing to write through symlink: ${path.relative(repoRoot, parentPath)}`);
  }
  const realParent = fs.realpathSync(parentPath);
  if (!isInside(realSongRoot, realParent)) {
    throw new Error(`Refusing to write outside song pack: ${path.relative(repoRoot, filePath)}`);
  }
  if (fs.existsSync(filePath) && fs.lstatSync(filePath).isSymbolicLink()) {
    throw new Error(`Refusing to overwrite symlink: ${path.relative(repoRoot, filePath)}`);
  }
};

const toRelativeManifestPath = (filePath, songRoot) => `./${path.relative(songRoot, filePath).split(path.sep).join("/")}`;

const sanitizeName = (value) => {
  const name = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 64);
  return name || "lyrics";
};

const inferName = (opts, timingJson, timingPath, id) => {
  if (opts.name) return sanitizeName(opts.name);
  if (typeof timingJson.slug === "string" && timingJson.slug.trim()) return sanitizeName(timingJson.slug);
  const base = path.basename(timingPath).replace(/\.json$/i, "");
  return sanitizeName(base) || id;
};

const validateTimingV2 = (timingJson) => {
  const warnings = [];
  if (!timingJson || typeof timingJson !== "object" || Array.isArray(timingJson)) {
    throw new Error("Timing JSON must be an object.");
  }
  if (timingJson.schema !== V2_SCHEMA) {
    throw new Error(`Timing JSON schema must be ${V2_SCHEMA}.`);
  }
  if (timingJson.timeUnit !== "ms") {
    warnings.push("timeUnit is not ms.");
  }
  if (!Array.isArray(timingJson.phrases)) {
    throw new Error("Timing JSON phrases must be an array.");
  }
  if (timingJson.includesLyrics !== true && timingJson.includesLyrics !== false) {
    warnings.push("includesLyrics should be true or false.");
  }
  let previousStart = -1;
  timingJson.phrases.forEach((phrase, index) => {
    if (!phrase || typeof phrase !== "object" || Array.isArray(phrase)) {
      throw new Error(`phrases[${index}] must be an object.`);
    }
    if (!Number.isInteger(phrase.startTimeMs) || !Number.isInteger(phrase.endTimeMs)) {
      warnings.push(`phrases[${index}] should use integer startTimeMs/endTimeMs.`);
    }
    if (Number.isFinite(phrase.startTimeMs) && Number.isFinite(phrase.endTimeMs) && phrase.endTimeMs <= phrase.startTimeMs) {
      warnings.push(`phrases[${index}] has endTimeMs <= startTimeMs.`);
    }
    if (Number.isFinite(phrase.startTimeMs) && phrase.startTimeMs < previousStart) {
      warnings.push(`phrases[${index}] starts before the previous phrase.`);
    }
    if (Number.isFinite(phrase.startTimeMs)) previousStart = phrase.startTimeMs;
  });
  return warnings;
};

const writeFile = (filePath, content, { force, dryRun, realSongRoot }) => {
  assertWritablePath(filePath, realSongRoot);
  if (!force && fs.existsSync(filePath)) {
    throw new Error(`Refusing to overwrite existing file without --force: ${path.relative(repoRoot, filePath)}`);
  }
  if (dryRun) return;
  fs.writeFileSync(filePath, content, "utf8");
};

const main = () => {
  const opts = parseArgs(process.argv.slice(2));
  const id = String(opts.id ?? opts.song ?? "").trim();
  assertSongId(id);

  const timingPath = assertFile(String(opts.timing ?? ""), "--timing", MAX_TIMING_BYTES);
  const lyricsPath = opts.lyrics ? assertFile(String(opts.lyrics), "--lyrics", MAX_LYRICS_BYTES) : null;
  const timingJson = readJson(timingPath);
  const timingWarnings = validateTimingV2(timingJson);

  const { root, realRoot } = assertSongRoot(id);
  const manifestPath = path.join(root, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`manifest.json not found: ${path.relative(repoRoot, manifestPath)}`);
  }

  const manifest = readJson(manifestPath);
  const name = inferName(opts, timingJson, timingPath, id);
  const lyricsDir = path.join(root, "lyrics");
  const timingTarget = path.join(lyricsDir, `${name}.timing.v2.json`);
  const lyricsTarget = lyricsPath ? path.join(lyricsDir, `${name}.lyrics.txt`) : null;
  const force = Boolean(opts.force);
  const dryRun = Boolean(opts["dry-run"]);

  if (timingJson.includesLyrics === false && !lyricsPath) {
    timingWarnings.push("timing-only export has no --lyrics file; playback may have no lyric text.");
  }
  if (timingJson.includesLyrics === true && lyricsPath) {
    timingWarnings.push("with-lyrics export also has --lyrics; Music Effect will prefer phrase text from timing JSON.");
  }

  const serializedTiming = `${JSON.stringify(timingJson, null, 2)}\n`;
  writeFile(timingTarget, serializedTiming, { force, dryRun, realSongRoot: realRoot });

  if (lyricsPath && lyricsTarget) {
    const lyricText = fs.readFileSync(lyricsPath, "utf8");
    writeFile(lyricsTarget, lyricText.endsWith("\n") ? lyricText : `${lyricText}\n`, { force, dryRun, realSongRoot: realRoot });
  }

  const nextManifest = {
    ...manifest,
    lyrics: lyricsTarget ? toRelativeManifestPath(lyricsTarget, root) : timingJson.includesLyrics === true ? null : manifest.lyrics ?? null,
    analysis: {
      ...(manifest.analysis ?? {}),
      timing: toRelativeManifestPath(timingTarget, root)
    }
  };

  writeFile(manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, { force: true, dryRun, realSongRoot: realRoot });

  const action = dryRun ? "Would install" : "Installed";
  console.log(`${action} lyric timing for ${id}`);
  console.log(`  timing: ${path.relative(repoRoot, timingTarget)}`);
  console.log(`  lyrics: ${lyricsTarget ? path.relative(repoRoot, lyricsTarget) : "(embedded in timing JSON or unchanged)"}`);
  console.log(`  manifest: ${path.relative(repoRoot, manifestPath)}`);
  for (const warning of timingWarnings) {
    console.warn(`Warning: ${warning}`);
  }
  console.log("");
  console.log(`Next: npm run song:validate -- --id ${id}`);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
