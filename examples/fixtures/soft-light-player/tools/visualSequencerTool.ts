import {
  createVisualSequencer,
  type VisualSequencerMode,
  type VisualSequencerState
} from "../../../../system/kit";

type VisualSequencerToolOptions = {
  duration: number;
  seekRawTime: (time: number) => void;
};

const isEnabledValue = (value: string | null | undefined) => {
  const normalized = value?.toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "on" || normalized === "show";
};

export const isVisualSequencerToolEnabled = () => (
  isEnabledValue(new URLSearchParams(window.location.search).get("visualSequencer"))
);

const formatTime = (time: number) => `${time.toFixed(3)}s`;
const formatOffset = (offsetMs: number) => `${offsetMs >= 0 ? "+" : ""}${Math.round(offsetMs)}ms`;
const formatRate = (rate: number) => rate.toFixed(2);
const clampRate = (rate: number) => Math.min(Math.max(rate, 0), 4);

const wrapTime = (time: number, duration: number) => {
  const safeDuration = Math.max(0.001, duration);
  return ((time % safeDuration) + safeDuration) % safeDuration;
};

const clampTime = (time: number, duration: number) => Math.min(Math.max(0, time), duration);

const make = <K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options: { className?: string; text?: string; slot?: string; type?: string; title?: string } = {}
) => {
  const element = document.createElement(tagName);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  if (options.slot) element.dataset.slot = options.slot;
  if (options.type && element instanceof HTMLInputElement) element.type = options.type;
  if (options.title) element.title = options.title;
  return element;
};

export class VisualSequencerTool {
  private readonly sequencer = createVisualSequencer();
  private readonly panel = document.createElement("aside");
  private readonly duration: number;
  private readonly seekRawTime: (time: number) => void;
  private lastRawTime = 0;
  private lastNowMs = 0;
  private raw!: HTMLElement;
  private visual!: HTMLElement;
  private offset!: HTMLElement;
  private rateReadout!: HTMLElement;
  private modeSelect!: HTMLSelectElement;
  private rateInput!: HTMLInputElement;
  private pauseButton!: HTMLButtonElement;
  private rawScrubInput!: HTMLInputElement;
  private visualScrubInput!: HTMLInputElement;

  constructor(options: VisualSequencerToolOptions) {
    this.duration = Math.max(0.001, options.duration);
    this.seekRawTime = options.seekRawTime;
    this.buildPanel();
  }

  mount(parent: HTMLElement) {
    parent.append(this.panel);
    this.render(this.sequencer.getState());
  }

  update(rawTime: number, nowMs: number) {
    this.lastRawTime = rawTime;
    this.lastNowMs = nowMs;
    const state = this.sequencer.update(rawTime, nowMs);
    this.render(state);
    return state;
  }

  private render(state: VisualSequencerState) {
    this.panel.classList.toggle("is-paused", state.paused);
    this.raw.textContent = formatTime(state.rawTime);
    this.visual.textContent = formatTime(state.visualTime);
    this.offset.textContent = formatOffset(state.offsetMs);
    this.rateReadout.textContent = formatRate(state.rate);
    this.modeSelect.value = state.mode;
    if (document.activeElement !== this.rateInput) {
      this.rateInput.value = String(state.rate);
    }
    this.pauseButton.textContent = state.paused ? "Resume" : "Pause";
    this.pauseButton.setAttribute("aria-pressed", String(state.paused));
    this.rawScrubInput.value = String(clampTime(state.rawTime, this.duration));
    this.visualScrubInput.value = String(wrapTime(state.visualTime, this.duration));
  }

  private applyAndRender(action: () => VisualSequencerState) {
    this.render(action());
  }

  private resetToCurrentRaw() {
    this.sequencer.reset();
    return this.sequencer.update(this.lastRawTime, this.lastNowMs);
  }

  private seekRawTo(time: number) {
    const target = clampTime(time, this.duration);
    this.seekRawTime(target);
    this.lastRawTime = target;
    this.lastNowMs = performance.now();
    return this.sequencer.update(target, this.lastNowMs);
  }

  private rangeRow(label: string, input: HTMLInputElement) {
    const row = make("label", { className: "visual-sequencer-field" });
    row.append(make("span", { text: label }), input);
    return row;
  }

  private setRateFromInput() {
    const nextRate = Number.parseFloat(this.rateInput.value);
    if (!Number.isFinite(nextRate)) return this.sequencer.getState();
    return this.sequencer.setRate(clampRate(nextRate));
  }

  private buildPanel() {
    this.panel.className = "visual-sequencer-panel";
    this.panel.setAttribute("aria-label", "Visual sequencer");

    const head = make("div", { className: "visual-sequencer-head" });
    head.append(make("strong", { text: "Visual Time" }));

    const grid = make("dl", { className: "visual-sequencer-grid" });
    for (const [label, slot] of [
      ["Raw", "raw"],
      ["Visual", "visual"],
      ["Offset", "offset"],
      ["Rate", "rate"]
    ] as const) {
      const row = make("div");
      row.append(make("dt", { text: label }), make("dd", { slot }));
      grid.append(row);
    }

    const modeRow = make("label", { className: "visual-sequencer-field" });
    modeRow.append(make("span", { text: "Mode" }));
    this.modeSelect = document.createElement("select");
    for (const [value, label] of [
      ["followRaw", "Follow Raw"],
      ["freeRun", "Free Run"]
    ] as const) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      this.modeSelect.append(option);
    }
    this.modeSelect.addEventListener("change", () => {
      this.applyAndRender(() => this.sequencer.setMode(this.modeSelect.value as VisualSequencerMode));
    });
    modeRow.append(this.modeSelect);

    const rateRow = make("label", { className: "visual-sequencer-field" });
    rateRow.append(make("span", { text: "Rate" }));
    this.rateInput = make("input", { type: "number" });
    this.rateInput.min = "0";
    this.rateInput.max = "4";
    this.rateInput.step = "0.05";
    this.rateInput.addEventListener("input", () => {
      this.applyAndRender(() => this.setRateFromInput());
    });
    this.rateInput.addEventListener("change", () => {
      this.applyAndRender(() => this.setRateFromInput());
      this.rateInput.value = String(this.sequencer.getState().rate);
    });
    this.rateInput.addEventListener("blur", () => {
      this.rateInput.value = String(this.sequencer.getState().rate);
    });
    rateRow.append(this.rateInput);

    const rateActions = make("div", { className: "visual-sequencer-actions" });
    rateActions.append(
      this.button("0.5x", () => this.sequencer.setRate(0.5)),
      this.button("1x", () => this.sequencer.setRate(1)),
      this.button("1.5x", () => this.sequencer.setRate(1.5)),
      this.button("2x", () => this.sequencer.setRate(2))
    );

    this.rawScrubInput = make("input", { className: "visual-sequencer-scrub", type: "range" });
    this.rawScrubInput.min = "0";
    this.rawScrubInput.max = String(this.duration);
    this.rawScrubInput.step = "0.01";
    this.rawScrubInput.addEventListener("input", () => {
      this.applyAndRender(() => this.seekRawTo(Number.parseFloat(this.rawScrubInput.value)));
    });

    const rawActions = make("div", { className: "visual-sequencer-actions" });
    rawActions.append(
      this.button("-10s", () => this.seekRawTo(this.lastRawTime - 10)),
      this.button("-1s", () => this.seekRawTo(this.lastRawTime - 1)),
      this.button("+1s", () => this.seekRawTo(this.lastRawTime + 1)),
      this.button("+10s", () => this.seekRawTo(this.lastRawTime + 10))
    );

    this.visualScrubInput = make("input", { className: "visual-sequencer-scrub", type: "range" });
    this.visualScrubInput.min = "0";
    this.visualScrubInput.max = String(this.duration);
    this.visualScrubInput.step = "0.01";
    this.visualScrubInput.addEventListener("input", () => {
      this.applyAndRender(() => this.sequencer.scrubTo(Number.parseFloat(this.visualScrubInput.value)));
    });

    const offsetActions = make("div", { className: "visual-sequencer-actions" });
    offsetActions.append(
      this.button("-100ms", () => this.sequencer.setOffsetMs(this.sequencer.getState().offsetMs - 100)),
      this.button("+100ms", () => this.sequencer.setOffsetMs(this.sequencer.getState().offsetMs + 100)),
      this.button("-50ms", () => this.sequencer.nudge(-50)),
      this.button("+50ms", () => this.sequencer.nudge(50))
    );

    const mainActions = make("div", { className: "visual-sequencer-actions" });
    this.pauseButton = this.button("Pause", () => {
      const state = this.sequencer.getState();
      return state.paused ? this.sequencer.resume() : this.sequencer.pause();
    });
    mainActions.append(
      this.pauseButton,
      this.button("Sync", () => this.sequencer.syncToRaw()),
      this.button("Reset", () => this.resetToCurrentRaw())
    );

    this.panel.replaceChildren(
      head,
      grid,
      modeRow,
      rateRow,
      rateActions,
      this.rangeRow("Raw seek", this.rawScrubInput),
      rawActions,
      this.rangeRow("Visual", this.visualScrubInput),
      offsetActions,
      mainActions
    );
    this.raw = this.slot("raw");
    this.visual = this.slot("visual");
    this.offset = this.slot("offset");
    this.rateReadout = this.slot("rate");
  }

  private button(label: string, action: () => VisualSequencerState) {
    const button = make("button", { className: "mini-button", text: label });
    button.type = "button";
    button.addEventListener("click", () => this.applyAndRender(action));
    return button;
  }

  private slot(name: string) {
    const element = this.panel.querySelector(`[data-slot="${name}"]`);
    if (!(element instanceof HTMLElement)) {
      throw new Error(`Missing visual sequencer slot: ${name}`);
    }
    return element;
  }
}
