import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

const sourceFile = new URL("../system/kit/timing/lyricAdjustment.ts", import.meta.url);

const loadLyricAdjustmentModule = async () => {
  const tempDir = await mkdtemp(join(tmpdir(), "music-effect-lyric-adjustment-"));
  const source = await readFile(sourceFile, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  await writeFile(join(tempDir, "package.json"), JSON.stringify({ type: "module" }));
  await writeFile(join(tempDir, "lyricAdjustment.js"), output);
  return import(new URL(`file:///${join(tempDir, "lyricAdjustment.js").replaceAll("\\", "/")}`));
};

const lyrics = [
  { id: "phrase-1", index: 0, sourceLine: 1, time: 1, end: 2, text: "alpha" },
  { id: "phrase-2", index: 1, sourceLine: 2, time: 3, end: 4, text: "beta" }
];

test("lyric cue fingerprint ignores lyric text and uses timing structure", async () => {
  const { createLyricCueFingerprint } = await loadLyricAdjustmentModule();
  const sameTimingDifferentText = lyrics.map((cue) => ({ ...cue, text: `${cue.text} changed` }));
  const differentTiming = lyrics.map((cue, index) => ({ ...cue, time: cue.time + index * 0.1 }));

  assert.equal(createLyricCueFingerprint(lyrics), createLyricCueFingerprint(sameTimingDifferentText));
  assert.notEqual(createLyricCueFingerprint(lyrics), createLyricCueFingerprint(differentTiming));
});

test("lyric adjustment applies cueId offsets and reports diagnostics", async () => {
  const { applyLyricAdjustment, createLyricCueFingerprint } = await loadLyricAdjustmentModule();
  const result = applyLyricAdjustment(
    lyrics,
    {
      schema: "music-effect.lyric-adjustment.v1",
      encoding: "utf-8",
      messageLanguage: "en",
      target: {
        songPackId: "test-song",
        visualId: "test-song",
        sourceFingerprint: createLyricCueFingerprint(lyrics)
      },
      adjustments: [{ cueId: "phrase-2", index: 1, startOffsetMs: 120, endOffsetMs: 220 }]
    },
    { songPackId: "test-song", visualId: "test-song", slug: "test-song", duration: 10 }
  );

  assert.equal(result.lyrics[0].time, 1);
  assert.equal(result.lyrics[1].time, 3.12);
  assert.equal(result.lyrics[1].end, 4.22);
  assert.equal(result.diagnostics.status, "ok");
  assert.equal(result.diagnostics.fingerprintMatched, true);
  assert.equal(result.diagnostics.appliedCount, 1);
  assert.equal(result.diagnostics.matchedBy, "cueId");
});

test("lyric adjustment warns on fingerprint mismatch, index fallback, and min duration clamp", async () => {
  const { applyLyricAdjustment } = await loadLyricAdjustmentModule();
  const result = applyLyricAdjustment(
    lyrics,
    {
      schema: "music-effect.lyric-adjustment.v1",
      target: {
        songPackId: "test-song",
        sourceFingerprint: "fnv1a32:deadbeef"
      },
      adjustments: [
        { cueId: "missing-cue", index: 0, startOffsetMs: 1200, endOffsetMs: 0 },
        { cueId: "still-missing", index: 20, startOffsetMs: 50 }
      ]
    },
    { songPackId: "test-song", duration: 10, minCueDurationSec: 0.05 }
  );

  assert.equal(result.diagnostics.status, "warning");
  assert.equal(result.diagnostics.fingerprintMatched, false);
  assert.equal(result.diagnostics.fallbackCount, 1);
  assert.equal(result.diagnostics.skippedCount, 1);
  assert.equal(result.diagnostics.clampedCount, 1);
  assert.equal(result.lyrics[0].time, 2.2);
  assert.equal(result.lyrics[0].end, 2.25);
  assert.match(result.diagnostics.issues.map((item) => item.code).join("\n"), /fingerprint-mismatch/);
  assert.match(result.diagnostics.issues.map((item) => item.code).join("\n"), /cue-id-fallback-to-index/);
  assert.match(result.diagnostics.issues.map((item) => item.code).join("\n"), /adjustment-target-not-found/);
  assert.match(result.diagnostics.issues.map((item) => item.code).join("\n"), /cue-min-duration-clamped/);
});

test("lyric adjustment bundle selects the matching song target", async () => {
  const { applyLyricAdjustment } = await loadLyricAdjustmentModule();
  const result = applyLyricAdjustment(
    lyrics,
    {
      schema: "music-effect.lyric-adjustment-bundle.v1",
      encoding: "utf-8",
      messageLanguage: "en",
      items: [
        {
          target: { songPackId: "other-song" },
          adjustments: [{ cueId: "phrase-1", startOffsetMs: 999 }]
        },
        {
          target: { songPackId: "test-song" },
          adjustments: [{ cueId: "phrase-1", startOffsetMs: -100 }]
        }
      ]
    },
    { songPackId: "test-song", duration: 10 }
  );

  assert.equal(result.diagnostics.status, "ok");
  assert.equal(result.lyrics[0].time, 0.9);
  assert.equal(result.lyrics[1].time, 3);
});
