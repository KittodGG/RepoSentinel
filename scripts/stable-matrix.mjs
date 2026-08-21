import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ANSI_ESCAPE = "\u001b[";
const root = fileURLToPath(new URL("..", import.meta.url));
const cli = join(root, "packages", "cli", "dist", "index.js");
const cases = [
  { name: "clean-public", path: "fixtures/clean-public", expected: 0 },
  { name: "broken-readme", path: "fixtures/broken-readme", expected: 0 },
  { name: "package-mismatch", path: "fixtures/package-mismatch", expected: 0 },
  { name: "security-env", path: "fixtures/security-env", expected: 0 },
  {
    name: "security-private-key",
    path: "fixtures/security-private-key",
    expected: 1,
  },
];

function run(args, environment = {}) {
  return new Promise((resolveRun, reject) => {
    execFile(
      process.execPath,
      [cli, ...args],
      {
        cwd: root,
        env: { ...process.env, ...environment },
        maxBuffer: 4 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error && typeof error.code !== "number") {
          reject(error);
          return;
        }
        resolveRun({
          code: typeof error?.code === "number" ? error.code : 0,
          stdout,
          stderr,
        });
      },
    );
  });
}

const staging = await mkdtemp(join(tmpdir(), "reposentinel-stable-matrix-"));
try {
  const rows = [];
  for (const testCase of cases) {
    const target = join(root, testCase.path);
    const args = [
      "check",
      target,
      "--profile",
      "public",
      "--format",
      "json",
      "--no-color",
    ];
    const first = await run(args);
    const second = await run(args);
    const report = JSON.parse(first.stdout);
    if (first.code !== testCase.expected)
      throw new Error(
        `${testCase.name}: expected exit ${testCase.expected}, got ${first.code}`,
      );
    if (first.stdout !== second.stdout || first.code !== second.code)
      throw new Error(`${testCase.name}: non-deterministic result`);
    if (
      first.stdout.includes("-----BEGIN OPENSSH PRIVATE KEY-----") ||
      first.stdout.includes("1234567890abcdef") ||
      first.stdout.includes("SUPER_SECRET")
    )
      throw new Error(`${testCase.name}: sensitive material leaked`);
    await writeFile(join(staging, `${testCase.name}.json`), first.stdout);
    rows.push({
      name: testCase.name,
      exitCode: first.code,
      score: report.score,
      findings: report.findings.length,
      schema: report.schemaVersion,
    });
  }
  const noColorAfter = await run([
    "check",
    join(root, "fixtures/clean-public"),
    "--profile",
    "public",
    "--format",
    "terminal",
    "--no-color",
  ]);
  const noColorBefore = await run([
    "--no-color",
    "check",
    join(root, "fixtures/clean-public"),
    "--profile",
    "public",
    "--format",
    "terminal",
  ]);
  const noColorEnv = await run(
    [
      "check",
      join(root, "fixtures/clean-public"),
      "--profile",
      "public",
      "--format",
      "terminal",
    ],
    { NO_COLOR: "1" },
  );
  if (
    [noColorAfter, noColorBefore, noColorEnv].some((result) =>
      `${result.stdout}${result.stderr}`.includes(ANSI_ESCAPE),
    )
  )
    throw new Error("color matrix: ANSI escape sequence leaked");
  const terminalPath = join(staging, "terminal-report.txt");
  const fileReport = await run([
    "check",
    join(root, "fixtures/clean-public"),
    "--profile",
    "public",
    "--format",
    "terminal",
    "--output",
    terminalPath,
  ]);
  const fileContents = await readFile(terminalPath, "utf8");
  if (fileContents.includes(ANSI_ESCAPE) || fileReport.code !== 0)
    throw new Error("color matrix: file report was not ANSI-free");

  const localeEn = await run([
    "check",
    join(root, "fixtures/clean-public"),
    "--profile",
    "public",
    "--lang",
    "en",
    "--format",
    "json",
    "--no-color",
  ]);
  const localeId = await run([
    "check",
    join(root, "fixtures/clean-public"),
    "--profile",
    "public",
    "--lang",
    "id",
    "--format",
    "json",
    "--no-color",
  ]);
  if (localeEn.code !== 0 || localeId.code !== 0)
    throw new Error("locale matrix: unexpected nonzero exit");
  const enReport = JSON.parse(localeEn.stdout);
  const idReport = JSON.parse(localeId.stdout);
  if (
    enReport.schemaVersion !== idReport.schemaVersion ||
    enReport.findings.length !== idReport.findings.length
  )
    throw new Error("locale matrix: machine contract changed");
  console.log(
    JSON.stringify(
      { matrix: rows, locale: "passed", status: "passed" },
      null,
      2,
    ),
  );
} finally {
  await rm(staging, { recursive: true, force: true });
}
