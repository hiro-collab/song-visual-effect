import {
  createBeatSyncReader,
  type BeatSyncReaderOptions,
  type BeatSyncSource,
  type BeatSyncState,
  type MusicMap
} from "../../../../system/kit";

type BeatStateToolOptions = {
  musicMap: MusicMap;
  getTime: () => number;
  offset?: BeatSyncReaderOptions["offset"];
};

const formatBeat = (state: BeatSyncState) => {
  if (state.beatIndex < 0) return "--";
  const position = state.beat?.position ? `.${state.beat.position}` : "";
  return `#${state.beatIndex + 1}${position}`;
};

const formatBpm = (bpm: number | null) => (bpm === null ? "--" : bpm.toFixed(1));

const formatPhase = (phase: number) => `${Math.round(phase * 100)}%`;

const make = <K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options: { className?: string; text?: string; slot?: string } = {}
) => {
  const element = document.createElement(tagName);
  if (options.className) element.className = options.className;
  if (options.text !== undefined) element.textContent = options.text;
  if (options.slot) element.dataset.slot = options.slot;
  return element;
};

export class BeatStateTool {
  private readonly reader;
  private readonly panel = document.createElement("aside");
  private source!: HTMLElement;
  private beat!: HTMLElement;
  private next!: HTMLElement;
  private phase!: HTMLElement;
  private bpm!: HTMLElement;
  private near!: HTMLElement;
  private enter!: HTMLElement;

  constructor(private readonly options: BeatStateToolOptions) {
    const usesFallback = options.musicMap.warnings.includes("beat fallback");
    const source: BeatSyncSource = {
      label: usesFallback ? "仮ビート / Fallback" : "解析ビート / Analysis",
      isFallback: usesFallback
    };
    this.reader = createBeatSyncReader({
      getTime: options.getTime,
      beats: options.musicMap.beats,
      offset: options.offset,
      source
    });
    this.buildPanel();
  }

  mount(parent: HTMLElement) {
    parent.append(this.panel);
    this.update();
  }

  update() {
    const state = this.reader.update();
    const nextIndex = state.nextBeat ? state.beatIndex + 2 : null;
    this.panel.classList.toggle("did-enter-beat", state.didEnterBeat);
    this.panel.classList.toggle("is-near-beat", state.isNearBeat);
    this.panel.classList.toggle("has-fallback-beats", Boolean(state.source.isFallback));
    this.source.textContent = state.source.label;
    this.beat.textContent = formatBeat(state);
    this.next.textContent = nextIndex === null ? "--" : `#${nextIndex}`;
    this.phase.textContent = formatPhase(state.phase);
    this.bpm.textContent = formatBpm(state.estimatedBpm);
    this.near.textContent = state.isNearBeat ? "近い / near" : "--";
    this.enter.textContent = state.didEnterBeat ? "進入 / enter" : "--";
  }

  private buildPanel() {
    this.panel.className = "beat-state-panel";
    this.panel.setAttribute("aria-label", "拍状態モニター");
    const head = make("div", { className: "beat-state-head" });
    const titleWrap = make("div");
    titleWrap.append(make("strong", { text: "拍状態 / Beat State" }));
    head.append(titleWrap);

    const grid = make("dl", { className: "beat-state-grid" });
    for (const [label, slot] of [
      ["出所", "source"],
      ["拍", "beat"],
      ["次", "next"],
      ["位相", "phase"],
      ["BPM", "bpm"],
      ["拍近傍", "near"],
      ["拍進入", "enter"]
    ] as const) {
      const row = make("div");
      row.append(make("dt", { text: label }), make("dd", { slot }));
      grid.append(row);
    }

    this.panel.replaceChildren(head, grid);
    this.source = this.slot("source");
    this.beat = this.slot("beat");
    this.next = this.slot("next");
    this.phase = this.slot("phase");
    this.bpm = this.slot("bpm");
    this.near = this.slot("near");
    this.enter = this.slot("enter");
  }

  private slot(name: string) {
    const element = this.panel.querySelector(`[data-slot="${name}"]`);
    if (!(element instanceof HTMLElement)) {
      throw new Error(`Missing beat state slot: ${name}`);
    }
    return element;
  }
}
