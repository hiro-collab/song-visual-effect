export class DampValue {
  value: number;
  target: number;
  velocity = 0;
  stiffness: number;
  damping: number;

  constructor(value: number, stiffness = 0.065, damping = 0.78) {
    this.value = value;
    this.target = value;
    this.stiffness = stiffness;
    this.damping = damping;
  }

  update(dt: number): number {
    const frameScale = Math.min(3, dt * 60);
    this.velocity += (this.target - this.value) * this.stiffness * frameScale;
    this.velocity *= Math.pow(this.damping, frameScale);
    this.value += this.velocity * frameScale;
    return this.value;
  }
}

export const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

export const smoothstep = (edge0: number, edge1: number, value: number) => {
  const t = clamp((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

export const decayPulse = (age: number, duration: number) => {
  if (age < 0 || age > duration) return 0;
  return Math.exp(-age * 5.2) * (1 - age / duration);
};

