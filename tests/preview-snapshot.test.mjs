import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs, resolveSnapshotConfig, summarizeFailures } from "../scripts/preview-snapshot.mjs";

test("preview snapshot can append optional player query params", () => {
  const options = parseArgs([
    "--song",
    "shining-star",
    "--time",
    "12.5",
    "--player-port",
    "61234",
    "--song-port",
    "61235",
    "--query",
    "visualSequencer=1&panel=compact"
  ]);

  const { targetUrl } = resolveSnapshotConfig(options);

  assert.equal(targetUrl.searchParams.get("visualSequencer"), "1");
  assert.equal(targetUrl.searchParams.get("panel"), "compact");
  assert.equal(targetUrl.searchParams.get("previewTime"), "12.5");
  assert.match(targetUrl.searchParams.get("song"), /\/shining-star\/manifest\.json$/);
});

test("preview snapshot rejects query params that override canonical preview params", () => {
  assert.throws(
    () => resolveSnapshotConfig(parseArgs(["--query", "previewTime=99"])),
    /reserved preview parameter: previewTime/
  );
  assert.throws(
    () => resolveSnapshotConfig(parseArgs(["--query", "song=http://127.0.0.1:5174/other/manifest.json"])),
    /reserved preview parameter: song/
  );
});

test("preview snapshot can fail readable empty canvases for smoke checks", () => {
  const { failures, warnings } = summarizeFailures({
    audit: {
      canvases: [
        {
          visible: true,
          sample: { points: 25, opaque: 0, colored: 0 }
        }
      ]
    },
    consoleMessages: [],
    allowConsoleErrors: false,
    failBlankCanvas: true
  });

  assert.deepEqual(warnings, []);
  assert.deepEqual(failures, ["Visible canvas pixel samples looked blank."]);
});

test("preview snapshot keeps blank canvas as warning when strict smoke is off", () => {
  const { failures, warnings } = summarizeFailures({
    audit: {
      canvases: [
        {
          visible: true,
          sample: { points: 25, opaque: 0, colored: 0 }
        }
      ]
    },
    consoleMessages: [],
    allowConsoleErrors: false,
    failBlankCanvas: false
  });

  assert.deepEqual(failures, []);
  assert.deepEqual(warnings, ["Visible canvas pixel samples looked blank."]);
});

test("preview snapshot does not treat opaque black canvases as mechanically blank", () => {
  const { failures, warnings } = summarizeFailures({
    audit: {
      canvases: [
        {
          visible: true,
          sample: { points: 25, opaque: 25, colored: 0 }
        }
      ]
    },
    consoleMessages: [],
    allowConsoleErrors: false,
    failBlankCanvas: true
  });

  assert.deepEqual(failures, []);
  assert.deepEqual(warnings, []);
});
