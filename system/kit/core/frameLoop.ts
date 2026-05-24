export const startFrameLoop = (tick: (now: number, dt: number) => void) => {
  let lastFrame = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    tick(now, dt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame((now) => {
    lastFrame = now;
    requestAnimationFrame(frame);
  });
};
