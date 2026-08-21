import { execFile as execFileCallback } from "node:child_process";
import { lstat, open, readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import ignore from "ignore";
import type { GitMetadata, RepositoryContext, RepositoryFile, RepositoryProfile, ResolvedConfig } from "./index.js";

export type DiscoveryOptions = {
  maxFileBytes?: number;
};

export type DiscoveryResult = {
  files: RepositoryFile[];
  textCache: Map<string, string>;
  ignoredCount: number;
  git: GitMetadata;
};

export type ChangedFilesResult = {
  baseRef: string;
  paths: readonly string[];
};

const DEFAULT_MAX_FILE_BYTES = 512 * 1024;
const execFile = promisify(execFileCallback);

async function readTrackedPaths(root: string): Promise<ReadonlySet<string>> {
  try {
    const result = await execFile("git", ["-C", root, "ls-files", "--cached", "-z"], { maxBuffer: 4 * 1024 * 1024 });
    return new Set(result.stdout.split("\0").filter(Boolean).map(toPosix));
  } catch {
    return new Set();
  }
}

async function readGitMetadata(root: string): Promise<GitMetadata> {
  try {
    const [branchResult, defaultBranchResult] = await Promise.all([
      execFile("git", ["-C", root, "branch", "--show-current"], { maxBuffer: 1024 * 1024 }),
      execFile("git", ["-C", root, "symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"], { maxBuffer: 1024 * 1024 })
    ]);
    const currentBranch = branchResult.stdout.trim() || undefined;
    const remoteHead = defaultBranchResult.stdout.trim();
    const defaultBranch = remoteHead.startsWith("origin/") ? remoteHead.slice("origin/".length) : remoteHead || undefined;
    return { available: true, ...(currentBranch ? { currentBranch } : {}), ...(defaultBranch ? { defaultBranch } : {}) };
  } catch {
    try {
      const branchResult = await execFile("git", ["-C", root, "branch", "--show-current"], { maxBuffer: 1024 * 1024 });
      const currentBranch = branchResult.stdout.trim() || undefined;
      return { available: true, ...(currentBranch ? { currentBranch } : {}) };
    } catch {
      return { available: false };
    }
  }
}

function toPosix(value: string): string {
  return value.split("\\").join("/");
}

export async function readChangedPaths(root: string, baseRef: string): Promise<ChangedFilesResult> {
  const resolvedRoot = resolve(root);
  const result = await execFile("git", ["-C", resolvedRoot, "diff", "--name-only", "-z", `${baseRef}...HEAD`], { maxBuffer: 4 * 1024 * 1024 });
  const paths = result.stdout.split("\0").filter(Boolean).map(toPosix).sort((left, right) => left.localeCompare(right));
  return { baseRef, paths };
}

async function isBinary(path: string, maxBytes: number): Promise<boolean> {
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.alloc(Math.min(maxBytes, 8192));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytesRead).includes(0);
  } finally {
    await handle.close();
  }
}

export async function discoverRepository(root: string, config: ResolvedConfig, options: DiscoveryOptions = {}): Promise<DiscoveryResult> {
  const resolvedRoot = resolve(root);
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const matcher = ignore().add(config.ignore);
  const [trackedPaths, git] = await Promise.all([readTrackedPaths(resolvedRoot), readGitMetadata(resolvedRoot)]);
  const files: RepositoryFile[] = [];
  const textCache = new Map<string, string>();
  let ignoredCount = 0;

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = join(directory, entry.name);
      const relativePath = toPosix(relative(resolvedRoot, absolutePath));
      const ignorePath = entry.isDirectory() ? `${relativePath}/` : relativePath;
      const ignored = relativePath.length > 0 && (matcher.ignores(ignorePath) || (entry.isDirectory() && matcher.ignores(`${relativePath}/placeholder`)));
      if (ignored) {
        ignoredCount += 1;
        continue;
      }

      const metadata = await lstat(absolutePath);
      if (entry.isSymbolicLink()) {
        files.push({ relativePath, absolutePath, kind: "symlink", sizeBytes: metadata.size, isIgnored: false, isTracked: trackedPaths.has(relativePath) });
        continue;
      }
      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;

      const binary = metadata.size > maxFileBytes || await isBinary(absolutePath, maxFileBytes);
      const kind = binary ? "binary" : "text";
      files.push({ relativePath, absolutePath, kind, sizeBytes: metadata.size, isIgnored: false, isTracked: trackedPaths.has(relativePath) });
      if (kind === "text" && metadata.size <= maxFileBytes) {
        textCache.set(relativePath, await readFile(absolutePath, "utf8"));
      }
    }
  }

  await visit(resolvedRoot);
  files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  return { files, textCache, ignoredCount, git };
}

export async function createRepositoryContext(
  root: string,
  profile: RepositoryProfile,
  config: ResolvedConfig,
  options?: DiscoveryOptions
): Promise<RepositoryContext & { ignoredCount: number }> {
  const result = await discoverRepository(root, config, options);
  return { root: resolve(root), profile, config, files: result.files, textCache: result.textCache, ignoredCount: result.ignoredCount, git: result.git };
}
