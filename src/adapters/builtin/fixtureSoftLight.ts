import type { SongAdapterContext } from "../../runtime/songAdapterContext";
import { SoftLightRenderer } from "../../renderers/softLightRenderer";
import type { SongApp, SongAppServices } from "../types";

export const createFixtureSoftLightApp = (
  context: SongAdapterContext,
  services: SongAppServices,
  status = "builtin fixture adapter"
): SongApp => {
  const renderer = new SoftLightRenderer(services.canvas, services.ctx, context.musicMap);

  return {
    id: "builtin:fixture-soft-light",
    status,
    resize: () => renderer.resize(),
    render: ({ time, dt, userGlow }) => renderer.render(context.musicMap, time, dt, userGlow),
    pointerMove: (event) => renderer.pointerMove(event),
    pointerLeave: () => renderer.pointerLeave(),
    pointerDown: (event) => renderer.pointerDown(event),
    pointerUp: () => renderer.pointerUp(),
    resetVisualTiming: () => renderer.resetBeat()
  };
};
