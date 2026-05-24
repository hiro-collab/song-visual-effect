import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { listShowProfiles } from "../scripts/launch-manager/shows.mjs";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

const writeJson = (filePath, value) => {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const config = {
  root: repoRoot,
  targets: [
    {
      id: "fixture-player",
      kind: "web-app",
      urls: { open: "http://127.0.0.1:51001/" }
    },
    {
      id: "song-pack-server",
      kind: "asset-server",
      urls: { open: "http://127.0.0.1:51002/" }
    }
  ],
  sets: []
};

const withShowProfileFixture = async ({ songId, showId, show }, assertion) => {
  const songRoot = resolve(repoRoot, "song-packs", songId);
  const showRoot = resolve(repoRoot, "show-profiles", showId);
  rmSync(songRoot, { recursive: true, force: true });
  rmSync(showRoot, { recursive: true, force: true });
  mkdirSync(songRoot, { recursive: true });
  mkdirSync(showRoot, { recursive: true });
  try {
    writeJson(resolve(songRoot, "manifest.json"), {
      schema: "music-effect.song-manifest.v1",
      id: songId,
      title: "Show Loader Test Song",
      artist: "Test Artist",
      audio: null
    });
    writeJson(resolve(showRoot, "show.json"), show);
    await assertion(await listShowProfiles(config));
  } finally {
    rmSync(songRoot, { recursive: true, force: true });
    rmSync(showRoot, { recursive: true, force: true });
  }
};

test("show profile loader reads local setlist items and ignores unknown fields", async () => {
  const songId = `test-show-song-${process.pid}`;
  const showId = `test-show-ok-${process.pid}`;
  await withShowProfileFixture(
    {
      songId,
      showId,
      show: {
        schemaVersion: 1,
        id: showId,
        title: "Test Show",
        unknownFutureField: { safeToIgnore: true },
        setlist: [
          {
            songId,
            manifest: `song-packs/${songId}/manifest.json`,
            label: "Test setlist item",
            notes: "local only"
          }
        ]
      }
    },
    (result) => {
      const profile = result.profiles.find((item) => item.directoryName === showId);
      assert.ok(profile, "test show profile should be listed");
      assert.equal(profile.setlist.length, 1);
      assert.equal(profile.setlist[0].songDirectoryName, songId);
      assert.equal(profile.setlist[0].manifestUrl, `http://127.0.0.1:51002/${songId}/manifest.json`);
      assert.match(profile.setlist[0].playerUrl, /http:\/\/127\.0\.0\.1:51001\/\?song=/);
    }
  );
});

test("show profile loader rejects external manifest URLs", async () => {
  const songId = `test-show-song-bad-${process.pid}`;
  const showId = `test-show-bad-${process.pid}`;
  await withShowProfileFixture(
    {
      songId,
      showId,
      show: {
        schemaVersion: 1,
        id: showId,
        title: "Bad Test Show",
        setlist: [
          {
            manifest: "https://example.com/song/manifest.json",
            label: "External manifest"
          }
        ]
      }
    },
    (result) => {
      assert.ok(result.errors.some((error) => error.includes("must not be an absolute path or URL")));
      const profile = result.profiles.find((item) => item.directoryName === showId);
      assert.ok(profile, "bad show profile itself is still listed for diagnosis");
      assert.equal(profile.setlist.length, 0);
    }
  );
});
