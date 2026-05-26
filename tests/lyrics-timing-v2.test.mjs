import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const sourceFile = new URL("../system/kit/core/lyricsTiming.ts", import.meta.url);

const loadLyricsTimingModule = async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "music-effect-lyrics-timing-"));
  const source = await readFile(sourceFile, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  await writeFile(join(tempDir, "package.json"), JSON.stringify({ type: "module" }));
  await writeFile(join(tempDir, "lyricsTiming.js"), output);
  return import(new URL(`file:///${join(tempDir, "lyricsTiming.js").replaceAll("\\", "/")}`));
};

test("lyrics timing legacy v1 remains seconds-based", async () => {
  const { collectTimedLyrics } = await loadLyricsTimingModule();
  const cues = collectTimedLyrics({
    schema: "music-effect.lyrics-timing.v1",
    timeUnit: "seconds",
    lyrics: [
      { index: 0, start: 1.25, end: 2.75, text: "synthetic first" },
      { index: 1, startSec: 3, endSec: 4, text: "synthetic second" }
    ]
  });

  assert.deepEqual(cues.map((cue) => cue.text), ["synthetic first", "synthetic second"]);
  assert.equal(cues[0].time, 1.25);
  assert.equal(cues[0].end, 2.75);
  assert.equal(cues[1].time, 3);
});

test("lyrics timing v2 with lyrics converts milliseconds to seconds", async () => {
  const { collectTimedLyrics } = await loadLyricsTimingModule();
  const warnings = [];
  const cues = collectTimedLyrics(
    {
      schema: "music-effect.lyrics-timing.v2",
      title: "Synthetic Song",
      artist: "Synthetic Artist",
      durationMs: 10000,
      slug: "synthetic-song",
      sourceProjectSchema: "lyric-timing-editor.project.v1",
      songle: { id: "1234", url: "https://songle.jp/songs/example" },
      timeUnit: "ms",
      includesLyrics: true,
      rightsNotice: "Synthetic test fixture. No real lyric rights are involved.",
      phrases: [
        { id: "phrase-0001", index: 0, startTimeMs: 1200, endTimeMs: 3000, text: "alpha", sourceLine: 1 },
        { id: "phrase-0002", index: 1, startTimeMs: 3000, endTimeMs: 4500, text: "beta", sourceLine: 2 }
      ]
    },
    { warnings }
  );

  assert.equal(warnings.length, 0);
  assert.deepEqual(cues, [
    { id: "phrase-0001", index: 0, sourceLine: 1, time: 1.2, end: 3, text: "alpha" },
    { id: "phrase-0002", index: 1, sourceLine: 2, time: 3, end: 4.5, text: "beta" }
  ]);
});

test("lyrics timing v2 timing-only joins song-pack lyric lines by index", async () => {
  const { collectTimedLyrics } = await loadLyricsTimingModule();
  const warnings = [];
  const cues = collectTimedLyrics(
    {
      schema: "music-effect.lyrics-timing.v2",
      durationMs: 8000,
      timeUnit: "ms",
      includesLyrics: false,
      rightsNotice: "Timing-only test fixture.",
      phrases: [
        { id: "phrase-0001", index: 1, sourceLine: 10, startTimeMs: 1000, endTimeMs: 2200 },
        { id: "phrase-0002", index: 2, sourceLine: 11, startTimeMs: 2200, endTimeMs: 4300 }
      ]
    },
    {
      lyricLines: ["zero", "one", "two"],
      warnings
    }
  );

  assert.equal(warnings.length, 0);
  assert.deepEqual(cues.map((cue) => cue.text), ["one", "two"]);
  assert.deepEqual(cues.map((cue) => cue.sourceLine), [10, 11]);
  assert.equal(cues[0].time, 1);
  assert.equal(cues[1].end, 4.3);
});

test("lyrics timing v2 keeps blank display ranges without requiring lyric text", async () => {
  const { collectTimedLyrics } = await loadLyricsTimingModule();
  const warnings = [];
  const cues = collectTimedLyrics(
    {
      schema: "music-effect.lyrics-timing.v2",
      durationMs: 3000,
      timeUnit: "ms",
      includesLyrics: false,
      rightsNotice: "Timing-only test fixture.",
      phrases: [
        { id: "intro", index: 0, sourceLine: 0, startTimeMs: 0, endTimeMs: 1000, displayMode: "blank" },
        { id: "phrase-0001", index: 1, sourceLine: 1, startTimeMs: 1000, endTimeMs: 3000 }
      ]
    },
    {
      lyricLines: ["should-not-be-used", "first lyric"],
      warnings
    }
  );

  assert.equal(warnings.length, 0);
  assert.deepEqual(cues, [
    { id: "intro", index: 0, sourceLine: 0, displayMode: "blank", time: 0, end: 1, text: "" },
    { id: "phrase-0001", index: 1, sourceLine: 1, time: 1, end: 3, text: "first lyric" }
  ]);
});

test("lyrics timing v2 warns when phrase ranges are not contiguous", async () => {
  const { collectTimedLyrics } = await loadLyricsTimingModule();
  const warnings = [];
  collectTimedLyrics(
    {
      schema: "music-effect.lyrics-timing.v2",
      durationMs: 5000,
      timeUnit: "ms",
      includesLyrics: true,
      rightsNotice: "Synthetic test fixture. No real lyric rights are involved.",
      phrases: [
        { id: "phrase-0001", index: 0, sourceLine: 1, startTimeMs: 1000, endTimeMs: 2200, text: "alpha" },
        { id: "phrase-0002", index: 1, sourceLine: 2, startTimeMs: 3000, endTimeMs: 4200, text: "beta" }
      ]
    },
    { warnings }
  );

  assert.match(warnings.join("\n"), /startTimeMs does not match previous endTimeMs/);
});

test("lyrics timing v2 reports invalid timing and missing text", async () => {
  const { collectTimedLyrics } = await loadLyricsTimingModule();
  const warnings = [];
  const cues = collectTimedLyrics(
    {
      schema: "music-effect.lyrics-timing.v2",
      durationMs: 2000,
      timeUnit: "ms",
      includesLyrics: false,
      rightsNotice: "Timing-only test fixture.",
      phrases: [
        { id: "bad-order", index: 0, sourceLine: 1, startTimeMs: 2000, endTimeMs: 1000 },
        { id: "missing-text", index: 9, sourceLine: 2, startTimeMs: 500, endTimeMs: 900 },
        { id: "long", index: 0, sourceLine: 3, startTimeMs: 1000, endTimeMs: 3500 }
      ]
    },
    {
      lyricLines: ["first"],
      duration: 2,
      warnings
    }
  );

  assert.deepEqual(cues, [{ id: "long", index: 0, sourceLine: 3, time: 1, end: 2, text: "first" }]);
  assert.match(warnings.join("\n"), /endTimeMs before startTimeMs/);
  assert.match(warnings.join("\n"), /no text and no matching lyric line/);
  assert.match(warnings.join("\n"), /endTimeMs exceeds duration/);
});

test("lyrics timing v2 metadata stays optional but invalid metadata warns", async () => {
  const { collectTimedLyrics } = await loadLyricsTimingModule();
  const warnings = [];
  const cues = collectTimedLyrics(
    {
      schema: "music-effect.lyrics-timing.v2",
      durationMs: 5000,
      slug: "Bad Slug",
      sourceProjectSchema: "other.project.v1",
      songle: "https://songle.jp/songs/example",
      timeUnit: "ms",
      includesLyrics: "yes",
      phrases: [
        { index: 0, startTimeMs: 1000, endTimeMs: 2200, text: "alpha", sourceLine: "1" }
      ]
    },
    { warnings }
  );

  assert.deepEqual(cues, [{ index: 0, time: 1, end: 2.2, text: "alpha" }]);
  assert.match(warnings.join("\n"), /slug should use lowercase/);
  assert.match(warnings.join("\n"), /sourceProjectSchema should be lyric-timing-editor\.project\.v1/);
  assert.match(warnings.join("\n"), /songle should be an object or null/);
  assert.match(warnings.join("\n"), /includesLyrics should be boolean/);
  assert.match(warnings.join("\n"), /rightsNotice is missing/);
  assert.match(warnings.join("\n"), /sourceLine is invalid/);
});

test("lyrics timing v2 warns when millisecond fields are not integers", async () => {
  const { collectTimedLyrics } = await loadLyricsTimingModule();
  const warnings = [];
  const cues = collectTimedLyrics(
    {
      schema: "music-effect.lyrics-timing.v2",
      durationMs: 5000.5,
      timeUnit: "ms",
      includesLyrics: true,
      rightsNotice: "Synthetic test fixture. No real lyric rights are involved.",
      phrases: [
        { id: "phrase-0001", index: 0, sourceLine: 1, startTimeMs: 1000.5, endTimeMs: 2200.5, text: "alpha" }
      ]
    },
    { warnings }
  );

  assert.deepEqual(cues, [{ id: "phrase-0001", index: 0, sourceLine: 1, time: 1.0005, end: 2.2005, text: "alpha" }]);
  assert.match(warnings.join("\n"), /durationMs should be integer milliseconds or null/);
  assert.match(warnings.join("\n"), /startTimeMs should be integer milliseconds/);
  assert.match(warnings.join("\n"), /endTimeMs should be integer milliseconds/);
});
