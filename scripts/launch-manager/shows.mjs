import { realpath, readdir, readFile, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

const SHOW_PROFILE_MAX_BYTES = 256 * 1024;
const SHOW_PROFILE_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const SHOW_PROFILE_MAX_SETLIST_ITEMS = 200;
const FORBIDDEN_KEY_PATTERN = /lyrics?|body|content|image|screenshot|base64|datauri|html|markdown|transcript|quote|fulltext|secret|token|password|api[_-]?key/i;
const FORBIDDEN_VALUE_PATTERN = /data:image\/|data:audio\/|data:video\/|base64,|<img\b|<script\b|<iframe\b/i;
const SECRET_VALUE_PATTERN =
  /-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{20,}|ghp_[0-9A-Za-z_]{20,}|hf_[0-9A-Za-z]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}/;

const normalizeSlashes = (value) => value.replace(/\\/g, "/");

const asDisplayText = (value, fallback) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 180) : fallback;
};

const assertShortString = (value, label, maxLength) => {
  if (value === undefined || value === null) return;
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string.`);
  }
  if (value.length > maxLength) {
    throw new Error(`${label} is too long.`);
  }
  if (FORBIDDEN_VALUE_PATTERN.test(value) || SECRET_VALUE_PATTERN.test(value)) {
    throw new Error(`${label} contains embedded data, active markup, or secret-like text.`);
  }
};

const scanProfileValue = (value, label) => {
  if (value === null || value === undefined) return;
  if (typeof value === "string") {
    assertShortString(value, label, 4096);
    return;
  }
  if (typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanProfileValue(item, `${label}[${index}]`));
    return;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    if (FORBIDDEN_KEY_PATTERN.test(key)) {
      throw new Error(`${label}.${key} is not allowed in show-profile metadata.`);
    }
    scanProfileValue(nestedValue, `${label}.${key}`);
  }
};

const targetById = (config, id) => config.targets.find((target) => target.id === id) ?? null;

const firstUsableUrl = (target) => target?.urls?.open ?? null;

const isInsidePath = (root, candidate) => {
  const path = relative(root, candidate);
  return path === "" || (!path.startsWith("..") && !isAbsolute(path));
};

const urlWithTrailingSlash = (value) => {
  if (!value) return null;
  const url = new URL(value);
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url.toString();
};

const playerUrlFor = (playerBaseUrl, manifestUrl) => {
  if (!playerBaseUrl || !manifestUrl) return null;
  const url = new URL(playerBaseUrl);
  url.searchParams.set("song", manifestUrl);
  return url.toString();
};

const rejectExternalOrAbsolutePath = (value, label) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a relative local path.`);
  }
  const trimmed = value.trim();
  if (isAbsolute(trimmed) || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    throw new Error(`${label} must not be an absolute path or URL.`);
  }
  return normalizeSlashes(trimmed).replace(/^\.\//, "");
};

const resolveSongManifest = async ({ root, songPacksRootReal, value, label }) => {
  const normalized = rejectExternalOrAbsolutePath(value, label);
  const match = /^song-packs\/([^/]+)\/manifest\.json$/.exec(normalized);
  if (!match) {
    throw new Error(`${label} must look like song-packs/<song-id>/manifest.json.`);
  }
  const target = resolve(root, normalized);
  const parent = resolve(target, "..");
  const realParent = await realpath(parent);
  if (!isInsidePath(songPacksRootReal, realParent)) {
    throw new Error(`${label} resolves outside song-packs.`);
  }
  return {
    manifestPath: normalized,
    songDirectoryName: match[1]
  };
};

const setlistFromProfile = (profile) => {
  if (Array.isArray(profile?.setlist)) return profile.setlist;
  if (Array.isArray(profile?.songs)) return profile.songs;
  return [];
};

const readShowProfileSummary = async ({
  config,
  showProfilesRoot,
  showProfilesRootReal,
  songPacksRootReal,
  dirent,
  songServerBaseUrl,
  playerBaseUrl
}) => {
  const directoryName = dirent.name;
  if (!SHOW_PROFILE_ID_PATTERN.test(directoryName)) {
    throw new Error(`${directoryName} is not a valid show-profile directory name.`);
  }
  const directoryPath = resolve(showProfilesRoot, directoryName);
  const showPath = resolve(directoryPath, "show.json");
  const directoryRealPath = await realpath(directoryPath);
  if (!isInsidePath(showProfilesRootReal, directoryRealPath)) {
    throw new Error(`${directoryName} resolves outside show-profiles.`);
  }

  const showRealPath = await realpath(showPath);
  if (!isInsidePath(showProfilesRootReal, showRealPath)) {
    throw new Error(`${directoryName}/show.json resolves outside show-profiles.`);
  }

  const showStat = await stat(showRealPath);
  if (!showStat.isFile()) return null;
  if (showStat.size > SHOW_PROFILE_MAX_BYTES) {
    throw new Error(`${directoryName}/show.json is too large.`);
  }

  const profile = JSON.parse(await readFile(showRealPath, "utf8"));
  scanProfileValue(profile, "show");
  assertShortString(profile.id, "show.id", 80);
  assertShortString(profile.title, "show.title", 180);
  assertShortString(profile.description, "show.description", 600);
  const itemErrors = [];
  const setlist = [];

  const rawSetlist = setlistFromProfile(profile);
  if (rawSetlist.length > SHOW_PROFILE_MAX_SETLIST_ITEMS) {
    throw new Error(`setlist has too many entries. Max ${SHOW_PROFILE_MAX_SETLIST_ITEMS}.`);
  }

  for (const [index, item] of rawSetlist.entries()) {
    try {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new Error(`setlist[${index}] must be an object.`);
      }
      assertShortString(item.songId, `setlist[${index}].songId`, 80);
      assertShortString(item.manifest ?? item.manifestPath, `setlist[${index}].manifest`, 240);
      assertShortString(item.label ?? item.title, `setlist[${index}].label`, 180);
      assertShortString(item.notes, `setlist[${index}].notes`, 600);
      const songId = asDisplayText(item.songId, "");
      const manifestValue = item.manifest ?? item.manifestPath ?? (songId ? `song-packs/${songId}/manifest.json` : "");
      const resolved = await resolveSongManifest({
        root: config.root,
        songPacksRootReal,
        value: manifestValue,
        label: `setlist[${index}].manifest`
      });
      const manifestUrl = songServerBaseUrl
        ? new URL(`${encodeURIComponent(resolved.songDirectoryName)}/manifest.json`, songServerBaseUrl).toString()
        : null;

      setlist.push({
        index,
        songId: songId || resolved.songDirectoryName,
        songDirectoryName: resolved.songDirectoryName,
        label: asDisplayText(item.label ?? item.title, songId || resolved.songDirectoryName),
        notes: asDisplayText(item.notes, ""),
        manifestPath: resolved.manifestPath,
        manifestUrl,
        playerUrl: playerUrlFor(playerBaseUrl, manifestUrl)
      });
    } catch (error) {
      itemErrors.push(`${directoryName} setlist[${index}]: ${error.message}`);
    }
  }

  return {
    id: asDisplayText(profile.id, directoryName),
    directoryName,
    title: asDisplayText(profile.title, directoryName),
    description: asDisplayText(profile.description, ""),
    showPath: normalizeSlashes(relative(config.root, showPath)),
    schemaVersion: Number.isFinite(Number(profile.schemaVersion)) ? Number(profile.schemaVersion) : 1,
    setlist,
    errors: itemErrors
  };
};

export const listShowProfiles = async (config) => {
  const showProfilesRoot = resolve(config.root, "show-profiles");
  const songPacksRoot = resolve(config.root, "song-packs");
  const fixturePlayer = targetById(config, "fixture-player") ?? config.targets.find((target) => target.kind === "web-app");
  const songPackServer =
    targetById(config, "song-pack-server") ?? config.targets.find((target) => target.kind === "asset-server");
  const playerBaseUrl = firstUsableUrl(fixturePlayer);
  const songServerBaseUrl = urlWithTrailingSlash(firstUsableUrl(songPackServer));

  let dirents = [];
  let showProfilesRootReal;
  let songPacksRootReal;
  try {
    showProfilesRootReal = await realpath(showProfilesRoot);
    songPacksRootReal = await realpath(songPacksRoot);
    dirents = await readdir(showProfilesRoot, { withFileTypes: true });
  } catch {
    return { profiles: [], errors: [] };
  }

  const profiles = [];
  const errors = [];
  for (const dirent of dirents) {
    if (!dirent.isDirectory() || dirent.name.startsWith(".")) continue;
    try {
      const profile = await readShowProfileSummary({
        config,
        showProfilesRoot,
        showProfilesRootReal,
        songPacksRootReal,
        dirent,
        songServerBaseUrl,
        playerBaseUrl
      });
      if (profile) {
        profiles.push(profile);
        errors.push(...profile.errors);
      }
    } catch (error) {
      errors.push(`${dirent.name}: ${error.message}`);
    }
  }

  profiles.sort((left, right) =>
    `${left.title} ${left.directoryName}`.localeCompare(`${right.title} ${right.directoryName}`, "ja")
  );

  return { profiles, errors };
};
