import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cli = resolve(root, "packages/cli/dist/index.js");

async function run(args) {
  try {
    const result = await execFileAsync(process.execPath, [cli, ...args], {
      cwd: root,
      maxBuffer: 4 * 1024 * 1024
    });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return { code: error.code ?? 1, stdout: error.stdout ?? "", stderr: error.stderr ?? "" };
  }
}

const invalidLocale = await run(["check", root, "--lang", "fr", "--no-color"]);
if (invalidLocale.code !== 2) throw new Error(`invalid locale exit code was ${invalidLocale.code}`);

const missingPath = await run(["check", resolve(root, "does-not-exist"), "--no-color"]);
if (missingPath.code !== 2) throw new Error(`missing path exit code was ${missingPath.code}`);

const unknownRule = await run(["explain", "unknown.rule", "--lang", "en"]);
if (unknownRule.code !== 2 || !unknownRule.stderr.includes("Rule not found")) throw new Error("unknown rule handling failed");

const report = await run(["check", root, "--format", "json", "--lang", "en", "--no-color"]);
if (report.code !== 0) throw new Error(`self-scan exit code was ${report.code}`);
const parsed = JSON.parse(report.stdout);
if (parsed.schemaVersion !== "reposentinel.report/v1") throw new Error("report schema changed");
const serialized = JSON.stringify(parsed);
if (/PRIVATE KEY|ghp_|github_pat_|xoxb-/u.test(serialized)) throw new Error("redaction boundary failed");
if (parsed.locale !== "en") throw new Error("machine report locale is not deterministic");

console.log("hardening_checks=passed");
