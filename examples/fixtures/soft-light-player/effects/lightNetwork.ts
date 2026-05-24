import { ColorRamp, DampValue, clamp, type PointerState } from "../../../../system/kit";

type NodePoint = {
  x: DampValue;
  y: DampValue;
  baseX: number;
  baseY: number;
  phase: number;
  speed: number;
};

type Link = {
  a: number;
  b: number;
  life: number;
  strength: number;
};

export class LightNetwork {
  private nodes: NodePoint[];
  private links: Link[] = [];
  private lastBeatIndex = -1;

  constructor(count: number) {
    this.nodes = Array.from({ length: count }, () => {
      const baseX = 0.12 + Math.random() * 0.76;
      const baseY = 0.1 + Math.random() * 0.72;
      return {
        x: new DampValue(baseX, 0.045, 0.82),
        y: new DampValue(baseY, 0.045, 0.82),
        baseX,
        baseY,
        phase: Math.random() * Math.PI * 2,
        speed: 0.18 + Math.random() * 0.24
      };
    });
  }

  trigger(beatIndex: number, chorus: number, emphasis: number) {
    if (beatIndex === this.lastBeatIndex) return;
    this.lastBeatIndex = beatIndex;
    const linkCount = 2 + Math.floor(chorus * 5) + Math.floor(emphasis * 3);
    for (let index = 0; index < linkCount; index++) {
      const a = Math.floor(Math.random() * this.nodes.length);
      let b = Math.floor(Math.random() * this.nodes.length);
      if (a === b) b = (b + 1) % this.nodes.length;
      this.links.push({ a, b, life: 1, strength: 0.42 + chorus * 0.38 + emphasis * 0.32 });
    }
    this.links = this.links.slice(-34);
  }

  draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    dt: number,
    time: number,
    pointer: PointerState,
    ramp: ColorRamp,
    glow: number
  ) {
    this.updateNodes(dt, time, pointer, width, height);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const link of this.links) {
      link.life -= dt * 0.16;
      if (link.life <= 0) continue;
      const a = this.nodes[link.a];
      const b = this.nodes[link.b];
      const x1 = a.x.value * width;
      const y1 = a.y.value * height;
      const x2 = b.x.value * width;
      const y2 = b.y.value * height;
      const alpha = clamp(link.life) * link.strength * glow;
      const lineGradient = ctx.createLinearGradient(x1, y1, x2, y2);
      lineGradient.addColorStop(0, ramp.sample(time * 0.02 + link.a * 0.07, alpha * 0.12));
      lineGradient.addColorStop(0.5, ramp.sample(time * 0.018 + 0.35, alpha * 0.34));
      lineGradient.addColorStop(1, ramp.sample(time * 0.02 + link.b * 0.07, alpha * 0.12));

      ctx.strokeStyle = lineGradient;
      ctx.shadowBlur = 34 * glow;
      ctx.shadowColor = ramp.sample(time * 0.021 + 0.12, alpha * 0.7);
      ctx.lineWidth = 10 + alpha * 15;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      const midX = (x1 + x2) / 2 + Math.sin(time * 0.7 + link.a) * 18;
      const midY = (y1 + y2) / 2 + Math.cos(time * 0.5 + link.b) * 18;
      ctx.quadraticCurveTo(midX, midY, x2, y2);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.lineWidth = 1.1 + alpha * 2.3;
      ctx.strokeStyle = ramp.sample(time * 0.019 + 0.25, alpha * 0.68);
      ctx.stroke();
    }

    for (const node of this.nodes) {
      const x = node.x.value * width;
      const y = node.y.value * height;
      const radius = (4 + Math.sin(time + node.phase) * 1.5) * glow;
      const nodeGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 9);
      nodeGradient.addColorStop(0, ramp.sample(node.phase * 0.04 + time * 0.02, 0.45 * glow));
      nodeGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = nodeGradient;
      ctx.beginPath();
      ctx.arc(x, y, radius * 9, 0, Math.PI * 2);
      ctx.fill();
    }

    this.links = this.links.filter((link) => link.life > 0);
    ctx.restore();
  }

  private updateNodes(dt: number, time: number, pointer: PointerState, width: number, height: number) {
    for (const node of this.nodes) {
      const orbitX = Math.sin(time * node.speed + node.phase) * 0.08;
      const orbitY = Math.cos(time * node.speed * 0.8 + node.phase * 1.7) * 0.06;
      let targetX = node.baseX + orbitX;
      let targetY = node.baseY + orbitY;
      if (pointer.active) {
        const px = pointer.x / width;
        const py = pointer.y / height;
        const distance = Math.hypot(px - targetX, py - targetY);
        const pull = Math.max(0, 1 - distance * 2.8) * 0.12;
        targetX += (px - targetX) * pull;
        targetY += (py - targetY) * pull;
      }
      node.x.target = clamp(targetX, 0.04, 0.96);
      node.y.target = clamp(targetY, 0.04, 0.88);
      node.x.update(dt);
      node.y.update(dt);
    }
  }
}

