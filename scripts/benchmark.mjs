import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const target = resolve(process.argv[2] ?? ".");
const iterations = Number.parseInt(process.argv[3] ?? "5", 10);

function runOnce() {
  return new Promise((resolveRun, reject) => {
    const started = performance.now();
    const child = spawn(
      process.execPath,
      [
        resolve(root, "packages/cli/dist/index.js"),
        "check",
        target,
        "--format",
        "json",
        "--no-color",
      ],
      {
        cwd: root,
        stdio: ["ignore", "ignore", "pipe"],
      },
    );
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code !== 0 && code !== 1)
        reject(
          new Error(stderr.trim() || `scan exited with ${code ?? "unknown"}`),
        );
      else resolveRun(performance.now() - started);
    });
  });
}

const durations = [];
for (let index = 0; index < iterations; index += 1)
  durations.push(await runOnce());
const sorted = [...durations].sort((left, right) => left - right);
const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
const average =
  durations.reduce((sum, value) => sum + value, 0) / durations.length;
console.log(
  JSON.stringify(
    {
      target,
      iterations,
      medianMs: Number(median.toFixed(2)),
      averageMs: Number(average.toFixed(2)),
      minMs: Number((sorted[0] ?? 0).toFixed(2)),
      maxMs: Number((sorted.at(-1) ?? 0).toFixed(2)),
    },
    null,
    2,
  ),
);
