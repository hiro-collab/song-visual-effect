import { mkdir, realpath, readdir, readFile, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

const MANIFEST_MAX_BYTES = 256 * 1024;

const normalizeSlashes = (value) => value.replace(/\\/g, "/");

const asDisplayText = (value, fallback) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 160) : fallback;
};

const asDuration = (value) => {
  const duration = Number(value);
  return Number.isFinite(duration) && duration > 0 ? duration : null;
};

const targetById = (config, id) => config.targets.find((target) => target.id === id) ?? null;

const firstUsableUrl = (target) => target?.urls?.open ?? null;

const deckTargetSpecs = [
  { id: "deck-a", label: "Deck A", targetId: "deck-a-player" },
  { id: "deck-b", label: "Deck B", targetId: "deck-b-player" }
];

const listDecks = (config) => {
  const decks = deckTargetSpecs
    .map((spec) => {
      const target = targetById(config, spec.targetId);
      const playerBaseUrl = firstUsableUrl(target);
      return target && playerBaseUrl ? { ...spec, playerBaseUrl } : null;
    })
    .filter(Boolean);

  if (decks.length > 0) return decks;

  const fixturePlayer = targetById(config, "fixture-player") ?? config.targets.find((target) => target.kind === "web-app");
  const playerBaseUrl = firstUsableUrl(fixturePlayer);
  return fixturePlayer && playerBaseUrl
    ? [{ id: "deck-a", label: "Deck A", targetId: fixturePlayer.id, playerBaseUrl }]
    : [];
};

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

const readManifestSummary = async ({ songPacksRoot, songPacksRootReal, dirent, songServerBaseUrl, decks }) => {
  const directoryName = dirent.name;
  const manifestPath = resolve(songPacksRoot, directoryName, "manifest.json");
  const directoryPath = resolve(songPacksRoot, directoryName);
  const directoryRealPath = await realpath(directoryPath);
  if (!isInsidePath(songPacksRootReal, directoryRealPath)) {
    throw new Error(`${directoryName} resolves outside song-packs.`);
  }

  const manifestRealPath = await realpath(manifestPath);
  if (!isInsidePath(songPacksRootReal, manifestRealPath)) {
    throw new Error(`${directoryName}/manifest.json resolves outside song-packs.`);
  }

  const manifestStat = await stat(manifestRealPath);
  if (!manifestStat.isFile()) return null;
  if (manifestStat.size > MANIFEST_MAX_BYTES) {
    throw new Error(`${directoryName}/manifest.json is too large.`);
  }

  const manifest = JSON.parse(await readFile(manifestRealPath, "utf8"));
  const manifestUrl = songServerBaseUrl
    ? new URL(`${encodeURIComponent(directoryName)}/manifest.json`, songServerBaseUrl).toString()
    : null;

  const deckUrls = Object.fromEntries(decks.map((deck) => [deck.id, playerUrlFor(deck.playerBaseUrl, manifestUrl)]));

  return {
    id: asDisplayText(manifest.id, directoryName),
    directoryName,
    title: asDisplayText(manifest.title, directoryName),
    artist: asDisplayText(manifest.artist, ""),
    duration: asDuration(manifest.duration),
    manifestPath: normalizeSlashes(relative(resolve(songPacksRoot, ".."), manifestPath)),
    manifestUrl,
    playerUrl: deckUrls["deck-a"] ?? Object.values(deckUrls)[0] ?? null,
    deckUrls
  };
};

export const listSongCatalog = async (config) => {
  const songPacksRoot = resolve(config.root, "song-packs");
  const songPackServer =
    targetById(config, "song-pack-server") ?? config.targets.find((target) => target.kind === "asset-server");
  const decks = listDecks(config);
  const deckA = decks.find((deck) => deck.id === "deck-a") ?? decks[0] ?? null;
  const songServerBaseUrl = urlWithTrailingSlash(firstUsableUrl(songPackServer));
  const requiredTargetIds = [songPackServer?.id, deckA?.targetId].filter(Boolean);
  const launchSet =
    config.sets.find((set) => requiredTargetIds.every((targetId) => set.targets.includes(targetId))) ?? null;
  const deckTargetIds = decks.map((deck) => deck.targetId);

  let dirents = [];
  let songPacksRootReal;
  try {
    await mkdir(songPacksRoot, { recursive: true });
    songPacksRootReal = await realpath(songPacksRoot);
    dirents = await readdir(songPacksRoot, { withFileTypes: true });
  } catch (error) {
    return {
      songs: [],
      errors: [`song-packs could not be read: ${error.message}`],
      requiredTargetIds,
      launchSetId: launchSet?.id ?? null,
      songPackTargetId: songPackServer?.id ?? null,
      deckTargetIds,
      decks
    };
  }

  const songs = [];
  const errors = [];
  for (const dirent of dirents) {
    if (!dirent.isDirectory() || dirent.name.startsWith(".")) continue;
    try {
      const song = await readManifestSummary({ songPacksRoot, songPacksRootReal, dirent, songServerBaseUrl, decks });
      if (song) songs.push(song);
    } catch (error) {
      errors.push(`${dirent.name}: ${error.message}`);
    }
  }

  songs.sort((left, right) =>
    `${left.title} ${left.artist} ${left.directoryName}`.localeCompare(
      `${right.title} ${right.artist} ${right.directoryName}`,
      "ja"
    )
  );

  return {
    songs,
    errors,
    requiredTargetIds,
    launchSetId: launchSet?.id ?? null,
    songPackTargetId: songPackServer?.id ?? null,
    deckTargetIds,
    decks
  };
};
