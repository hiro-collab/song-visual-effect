import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
export const defaultRepoRoot = path.resolve(__dirname, "..", "..");
export const MAX_TIMING_BYTES = 4 * 1024 * 1024;
export const MAX_LYRICS_BYTES = 512 * 1024;
export const MAX_TIMING_TEXT_LENGTH = 4 * 1024 * 1024;
export const MAX_LYRICS_TEXT_LENGTH = 512 * 1024;
export const V2_SCHEMA = "music-effect.lyrics-timing.v2";
export const EDITOR_PROJECT_SCHEMA = "lyric-timing-editor.project.v1";

export const isInside = (parent, child) => {
  const baseKey = process.platform === "win32" ? parent.toLowerCase() : parent;
  const targetKey = process.platform === "win32" ? child.toLowerCase() : child;
  return targetKey === baseKey || targetKey.startsWith(`${baseKey}${path.sep}`);
};

export const assertSongId = (id) => {
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(id)) {
    throw new Error("Use --id with lowercase letters, numbers, dot, underscore, or hyphen.");
  }
};

export const sanitizeName = (value) => {
  const name = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 64);
  return name || "lyrics";
};

const songPacksRootFor = (root) => path.join(root, "song-packs");

const assertInputFile = (filePath, label, maxBytes, { cwd = process.cwd(), usage = "" } = {}) => {
  if (!filePath) throw new Error(`${label} is required.${usage ? `\n\n${usage}` : ""}`);
  const resolved = path.resolve(cwd, filePath);
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

const readJsonText = (text, label) => {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
};

const readJsonFile = (filePath) => readJsonText(fs.readFileSync(filePath, "utf8"), path.basename(filePath));

const assertSongRoot = (root, id) => {
  const songPacksRoot = songPacksRootFor(root);
  if (!fs.existsSync(songPacksRoot)) {
    throw new Error(`song-packs directory not found: ${path.relative(root, songPacksRoot)}`);
  }
  const realSongPacksRoot = fs.realpathSync(songPacksRoot);
  const songRoot = path.join(songPacksRoot, id);
  if (!fs.existsSync(songRoot)) {
    throw new Error(`Song pack not found: ${path.relative(root, songRoot)}`);
  }
  if (fs.lstatSync(songRoot).isSymbolicLink()) {
    throw new Error(`Refusing symlinked song pack: ${path.relative(root, songRoot)}`);
  }
  const realSongRoot = fs.realpathSync(songRoot);
  if (!isInside(realSongPacksRoot, realSongRoot)) {
    throw new Error(`Song pack escapes song-packs: ${id}`);
  }
  return { songRoot, realSongRoot };
};

const assertWritablePath = (root, filePath, realSongRoot) => {
  const parentPath = path.dirname(filePath);
  fs.mkdirSync(parentPath, { recursive: true });
  if (fs.lstatSync(parentPath).isSymbolicLink()) {
    throw new Error(`Refusing to write through symlink: ${path.relative(root, parentPath)}`);
  }
  const realParent = fs.realpathSync(parentPath);
  if (!isInside(realSongRoot, realParent)) {
    throw new Error(`Refusing to write outside song pack: ${path.relative(root, filePath)}`);
  }
  if (fs.existsSync(filePath) && fs.lstatSync(filePath).isSymbolicLink()) {
    throw new Error(`Refusing to overwrite symlink: ${path.relative(root, filePath)}`);
  }
};

const writeFileChecked = (root, filePath, content, { force, dryRun, realSongRoot }) => {
  assertWritablePath(root, filePath, realSongRoot);
  if (!force && fs.existsSync(filePath)) {
    throw new Error(`Refusing to overwrite existing file without --force: ${path.relative(root, filePath)}`);
  }
  if (dryRun) return;
  fs.writeFileSync(filePath, content, "utf8");
};

const toRelativeManifestPath = (filePath, songRoot) => `./${path.relative(songRoot, filePath).split(path.sep).join("/")}`;

const inferName = ({ explicitName, timingJson, timingPath, id }) => {
  if (explicitName) return sanitizeName(explicitName);
  if (typeof timingJson.slug === "string" && timingJson.slug.trim()) return sanitizeName(timingJson.slug);
  if (timingPath) {
    const base = path.basename(timingPath).replace(/\.json$/i, "");
    return sanitizeName(base) || id;
  }
  return sanitizeName(id);
};

export const validateTimingV2 = (timingJson) => {
  const warnings = [];
  if (!timingJson || typeof timingJson !== "object" || Array.isArray(timingJson)) {
    throw new Error("Timing JSON must be an object.");
  }
  if (timingJson.schema === EDITOR_PROJECT_SCHEMA) {
    throw new Error(
      `This is a Lyric Timing Editor Work Project JSON (${EDITOR_PROJECT_SCHEMA}). Choose Export -> Music Effect v2 and install that ${V2_SCHEMA} JSON instead.`
    );
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

const normalizeOptionalText = (text, label, maxLength) => {
  if (text === null || text === undefined) return null;
  if (typeof text !== "string") throw new Error(`${label} must be text.`);
  if (text.length > maxLength) throw new Error(`${label} is too large.`);
  return text;
};

const finiteNumber = (value) => (typeof value === "number" && Number.isFinite(value) ? value : null);

const collectDurationWarnings = (manifest, timingJson) => {
  const manifestDuration = finiteNumber(manifest.duration);
  const timingDurationMs = finiteNumber(timingJson.durationMs);
  if (manifestDuration === null || timingDurationMs === null) return [];

  const timingDuration = timingDurationMs / 1000;
  const drift = Math.abs(manifestDuration - timingDuration);
  if (drift <= 1) return [];

  return [
    `timing duration ${timingDuration.toFixed(3)}s differs from manifest duration ${manifestDuration.toFixed(3)}s; playback may warn or hide late lyrics.`
  ];
};

export const installLyricsDataFromText = ({
  root = defaultRepoRoot,
  id,
  timingText,
  lyricsText = null,
  name = "",
  force = false,
  dryRun = false
} = {}) => {
  const songId = String(id ?? "").trim();
  assertSongId(songId);
  if (typeof timingText !== "string" || !timingText.trim()) {
    throw new Error("timing JSON is required.");
  }
  if (timingText.length > MAX_TIMING_TEXT_LENGTH) {
    throw new Error("timing JSON is too large.");
  }
  const normalizedLyricsText = normalizeOptionalText(lyricsText, "lyrics text", MAX_LYRICS_TEXT_LENGTH);
  const timingJson = readJsonText(timingText, "timing JSON");
  const timingWarnings = validateTimingV2(timingJson);
  const { songRoot, realSongRoot } = assertSongRoot(root, songId);
  const manifestPath = path.join(songRoot, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`manifest.json not found: ${path.relative(root, manifestPath)}`);
  }

  const manifest = readJsonFile(manifestPath);
  timingWarnings.push(...collectDurationWarnings(manifest, timingJson));
  const fileName = inferName({ explicitName: name, timingJson, id: songId });
  const lyricsDir = path.join(songRoot, "lyrics");
  const timingTarget = path.join(lyricsDir, `${fileName}.timing.v2.json`);
  const hasLyricsText = normalizedLyricsText !== null;
  const lyricsTarget = hasLyricsText ? path.join(lyricsDir, `${fileName}.lyrics.txt`) : null;

  if (timingJson.includesLyrics === false && !hasLyricsText) {
    timingWarnings.push("timing-only export has no --lyrics file; playback may have no lyric text.");
  }
  if (timingJson.includesLyrics === true && hasLyricsText) {
    timingWarnings.push("with-lyrics export also has --lyrics; Music Effect will prefer phrase text from timing JSON.");
  }

  writeFileChecked(root, timingTarget, `${JSON.stringify(timingJson, null, 2)}\n`, {
    force,
    dryRun,
    realSongRoot
  });

  if (hasLyricsText && lyricsTarget) {
    writeFileChecked(root, lyricsTarget, normalizedLyricsText.endsWith("\n") ? normalizedLyricsText : `${normalizedLyricsText}\n`, {
      force,
      dryRun,
      realSongRoot
    });
  }

  const nextManifest = {
    ...manifest,
    lyrics: lyricsTarget ? toRelativeManifestPath(lyricsTarget, songRoot) : timingJson.includesLyrics === true ? null : manifest.lyrics ?? null,
    analysis: {
      ...(manifest.analysis ?? {}),
      timing: toRelativeManifestPath(timingTarget, songRoot)
    }
  };

  writeFileChecked(root, manifestPath, `${JSON.stringify(nextManifest, null, 2)}\n`, {
    force: true,
    dryRun,
    realSongRoot
  });

  return {
    id: songId,
    name: fileName,
    dryRun,
    includesLyrics: timingJson.includesLyrics === true,
    timingOnly: timingJson.includesLyrics === false,
    timing: path.relative(root, timingTarget),
    lyrics: lyricsTarget ? path.relative(root, lyricsTarget) : null,
    manifest: path.relative(root, manifestPath),
    warnings: timingWarnings,
    next: [
      `npm run song:validate -- --id ${songId}`,
      "npm test",
      "npm run build"
    ]
  };
};

export const installLyricsData = ({
  root = defaultRepoRoot,
  cwd = process.cwd(),
  id,
  timingPath,
  lyricsPath = null,
  name = "",
  force = false,
  dryRun = false,
  usage = ""
} = {}) => {
  const resolvedTimingPath = assertInputFile(String(timingPath ?? ""), "--timing", MAX_TIMING_BYTES, { cwd, usage });
  const resolvedLyricsPath = lyricsPath ? assertInputFile(String(lyricsPath), "--lyrics", MAX_LYRICS_BYTES, { cwd, usage }) : null;
  const timingText = fs.readFileSync(resolvedTimingPath, "utf8");
  const lyricsText = resolvedLyricsPath ? fs.readFileSync(resolvedLyricsPath, "utf8") : null;
  const timingJson = readJsonText(timingText, path.basename(resolvedTimingPath));
  const fileName = inferName({ explicitName: name, timingJson, timingPath: resolvedTimingPath, id });

  return installLyricsDataFromText({
    root,
    id,
    timingText,
    lyricsText,
    name: fileName,
    force,
    dryRun
  });
};

export const formatInstallResult = (result) => {
  const action = result.dryRun ? "Would install" : "Installed";
  const lines = [
    `${action} lyric timing for ${result.id}`,
    `  timing: ${result.timing}`,
    `  lyrics: ${result.lyrics ?? "(embedded in timing JSON or unchanged)"}`,
    `  manifest: ${result.manifest}`
  ];
  for (const warning of result.warnings ?? []) {
    lines.push(`Warning: ${warning}`);
  }
  lines.push("", `Next: npm run song:validate -- --id ${result.id}`);
  return lines.join("\n");
};

export const listInstalledSongs = ({ root = defaultRepoRoot } = {}) => {
  const songPacksRoot = songPacksRootFor(root);
  if (!fs.existsSync(songPacksRoot)) return [];
  const realSongPacksRoot = fs.realpathSync(songPacksRoot);
  return fs
    .readdirSync(songPacksRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const songRoot = path.join(songPacksRoot, entry.name);
      if (fs.lstatSync(songRoot).isSymbolicLink()) return [];
      const realSongRoot = fs.realpathSync(songRoot);
      if (!isInside(realSongPacksRoot, realSongRoot)) return [];
      const manifestPath = path.join(songRoot, "manifest.json");
      if (!fs.existsSync(manifestPath)) return [];
      try {
        const manifest = readJsonFile(manifestPath);
        return [
          {
            id: String(manifest.id ?? entry.name),
            title: String(manifest.title ?? entry.name),
            artist: String(manifest.artist ?? ""),
            duration: typeof manifest.duration === "number" ? manifest.duration : null,
            lyrics: manifest.lyrics ?? null,
            timing: manifest.analysis?.timing ?? null,
            manifestPath: path.relative(root, manifestPath).split(path.sep).join("/")
          }
        ];
      } catch {
        return [];
      }
    })
    .sort((a, b) => a.id.localeCompare(b.id));
};
