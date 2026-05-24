import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

const runValidate = (id) =>
  spawnSync(process.execPath, ["scripts/validate-song-pack.mjs", "--id", id], {
    cwd: repoRoot,
    encoding: "utf8"
  });

const writeJson = (filePath, value) => {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const withSongPack = async (id, build, assertion) => {
  const root = resolve(repoRoot, "song-packs", id);
  rmSync(root, { recursive: true, force: true });
  mkdirSync(root, { recursive: true });
  try {
    build(root);
    await assertion(runValidate(id));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

const writeMinimumSubmissionPack = (root, id) => {
  writeJson(resolve(root, "manifest.json"), {
    schema: "music-effect.song-manifest.v1",
    id,
    title: "Test Song",
    artist: "Test Artist",
    credits: "CREDITS.md",
    references: "references.json",
    audio: null,
    webAdapter: "song:test"
  });
  writeJson(resolve(root, "references.json"), {
    schema: "music-effect.references.v1",
    items: []
  });
  writeFileSync(
    resolve(root, "README.md"),
    "# Test Song\n\n## How to use\n\nOpen this pack through the fixture player.\n\n## Verification\n\nValidated with song:validate.\n",
    "utf8"
  );
  writeFileSync(resolve(root, "CREDITS.md"), "# Credits\n\nNo audio or lyrics are included.\n", "utf8");
};

test("song:validate accepts a minimal submission pack", async () => {
  const id = `test-validate-ok-${process.pid}`;
  await withSongPack(
    id,
    (root) => writeMinimumSubmissionPack(root, id),
    (result) => {
      assert.equal(result.status, 0, result.stderr || result.stdout);
      assert.match(result.stdout, /Song pack validation ok/);
      assert.doesNotMatch(result.stderr, /Warning:/);
    }
  );
});

test("song:validate rejects committed audio files", async () => {
  const id = `test-validate-audio-${process.pid}`;
  await withSongPack(
    id,
    (root) => {
      writeMinimumSubmissionPack(root, id);
      writeFileSync(resolve(root, "track.mp3"), "not real audio", "utf8");
    },
    (result) => {
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Audio files must not be committed/);
    }
  );
});

test("song:validate rejects copied reference body fields", async () => {
  const id = `test-validate-reference-${process.pid}`;
  await withSongPack(
    id,
    (root) => {
      writeMinimumSubmissionPack(root, id);
      writeJson(resolve(root, "references.json"), {
        schema: "music-effect.references.v1",
        items: [
          {
            label: "Article",
            type: "review",
            url: "https://example.com/review",
            purpose: "source URL",
            body: "copied article text"
          }
        ]
      });
    },
    (result) => {
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /not allowed/);
    }
  );
});
