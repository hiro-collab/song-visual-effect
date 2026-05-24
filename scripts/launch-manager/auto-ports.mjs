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
  requestedPlayerPort = null,
  requestedSongPackPort = null
} = {}) => {
  const base = stablePortBaseFor(resolve(root));
  const manager = requestedManagerPort ?? (await findFreePort({ start: base, host }));
  const exclude = new Set([manager]);

  let player = requestedPlayerPort;
  let songPack = requestedSongPackPort;
  if (player !== null) exclude.add(player);
  if (songPack !== null) exclude.add(songPack);

  if (player === null && songPack === null) {
    [player, songPack] = await findFreePortBlock({
      start: base + 1,
      count: 2,
      host,
      exclude
    });
  } else if (player === null) {
    player = await findFreePort({ start: base + 1, host, exclude });
  } else if (songPack === null) {
    songPack = await findFreePort({ start: Math.max(base + 2, player + 1), host, exclude });
  }

  const unique = new Set([manager, player, songPack]);
  if (unique.size !== 3) {
    throw new Error("Launch Manager, player, and song pack ports must be different.");
  }

  return {
    mode: "auto",
    base,
    manager,
    player,
    songPack
  };
};

export const applyLaunchPortsToEnv = (ports) => {
  setIfMissing("DEV_MANAGER_PORT", ports.manager);
  setIfMissing("PLAYER_PORT", ports.player);
  setIfMissing("SONG_PACK_PORT", ports.songPack);
};

export const resolvePortsFromEnv = async ({ root, host = "127.0.0.1", explicitManagerPort = null } = {}) => {
  const requestedManagerPort =
    explicitManagerPort ?? envNumber(process.env.DEV_MANAGER_PORT ?? process.env.LAUNCH_MANAGER_PORT, "Launch Manager port");
  const requestedPlayerPort = envNumber(process.env.PLAYER_PORT, "Player port");
  const requestedSongPackPort = envNumber(process.env.SONG_PACK_PORT, "Song pack port");
  const ports = await resolveLaunchPorts({
    root,
    host,
    requestedManagerPort,
    requestedPlayerPort,
    requestedSongPackPort
  });
  return {
    ...ports,
    mode:
      requestedManagerPort === null && requestedPlayerPort === null && requestedSongPackPort === null
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
