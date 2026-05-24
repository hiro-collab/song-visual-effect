import { realpath, readdir, readFile, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

const SHOW_PROFILE_MAX_BYTES = 256 * 1024;

const normalizeSlashes = (value) => value.replace(/\\/g, "/");

const asDisplayText = (value, fallback) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 180) : fallback;
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
  const itemErrors = [];
  const setlist = [];

  for (const [index, item] of setlistFromProfile(profile).entries()) {
    try {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        throw new Error(`setlist[${index}] must be an object.`);
      }
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
