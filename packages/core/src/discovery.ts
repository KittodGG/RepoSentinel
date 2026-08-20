import { lstat, open, readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import ignore from "ignore";
import type { RepositoryContext, RepositoryFile, RepositoryProfile, ResolvedConfig } from "./index.js";

export type DiscoveryOptions = {
  maxFileBytes?: number;
};

export type DiscoveryResult = {
  files: RepositoryFile[];
  textCache: Map<string, string>;
  ignoredCount: number;
};

const DEFAULT_MAX_FILE_BYTES = 512 * 1024;

function toPosix(value: string): string {
  return value.split("\\").join("/");
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
        files.push({ relativePath, absolutePath, kind: "symlink", sizeBytes: metadata.size, isIgnored: false });
        continue;
      }
      if (entry.isDirectory()) {
        files.push({ relativePath, absolutePath, kind: "directory", sizeBytes: 0, isIgnored: false });
        await visit(absolutePath);
        continue;
      }
      if (!entry.isFile()) continue;

      const binary = metadata.size > maxFileBytes || await isBinary(absolutePath, maxFileBytes);
      const kind = binary ? "binary" : "text";
      files.push({ relativePath, absolutePath, kind, sizeBytes: metadata.size, isIgnored: false });
      if (kind === "text" && metadata.size <= maxFileBytes) {
        textCache.set(relativePath, await readFile(absolutePath, "utf8"));
      }
    }
  }

  await visit(resolvedRoot);
  files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  return { files, textCache, ignoredCount };
}

export async function createRepositoryContext(
  root: string,
  profile: RepositoryProfile,
  config: ResolvedConfig,
  options?: DiscoveryOptions
): Promise<RepositoryContext & { ignoredCount: number }> {
  const result = await discoverRepository(root, config, options);
  return { root: resolve(root), profile, config, files: result.files, textCache: result.textCache, ignoredCount: result.ignoredCount };
}
