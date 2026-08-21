import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const root = fileURLToPath(new URL("..", import.meta.url));
const artifactDir = join(root, "artifacts");
const stagedPackage = join(artifactDir, "package");
const packageJson = JSON.parse(await readFile(join(stagedPackage, "package.json"), "utf8"));
const tarball = join(artifactDir, `${packageJson.name}-${packageJson.version}.tgz`);
const installDir = await mkdtemp(join(tmpdir(), "reposentinel-npm-smoke-"));

try {
  const archive = await execFileAsync("tar", ["-xzf", tarball, "-C", installDir]);
  void archive;
  const installedPackage = join(installDir, "package");
  const installedManifest = JSON.parse(await readFile(join(installedPackage, "package.json"), "utf8"));
  await execFileAsync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: installedPackage, maxBuffer: 4 * 1024 * 1024 });
  if (installedManifest.private) throw new Error("Published package must not be private");
  if (!installedManifest.name || !installedManifest.version) throw new Error("Published package metadata is incomplete");
  const bundle = join(installedPackage, "dist", "index.js");
  const version = await execFileAsync(process.execPath, [bundle, "--version"], { cwd: installedPackage });
  if (!version.stdout.includes(installedManifest.version)) throw new Error("Packed CLI version does not match package version");
  await writeFile(join(installedPackage, ".release-gate-passed"), "ok\n");
  console.log(`release_gate=passed package=${installedManifest.name}@${installedManifest.version}`);
} finally {
  await rm(installDir, { recursive: true, force: true });
}
