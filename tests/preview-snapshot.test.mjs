import test from "node:test";
import assert from "node:assert/strict";
import { summarizeFailures } from "../scripts/preview-snapshot.mjs";

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
