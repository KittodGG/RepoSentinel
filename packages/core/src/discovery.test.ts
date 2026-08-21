import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createRepositoryContext, readChangedPaths } from "./discovery.js";
import type { ResolvedConfig } from "./index.js";

const execFile = promisify(execFileCallback);

const config: ResolvedConfig = {
  profile: "public",
  ignore: ["node_modules/**", "generated/**"],
  rules: {},
  ciFailOn: "error",
  security: { network: false, scanHistory: false, redactFindings: true }
};

describe("safe discovery", () => {
  it("ignores configured paths and caches text files", async () => {
    const root = await mkdtemp(join(tmpdir(), "reposentinel-discovery-"));
    await mkdir(join(root, "node_modules"));
    await mkdir(join(root, "generated"));
    await writeFile(join(root, "README.md"), "# Demo");
    await writeFile(join(root, "node_modules", "ignored.js"), "ignored");
    await writeFile(join(root, "generated", "output.txt"), "ignored");

    const context = await createRepositoryContext(root, "public", config);
    expect(context.files.some((file) => file.relativePath === "README.md")).toBe(true);
    expect(context.files.some((file) => file.relativePath.includes("node_modules"))).toBe(false);
    expect(context.textCache.get("README.md")).toBe("# Demo");
    expect(context.ignoredCount).toBeGreaterThanOrEqual(2);
  });

  it("honors repository .gitignore patterns in addition to configured ignores", async () => {
    const root = await mkdtemp(join(tmpdir(), "reposentinel-gitignore-"));
    await mkdir(join(root, "generated"));
    await writeFile(join(root, ".gitignore"), "generated/\n");
    await writeFile(join(root, "generated", "output.txt"), "ignored");
    await writeFile(join(root, "README.md"), "# Demo");
    const context = await createRepositoryContext(root, "public", config);
    expect(context.files.some((file) => file.relativePath === "generated/output.txt")).toBe(false);
    expect(context.ignoredCount).toBeGreaterThanOrEqual(1);
  });

  it("records symlinks without following them", async () => {
    const root = await mkdtemp(join(tmpdir(), "reposentinel-symlink-"));
    const outside = await mkdtemp(join(tmpdir(), "reposentinel-outside-"));
    await writeFile(join(outside, "secret.txt"), "do not follow");
    await symlink(outside, join(root, "external"));

    const context = await createRepositoryContext(root, "public", config);
    const link = context.files.find((file) => file.relativePath === "external");
    expect(link?.kind).toBe("symlink");
    expect(context.files.some((file) => file.relativePath.includes("secret.txt"))).toBe(false);
  });

  it("marks cached Git files and excludes directories from file counts", async () => {
    const root = await mkdtemp(join(tmpdir(), "reposentinel-tracked-"));
    await mkdir(join(root, "nested"));
    await writeFile(join(root, ".env"), "TOKEN=synthetic");
    await execFile("git", ["-C", root, "init", "--quiet"]);
    await execFile("git", ["-C", root, "add", ".env"]);

    const context = await createRepositoryContext(root, "public", config);
    const envFile = context.files.find((file) => file.relativePath === ".env");
    expect(envFile?.isTracked).toBe(true);
    expect(context.files.some((file) => file.kind === "directory")).toBe(false);
    expect(context.git?.available).toBe(true);
  });

  it("enforces aggregate file budgets", async () => {
    const root = await mkdtemp(join(tmpdir(), "reposentinel-budget-"));
    await writeFile(join(root, "a.txt"), "12345");
    await writeFile(join(root, "b.txt"), "67890");
    await expect(createRepositoryContext(root, "public", config, { maxFiles: 1 })).rejects.toThrow("file limit");
    await expect(createRepositoryContext(root, "public", config, { maxTotalBytes: 5 })).rejects.toThrow("aggregate scan size limit");
  });

  it("rejects unsafe Git base refs", async () => {
    const root = await mkdtemp(join(tmpdir(), "reposentinel-invalid-ref-"));
    await expect(readChangedPaths(root, "--output=/tmp/unsafe")).rejects.toThrow("Invalid Git base ref");
  });

  it("returns deterministic paths changed from a Git base commit", async () => {
    const root = await mkdtemp(join(tmpdir(), "reposentinel-changed-"));
    await execFile("git", ["-C", root, "init", "--quiet"]);
    await execFile("git", ["-C", root, "config", "user.email", "reposentinel@example.test"]);
    await execFile("git", ["-C", root, "config", "user.name", "RepoSentinel Test"]);
    await writeFile(join(root, "README.md"), "# Before");
    await execFile("git", ["-C", root, "add", "README.md"]);
    await execFile("git", ["-C", root, "commit", "--quiet", "-m", "base"]);
    const baseRef = (await execFile("git", ["-C", root, "rev-parse", "HEAD"])).stdout.trim();
    await writeFile(join(root, "README.md"), "# After");
    await writeFile(join(root, "CONTRIBUTING.md"), "# Contributing");
    await execFile("git", ["-C", root, "add", "."]);
    await execFile("git", ["-C", root, "commit", "--quiet", "-m", "change"]);

    const changed = await readChangedPaths(root, baseRef);
    expect(changed.baseRef).toBe(baseRef);
    expect(changed.paths).toEqual(["CONTRIBUTING.md", "README.md"]);
  });
});
