import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { installLyricsDataFromText } from "../scripts/lyrics-installer/install.mjs";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const songId = "lyrics-install-test";
const songRoot = join(repoRoot, "song-packs", songId);
const tempInputRoot = join(repoRoot, ".codex", "runtime", "install-lyrics-data-test");

const clean = () => {
  rmSync(songRoot, { recursive: true, force: true });
  rmSync(tempInputRoot, { recursive: true, force: true });
};

const runInstall = (args) => spawnSync(
  process.execPath,
  ["scripts/install-lyrics-data.mjs", ...args],
  { cwd: repoRoot, encoding: "utf8" }
);

test("install-lyrics-data copies v2 timing, lyrics text, and updates manifest", () => {
  clean();
  try {
    mkdirSync(songRoot, { recursive: true });
    mkdirSync(tempInputRoot, { recursive: true });
    writeFileSync(
      join(songRoot, "manifest.json"),
      `${JSON.stringify({
        schema: "music-effect.song-manifest.v1",
        id: songId,
        title: "Synthetic Install Test",
        artist: "Synthetic",
        lyrics: null,
        analysis: { timing: null }
      }, null, 2)}\n`,
      "utf8"
    );
    writeFileSync(
      join(tempInputRoot, "timing.json"),
      `${JSON.stringify({
        schema: "music-effect.lyrics-timing.v2",
        slug: "install-test",
        timeUnit: "ms",
        includesLyrics: false,
        rightsNotice: "Synthetic test fixture.",
        durationMs: 2000,
        phrases: [
          { id: "phrase-0001", index: 0, sourceLine: 1, startTimeMs: 0, endTimeMs: 1000 },
          { id: "phrase-0002", index: 1, sourceLine: 2, startTimeMs: 1000, endTimeMs: 2000 }
        ]
      })}\n`,
      "utf8"
    );
    writeFileSync(join(tempInputRoot, "lyrics.txt"), "alpha\nbeta\n", "utf8");

    const result = runInstall([
      "--id", songId,
      "--timing", join(tempInputRoot, "timing.json"),
      "--lyrics", join(tempInputRoot, "lyrics.txt"),
      "--name", "live"
    ]);

    assert.equal(result.status, 0, result.stderr);
    assert.ok(existsSync(join(songRoot, "lyrics", "live.timing.v2.json")));
    assert.ok(existsSync(join(songRoot, "lyrics", "live.lyrics.txt")));

    const manifest = JSON.parse(readFileSync(join(songRoot, "manifest.json"), "utf8"));
    assert.equal(manifest.lyrics, "./lyrics/live.lyrics.txt");
    assert.equal(manifest.analysis.timing, "./lyrics/live.timing.v2.json");
  } finally {
    clean();
  }
});

test("install-lyrics-data can install with-lyrics v2 without separate lyric text", () => {
  clean();
  try {
    mkdirSync(songRoot, { recursive: true });
    mkdirSync(tempInputRoot, { recursive: true });
    writeFileSync(
      join(songRoot, "manifest.json"),
      `${JSON.stringify({
        schema: "music-effect.song-manifest.v1",
        id: songId,
        title: "Synthetic Install Test",
        artist: "Synthetic",
        lyrics: "./lyrics/old.txt",
        analysis: { timing: "./lyrics/old.json" }
      }, null, 2)}\n`,
      "utf8"
    );
    writeFileSync(
      join(tempInputRoot, "timing.json"),
      `${JSON.stringify({
        schema: "music-effect.lyrics-timing.v2",
        slug: "embedded-test",
        timeUnit: "ms",
        includesLyrics: true,
        rightsNotice: "Synthetic test fixture.",
        durationMs: 1000,
        phrases: [
          { id: "phrase-0001", index: 0, sourceLine: 1, startTimeMs: 0, endTimeMs: 1000, text: "alpha" }
        ]
      })}\n`,
      "utf8"
    );

    const result = runInstall([
      "--id", songId,
      "--timing", join(tempInputRoot, "timing.json")
    ]);

    assert.equal(result.status, 0, result.stderr);
    const manifest = JSON.parse(readFileSync(join(songRoot, "manifest.json"), "utf8"));
    assert.equal(manifest.lyrics, null);
    assert.equal(manifest.analysis.timing, "./lyrics/embedded-test.timing.v2.json");
  } finally {
    clean();
  }
});

test("shared lyrics installer helper warns when timing duration differs from manifest", () => {
  clean();
  try {
    mkdirSync(songRoot, { recursive: true });
    writeFileSync(
      join(songRoot, "manifest.json"),
      `${JSON.stringify({
        schema: "music-effect.song-manifest.v1",
        id: songId,
        title: "Synthetic Install Test",
        artist: "Synthetic",
        duration: 10,
        lyrics: null,
        analysis: { timing: null }
      }, null, 2)}\n`,
      "utf8"
    );

    const result = installLyricsDataFromText({
      root: repoRoot,
      id: songId,
      name: "duration-mismatch",
      timingText: `${JSON.stringify({
        schema: "music-effect.lyrics-timing.v2",
        slug: "duration-mismatch",
        timeUnit: "ms",
        includesLyrics: true,
        rightsNotice: "Synthetic test fixture.",
        durationMs: 181000,
        phrases: [
          { id: "phrase-0001", index: 0, sourceLine: 1, startTimeMs: 0, endTimeMs: 181000, text: "alpha" }
        ]
      })}\n`
    });

    assert.match(result.warnings.join("\n"), /timing duration 181\.000s differs from manifest duration 10\.000s/);
  } finally {
    clean();
  }
});

test("shared lyrics installer helper installs from uploaded text", () => {
  clean();
  try {
    mkdirSync(songRoot, { recursive: true });
    writeFileSync(
      join(songRoot, "manifest.json"),
      `${JSON.stringify({
        schema: "music-effect.song-manifest.v1",
        id: songId,
        title: "Synthetic Install Test",
        artist: "Synthetic",
        lyrics: null,
        analysis: { timing: null }
      }, null, 2)}\n`,
      "utf8"
    );

    const result = installLyricsDataFromText({
      root: repoRoot,
      id: songId,
      name: "uploaded",
      timingText: `${JSON.stringify({
        schema: "music-effect.lyrics-timing.v2",
        timeUnit: "ms",
        includesLyrics: false,
        rightsNotice: "Synthetic test fixture.",
        durationMs: 2000,
        phrases: [
          { id: "phrase-0001", index: 0, sourceLine: 1, startTimeMs: 0, endTimeMs: 1000 },
          { id: "phrase-0002", index: 1, sourceLine: 2, startTimeMs: 1000, endTimeMs: 2000 }
        ]
      })}\n`,
      lyricsText: "alpha\nbeta\n"
    });

    assert.equal(result.timing, join("song-packs", songId, "lyrics", "uploaded.timing.v2.json"));
    assert.equal(result.lyrics, join("song-packs", songId, "lyrics", "uploaded.lyrics.txt"));
    const manifest = JSON.parse(readFileSync(join(songRoot, "manifest.json"), "utf8"));
    assert.equal(manifest.lyrics, "./lyrics/uploaded.lyrics.txt");
    assert.equal(manifest.analysis.timing, "./lyrics/uploaded.timing.v2.json");
  } finally {
    clean();
  }
});
