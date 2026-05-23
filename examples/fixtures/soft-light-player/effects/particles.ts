import { ColorRamp, type PointerState } from "../../../../system/kit";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  drift: number;
};

export class ParticleField {
  private particles: Particle[];

  constructor(count: number) {
    this.particles = Array.from({ length: count }, () => this.createParticle(Math.random(), Math.random()));
  }

  resize(width: number, height: number) {
    for (const particle of this.particles) {
      particle.x = ((particle.x % 1) + 1) % 1;
      particle.y = ((particle.y % 1) + 1) % 1;
      particle.size = Math.max(0.8, Math.min(width, height) * (0.0009 + Math.random() * 0.0018));
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    dt: number,
    time: number,
    pointer: PointerState,
    ramp: ColorRamp,
    density: number
  ) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const maxParticles = Math.floor(this.particles.length * Math.max(0.2, Math.min(1, density)));
    for (let index = 0; index < maxParticles; index++) {
      const particle = this.particles[index];
      const px = particle.x * width;
      const py = particle.y * height;
      const attraction = pointer.active ? 0.04 : 0;
      if (attraction) {
        const dx = pointer.x - px;
        const dy = pointer.y - py;
        const distance = Math.hypot(dx, dy) + 1;
        const pull = Math.min(1, 180 / distance) * attraction * dt * 60;
        particle.vx += (dx / distance) * pull * 0.05;
        particle.vy += (dy / distance) * pull * 0.05;
      }

      particle.vx += Math.cos(time * 0.14 + particle.phase) * particle.drift * dt;
      particle.vy += Math.sin(time * 0.11 + particle.phase) * particle.drift * dt;
      particle.vx *= Math.pow(0.985, dt * 60);
      particle.vy *= Math.pow(0.985, dt * 60);
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;

      if (particle.x < -0.04) particle.x = 1.04;
      if (particle.x > 1.04) particle.x = -0.04;
      if (particle.y < -0.04) particle.y = 1.04;
      if (particle.y > 1.04) particle.y = -0.04;

      const twinkle = 0.45 + Math.sin(time * 1.7 + particle.phase) * 0.22;
      const radius = particle.size * (1.8 + twinkle);
      const gradient = ctx.createRadialGradient(px, py, 0, px, py, radius * 6);
      gradient.addColorStop(0, ramp.sample((particle.phase * 0.05 + time * 0.018) % 1, 0.52));
      gradient.addColorStop(0.35, ramp.sample((particle.phase * 0.05 + 0.18) % 1, 0.16));
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(px, py, radius * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private createParticle(x: number, y: number): Particle {
    return {
      x,
      y,
      vx: (Math.random() - 0.5) * 0.012,
      vy: (Math.random() - 0.5) * 0.012,
      size: 2,
      phase: Math.random() * Math.PI * 2,
      drift: 0.004 + Math.random() * 0.009
    };
  }
}

