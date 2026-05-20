import type { MusicMap, PointerState } from "../types";
import { DampValue } from "../effects/damping";
import { ColorRamp } from "../effects/palette";
import { ParticleField } from "../effects/particles";
import { LightNetwork } from "../effects/lightNetwork";
import { activeRange, beatAt, emphasisAt } from "../music/timing";

export class SoftLightRenderer {
  private readonly pointer: PointerState = { x: 0, y: 0, active: false, down: false };
  private readonly particles = new ParticleField(260);
  private readonly network = new LightNetwork(18);
  private readonly glow = new DampValue(0.55, 0.05, 0.8);
  private readonly warmth = new DampValue(0.45, 0.035, 0.86);
  private readonly density = new DampValue(0.55, 0.045, 0.82);
  private readonly rampShift = new DampValue(0, 0.03, 0.9);
  private clickRipples: Array<{ x: number; y: number; age: number }> = [];
  private ramp: ColorRamp;
  private width = 1;
  private height = 1;
  private lastBeatIndex = -1;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly ctx: CanvasRenderingContext2D,
    musicMap: MusicMap
  ) {
    this.ramp = new ColorRamp(musicMap.palette);
  }

  setMusicMap(musicMap: MusicMap) {
    this.ramp = new ColorRamp(musicMap.palette);
    this.lastBeatIndex = -1;
  }

  resetBeat() {
    this.lastBeatIndex = -1;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.floor(window.innerWidth * dpr);
    this.height = Math.floor(window.innerHeight * dpr);
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.particles.resize(this.width, this.height);
  }

  pointerMove(event: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.width / rect.width;
    const scaleY = this.height / rect.height;
    this.pointer.x = (event.clientX - rect.left) * scaleX;
    this.pointer.y = (event.clientY - rect.top) * scaleY;
    this.pointer.active = true;
  }

  pointerLeave() {
    this.pointer.active = false;
    this.pointer.down = false;
  }

  pointerDown(event: PointerEvent) {
    this.pointer.down = true;
    this.clickRipples.push({ x: this.pointer.x || event.clientX, y: this.pointer.y || event.clientY, age: 0 });
  }

  pointerUp() {
    this.pointer.down = false;
  }

  render(musicMap: MusicMap, time: number, dt: number, userGlow: number) {
    const beat = beatAt(time, musicMap.beats);
    const chorus = activeRange(time, musicMap.chorus);
    const warm = activeRange(time, musicMap.markers.warmSections ?? []);
    const emphasis = emphasisAt(time, musicMap);

    if (beat.index !== this.lastBeatIndex && beat.pulse > 0.35) {
      this.lastBeatIndex = beat.index;
      this.network.trigger(beat.index, chorus, emphasis);
    }

    this.glow.target = 0.44 + beat.pulse * 0.42 + chorus * 0.34 + emphasis * 0.14;
    this.warmth.target = 0.35 + warm * 0.38 + chorus * 0.16;
    this.density.target = 0.44 + chorus * 0.38 + emphasis * 0.18;
    this.rampShift.target = (time / musicMap.duration) * 1.4 + chorus * 0.12 + beat.pulse * 0.04;
    this.glow.update(dt);
    this.warmth.update(dt);
    this.density.update(dt);
    this.rampShift.update(dt);

    this.drawBackground(time, beat.pulse, chorus, userGlow);
    this.network.draw(this.ctx, this.width, this.height, dt, time, this.pointer, this.ramp, this.glow.value * userGlow);
    this.particles.draw(this.ctx, this.width, this.height, dt, time, this.pointer, this.ramp, this.density.value + chorus * 0.25);
    this.drawRipples(dt, userGlow);
  }

  private drawBackground(time: number, beatPulse: number, chorus: number, userGlow: number) {
    const ctx = this.ctx;
    ctx.globalCompositeOperation = "source-over";
    const shadow = ctx.createLinearGradient(0, 0, this.width, this.height);
    shadow.addColorStop(0, "#141520");
    shadow.addColorStop(0.52, "#202033");
    shadow.addColorStop(1, "#10131e");
    ctx.fillStyle = shadow;
    ctx.fillRect(0, 0, this.width, this.height);

    const main = ctx.createRadialGradient(
      this.width * 0.5,
      this.height * 0.45,
      0,
      this.width * 0.5,
      this.height * 0.45,
      Math.max(this.width, this.height) * 0.82
    );
    const warm = this.warmth.value;
    main.addColorStop(0, this.ramp.sample(this.rampShift.value + 0.08, (0.28 + beatPulse * 0.22 + chorus * 0.16) * userGlow));
    main.addColorStop(0.36, this.ramp.sample(this.rampShift.value + 0.28 + warm * 0.2, (0.18 + chorus * 0.14) * userGlow));
    main.addColorStop(0.74, "rgba(60, 69, 99, 0.24)");
    main.addColorStop(1, "rgba(8, 10, 16, 0)");
    ctx.fillStyle = main;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let index = 0; index < 3; index++) {
      const offset = time * (0.018 + index * 0.006) + index * 0.24;
      const x = this.width * (0.22 + Math.sin(offset) * 0.12 + index * 0.22);
      const gradient = ctx.createLinearGradient(x - this.width * 0.24, 0, x + this.width * 0.2, this.height);
      gradient.addColorStop(0, "rgba(255, 255, 255, 0)");
      gradient.addColorStop(0.48, this.ramp.sample(this.rampShift.value + offset + index * 0.12, (0.05 + chorus * 0.04 + beatPulse * 0.03) * userGlow));
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.width, this.height);
    }
    ctx.restore();
  }

  private drawRipples(dt: number, userGlow: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    this.clickRipples = this.clickRipples
      .map((ripple) => ({ ...ripple, age: ripple.age + dt }))
      .filter((ripple) => ripple.age < 1.8);
    for (const ripple of this.clickRipples) {
      const t = ripple.age / 1.8;
      const radius = Math.min(this.width, this.height) * (0.05 + t * 0.42);
      ctx.lineWidth = (10 - t * 8) * userGlow;
      ctx.strokeStyle = this.ramp.sample(this.rampShift.value + t * 0.18, (1 - t) * 0.32 * userGlow);
      ctx.shadowBlur = 32 * (1 - t) * userGlow;
      ctx.shadowColor = this.ramp.sample(this.rampShift.value + 0.2, (1 - t) * 0.85);
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
