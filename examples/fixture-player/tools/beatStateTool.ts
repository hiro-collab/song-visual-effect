import type { MusicMap } from "../../../system/kit/types";
import {
  createBeatSyncReader,
  type BeatSyncReaderOptions,
  type BeatSyncSource,
  type BeatSyncState
} from "../../../system/kit/beatSync";

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
      label: usesFallback ? "Fallback beats" : "Analysis beats",
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
    this.near.textContent = state.isNearBeat ? "near" : "--";
    this.enter.textContent = state.didEnterBeat ? "entered" : "--";
  }

  private buildPanel() {
    this.panel.className = "beat-state-panel";
    this.panel.setAttribute("aria-label", "Beat state monitor");
    this.panel.innerHTML = `
      <div class="beat-state-head">
        <div>
          <strong>Beat State</strong>
        </div>
      </div>
      <dl class="beat-state-grid">
        <div><dt>Source</dt><dd data-slot="source"></dd></div>
        <div><dt>Beat</dt><dd data-slot="beat"></dd></div>
        <div><dt>Next</dt><dd data-slot="next"></dd></div>
        <div><dt>Phase</dt><dd data-slot="phase"></dd></div>
        <div><dt>BPM</dt><dd data-slot="bpm"></dd></div>
        <div><dt>Near</dt><dd data-slot="near"></dd></div>
        <div><dt>Enter</dt><dd data-slot="enter"></dd></div>
      </dl>
    `;
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
