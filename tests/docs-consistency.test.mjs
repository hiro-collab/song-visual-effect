import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

const readUtf8 = (path) => readFileSync(resolve(repoRoot, path), "utf8");

const extractExportedStringConst = (source, name) => {
  const match = source.match(new RegExp(`export const ${name} = "([^"]+)";`));
  assert.ok(match, `${name} should be exported as a string constant`);
  return match[1];
};

const extractJsonBlocks = (markdown) => {
  const blocks = [];
  const regex = /```json\s*([\s\S]*?)```/g;
  let match = regex.exec(markdown);
  while (match) {
    blocks.push(match[1]);
    match = regex.exec(markdown);
  }
  return blocks;
};

test("lyric adjustment docs agree on schemas, examples, and show-profile link", () => {
  const constants = readUtf8("system/kit/timing/lyricAdjustment.ts");
  const lyricAdjustmentSchema = extractExportedStringConst(constants, "LYRIC_ADJUSTMENT_SCHEMA_V1");
  const lyricAdjustmentBundleSchema = extractExportedStringConst(constants, "LYRIC_ADJUSTMENT_BUNDLE_SCHEMA_V1");

  const lyricDocs = readUtf8("docs/lyric-adjustments.md");
  const showDocs = readUtf8("docs/show-profiles.md");
  const docsReadme = readUtf8("docs/README.md");

  for (const docs of [lyricDocs, showDocs]) {
    assert.match(docs, new RegExp(lyricAdjustmentSchema), `${lyricAdjustmentSchema} should be documented`);
    assert.match(docs, new RegExp(lyricAdjustmentBundleSchema), `${lyricAdjustmentBundleSchema} should be documented`);
  }

  assert.match(showDocs, /docs\/lyric-adjustments\.md/, "show-profile docs should point to lyric adjustment details");
  assert.match(docsReadme, /lyric-adjustments\.md/, "docs README should list lyric adjustment docs");
  assert.match(docsReadme, /show-profiles\.md/, "docs README should list show-profile docs");
  assert.match(showDocs, /show-profileは必須ではありません。/, "show-profile docs should keep the optional-layer warning");
  assert.match(
    showDocs,
    /曲パックや曲映像の作り方を縛るものではありません。/,
    "show-profile docs should avoid making song-packs depend on show-profiles"
  );

  const parsedBlocks = extractJsonBlocks(lyricDocs).map((block) => JSON.parse(block));
  assert.ok(
    parsedBlocks.some((block) => block.schema === lyricAdjustmentSchema),
    "lyric adjustment docs should include a valid single adjustment JSON example"
  );
  assert.ok(
    parsedBlocks.some((block) => block.schema === lyricAdjustmentBundleSchema),
    "lyric adjustment docs should include a valid bundle JSON example"
  );

  for (const block of parsedBlocks) {
    if (block.schema === lyricAdjustmentSchema) {
      assert.equal(block.target.timingSchema, "music-effect.lyrics-timing.v2");
      assert.ok(block.target.sourceFingerprint, "single adjustment example should include sourceFingerprint");
      assert.equal(typeof block.adjustments[0].startOffsetMs, "number");
    }
    if (block.schema === lyricAdjustmentBundleSchema) {
      assert.equal(block.items[0].target.timingSchema, "music-effect.lyrics-timing.v2");
      assert.ok(block.items[0].target.sourceFingerprint, "bundle example should include sourceFingerprint");
      assert.equal(typeof block.items[0].adjustments[0].startOffsetMs, "number");
    }
  }
});
