import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import { resolveLaunchPorts } from "../scripts/launch-manager/auto-ports.mjs";
import { stablePortBaseFor } from "../scripts/launch-manager/ports.mjs";

const listen = (server, port) =>
  new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(port, "127.0.0.1", () => resolveListen());
  });

const close = (server) =>
  new Promise((resolveClose) => {
    server.close(() => resolveClose());
  });

test("Launch Manager auto ports avoid an occupied candidate and stay distinct", async () => {
  const root = mkdtempSync(join(tmpdir(), "music-effect-auto-ports-"));
  const occupied = stablePortBaseFor(root);
  const server = createServer();
  try {
    await listen(server, occupied);
    const ports = await resolveLaunchPorts({ root });
    assert.notEqual(ports.manager, occupied);
    assert.equal(ports.player, ports.deckA);
    assert.equal(new Set([ports.manager, ports.deckA, ports.deckB, ports.songPack]).size, 4);
  } finally {
    await close(server).catch(() => {});
    rmSync(root, { recursive: true, force: true });
  }
});

test("Launch Manager rejects duplicate explicit ports", async () => {
  const root = mkdtempSync(join(tmpdir(), "music-effect-auto-ports-"));
  try {
    await assert.rejects(
      () =>
        resolveLaunchPorts({
          root,
          requestedManagerPort: 53001,
          requestedDeckAPlayerPort: 53001,
          requestedDeckBPlayerPort: 53002,
          requestedSongPackPort: 53003
        }),
      /must be different/
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
