import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import ts from "typescript";

const loadVisualSequencer = async () => {
  const source = readFileSync(new URL("../system/kit/core/visualSequencer.ts", import.meta.url), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022
    }
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
};

const { createVisualSequencer } = await loadVisualSequencer();

const closeTo = (actual, expected, message) => {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: expected ${expected}, got ${actual}`);
};

test("default followRaw mode matches raw time at rate 1 and offset 0", () => {
  const sequencer = createVisualSequencer();

  closeTo(sequencer.update(3, 1000).visualTime, 3, "first update follows raw time");
  closeTo(sequencer.update(4.5, 2500).visualTime, 4.5, "subsequent update follows raw time");
  closeTo(sequencer.getState().offsetMs, 0, "offset stays zero");
});

test("offsetMs is applied as the current raw to visual difference", () => {
  const sequencer = createVisualSequencer({ offsetMs: 100 });
  const state = sequencer.update(1, 0);

  closeTo(state.visualTime, 1.1, "visual time includes offset");
  closeTo(state.offsetMs, 100, "offset is reported in milliseconds");
});

test("rate scales followRaw raw time deltas", () => {
  const sequencer = createVisualSequencer({ rate: 2 });

  closeTo(sequencer.update(10, 0).visualTime, 10, "initial anchor follows raw");
  closeTo(sequencer.update(11, 1000).visualTime, 12, "one raw second advances two visual seconds");
});

test("freeRun mode advances from nowMs rather than rawTime", () => {
  const sequencer = createVisualSequencer();

  closeTo(sequencer.update(10, 1000).visualTime, 10, "initial anchor follows raw");
  sequencer.setMode("freeRun");
  closeTo(sequencer.update(20, 2000).visualTime, 11, "visual time ignores raw jump in freeRun");
});

test("switching freeRun back to followRaw does not jump until raw deltas arrive", () => {
  const sequencer = createVisualSequencer();

  sequencer.update(10, 1000);
  sequencer.setMode("freeRun");
  sequencer.update(20, 2000);
  const beforeSwitch = sequencer.setMode("followRaw");
  closeTo(beforeSwitch.visualTime, 11, "mode switch preserves visual time");
  closeTo(sequencer.update(25, 3000).visualTime, 16, "followRaw resumes from the current visual time");
});

test("pause freezes visual time without catching up on resume", () => {
  const sequencer = createVisualSequencer();

  sequencer.update(0, 0);
  sequencer.pause();
  closeTo(sequencer.update(10, 10000).visualTime, 0, "paused visual time is frozen");
  sequencer.resume();
  closeTo(sequencer.update(11, 11000).visualTime, 1, "resume continues from the paused visual time");
});

test("scrubTo and nudge move visual time without touching raw time", () => {
  const sequencer = createVisualSequencer();

  sequencer.update(10, 0);
  const scrubbed = sequencer.scrubTo(5);
  closeTo(scrubbed.rawTime, 10, "scrub leaves raw time alone");
  closeTo(scrubbed.visualTime, 5, "scrub changes visual time");
  closeTo(scrubbed.offsetMs, -5000, "scrub updates offset");

  const nudged = sequencer.nudge(50);
  closeTo(nudged.visualTime, 5.05, "nudge moves visual time by milliseconds");
  closeTo(nudged.offsetMs, -4950, "nudge updates offset");
});

test("reset returns to initial behavior on the next update", () => {
  const sequencer = createVisualSequencer({ offsetMs: 100 });

  sequencer.update(10, 0);
  sequencer.nudge(500);
  sequencer.setRate(2);
  sequencer.setMode("freeRun");
  sequencer.reset();

  const state = sequencer.update(3, 1000);
  closeTo(state.visualTime, 3.1, "reset reapplies initial offset to the next raw anchor");
  closeTo(state.rate, 1, "reset restores default rate");
  assert.equal(state.mode, "followRaw");
});

test("followRaw handles raw time rewind by carrying the same delta into visual time", () => {
  const sequencer = createVisualSequencer();

  sequencer.update(120, 0);
  closeTo(sequencer.update(10, 1000).visualTime, 10, "rewind follows raw time back");
});

test("snapshot and restore keep an independent sequencer instance aligned", () => {
  const source = createVisualSequencer({ rate: 1.5 });
  source.update(2, 0);
  source.nudge(250);
  const snapshot = source.snapshot();

  const restored = createVisualSequencer();
  const restoredState = restored.restore(snapshot);
  assert.deepEqual(restoredState, snapshot);
  closeTo(restored.update(3, 1000).visualTime, 3.75, "restored instance continues with saved rate and anchor");
});

test("syncToRaw explicitly snaps visual time back to raw time", () => {
  const sequencer = createVisualSequencer();

  sequencer.update(10, 0);
  sequencer.scrubTo(5);
  const state = sequencer.syncToRaw();
  closeTo(state.visualTime, 10, "sync snaps to last raw time");
  closeTo(state.offsetMs, 0, "sync clears offset");
});
