import type { SongAdapterContext, SongApp, SongAppFrame, SongAppServices } from "../../system/kit";

export const createNeutralSongApp = (
  context: SongAdapterContext,
  services: SongAppServices
): SongApp => {
  const { canvas, ctx } = services;

  const resize = () => {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  };

  const render = (_frame: SongAppFrame) => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  };

  return {
    id: `${context.manifest.id}:neutral-start`,
    status: `${context.manifest.title}: neutral song app scaffold`,
    resize,
    render
  };
};
