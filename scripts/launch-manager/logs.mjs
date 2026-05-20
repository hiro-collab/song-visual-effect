import { createWriteStream } from "node:fs";
import { mkdir, open, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export const targetLogDir = (runtimeRoot, targetId) => resolve(runtimeRoot, "targets", targetId);

export const prepareTargetLogs = async (runtimeRoot, targetId) => {
  const dir = targetLogDir(runtimeRoot, targetId);
  await mkdir(dir, { recursive: true });
  const paths = {
    dir,
    stdout: resolve(dir, "stdout.log"),
    stderr: resolve(dir, "stderr.log")
  };
  await writeFile(paths.stdout, "", "utf8");
  await writeFile(paths.stderr, "", "utf8");
  return paths;
};

export const createLogWriters = (paths) => ({
  stdout: createWriteStream(paths.stdout, { flags: "a", encoding: "utf8" }),
  stderr: createWriteStream(paths.stderr, { flags: "a", encoding: "utf8" })
});

export const closeLogWriters = (writers) => {
  if (!writers) return;
  writers.stdout?.end();
  writers.stderr?.end();
};

export const appendManagerLog = (writer, text) => {
  if (!writer) return;
  writer.write(`[launch-manager ${new Date().toISOString()}] ${text}\n`);
};

export const tailFile = async (filePath, maxBytes = 12000) => {
  try {
    const stats = await stat(filePath);
    const start = Math.max(0, stats.size - maxBytes);
    const length = stats.size - start;
    const handle = await open(filePath, "r");
    try {
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, start);
      return buffer.toString("utf8");
    } finally {
      await handle.close();
    }
  } catch {
    return "";
  }
};

export const targetLogTail = async (paths) => {
  if (!paths) return { stdout: "", stderr: "" };
  const [stdout, stderr] = await Promise.all([tailFile(paths.stdout), tailFile(paths.stderr)]);
  return { stdout, stderr };
};
