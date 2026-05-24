import {
  clamp,
  createBeatSyncReader,
  createCanvasScene,
  DampValue,
  resizeCanvasToDisplaySize,
  smoothstep,
  type SongAdapterContext,
  type SongApp,
  type SongAppFrame,
  type SongAppServices
} from "../../system/kit";

export const createSongApp = (
  context: SongAdapterContext,
  services: SongAppServices
): SongApp => {
  const { canvas, ctx } = services;
  const duration = context.musicMap.duration || context.manifest.duration || 225.07;
  let renderTime = 0;
  let previousTime = 0;
  let beatFlash = 0;
  let lifePhase = 0;
  const lifePulse = new DampValue(0, 0.17, 0.58);
  const lifeBreath = new DampValue(0.18, 0.035, 0.82);
  const lampPulse = new DampValue(0, 0.11, 0.62);
  const routeLag = new DampValue(0, 0.045, 0.78);
  const beatReader = createBeatSyncReader({
    getTime: () => renderTime,
    beats: context.musicMap.beats,
    source: "songle-beat",
    hitWindow: 0.055
  });

  const resize = () => {
    resizeCanvasToDisplaySize(canvas, 2);
  };

  const render = (frame: SongAppFrame) => {
    renderTime = clamp(frame.time, 0, duration);
    const activeShot = currentShot(renderTime);
    const timeJumped = Math.abs(renderTime - previousTime) > 1;
    if (renderTime < previousTime || timeJumped) {
      beatReader.reset();
      beatFlash = 0;
      lifePhase = renderTime * 0.73;
      seedDamp(lifePulse, 0.12 + activeShot.route * 0.16);
      seedDamp(lifeBreath, organicTargetForShot(activeShot));
      seedDamp(lampPulse, 0.05 + activeShot.lamp * 0.12);
      seedDamp(routeLag, activeShot.route);
    }
    previousTime = renderTime;

    const dt = Math.max(0.016, Math.min(0.05, frame.dt || 0.016));
    const beat = beatReader.update();
    if (beat.didEnterBeat || beat.isNearBeat) {
      beatFlash = Math.max(beatFlash, 1);
      lifePulse.target = Math.max(lifePulse.target, 0.78 + activeShot.finalPush * 0.58 + activeShot.route * 0.18);
      lampPulse.target = Math.max(lampPulse.target, 0.55 + activeShot.exposure * 0.4 + activeShot.lamp * 0.28);
    }
    beatFlash *= Math.exp(-dt * 7.2);
    lifePulse.target = Math.max(0, lifePulse.target - dt * (2.25 - activeShot.finalPush * 0.75));
    lifeBreath.target = organicTargetForShot(activeShot);
    lampPulse.target = Math.max(0, lampPulse.target - dt * 1.85);
    routeLag.target = activeShot.route;
    const organicPulse = clamp(lifePulse.update(dt), 0, 1.45);
    const organicBreath = clamp(lifeBreath.update(dt), 0, 1.25);
    const lampBloom = clamp(lampPulse.update(dt), 0, 1.45);
    const routeFlow = clamp(routeLag.update(dt), 0, 1.25);
    lifePhase += dt * (0.62 + organicBreath * 0.48 + activeShot.finalPush * 0.42 + organicPulse * 0.2);

    const scene = createCanvasScene(frame, services, { maxDpr: 2, clip: false });

    ctx.save();
    ctx.setTransform(scene.dpr, 0, 0, scene.dpr, 0, 0);
    ctx.clearRect(0, 0, scene.cssWidth, scene.cssHeight);
    ctx.beginPath();
    ctx.rect(scene.contentRect.left, scene.contentRect.top, scene.contentRect.width, scene.contentRect.height);
    ctx.clip();
    drawOpePrototype(ctx, {
      time: renderTime,
      dt: frame.dt,
      beatPhase: beat.phase,
      beatFlash,
      organicPulse,
      organicBreath,
      lampBloom,
      routeFlow,
      lifePhase,
      userGlow: clamp(frame.userGlow),
      left: scene.contentRect.left,
      top: scene.contentRect.top,
      width: scene.contentRect.width,
      height: scene.contentRect.height
    });
    ctx.restore();
  };

  return {
    id: `${context.manifest.id}:operation-prototype`,
    status: `${context.manifest.title}: operation-room storyboard prototype`,
    resize,
    render,
    resetVisualTiming: () => {
      beatReader.reset();
      beatFlash = 0;
      lifePhase = renderTime * 0.73;
      seedDamp(lifePulse, 0);
      seedDamp(lifeBreath, 0.18);
      seedDamp(lampPulse, 0);
      seedDamp(routeLag, 0);
      previousTime = 0;
    }
  };
};

type View = {
  time: number;
  dt: number;
  beatPhase: number;
  beatFlash: number;
  organicPulse: number;
  organicBreath: number;
  lampBloom: number;
  routeFlow: number;
  lifePhase: number;
  userGlow: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

type Shot = {
  label: string;
  tableX: number;
  tableY: number;
  tableW: number;
  tableH: number;
  tableTilt: number;
  lamp: number;
  pressure: number;
  records: number;
  exposure: number;
  freeze: number;
  afterimage: number;
  monitor: number;
  sutures: number;
  route: number;
  finalPush: number;
  darkness: number;
};

type FlowAccent = {
  start: number;
  end: number;
  mode: "drop" | "sweep" | "exit";
  strength: number;
};

type FocusWindow = {
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strength: number;
};

const SHOTS: Array<{ start: number; end: number; shot: Shot }> = [
  {
    start: 0,
    end: 3.7,
    shot: {
      label: "COLD START",
      tableX: 0.49,
      tableY: 0.67,
      tableW: 0.36,
      tableH: 0.075,
      tableTilt: -0.2,
      lamp: 0.25,
      pressure: 0,
      records: 0,
      exposure: 0,
      freeze: 0,
      afterimage: 0,
      monitor: 0,
      sutures: 0,
      route: 0,
      finalPush: 0,
      darkness: 0.94
    }
  },
  {
    start: 3.7,
    end: 30,
    shot: {
      label: "DIAGNOSIS",
      tableX: 0.52,
      tableY: 0.62,
      tableW: 0.48,
      tableH: 0.11,
      tableTilt: -0.13,
      lamp: 0.42,
      pressure: 0.55,
      records: 0.35,
      exposure: 0.08,
      freeze: 0,
      afterimage: 0,
      monitor: 0.34,
      sutures: 0,
      route: 0.12,
      finalPush: 0,
      darkness: 0.78
    }
  },
  {
    start: 30,
    end: 52.91,
    shot: {
      label: "PUBLIC RECORD",
      tableX: 0.52,
      tableY: 0.66,
      tableW: 0.31,
      tableH: 0.085,
      tableTilt: -0.11,
      lamp: 0.38,
      pressure: 0.95,
      records: 0.92,
      exposure: 0.04,
      freeze: 0,
      afterimage: 0,
      monitor: 0.55,
      sutures: 0.1,
      route: 0.18,
      finalPush: 0,
      darkness: 0.82
    }
  },
  {
    start: 52.91,
    end: 69.61,
    shot: {
      label: "EXPOSURE 1",
      tableX: 0.51,
      tableY: 0.58,
      tableW: 0.5,
      tableH: 0.12,
      tableTilt: -0.08,
      lamp: 0.68,
      pressure: 0.32,
      records: 0.18,
      exposure: 0.82,
      freeze: 0.12,
      afterimage: 0,
      monitor: 0.28,
      sutures: 0.3,
      route: 0.22,
      finalPush: 0.05,
      darkness: 0.42
    }
  },
  {
    start: 69.61,
    end: 100,
    shot: {
      label: "AFTERIMAGE",
      tableX: 0.53,
      tableY: 0.62,
      tableW: 0.34,
      tableH: 0.075,
      tableTilt: -0.11,
      lamp: 0.18,
      pressure: 0.18,
      records: 0.12,
      exposure: 0.05,
      freeze: 0,
      afterimage: 0.9,
      monitor: 0.18,
      sutures: 0.1,
      route: 0.16,
      finalPush: 0,
      darkness: 0.86
    }
  },
  {
    start: 100,
    end: 131.7,
    shot: {
      label: "TRIAGE GRID",
      tableX: 0.5,
      tableY: 0.66,
      tableW: 0.38,
      tableH: 0.09,
      tableTilt: -0.07,
      lamp: 0.36,
      pressure: 0.78,
      records: 0.7,
      exposure: 0.08,
      freeze: 0.05,
      afterimage: 0.1,
      monitor: 0.95,
      sutures: 0.14,
      route: 0.2,
      finalPush: 0,
      darkness: 0.78
    }
  },
  {
    start: 131.7,
    end: 148.4,
    shot: {
      label: "FROZEN CHORUS",
      tableX: 0.52,
      tableY: 0.57,
      tableW: 0.45,
      tableH: 0.105,
      tableTilt: -0.04,
      lamp: 0.52,
      pressure: 0.28,
      records: 0.18,
      exposure: 0.68,
      freeze: 0.96,
      afterimage: 0.18,
      monitor: 0.52,
      sutures: 0.22,
      route: 0.08,
      finalPush: 0,
      darkness: 0.34
    }
  },
  {
    start: 148.4,
    end: 170,
    shot: {
      label: "SUTURE DRIFT",
      tableX: 0.49,
      tableY: 0.62,
      tableW: 0.27,
      tableH: 0.07,
      tableTilt: -0.1,
      lamp: 0.22,
      pressure: 0.18,
      records: 0.12,
      exposure: 0.02,
      freeze: 0.1,
      afterimage: 0.34,
      monitor: 0.18,
      sutures: 0.88,
      route: 0.18,
      finalPush: 0.1,
      darkness: 0.86
    }
  },
  {
    start: 170,
    end: 190.33,
    shot: {
      label: "EXIT ROUTE",
      tableX: 0.48,
      tableY: 0.63,
      tableW: 0.3,
      tableH: 0.075,
      tableTilt: -0.08,
      lamp: 0.26,
      pressure: 0.32,
      records: 0.22,
      exposure: 0.08,
      freeze: 0.04,
      afterimage: 0.18,
      monitor: 0.54,
      sutures: 0.54,
      route: 0.54,
      finalPush: 0.34,
      darkness: 0.76
    }
  },
  {
    start: 190.33,
    end: 207.03,
    shot: {
      label: "FINAL PULSE",
      tableX: 0.48,
      tableY: 0.61,
      tableW: 0.32,
      tableH: 0.08,
      tableTilt: -0.06,
      lamp: 0.46,
      pressure: 0.24,
      records: 0.28,
      exposure: 0.48,
      freeze: 0.12,
      afterimage: 0.04,
      monitor: 0.58,
      sutures: 0.25,
      route: 0.96,
      finalPush: 1,
      darkness: 0.48
    }
  },
  {
    start: 207.03,
    end: 225.07,
    shot: {
      label: "AFTERCARE",
      tableX: 0.56,
      tableY: 0.66,
      tableW: 0.28,
      tableH: 0.06,
      tableTilt: -0.08,
      lamp: 0.08,
      pressure: 0.04,
      records: 0.04,
      exposure: 0.02,
      freeze: 0,
      afterimage: 0.68,
      monitor: 0.08,
      sutures: 0.08,
      route: 0.32,
      finalPush: 0.12,
      darkness: 0.93
    }
  }
];

const LABELS = ["STATUS", "CASE", "TRIAGE", "INDEX", "VALUE", "RECORD", "CHECK", "SIGNAL"];
const VERDICTS = ["PENDING", "MEASURE", "OBSERVE", "REVIEW", "UNREAD", "HOLD"];
const FLOW_ACCENTS: FlowAccent[] = [
  { start: 31.2, end: 34.8, mode: "drop", strength: 0.58 },
  { start: 51.8, end: 55.4, mode: "sweep", strength: 0.46 },
  { start: 128.4, end: 133.8, mode: "drop", strength: 0.52 },
  { start: 184.6, end: 191.4, mode: "exit", strength: 0.64 }
];

const drawOpePrototype = (ctx: CanvasRenderingContext2D, view: View) => {
  const shot = currentShot(view.time);
  const t = view.time;
  const mechanicalPulse = clamp(view.beatFlash + view.userGlow * 0.22);
  const organicPulse = clamp(view.organicPulse * 0.92 + view.organicBreath * 0.28 + view.userGlow * 0.08, 0, 1.5);
  drawBackground(ctx, view, shot, mechanicalPulse);
  drawFlowAccents(ctx, view);
  drawAttentionAperture(ctx, view, shot);
  drawLamp(ctx, view, shot, organicPulse);
  drawRecordPanels(ctx, view, shot, mechanicalPulse);
  drawMonitorFrame(ctx, view, shot, mechanicalPulse);
  drawTable(ctx, view, shot, organicPulse);
  drawSutures(ctx, view, shot, organicPulse);
  drawPulseRoute(ctx, view, shot, organicPulse);
  drawFreezeCuts(ctx, view, shot, mechanicalPulse);
  drawHud(ctx, view, shot, t);
};

const seedDamp = (value: DampValue, next: number) => {
  value.value = next;
  value.target = next;
  value.velocity = 0;
};

const organicTargetForShot = (shot: Shot) => (
  clamp(0.18 + shot.route * 0.34 + shot.sutures * 0.28 + shot.lamp * 0.12 + shot.exposure * 0.08 - shot.freeze * 0.14)
);

const flowAmountAt = (time: number, accent: FlowAccent) => {
  if (time < accent.start || time > accent.end) return 0;
  const duration = accent.end - accent.start;
  const fade = Math.min(1.2, duration * 0.36);
  const intro = smoothstep(accent.start, accent.start + fade, time);
  const outro = 1 - smoothstep(accent.end - fade, accent.end, time);
  return intro * outro * accent.strength;
};

const drawFlowAccents = (ctx: CanvasRenderingContext2D, view: View) => {
  for (const accent of FLOW_ACCENTS) {
    const amount = flowAmountAt(view.time, accent);
    if (amount <= 0.01) continue;
    if (accent.mode === "drop") drawDropFlow(ctx, view, amount, accent);
    else if (accent.mode === "sweep") drawSweepFlow(ctx, view, amount, accent);
    else drawExitFlow(ctx, view, amount, accent);
  }
};

const drawDropFlow = (ctx: CanvasRenderingContext2D, view: View, amount: number, accent: FlowAccent) => {
  const local = clamp((view.time - accent.start) / (accent.end - accent.start));
  ctx.save();
  ctx.globalAlpha = amount;
  const fall = (local * 0.42 + Math.sin(view.lifePhase * 0.4) * 0.015) % 1;

  const shade = ctx.createLinearGradient(view.left, view.top, view.left, view.top + view.height);
  shade.addColorStop(0, rgba(2, 10, 16, 0));
  shade.addColorStop(0.45, rgba(2, 11, 18, 0.18));
  shade.addColorStop(1, rgba(0, 3, 9, 0.46));
  ctx.fillStyle = shade;
  ctx.fillRect(view.left, view.top, view.width, view.height);

  ctx.strokeStyle = rgba(156, 239, 229, 0.34);
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 18; i += 1) {
    const x = sx(view, 0.08 + ((i * 0.119) % 0.84));
    const y = sy(view, 0.05 + ((i * 0.177 + fall) % 0.92));
    const len = sh(view, 0.06 + (i % 4) * 0.018);
    ctx.beginPath();
    ctx.moveTo(x, y - len * 0.45);
    ctx.lineTo(x + sw(view, 0.008 * Math.sin(i)), y + len * 0.55);
    ctx.stroke();
  }

  ctx.fillStyle = rgba(245, 84, 104, 0.08);
  for (let i = 0; i < 4; i += 1) {
    const y = sy(view, 0.18 + ((fall + i * 0.19) % 0.68));
    ctx.fillRect(sx(view, 0.08 + i * 0.18), y, sw(view, 0.22), sh(view, 0.012));
  }
  ctx.restore();
};

const drawSweepFlow = (ctx: CanvasRenderingContext2D, view: View, amount: number, accent: FlowAccent) => {
  const local = clamp((view.time - accent.start) / (accent.end - accent.start));
  ctx.save();
  ctx.globalAlpha = amount;
  const sweep = sx(view, -0.22 + local * 1.36);
  const beam = ctx.createLinearGradient(sweep - sw(view, 0.24), view.top, sweep + sw(view, 0.28), view.top);
  beam.addColorStop(0, rgba(196, 255, 246, 0));
  beam.addColorStop(0.48, rgba(213, 255, 250, 0.22));
  beam.addColorStop(1, rgba(80, 196, 210, 0));
  ctx.fillStyle = beam;
  ctx.fillRect(view.left, view.top, view.width, view.height);

  ctx.strokeStyle = rgba(211, 255, 248, 0.28);
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 8; i += 1) {
    const y = sy(view, 0.2 + i * 0.07);
    const x = sweep - sw(view, 0.22 - i * 0.016);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + sw(view, 0.42), y - sh(view, 0.035));
    ctx.stroke();
  }
  ctx.restore();
};

const drawExitFlow = (ctx: CanvasRenderingContext2D, view: View, amount: number, accent: FlowAccent) => {
  const local = clamp((view.time - accent.start) / (accent.end - accent.start));
  ctx.save();
  ctx.globalAlpha = amount;
  ctx.strokeStyle = rgba(184, 255, 236, 0.3);
  ctx.lineWidth = 1.3;
  for (let i = 0; i < 16; i += 1) {
    const u = (local * 0.62 + i * 0.071) % 1;
    const x = sx(view, 0.12 + u * 0.72);
    const y = sy(view, 0.76 - u * 0.48 + Math.sin(i * 1.8) * 0.045);
    ctx.beginPath();
    ctx.moveTo(x - sw(view, 0.08), y + sh(view, 0.04));
    ctx.lineTo(x + sw(view, 0.14), y - sh(view, 0.08));
    ctx.stroke();
  }

  const tunnel = ctx.createLinearGradient(sx(view, 0.22), sy(view, 0.72), sx(view, 0.86), sy(view, 0.26));
  tunnel.addColorStop(0, rgba(0, 0, 0, 0));
  tunnel.addColorStop(0.48, rgba(105, 229, 223, 0.11));
  tunnel.addColorStop(1, rgba(240, 255, 250, 0.18));
  ctx.fillStyle = tunnel;
  ctx.beginPath();
  ctx.moveTo(sx(view, 0.12), sy(view, 0.86));
  ctx.lineTo(sx(view, 0.34), sy(view, 0.62));
  ctx.lineTo(sx(view, 0.92), sy(view, 0.2));
  ctx.lineTo(sx(view, 0.98), sy(view, 0.34));
  ctx.lineTo(sx(view, 0.42), sy(view, 0.72));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const focusWindowForShot = (shot: Shot): FocusWindow => {
  const routeFocus = shot.route * 0.9 + shot.finalPush * 0.7;
  const recordFocus = Math.max(0, shot.records * 0.65 + shot.pressure * 0.25 - shot.exposure * 0.25);
  const sutureFocus = shot.sutures * 0.9;
  const frozenFocus = shot.freeze * 0.85;
  const aftercareFocus = shot.label === "AFTERCARE" ? 1 : 0;

  if (aftercareFocus > 0.5) {
    return { x: 0.72, y: 0.74, width: 0.26, height: 0.2, angle: -0.15, strength: 0.52 };
  }
  if (routeFocus > 0.7) {
    return { x: 0.57, y: 0.51, width: 0.72, height: 0.32, angle: -0.52, strength: 0.34 + routeFocus * 0.12 };
  }
  if (sutureFocus > 0.55) {
    return { x: 0.54, y: 0.5, width: 0.5, height: 0.42, angle: -0.18, strength: 0.42 };
  }
  if (frozenFocus > 0.55) {
    return { x: shot.tableX, y: shot.tableY, width: 0.48, height: 0.22, angle: shot.tableTilt, strength: 0.38 };
  }
  if (recordFocus > 0.55) {
    return { x: 0.5, y: 0.55, width: 0.82, height: 0.68, angle: -0.08, strength: 0.28 + recordFocus * 0.12 };
  }
  return {
    x: shot.tableX,
    y: shot.tableY,
    width: 0.42 + shot.exposure * 0.2,
    height: 0.28 + shot.lamp * 0.08,
    angle: shot.tableTilt,
    strength: 0.24 + shot.exposure * 0.08
  };
};

const drawAttentionAperture = (ctx: CanvasRenderingContext2D, view: View, shot: Shot) => {
  const focus = focusWindowForShot(shot);
  const cx = sx(view, focus.x + Math.sin(view.lifePhase * 0.62) * 0.004 * view.organicBreath);
  const cy = sy(view, focus.y + Math.cos(view.lifePhase * 0.54) * 0.005 * view.organicBreath);
  const rx = sw(view, focus.width * (0.5 + view.organicPulse * 0.014));
  const ry = sh(view, focus.height * (0.5 + view.organicBreath * 0.018));

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(focus.angle);
  ctx.scale(Math.max(0.001, rx / Math.max(rx, ry)), Math.max(0.001, ry / Math.max(rx, ry)));
  const radius = Math.max(rx, ry);
  const aperture = ctx.createRadialGradient(0, 0, radius * 0.24, 0, 0, radius * 1.22);
  aperture.addColorStop(0, rgba(0, 2, 8, 0));
  aperture.addColorStop(0.58, rgba(0, 2, 8, focus.strength * 0.08));
  aperture.addColorStop(1, rgba(0, 2, 8, focus.strength));
  ctx.fillStyle = aperture;
  ctx.fillRect(-radius * 1.4, -radius * 1.4, radius * 2.8, radius * 2.8);
  ctx.restore();

  if (shot.label === "AFTERCARE") {
    ctx.save();
    ctx.globalAlpha = 0.18 + view.organicPulse * 0.1;
    ctx.strokeStyle = rgba(230, 255, 247, 0.52);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(sx(view, 0.57), sy(view, 0.78));
    ctx.bezierCurveTo(sx(view, 0.63), sy(view, 0.75), sx(view, 0.7), sy(view, 0.76), sx(view, 0.79), sy(view, 0.72));
    ctx.stroke();
    ctx.restore();
  }
};

const currentShot = (time: number) => {
  const shotEntry = SHOTS.find((item) => time >= item.start && time < item.end) ?? SHOTS[SHOTS.length - 1];
  const nextEntry = SHOTS[SHOTS.indexOf(shotEntry) + 1];
  if (!nextEntry) return shotEntry.shot;
  const blend = smoothstep(shotEntry.end - 1.2, shotEntry.end, time);
  return mixShot(shotEntry.shot, nextEntry.shot, blend);
};

const mixShot = (a: Shot, b: Shot, t: number): Shot => ({
  label: t < 0.5 ? a.label : b.label,
  tableX: mix(a.tableX, b.tableX, t),
  tableY: mix(a.tableY, b.tableY, t),
  tableW: mix(a.tableW, b.tableW, t),
  tableH: mix(a.tableH, b.tableH, t),
  tableTilt: mix(a.tableTilt, b.tableTilt, t),
  lamp: mix(a.lamp, b.lamp, t),
  pressure: mix(a.pressure, b.pressure, t),
  records: mix(a.records, b.records, t),
  exposure: mix(a.exposure, b.exposure, t),
  freeze: mix(a.freeze, b.freeze, t),
  afterimage: mix(a.afterimage, b.afterimage, t),
  monitor: mix(a.monitor, b.monitor, t),
  sutures: mix(a.sutures, b.sutures, t),
  route: mix(a.route, b.route, t),
  finalPush: mix(a.finalPush, b.finalPush, t),
  darkness: mix(a.darkness, b.darkness, t)
});

const mix = (a: number, b: number, t: number) => a + (b - a) * clamp(t);
const sx = (view: View, x: number) => view.left + view.width * x;
const sy = (view: View, y: number) => view.top + view.height * y;
const sw = (view: View, width: number) => view.width * width;
const sh = (view: View, height: number) => view.height * height;

const rgba = (r: number, g: number, b: number, a: number) => `rgba(${r}, ${g}, ${b}, ${clamp(a)})`;

const drawBackground = (ctx: CanvasRenderingContext2D, view: View, shot: Shot, pulse: number) => {
  const gradient = ctx.createLinearGradient(view.left, view.top, view.left + view.width, view.top + view.height);
  const exposure = shot.exposure * 0.55 + shot.freeze * 0.35;
  gradient.addColorStop(0, rgba(4 + exposure * 70, 8 + exposure * 80, 14 + exposure * 90, 1));
  gradient.addColorStop(0.55, rgba(3 + exposure * 35, 14 + exposure * 60, 22 + exposure * 70, 1));
  gradient.addColorStop(1, rgba(1 + exposure * 18, 5 + exposure * 25, 12 + exposure * 40, 1));
  ctx.fillStyle = gradient;
  ctx.fillRect(view.left, view.top, view.width, view.height);

  const sideExposure = shot.exposure * (0.75 + pulse * 0.25);
  if (sideExposure > 0.01) {
    const glow = ctx.createLinearGradient(view.left, view.top, view.left + view.width * 0.68, view.top);
    glow.addColorStop(0, rgba(220, 249, 255, sideExposure * 0.65));
    glow.addColorStop(0.55, rgba(105, 215, 230, sideExposure * 0.16));
    glow.addColorStop(1, rgba(0, 0, 0, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(view.left, view.top, view.width, view.height);
  }

  ctx.save();
  ctx.globalAlpha = 0.06 + shot.pressure * 0.08;
  ctx.strokeStyle = rgba(174, 232, 225, 0.7);
  ctx.lineWidth = 1;
  const gap = Math.max(12, view.height * 0.035);
  for (let y = view.top + (view.time * 18) % gap; y < view.top + view.height; y += gap) {
    ctx.beginPath();
    ctx.moveTo(view.left, y);
    ctx.lineTo(view.left + view.width, y);
    ctx.stroke();
  }
  ctx.restore();

  const dark = shot.darkness * (1 - shot.exposure * 0.4);
  ctx.fillStyle = rgba(0, 3, 9, dark * 0.42);
  ctx.fillRect(view.left, view.top, view.width, view.height);
};

const drawLamp = (ctx: CanvasRenderingContext2D, view: View, shot: Shot, pulse: number) => {
  const amount = shot.lamp;
  if (amount <= 0.02) return;
  const liveBloom = view.lampBloom * (0.7 + shot.exposure * 0.4);
  const x = sx(view, 0.19 + Math.sin(view.lifePhase * 1.7) * 0.006 * (0.4 + pulse));
  const y = sy(view, 0.12 + Math.cos(view.lifePhase * 1.35) * 0.008 * (0.25 + pulse));
  const radius = sw(view, 0.065 + amount * 0.035 + liveBloom * 0.014);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.18 + Math.sin(view.lifePhase * 0.9) * 0.018 * view.organicBreath);
  ctx.fillStyle = rgba(210, 255, 246, 0.08 + amount * 0.18 + liveBloom * 0.09);
  ctx.beginPath();
  ctx.ellipse(0, 0, radius, radius * (0.34 + liveBloom * 0.055), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(218, 255, 249, 0.16 + amount * 0.25 + liveBloom * 0.12);
  ctx.lineWidth = 1.5 + liveBloom * 1.1;
  ctx.stroke();
  ctx.restore();

  const cone = ctx.createRadialGradient(x, y, radius * 0.2, x + sw(view, 0.12), y + sh(view, 0.24), sw(view, 0.48 + liveBloom * 0.07));
  cone.addColorStop(0, rgba(169, 255, 241, amount * 0.22 + liveBloom * 0.1));
  cone.addColorStop(0.55, rgba(78, 175, 176, amount * 0.07 + liveBloom * 0.025));
  cone.addColorStop(1, rgba(0, 0, 0, 0));
  ctx.fillStyle = cone;
  ctx.fillRect(view.left, view.top, view.width, view.height);
};

const drawRecordPanels = (ctx: CanvasRenderingContext2D, view: View, shot: Shot, pulse: number) => {
  const amount = shot.records;
  if (amount <= 0.02) return;
  const count = Math.round(3 + amount * 7);
  const leftBand = sw(view, 0.26 + amount * 0.08);
  const rightBand = sw(view, 0.22 + amount * 0.08);
  const panelAlpha = 0.16 + amount * 0.22;

  for (let i = 0; i < count; i += 1) {
    const side = i % 2 === 0 ? -1 : 1;
    const bandWidth = side < 0 ? leftBand : rightBand;
    const baseX = side < 0 ? view.left + sw(view, 0.02) : view.left + view.width - bandWidth - sw(view, 0.02);
    const y = view.top + sh(view, 0.14 + ((i * 0.137 + view.time * 0.012) % 0.64));
    const w = bandWidth * (0.66 + ((i * 17) % 5) * 0.06);
    const h = sh(view, 0.055 + ((i * 13) % 4) * 0.014);
    const crowd = shot.pressure * sw(view, 0.055);
    const x = baseX + (side < 0 ? crowd * amount : -crowd * amount);
    drawPanel(ctx, x, y, w, h, LABELS[i % LABELS.length], VERDICTS[(i + 2) % VERDICTS.length], panelAlpha, pulse);
  }

  if (shot.pressure > 0.18) {
    ctx.save();
    ctx.globalAlpha = shot.pressure * 0.35;
    ctx.strokeStyle = rgba(248, 83, 104, 0.46);
    ctx.lineWidth = 1;
    const centerX = sx(view, shot.tableX);
    const centerY = sy(view, shot.tableY);
    for (let i = 0; i < 9; i += 1) {
      const side = i % 2 === 0 ? 0.06 : 0.91;
      const y = sy(view, 0.18 + i * 0.07);
      ctx.beginPath();
      ctx.moveTo(sx(view, side), y);
      ctx.lineTo(centerX + Math.sin(i) * sw(view, 0.05), centerY + Math.cos(i * 2) * sh(view, 0.05));
      ctx.stroke();
    }
    ctx.restore();
  }
};

const drawPanel = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  value: string,
  alpha: number,
  pulse: number
) => {
  ctx.save();
  ctx.fillStyle = rgba(9, 24, 34, alpha);
  ctx.strokeStyle = rgba(166, 239, 229, alpha + pulse * 0.14);
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = rgba(226, 252, 246, alpha + 0.28);
  ctx.font = `${Math.max(9, h * 0.22)}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  ctx.fillText(title, x + w * 0.08, y + h * 0.38);
  ctx.fillStyle = rgba(245, 88, 108, alpha + 0.12);
  ctx.font = `${Math.max(9, h * 0.18)}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  ctx.fillText(value, x + w * 0.08, y + h * 0.72);
  ctx.strokeStyle = rgba(222, 255, 249, alpha * 0.75);
  for (let i = 0; i < 3; i += 1) {
    const ly = y + h * (0.28 + i * 0.18);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.52, ly);
    ctx.lineTo(x + w * (0.86 - i * 0.08), ly);
    ctx.stroke();
  }
  ctx.restore();
};

const drawMonitorFrame = (ctx: CanvasRenderingContext2D, view: View, shot: Shot, pulse: number) => {
  const amount = shot.monitor;
  if (amount <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = 0.22 + amount * 0.38;
  ctx.strokeStyle = rgba(112, 228, 224, 0.6 + pulse * 0.2);
  ctx.lineWidth = 1;
  const topHeight = sh(view, 0.12 + amount * 0.21);
  const y = view.top + sh(view, 0.035 + (1 - amount) * 0.1);
  ctx.strokeRect(sx(view, 0.18), y, sw(view, 0.64), topHeight);
  const columns = 5;
  for (let i = 1; i < columns; i += 1) {
    const x = sx(view, 0.18 + (0.64 / columns) * i);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + topHeight);
    ctx.stroke();
  }
  for (let i = 1; i < 4; i += 1) {
    const gy = y + topHeight * i / 4;
    ctx.beginPath();
    ctx.moveTo(sx(view, 0.18), gy);
    ctx.lineTo(sx(view, 0.82), gy);
    ctx.stroke();
  }
  drawSmallWave(ctx, sx(view, 0.22), y + topHeight * 0.38, sw(view, 0.22), sh(view, 0.035), view.time, pulse);
  drawSmallWave(ctx, sx(view, 0.54), y + topHeight * 0.68, sw(view, 0.2), sh(view, 0.026), view.time + 1.7, pulse);
  ctx.restore();
};

const drawTable = (ctx: CanvasRenderingContext2D, view: View, shot: Shot, pulse: number) => {
  const x = sx(view, shot.tableX);
  const y = sy(view, shot.tableY);
  const w = sw(view, shot.tableW);
  const h = sh(view, shot.tableH);
  const breathScale = 1 + view.organicBreath * 0.018 + view.organicPulse * 0.018;
  const livingOffset = Math.sin(view.lifePhase * 2.1) * sh(view, 0.005) * (0.4 + view.organicBreath);
  ctx.save();
  ctx.translate(x + Math.sin(view.lifePhase * 1.15) * sw(view, 0.004) * view.organicBreath, y + livingOffset);
  ctx.rotate(shot.tableTilt + Math.sin(view.lifePhase * 0.8) * 0.012 * view.organicBreath);
  ctx.scale(breathScale, 1 + view.organicBreath * 0.01 + view.organicPulse * 0.012);

  if (shot.afterimage > 0.15) {
    ctx.strokeStyle = rgba(192, 243, 240, 0.08 + shot.afterimage * 0.24);
    ctx.lineWidth = 1.2;
    roundedRect(ctx, -w * 0.55, -h * 0.58, w * 1.1, h * 1.16, h * 0.18);
    ctx.stroke();
  }

  const fill = ctx.createLinearGradient(-w * 0.55, -h * 0.5, w * 0.55, h * 0.5);
  fill.addColorStop(0, rgba(204, 255, 247, 0.05 + shot.exposure * 0.28 + shot.freeze * 0.35));
  fill.addColorStop(0.52, rgba(60, 116, 126, 0.22 + shot.exposure * 0.16));
  fill.addColorStop(1, rgba(6, 22, 31, 0.72));
  ctx.fillStyle = fill;
  ctx.strokeStyle = rgba(219, 255, 249, 0.3 + shot.exposure * 0.3 + pulse * 0.18);
  ctx.lineWidth = 1.5 + pulse * 0.8;
  roundedRect(ctx, -w * 0.5, -h * 0.5, w, h, h * 0.22);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = rgba(246, 74, 93, 0.32 + pulse * 0.28 + view.organicPulse * 0.24);
  ctx.lineWidth = Math.max(1, h * (0.05 + view.organicPulse * 0.035));
  const wave = Math.sin(view.lifePhase * 4.2) * h * 0.035 * view.organicBreath;
  const spike = h * (0.16 + view.organicPulse * 0.17);
  ctx.beginPath();
  ctx.moveTo(-w * 0.38, h * 0.04 + wave);
  ctx.bezierCurveTo(-w * 0.28, h * 0.04 - wave * 0.3, -w * 0.22, h * 0.04 + wave * 0.4, -w * 0.18, h * 0.04);
  ctx.lineTo(-w * 0.12, -spike);
  ctx.lineTo(-w * 0.05, h * (0.14 + view.organicPulse * 0.08));
  ctx.lineTo(w * 0.02, -h * (0.08 + view.organicPulse * 0.08));
  ctx.bezierCurveTo(w * 0.08, h * 0.03, w * 0.17, h * 0.045 + wave, w * 0.36, h * 0.04 - wave * 0.25);
  ctx.stroke();

  ctx.strokeStyle = rgba(232, 255, 247, 0.08 + view.organicPulse * 0.18);
  ctx.lineWidth = Math.max(1, h * 0.035);
  ctx.beginPath();
  ctx.moveTo(-w * 0.45, -h * 0.18);
  ctx.bezierCurveTo(-w * 0.25, -h * (0.28 + view.organicPulse * 0.08), w * 0.15, -h * 0.22, w * 0.46, -h * 0.12);
  ctx.stroke();

  ctx.restore();
};

const drawSutures = (ctx: CanvasRenderingContext2D, view: View, shot: Shot, pulse: number) => {
  const amount = shot.sutures;
  if (amount <= 0.04) return;
  ctx.save();
  ctx.globalAlpha = 0.18 + amount * 0.58;
  ctx.strokeStyle = rgba(178, 255, 231, 0.62 + pulse * 0.2);
  ctx.lineWidth = 1.1 + amount * 0.8;
  const cx = sx(view, 0.55);
  const cy = sy(view, 0.53);
  const gap = sw(view, 0.035 + (1 - amount) * 0.035);
  const progress = (view.lifePhase * 0.33 + view.organicPulse * 0.08) % 1;

  for (let i = 0; i < 5; i += 1) {
    const offset = (i - 2) * gap;
    ctx.beginPath();
    ctx.moveTo(sx(view, 0.23), cy + offset);
    ctx.bezierCurveTo(
      sx(view, 0.35),
      cy - sh(view, 0.18 + view.organicBreath * 0.025) + offset,
      sx(view, 0.62),
      cy + sh(view, 0.19 + view.organicPulse * 0.028) - offset,
      sx(view, 0.78),
      cy - offset * 0.2
    );
    ctx.setLineDash([sw(view, 0.018), sw(view, 0.018)]);
    ctx.lineDashOffset = -progress * sw(view, 0.1) - i * 8;
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.fillStyle = rgba(224, 255, 244, 0.18 + view.organicPulse * 0.34);
  for (let i = 0; i < 4; i += 1) {
    const k = (progress + i * 0.21) % 1;
    const x = mix(sx(view, 0.28), sx(view, 0.74), k);
    const y = cy + Math.sin(k * Math.PI * 2.7 + i) * sh(view, 0.075 + view.organicBreath * 0.028);
    ctx.beginPath();
    ctx.arc(x, y, 2.2 + view.organicPulse * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = rgba(4, 12, 20, 0.58);
  ctx.strokeStyle = rgba(218, 255, 248, 0.18 + amount * 0.3);
  ctx.beginPath();
  ctx.ellipse(cx, cy, sw(view, 0.075), sh(view, 0.11), -0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
};

const drawPulseRoute = (ctx: CanvasRenderingContext2D, view: View, shot: Shot, pulse: number) => {
  const amount = Math.max(shot.route, view.routeFlow * 0.85);
  if (amount <= 0.03) return;
  const final = shot.finalPush;
  const drift = view.organicBreath * 0.012;
  const startX = sx(view, (final > 0.4 ? 0.12 : 0.22) + Math.sin(view.lifePhase * 0.95) * drift);
  const startY = sy(view, (final > 0.4 ? 0.78 : 0.72) + Math.cos(view.lifePhase * 1.25) * drift);
  const endX = sx(view, (final > 0.4 ? 0.9 : 0.72) + Math.sin(view.lifePhase * 0.7 + 1.7) * drift);
  const endY = sy(view, (final > 0.4 ? 0.28 : 0.55) + Math.cos(view.lifePhase * 0.8 + 0.9) * drift);
  ctx.save();
  ctx.globalAlpha = 0.25 + amount * 0.65;
  ctx.strokeStyle = rgba(235, 255, 250, 0.6);
  ctx.lineWidth = 1.4 + final * 2 + view.organicPulse * 1.5;
  ctx.beginPath();
  const points = makePulsePoints(
    startX,
    startY,
    endX,
    endY,
    18,
    sh(view, 0.028 + final * 0.02),
    view.lifePhase,
    view.organicPulse,
    view.organicBreath
  );
  for (let i = 0; i < points.length; i += 1) {
    const [x, y] = points[i];
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.strokeStyle = rgba(248, 76, 96, 0.18 + final * 0.5 + pulse * 0.22);
  ctx.lineWidth = 4 + final * 5 + view.organicPulse * 1.8;
  ctx.globalAlpha = amount * 0.42;
  ctx.beginPath();
  for (let i = 0; i < points.length; i += 1) {
    const [x, y] = points[i];
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  const lead = (view.lifePhase * (0.3 + final * 0.17)) % 1;
  ctx.strokeStyle = rgba(238, 255, 250, 0.58 + view.organicPulse * 0.18);
  ctx.lineWidth = 2.2 + final * 3.5 + view.organicPulse * 2;
  ctx.globalAlpha = amount * (0.34 + view.organicPulse * 0.18);
  drawRouteWindow(ctx, points, lead, 0.22 + final * 0.08);

  if (final > 0.18) {
    ctx.globalAlpha = final * (0.4 + view.organicPulse * 0.28);
    ctx.fillStyle = rgba(234, 255, 249, 0.74);
    for (let i = 0; i < 5; i += 1) {
      const k = (view.lifePhase * 0.42 + i * 0.18) % 1;
      const x = mix(startX, endX, k);
      const y = mix(startY, endY, k) + Math.sin(k * Math.PI * 6 + view.lifePhase) * sh(view, 0.025 + view.organicBreath * 0.012);
      const size = 6 + view.organicPulse * 7 + Math.sin(view.lifePhase * 2.2 + i) * 1.5;
      ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size);
    }
  }
  ctx.restore();
};

const makePulsePoints = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  steps: number,
  amp: number,
  phase: number,
  pulse: number,
  breath: number
) => {
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i += 1) {
    const u = i / steps;
    const x = mix(startX, endX, u);
    const y = mix(startY, endY, u);
    const spike = ((i + Math.floor(phase * 2.2)) % 5 === 2 ? -1.7 : (i % 5 === 3 ? 1.15 : 0));
    const wobble = Math.sin(phase * 2.6 + u * Math.PI * 5.4) * amp * 0.52 * breath;
    points.push([x, y + spike * amp * (0.85 + pulse * 0.8) + wobble]);
  }
  return points;
};

const drawRouteWindow = (ctx: CanvasRenderingContext2D, points: Array<[number, number]>, lead: number, width: number) => {
  const start = clamp(lead - width * 0.5);
  const end = clamp(lead + width * 0.5);
  const max = points.length - 1;
  ctx.beginPath();
  let hasPoint = false;
  for (let i = 0; i < points.length; i += 1) {
    const u = i / max;
    if (u < start || u > end) continue;
    const [x, y] = points[i];
    if (!hasPoint) {
      ctx.moveTo(x, y);
      hasPoint = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  if (hasPoint) ctx.stroke();
};

const drawFreezeCuts = (ctx: CanvasRenderingContext2D, view: View, shot: Shot, pulse: number) => {
  const amount = shot.freeze;
  if (amount <= 0.04) return;
  ctx.save();
  ctx.globalAlpha = amount * (0.32 + pulse * 0.12);
  ctx.fillStyle = rgba(255, 255, 255, 0.16 + amount * 0.18);
  ctx.fillRect(view.left, view.top, view.width, view.height);
  ctx.globalAlpha = amount * 0.5;
  ctx.fillStyle = rgba(0, 4, 10, 0.64);
  for (let i = 0; i < 5; i += 1) {
    ctx.save();
    ctx.translate(sx(view, 0.16 + i * 0.18), sy(view, 0.2 + (i % 2) * 0.14));
    ctx.rotate(-0.18);
    ctx.fillRect(0, 0, sw(view, 0.03 + i * 0.01), sh(view, 0.66));
    ctx.restore();
  }
  ctx.restore();
};

const drawHud = (ctx: CanvasRenderingContext2D, view: View, shot: Shot, time: number) => {
  ctx.save();
  const alpha = 0.22 + shot.pressure * 0.2 + shot.finalPush * 0.12;
  ctx.fillStyle = rgba(220, 255, 248, alpha);
  ctx.font = `${Math.max(11, view.width * 0.012)}px ui-monospace, SFMono-Regular, Consolas, monospace`;
  ctx.fillText(shot.label, sx(view, 0.035), sy(view, 0.935));
  ctx.fillStyle = rgba(248, 87, 107, 0.24 + shot.finalPush * 0.28);
  ctx.fillText(`T+${time.toFixed(2)}`, sx(view, 0.83), sy(view, 0.935));
  ctx.strokeStyle = rgba(206, 255, 247, 0.16 + shot.exposure * 0.2);
  ctx.lineWidth = 1;
  ctx.strokeRect(sx(view, 0.025), sy(view, 0.04), sw(view, 0.95), sh(view, 0.9));
  ctx.restore();
};

const drawSmallWave = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  time: number,
  pulse: number
) => {
  ctx.beginPath();
  for (let i = 0; i < 26; i += 1) {
    const u = i / 25;
    const spike = i % 7 === 3 ? -1.5 : Math.sin((u * 4 + time * 1.4) * Math.PI) * 0.22;
    const px = x + w * u;
    const py = y + h * 0.5 + spike * h * (0.28 + pulse * 0.18);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
};

const roundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  const radius = Math.min(r, Math.abs(w) * 0.5, Math.abs(h) * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
};
