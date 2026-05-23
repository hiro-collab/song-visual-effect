import { clamp } from "../render/damping";

const clampTime = (time: number, duration: number) => Math.min(Math.max(0, time), Math.max(0, duration));

export class Transport {
  private startedAt = 0;
  private pausedAt = 0;
  private clockPlaying = false;

  constructor(
    private readonly audio: HTMLAudioElement,
    private readonly onStateChange: () => void
  ) {
    this.audio.addEventListener("pause", this.onStateChange);
    this.audio.addEventListener("play", this.onStateChange);
    this.audio.addEventListener("ended", () => {
      this.audio.currentTime = 0;
      this.onStateChange();
    });
  }

  hasAudioSource() {
    return Boolean(this.audio.getAttribute("src"));
  }

  currentTime() {
    if (this.hasAudioSource()) return this.audio.currentTime;
    if (!this.clockPlaying) return this.pausedAt;
    return this.pausedAt + (performance.now() - this.startedAt) / 1000;
  }

  duration(fallback: number) {
    return this.audio.duration && Number.isFinite(this.audio.duration) ? this.audio.duration : fallback;
  }

  isPlaying() {
    return this.hasAudioSource() ? !this.audio.paused : this.clockPlaying;
  }

  async play() {
    if (this.hasAudioSource()) {
      try {
        await this.audio.play();
      } catch {
        this.audio.removeAttribute("src");
        this.clockPlaying = true;
        this.startedAt = performance.now();
      }
    } else {
      this.clockPlaying = true;
      this.startedAt = performance.now();
    }
    this.onStateChange();
  }

  pause() {
    if (this.hasAudioSource()) {
      this.audio.pause();
    } else {
      this.pausedAt = this.currentTime();
      this.clockPlaying = false;
    }
    this.onStateChange();
  }

  toggle() {
    if (this.isPlaying()) {
      this.pause();
      return;
    }
    void this.play();
  }

  seek(time: number, duration: number) {
    const target = clampTime(time, duration);
    if (this.hasAudioSource()) {
      this.audio.currentTime = clampTime(target, this.duration(duration));
    } else {
      this.pausedAt = target;
      if (this.clockPlaying) this.startedAt = performance.now();
    }
    return clamp(target / Math.max(1, duration));
  }

  setAudioPath(path: string) {
    this.audio.src = path;
    this.pausedAt = 0;
    this.clockPlaying = false;
    this.onStateChange();
  }

  setLocalAudio(file: File) {
    if (this.audio.src?.startsWith("blob:")) URL.revokeObjectURL(this.audio.src);
    this.audio.src = URL.createObjectURL(file);
    this.pausedAt = 0;
    this.clockPlaying = false;
    this.onStateChange();
  }
}
