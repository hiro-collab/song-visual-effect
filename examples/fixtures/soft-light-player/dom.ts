export type AppElements = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  audio: HTMLAudioElement;
  lyricCurrent: HTMLParagraphElement;
  lyricNext: HTMLParagraphElement;
  songTitle: HTMLHeadingElement;
  songArtist: HTMLParagraphElement;
  playToggle: HTMLButtonElement;
  playIconPath: SVGPathElement;
  audioInput: HTMLInputElement;
  progressBar: HTMLDivElement;
  glowRange: HTMLInputElement;
  fullscreenToggle: HTMLButtonElement;
  dataStatus: HTMLDivElement;
  timingPanel: HTMLElement;
  timingToggle: HTMLButtonElement;
  timingCount: HTMLSpanElement;
  timingLeft: HTMLSpanElement;
  timingRight: HTMLSpanElement;
  timingLast: HTMLParagraphElement;
  timingUndo: HTMLButtonElement;
  timingClear: HTMLButtonElement;
  timingExport: HTMLButtonElement;
  timingOffsetReadout: HTMLSpanElement;
  timingFromLabel: HTMLSpanElement;
  sequenceReadout: HTMLSpanElement;
  sequenceBar: HTMLDivElement;
  sequenceProgress: HTMLDivElement;
  sequenceStones: HTMLDivElement;
  offsetAllEarlierBig: HTMLButtonElement;
  offsetAllEarlier: HTMLButtonElement;
  offsetAllReset: HTMLButtonElement;
  offsetAllLater: HTMLButtonElement;
  offsetAllLaterBig: HTMLButtonElement;
  offsetFromEarlierBig: HTMLButtonElement;
  offsetFromEarlier: HTMLButtonElement;
  offsetFromReset: HTMLButtonElement;
  offsetFromLater: HTMLButtonElement;
  offsetFromLaterBig: HTMLButtonElement;
};

const requireElement = <T extends Element>(selector: string) => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing app element: ${selector}`);
  return element;
};

export const getAppElements = (): AppElements => {
  const canvas = requireElement<HTMLCanvasElement>("#visualizer");
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas 2D is unavailable");

  return {
    canvas,
    ctx,
    audio: requireElement<HTMLAudioElement>("#audio"),
    lyricCurrent: requireElement<HTMLParagraphElement>("#lyric-current"),
    lyricNext: requireElement<HTMLParagraphElement>("#lyric-next"),
    songTitle: requireElement<HTMLHeadingElement>("#song-title"),
    songArtist: requireElement<HTMLParagraphElement>("#song-artist"),
    playToggle: requireElement<HTMLButtonElement>("#play-toggle"),
    playIconPath: requireElement<SVGPathElement>("#play-icon-path"),
    audioInput: requireElement<HTMLInputElement>("#audio-input"),
    progressBar: requireElement<HTMLDivElement>("#progress-bar"),
    glowRange: requireElement<HTMLInputElement>("#glow-range"),
    fullscreenToggle: requireElement<HTMLButtonElement>("#fullscreen-toggle"),
    dataStatus: requireElement<HTMLDivElement>("#data-status"),
    timingPanel: requireElement<HTMLElement>("#timing-panel"),
    timingToggle: requireElement<HTMLButtonElement>("#timing-toggle"),
    timingCount: requireElement<HTMLSpanElement>("#timing-count"),
    timingLeft: requireElement<HTMLSpanElement>("#timing-left"),
    timingRight: requireElement<HTMLSpanElement>("#timing-right"),
    timingLast: requireElement<HTMLParagraphElement>("#timing-last"),
    timingUndo: requireElement<HTMLButtonElement>("#timing-undo"),
    timingClear: requireElement<HTMLButtonElement>("#timing-clear"),
    timingExport: requireElement<HTMLButtonElement>("#timing-export"),
    timingOffsetReadout: requireElement<HTMLSpanElement>("#timing-offset-readout"),
    timingFromLabel: requireElement<HTMLSpanElement>("#timing-from-label"),
    sequenceReadout: requireElement<HTMLSpanElement>("#timing-sequence-readout"),
    sequenceBar: requireElement<HTMLDivElement>("#timing-sequence-bar"),
    sequenceProgress: requireElement<HTMLDivElement>("#timing-sequence-progress"),
    sequenceStones: requireElement<HTMLDivElement>("#timing-sequence-stones"),
    offsetAllEarlierBig: requireElement<HTMLButtonElement>("#offset-all-earlier-big"),
    offsetAllEarlier: requireElement<HTMLButtonElement>("#offset-all-earlier"),
    offsetAllReset: requireElement<HTMLButtonElement>("#offset-all-reset"),
    offsetAllLater: requireElement<HTMLButtonElement>("#offset-all-later"),
    offsetAllLaterBig: requireElement<HTMLButtonElement>("#offset-all-later-big"),
    offsetFromEarlierBig: requireElement<HTMLButtonElement>("#offset-from-earlier-big"),
    offsetFromEarlier: requireElement<HTMLButtonElement>("#offset-from-earlier"),
    offsetFromReset: requireElement<HTMLButtonElement>("#offset-from-reset"),
    offsetFromLater: requireElement<HTMLButtonElement>("#offset-from-later"),
    offsetFromLaterBig: requireElement<HTMLButtonElement>("#offset-from-later-big")
  };
};
