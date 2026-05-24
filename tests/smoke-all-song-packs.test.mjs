import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { listSongPackIds, selectSongIds } from "../scripts/smoke-all-song-packs.mjs";

const writeManifest = (root, id) => {
  const directory = resolve(root, "song-packs", id);
  mkdirSync(directory, { recursive: true });
  writeFileSync(resolve(directory, "manifest.json"), JSON.stringify({ id, title: id, audio: null }), "utf8");
};

test("song:smoke:all lists manifest-backed song packs in stable order", () => {
  const root = mkdtempSync(join(tmpdir(), "music-effect-smoke-all-"));
  try {
    mkdirSync(resolve(root, "song-packs", "not-a-pack"), { recursive: true });
    writeManifest(root, "z-song");
    writeManifest(root, "a-song");
    assert.deepEqual(listSongPackIds({ root }), ["a-song", "z-song"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("song:smoke:all selection supports include, exclude, and max", () => {
  assert.deepEqual(
    selectSongIds({
      allIds: ["a", "b", "c"],
      includeIds: ["c", "a"],
      excludeIds: ["c"],
      max: 1
    }),
    ["a"]
  );
  assert.throws(
    () => selectSongIds({ allIds: ["a"], includeIds: ["missing"] }),
    /Unknown song-pack id/
  );
});
