import type { Palette } from "./types";
import { clamp } from "./damping";

export const DEFAULT_PALETTE: Palette = {
  base: ["#fff7dc", "#ffe7a8", "#ffd6ef", "#cfe7ff"],
  accent: ["#fff2a6", "#ffd88c", "#f6b8d9"],
  shadow: ["#7f8eaf", "#9b8eaf", "#151725"]
};

type Rgb = [number, number, number];

const hexToRgb = (hex: string): Rgb => {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t)
];

const rgbCss = (rgb: Rgb, alpha = 1) => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;

export class ColorRamp {
  private colors: Rgb[];

  constructor(palette: Palette) {
    this.colors = [...palette.base, ...palette.accent].map(hexToRgb);
  }

  sample(position: number, alpha = 1): string {
    const t = clamp(position - Math.floor(position));
    const scaled = t * (this.colors.length - 1);
    const index = Math.floor(scaled);
    const local = scaled - index;
    const a = this.colors[index] ?? this.colors[0];
    const b = this.colors[index + 1] ?? this.colors[this.colors.length - 1];
    return rgbCss(mix(a, b, local), alpha);
  }
}

