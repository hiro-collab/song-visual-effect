import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { findFreePort, findFreePortBlock, stablePortBaseFor } from "./ports.mjs";

const envNumber = (value, label) => {
  if (value === undefined || value === "") return null;
  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`${label} must be a TCP port number.`);
  }
  return port;
};

const setIfMissing = (name, value) => {
  if (!process.env[name]) process.env[name] = String(value);
};

export const resolveLaunchPorts = async ({
  root,
  host = "127.0.0.1",
  requestedManagerPort = null,
  requestedDeckAPlayerPort = null,
  requestedDeckBPlayerPort = null,
  requestedSongPackPort = null
} = {}) => {
  const base = stablePortBaseFor(resolve(root));
  const manager = requestedManagerPort ?? (await findFreePort({ start: base, host }));
  const exclude = new Set([manager]);

  let deckA = requestedDeckAPlayerPort;
  let deckB = requestedDeckBPlayerPort;
  let songPack = requestedSongPackPort;
  if (deckA !== null) exclude.add(deckA);
  if (deckB !== null) exclude.add(deckB);
  if (songPack !== null) exclude.add(songPack);

  if (deckA === null && deckB === null && songPack === null) {
    [deckA, deckB, songPack] = await findFreePortBlock({
      start: base + 1,
      count: 3,
      host,
      exclude
    });
  } else {
    if (deckA === null) {
      deckA = await findFreePort({ start: base + 1, host, exclude });
      exclude.add(deckA);
    }
    if (deckB === null) {
      deckB = await findFreePort({ start: Math.max(base + 2, deckA + 1), host, exclude });
      exclude.add(deckB);
    }
    if (songPack === null) {
      songPack = await findFreePort({ start: Math.max(base + 3, deckB + 1), host, exclude });
      exclude.add(songPack);
    }
  }

  const unique = new Set([manager, deckA, deckB, songPack]);
  if (unique.size !== 4) {
    throw new Error("Launch Manager, Deck A, Deck B, and song pack ports must be different.");
  }

  return {
    mode: "auto",
    base,
    manager,
    player: deckA,
    deckA,
    deckB,
    songPack
  };
};

export const applyLaunchPortsToEnv = (ports) => {
  setIfMissing("DEV_MANAGER_PORT", ports.manager);
  setIfMissing("PLAYER_PORT", ports.deckA ?? ports.player);
  setIfMissing("DECK_A_PLAYER_PORT", ports.deckA ?? ports.player);
  setIfMissing("DECK_B_PLAYER_PORT", ports.deckB);
  setIfMissing("SONG_PACK_PORT", ports.songPack);
};

export const resolvePortsFromEnv = async ({ root, host = "127.0.0.1", explicitManagerPort = null } = {}) => {
  const requestedManagerPort =
    explicitManagerPort ?? envNumber(process.env.DEV_MANAGER_PORT ?? process.env.LAUNCH_MANAGER_PORT, "Launch Manager port");
  const requestedDeckAPlayerPort = envNumber(process.env.DECK_A_PLAYER_PORT ?? process.env.PLAYER_PORT, "Deck A player port");
  const requestedDeckBPlayerPort = envNumber(process.env.DECK_B_PLAYER_PORT, "Deck B player port");
  const requestedSongPackPort = envNumber(process.env.SONG_PACK_PORT, "Song pack port");
  const ports = await resolveLaunchPorts({
    root,
    host,
    requestedManagerPort,
    requestedDeckAPlayerPort,
    requestedDeckBPlayerPort,
    requestedSongPackPort
  });
  return {
    ...ports,
    mode:
      requestedManagerPort === null &&
      requestedDeckAPlayerPort === null &&
      requestedDeckBPlayerPort === null &&
      requestedSongPackPort === null
        ? "auto"
        : "mixed"
  };
};

export const writePortsFile = async ({ root, runtimeRoot, configPath, ports, url }) => {
  const runtimeDir = resolve(root, ".codex", "runtime");
  await mkdir(runtimeDir, { recursive: true });
  const path = resolve(runtimeDir, "ports.json");
  const body = {
    root: resolve(root),
    pid: process.pid,
    url,
    ports,
    configPath,
    runtimeRoot,
    updatedAt: new Date().toISOString()
  };
  await writeFile(path, JSON.stringify(body, null, 2), "utf8");
  return { path, body };
};
