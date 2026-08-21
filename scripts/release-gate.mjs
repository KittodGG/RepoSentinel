import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { runNpm } from "./lib/npm.mjs";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));
const artifactDir = join(root, "artifacts");
const stagedPackage = join(artifactDir, "package");
const packageJson = JSON.parse(
  await readFile(join(stagedPackage, "package.json"), "utf8"),
);
const tarball = join(
  artifactDir,
  `${packageJson.name}-${packageJson.version}.tgz`,
);
const installDir = await mkdtemp(join(tmpdir(), "reposentinel-npm-smoke-"));

try {
  // Installing the tarball is both the extraction step and the smoke test: it
  // is exactly what a consumer runs. Shelling out to tar meant GNU tar read the
  // drive letter in a Windows path as a remote host and refused the archive.
  await runNpm(
    [
      "install",
      tarball,
      "--prefix",
      installDir,
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
    ],
    { cwd: installDir },
  );
  const installedPackage = join(installDir, "node_modules", packageJson.name);
  const installedManifest = JSON.parse(
    await readFile(join(installedPackage, "package.json"), "utf8"),
  );
  if (installedManifest.private)
    throw new Error("Published package must not be private");
  if (!installedManifest.name || !installedManifest.version)
    throw new Error("Published package metadata is incomplete");
  if (
    !Array.isArray(installedManifest.files) ||
    !installedManifest.files.some(
      (entry) => entry === "dist" || entry.startsWith("dist/"),
    )
  )
    throw new Error("Published package must allowlist dist output");
  if (
    !installedManifest.exports &&
    !installedManifest.main &&
    !installedManifest.bin
  )
    throw new Error("Published package must expose an entrypoint");
  if (installedManifest.engines?.node !== ">=24")
    throw new Error("Published package must declare Node.js >=24");
  if (
    Object.keys(installedManifest.dependencies ?? {}).some((name) =>
      name.startsWith("@reposentinel/"),
    )
  )
    throw new Error("Published package must not depend on workspace packages");
  const bundle = join(installedPackage, "dist", "index.js");
  const version = await execFileAsync(process.execPath, [bundle, "--version"], {
    cwd: installedPackage,
  });
  if (!version.stdout.includes(installedManifest.version))
    throw new Error("Packed CLI version does not match package version");
  await writeFile(join(installedPackage, ".release-gate-passed"), "ok\n");
  console.log(
    `release_gate=passed package=${installedManifest.name}@${installedManifest.version}`,
  );
} finally {
  await rm(installDir, { recursive: true, force: true });
}
