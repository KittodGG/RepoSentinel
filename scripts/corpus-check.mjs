import { execFile } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(new URL("..", import.meta.url).pathname);
const manifestPath = resolve(
  process.env.REPOSENTINEL_CORPUS_MANIFEST ??
    join(root, "scripts/corpus-manifest.json"),
);
const cacheDir = resolve(
  process.env.REPOSENTINEL_CORPUS_CACHE ?? join(root, ".cache", "corpus"),
);
const cliPath = join(root, "packages", "cli", "dist", "index.js");

function printUsage() {
  console.log(
    "Usage: node scripts/corpus-check.mjs [--manifest path] [--cache-dir path]",
  );
}

function parseArgs(argv) {
  const options = { manifest: manifestPath, cache: cacheDir };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      printUsage();
      process.exit(0);
    }
    if (argument === "--manifest") {
      options.manifest = resolve(argv[index + 1] ?? "");
      index += 1;
      continue;
    }
    if (argument === "--cache-dir") {
      options.cache = resolve(argv[index + 1] ?? "");
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

async function run(command, args, options = {}) {
  return execFileAsync(command, args, {
    cwd: root,
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  });
}

async function ensureCheckout(repository, cache) {
  const checkout = join(cache, repository.name.replaceAll("/", "__"));
  const marker = join(checkout, ".reposentinel-corpus-commit");
  let currentCommit = "";
  try {
    currentCommit = (await readFile(marker, "utf8")).trim();
  } catch {
    currentCommit = "";
  }
  if (currentCommit === repository.commit) return checkout;

  await rm(checkout, { recursive: true, force: true });
  await mkdir(checkout, { recursive: true });
  const remote = `https://github.com/${repository.name}.git`;
  await run("git", ["init", "--quiet", checkout]);
  await run("git", ["-C", checkout, "remote", "add", "origin", remote]);
  await run("git", [
    "-C",
    checkout,
    "fetch",
    "--quiet",
    "--depth",
    "1",
    "origin",
    repository.commit,
  ]);
  await run("git", [
    "-C",
    checkout,
    "checkout",
    "--quiet",
    "--detach",
    repository.commit,
  ]);
  await writeFile(marker, `${repository.commit}\n`);
  return checkout;
}

async function scan(repository, checkout, limits) {
  const reportPath = join(checkout, ".reposentinel-corpus-report.json");
  await rm(reportPath, { force: true });
  const started = performance.now();
  let exitCode = 0;
  let errorMessage = "";
  try {
    await run(
      process.execPath,
      [
        cliPath,
        "check",
        checkout,
        "--profile",
        "public",
        "--lang",
        "en",
        "--format",
        "json",
        "--no-color",
        "--output",
        reportPath,
      ],
      { timeout: limits.maxScanSeconds * 1000 },
    );
  } catch (error) {
    exitCode = typeof error.code === "number" ? error.code : 1;
    errorMessage = error instanceof Error ? error.message : String(error);
    if (error.killed || error.signal === "SIGTERM")
      errorMessage = `scan exceeded ${limits.maxScanSeconds}s`;
  }
  const elapsedSeconds = (performance.now() - started) / 1000;
  let report;
  try {
    report = JSON.parse(await readFile(reportPath, "utf8"));
  } catch (error) {
    throw new Error(
      `${repository.name}: scanner did not produce a valid JSON report (${errorMessage || String(error)})`,
    );
  }
  const findings = Array.isArray(report.findings) ? report.findings : [];
  const securityFindings = findings.filter(
    (finding) => finding?.category === "security",
  );
  const blockingSecurityFindings = securityFindings.filter(
    (finding) =>
      (finding?.severity === "critical" || finding?.severity === "error") &&
      !/(?:^|\/)(?:test|tests|testdata|fixtures|examples?)(?:\/|$)/iu.test(
        finding?.path ?? "",
      ),
  );
  const reportBytes = (await stat(reportPath)).size;
  const score = Number(report.score ?? report.summary?.score ?? NaN);
  const failures = [];
  if (!Number.isFinite(score) || score < repository.minScore)
    failures.push(
      `score ${Number.isFinite(score) ? score : "missing"} < ${repository.minScore}`,
    );
  if (blockingSecurityFindings.length > limits.maxBlockingSecurityFindings)
    failures.push(
      `blocking security findings ${blockingSecurityFindings.length} > ${limits.maxBlockingSecurityFindings}`,
    );
  if (findings.length > limits.maxFindings)
    failures.push(`findings ${findings.length} > ${limits.maxFindings}`);
  if (reportBytes > limits.maxReportBytes)
    failures.push(`report ${reportBytes} bytes > ${limits.maxReportBytes}`);
  if (elapsedSeconds > limits.maxScanSeconds)
    failures.push(
      `scan ${elapsedSeconds.toFixed(2)}s > ${limits.maxScanSeconds}s`,
    );
  if (exitCode !== 0 && securityFindings.length === 0 && findings.length === 0)
    failures.push(`scanner exited ${exitCode}`);
  return {
    name: repository.name,
    commit: repository.commit.slice(0, 12),
    score: Number.isFinite(score) ? score : "n/a",
    findings: findings.length,
    security: securityFindings.length,
    blockingSecurity: blockingSecurityFindings.length,
    reportBytes,
    seconds: Number(elapsedSeconds.toFixed(2)),
    failures,
  };
}

const options = parseArgs(process.argv.slice(2));
const manifest = JSON.parse(await readFile(options.manifest, "utf8"));
if (manifest.schemaVersion !== "reposentinel.corpus/v1")
  throw new Error("Unsupported corpus manifest schema.");
if (!Array.isArray(manifest.repositories) || manifest.repositories.length === 0)
  throw new Error("Corpus manifest must define at least one repository.");
await mkdir(options.cache, { recursive: true });
await run(process.execPath, [cliPath, "--version"]);
const results = [];
for (const repository of manifest.repositories) {
  process.stdout.write(
    `corpus ${repository.name}@${repository.commit.slice(0, 12)} ... `,
  );
  try {
    const checkout = await ensureCheckout(repository, options.cache);
    const result = await scan(repository, checkout, manifest.limits);
    results.push(result);
    console.log(result.failures.length === 0 ? "passed" : "failed");
  } catch (error) {
    const result = {
      name: repository.name,
      commit: repository.commit.slice(0, 12),
      score: "n/a",
      findings: "n/a",
      security: "n/a",
      blockingSecurity: "n/a",
      reportBytes: "n/a",
      seconds: "n/a",
      failures: [error instanceof Error ? error.message : String(error)],
    };
    results.push(result);
    console.log("failed");
  }
}

console.table(results);
const failed = results.filter((result) => result.failures.length > 0);
const summary = {
  schemaVersion: "reposentinel.corpus-result/v1",
  manifest: options.manifest,
  passed: failed.length === 0,
  repositories: results,
};
const resultPath = join(options.cache, "latest-result.json");
await writeFile(resultPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(
  `corpus_result=${failed.length === 0 ? "passed" : "failed"} path=${resultPath}`,
);
if (failed.length > 0) process.exitCode = 1;
