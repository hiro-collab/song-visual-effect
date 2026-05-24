import { createServer } from "node:net";
import { createHash } from "node:crypto";

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

export const stablePortBaseFor = (value, { min = 5200, max = 62000, blockSize = 32 } = {}) => {
  const range = Math.max(blockSize, max - min - blockSize);
  const hash = createHash("sha256").update(String(value)).digest().readUInt32BE(0);
  return min + (hash % Math.floor(range / blockSize)) * blockSize;
};

export const findFreePort = async ({
  start,
  host = "127.0.0.1",
  exclude = new Set(),
  maxAttempts = 400
}) => {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = start + offset;
    if (port > 65535) break;
    if (exclude.has(port)) continue;
    if (await isPortFree(port, host)) return port;
  }
  throw new Error(`No free TCP port found near ${start}.`);
};

export const findFreePortBlock = async ({
  start,
  count,
  host = "127.0.0.1",
  exclude = new Set(),
  maxAttempts = 400
}) => {
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const ports = Array.from({ length: count }, (_value, index) => start + offset + index);
    if (ports.some((port) => port > 65535 || exclude.has(port))) continue;
    const availability = await Promise.all(ports.map((port) => isPortFree(port, host)));
    if (availability.every(Boolean)) return ports;
  }
  throw new Error(`No free TCP port block of ${count} ports found near ${start}.`);
};
