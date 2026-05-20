import { execFile } from "node:child_process";
import { platform } from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ensurePid = (pid) => {
  const value = Number(pid);
  if (!Number.isInteger(value) || value <= 0) throw new Error("Invalid pid.");
  return value;
};

const powershellPath = () => {
  const root = process.env.SystemRoot ?? "C:\\WINDOWS";
  return `${root}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
};

const readWindowsMetrics = async (pid) => {
  const script = [
    `$proc = Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}"`,
    `$perf = Get-CimInstance Win32_PerfFormattedData_PerfProc_Process -Filter "IDProcess = ${pid}" | Select-Object -First 1`,
    "$cpu = $null",
    "if ($perf) { $cpu = [double]$perf.PercentProcessorTime }",
    "if ($proc) {",
    "  [pscustomobject]@{",
    "    exists = $true;",
    "    memoryMb = [math]::Round(($proc.WorkingSetSize / 1MB), 1);",
    "    cpuPercent = $cpu",
    "  } | ConvertTo-Json -Compress",
    "} else {",
    "  [pscustomobject]@{ exists = $false } | ConvertTo-Json -Compress",
    "}"
  ].join("\n");
  const { stdout } = await execFileAsync(powershellPath(), ["-NoProfile", "-Command", script], {
    timeout: 1800,
    windowsHide: true
  });
  return JSON.parse(stdout.trim() || "{\"exists\":false}");
};

const readPosixMetrics = async (pid) => {
  const { stdout } = await execFileAsync("ps", ["-p", String(pid), "-o", "pid=,rss=,pcpu="], { timeout: 1200 });
  const parts = stdout.trim().split(/\s+/);
  if (parts.length < 3) return { exists: false };
  return {
    exists: true,
    memoryMb: Math.round((Number(parts[1]) / 1024) * 10) / 10,
    cpuPercent: Number(parts[2])
  };
};

export const readProcessMetrics = async (pid) => {
  const value = ensurePid(pid);
  try {
    if (platform() === "win32") return await readWindowsMetrics(value);
    return await readPosixMetrics(value);
  } catch {
    return { exists: false };
  }
};
