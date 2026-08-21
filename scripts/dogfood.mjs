import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));
const cli = join(root, "packages", "cli", "dist", "index.js");
const reportDir = join(root, ".reposentinel", "reports");
const reportPath = join(reportDir, "dogfood-report.json");

await mkdir(reportDir, { recursive: true });
const { stdout } = await execFileAsync(process.execPath, [cli, "check", root, "--profile", "public", "--lang", "en", "--fail-on", "error", "--format", "json", "--no-color"], {
  cwd: root,
  maxBuffer: 4 * 1024 * 1024
});
const report = JSON.parse(stdout);
if (report.schemaVersion !== "reposentinel.report/v1") throw new Error("Dogfood report schema is not stable");
if (report.summary.critical !== 0 || report.summary.error !== 0) throw new Error("Dogfood scan contains critical or error findings");
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
const saved = JSON.parse(await readFile(reportPath, "utf8"));
console.log(`dogfood=passed score=${saved.score} findings=${saved.findings.length} report=${reportPath}`);
