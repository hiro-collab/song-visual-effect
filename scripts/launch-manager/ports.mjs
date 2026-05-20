import { createServer } from "node:net";

export const isPortFree = (port, host = "127.0.0.1") =>
  new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });

export const findPortConflicts = async (ports, host = "127.0.0.1") => {
  const conflicts = [];
  for (const port of ports) {
    if (!(await isPortFree(port, host))) conflicts.push(port);
  }
  return conflicts;
};
