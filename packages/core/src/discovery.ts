import { execFile as execFileCallback } from "node:child_process";
import { lstat, open, readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import ignore from "ignore";
import type {
  GitMetadata,
  RepositoryContext,
  RepositoryFile,
  RepositoryProfile,
  ResolvedConfig,
  ScanBudget,
} from "./index.js";

export type DiscoveryOptions = {
  maxFileBytes?: number;
  maxFiles?: number;
  maxTotalBytes?: number;
};

export type DiscoveryResult = {
  files: RepositoryFile[];
  textCache: Map<string, string>;
  securityTextCache: Map<string, string>;
  ignoredCount: number;
  git: GitMetadata;
  scanBudget: ScanBudget;
};

export type ChangedFilesResult = {
  baseRef: string;
  paths: readonly string[];
};

const DEFAULT_MAX_FILE_BYTES = 512 * 1024;
const DEFAULT_MAX_FILES = 100_000;
const DEFAULT_MAX_TOTAL_BYTES = 256 * 1024 * 1024;
const execFile = promisify(execFileCallback);

async function readTrackedPaths(root: string): Promise<ReadonlySet<string>> {
  try {
    const result = await execFile(
      "git",
      ["-C", root, "ls-files", "--cached", "-z"],
      { maxBuffer: 4 * 1024 * 1024 },
    );
    return new Set(result.stdout.split("\0").filter(Boolean).map(toPosix));
  } catch {
    return new Set();
  }
}

async function readGitMetadata(root: string): Promise<GitMetadata> {
  try {
    const [branchResult, defaultBranchResult] = await Promise.all([
      execFile("git", ["-C", root, "branch", "--show-current"], {
        maxBuffer: 1024 * 1024,
      }),
      execFile(
        "git",
        [
          "-C",
          root,
          "symbolic-ref",
          "--quiet",
          "--short",
          "refs/remotes/origin/HEAD",
        ],
        { maxBuffer: 1024 * 1024 },
      ),
    ]);
    const currentBranch = branchResult.stdout.trim() || undefined;
    const remoteHead = defaultBranchResult.stdout.trim();
    const defaultBranch = remoteHead.startsWith("origin/")
      ? remoteHead.slice("origin/".length)
      : remoteHead || undefined;
    return {
      available: true,
      ...(currentBranch ? { currentBranch } : {}),
      ...(defaultBranch ? { defaultBranch } : {}),
    };
  } catch {
    try {
      const branchResult = await execFile(
        "git",
        ["-C", root, "branch", "--show-current"],
        { maxBuffer: 1024 * 1024 },
      );
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

function validateGitRef(baseRef: string): void {
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._/@~^+-]*$/u.test(baseRef) ||
    baseRef.includes("..") ||
    baseRef.includes("@{") ||
    baseRef.endsWith(".") ||
    baseRef.endsWith(".lock")
  ) {
    throw new Error(
      "Invalid Git base ref. Use a safe branch, tag, or commit reference.",
    );
  }
}

export async function readChangedPaths(
  root: string,
  baseRef: string,
): Promise<ChangedFilesResult> {
  validateGitRef(baseRef);
  const resolvedRoot = resolve(root);
  let result: { stdout: string };
  try {
    result = await execFile(
      "git",
      [
        "-C",
        resolvedRoot,
        "diff",
        "--name-only",
        "-z",
        `${baseRef}...HEAD`,
        "--",
      ],
      { maxBuffer: 4 * 1024 * 1024 },
    );
  } catch {
    throw new Error(
      `Base ref "${baseRef}" was not found or could not be compared. Run git fetch origin first, or choose another branch, tag, or commit reference.`,
    );
  }
  const paths = result.stdout
    .split("\0")
    .filter(Boolean)
    .map(toPosix)
    .sort((left, right) => left.localeCompare(right));
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

function ignoredBy(
  matcher: ReturnType<typeof ignore>,
  relativePath: string,
  isDirectory: boolean,
): boolean {
  const ignorePath = isDirectory ? `${relativePath}/` : relativePath;
  return (
    relativePath.length > 0 &&
    (matcher.ignores(ignorePath) ||
      (isDirectory && matcher.ignores(`${relativePath}/placeholder`)))
  );
}

export async function discoverRepository(
  root: string,
  config: ResolvedConfig,
  options: DiscoveryOptions = {},
): Promise<DiscoveryResult> {
  const resolvedRoot = resolve(root);
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const maxTotalBytes = options.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES;
  const configuredMatcher = ignore().add(config.ignore);
  const repositoryMatcher = ignore();
  try {
    repositoryMatcher.add(
      await readFile(join(resolvedRoot, ".gitignore"), "utf8"),
    );
  } catch {
    // A repository without .gitignore is valid; configured patterns still apply.
  }
  const [trackedPaths, git] = await Promise.all([
    readTrackedPaths(resolvedRoot),
    readGitMetadata(resolvedRoot),
  ]);
  const files: RepositoryFile[] = [];
  const textCache = new Map<string, string>();
  const securityTextCache = new Map<string, string>();
  let ignoredCount = 0;
  let filesConsidered = 0;
  let textBytesCached = 0;
  let truncated = false;

  async function visit(directory: string): Promise<void> {
    if (truncated) return;
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (truncated) return;
      const absolutePath = join(directory, entry.name);
      const relativePath = toPosix(relative(resolvedRoot, absolutePath));
      const configuredIgnored = ignoredBy(
        configuredMatcher,
        relativePath,
        entry.isDirectory(),
      );
      if (configuredIgnored) {
        ignoredCount += 1;
        continue;
      }
      const repositoryIgnored = ignoredBy(
        repositoryMatcher,
        relativePath,
        entry.isDirectory(),
      );
      if (repositoryIgnored) ignoredCount += 1;

      const metadata = await lstat(absolutePath);
      if (entry.isDirectory()) {
        // Configured ignores are pruned for performance. Repository .gitignore
        // paths are still traversed so security detectors can inspect local-only
        // .env, key, and credential files without exposing their text to other rules.
        await visit(absolutePath);
        continue;
      }

      if (filesConsidered >= maxFiles) {
        truncated = true;
        return;
      }
      filesConsidered += 1;

      if (entry.isSymbolicLink()) {
        files.push({
          relativePath,
          absolutePath,
          kind: "symlink",
          sizeBytes: metadata.size,
          isIgnored: repositoryIgnored,
          isTracked: trackedPaths.has(relativePath),
        });
        continue;
      }
      if (!entry.isFile()) continue;

      const binary =
        metadata.size > maxFileBytes ||
        (await isBinary(absolutePath, maxFileBytes));
      const kind = binary ? "binary" : "text";
      files.push({
        relativePath,
        absolutePath,
        kind,
        sizeBytes: metadata.size,
        isIgnored: repositoryIgnored,
        isTracked: trackedPaths.has(relativePath),
      });
      if (kind !== "text" || metadata.size > maxFileBytes) continue;
      if (textBytesCached + metadata.size > maxTotalBytes) {
        truncated = true;
        return;
      }

      const source = await readFile(absolutePath, "utf8");
      textBytesCached += metadata.size;
      if (repositoryIgnored) securityTextCache.set(relativePath, source);
      else textCache.set(relativePath, source);
    }
  }

  await visit(resolvedRoot);
  files.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  );
  const scanBudget: ScanBudget = {
    maxFiles,
    maxTotalBytes,
    filesConsidered,
    textBytesCached,
    truncated,
  };
  return { files, textCache, securityTextCache, ignoredCount, git, scanBudget };
}

export async function createRepositoryContext(
  root: string,
  profile: RepositoryProfile,
  config: ResolvedConfig,
  options?: DiscoveryOptions,
): Promise<RepositoryContext & { ignoredCount: number }> {
  const result = await discoverRepository(root, config, options);
  return {
    root: resolve(root),
    profile,
    config,
    files: result.files,
    textCache: result.textCache,
    securityTextCache: result.securityTextCache,
    scanBudget: result.scanBudget,
    ignoredCount: result.ignoredCount,
    git: result.git,
  };
}
