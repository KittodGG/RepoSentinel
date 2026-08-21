import { execFile as execFileCallback } from "node:child_process";
import { mkdir, mkdtemp, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { createRepositoryContext, readChangedPaths } from "./discovery.js";
import type { ResolvedConfig } from "./index.js";

const execFile = promisify(execFileCallback);

const config: ResolvedConfig = {
  profile: "public",
  ignore: ["node_modules/**", "generated/**"],
  rules: {},
  ciFailOn: "error",
  security: { network: false, scanHistory: false, redactFindings: true },
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
    expect(
      context.files.some((file) => file.relativePath === "README.md"),
    ).toBe(true);
    expect(
      context.files.some((file) => file.relativePath.includes("node_modules")),
    ).toBe(false);
    expect(context.textCache.get("README.md")).toBe("# Demo");
    expect(context.ignoredCount).toBeGreaterThanOrEqual(2);
  });

  it("preserves repository-gitignored files for security scanning but not general text rules", async () => {
    const root = await mkdtemp(join(tmpdir(), "reposentinel-gitignore-"));
    await mkdir(join(root, "generated"));
    await mkdir(join(root, "secrets"));
    await writeFile(join(root, ".gitignore"), "generated/\nsecrets/\n.env\n");
    await writeFile(join(root, "generated", "output.txt"), "ignored");
    await writeFile(join(root, "secrets", "deploy.env"), "TOKEN=synthetic");
    await writeFile(join(root, ".env"), "TOKEN=synthetic");
    await writeFile(join(root, "README.md"), "# Demo");
    const testConfig = { ...config, ignore: ["node_modules/**"] };
    const context = await createRepositoryContext(root, "public", testConfig);
    expect(
      context.files.find((file) => file.relativePath === "generated/output.txt")
        ?.isIgnored,
    ).toBe(true);
    expect(
      context.files.find((file) => file.relativePath === "secrets/deploy.env")
        ?.isIgnored,
    ).toBe(true);
    expect(
      context.files.find((file) => file.relativePath === ".env")?.isIgnored,
    ).toBe(true);
    expect(context.textCache.has("secrets/deploy.env")).toBe(false);
    expect(context.securityTextCache?.has("secrets/deploy.env")).toBe(true);
    expect(context.ignoredCount).toBeGreaterThanOrEqual(3);
  });

  it.skipIf(process.platform === "win32")(
    "records symlinks without following them",
    async () => {
      const root = await mkdtemp(join(tmpdir(), "reposentinel-symlink-"));
      const outside = await mkdtemp(join(tmpdir(), "reposentinel-outside-"));
      await writeFile(join(outside, "secret.txt"), "do not follow");
      await symlink(outside, join(root, "external"));

      const context = await createRepositoryContext(root, "public", config);
      const link = context.files.find(
        (file) => file.relativePath === "external",
      );
      expect(link?.kind).toBe("symlink");
      expect(
        context.files.some((file) => file.relativePath.includes("secret.txt")),
      ).toBe(false);
    },
  );

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

  it("degrades gracefully when aggregate scan budgets are reached", async () => {
    const root = await mkdtemp(join(tmpdir(), "reposentinel-budget-"));
    await writeFile(join(root, "a.txt"), "12345");
    await writeFile(join(root, "b.txt"), "67890");
    const fileLimited = await createRepositoryContext(root, "public", config, {
      maxFiles: 1,
    });
    expect(fileLimited.scanBudget?.truncated).toBe(true);
    const byteLimited = await createRepositoryContext(root, "public", config, {
      maxTotalBytes: 5,
    });
    expect(byteLimited.scanBudget?.truncated).toBe(true);
    expect(byteLimited.files.length).toBeGreaterThan(0);
  });

  it("rejects unsafe Git base refs", async () => {
    const root = await mkdtemp(join(tmpdir(), "reposentinel-invalid-ref-"));
    await expect(
      readChangedPaths(root, "--output=/tmp/unsafe"),
    ).rejects.toThrow("Invalid Git base ref");
  });

  it("sanitizes unknown Git base-ref failures", async () => {
    const root = await mkdtemp(join(tmpdir(), "reposentinel-missing-ref-"));
    await execFile("git", ["-C", root, "init", "--quiet"]);
    await expect(readChangedPaths(root, "origin/missing")).rejects.toThrow(
      'Base ref "origin/missing" was not found or could not be compared',
    );
  });

  it("returns deterministic paths changed from a Git base commit", async () => {
    const root = await mkdtemp(join(tmpdir(), "reposentinel-changed-"));
    await execFile("git", ["-C", root, "init", "--quiet"]);
    await execFile("git", [
      "-C",
      root,
      "config",
      "user.email",
      "reposentinel@example.test",
    ]);
    await execFile("git", [
      "-C",
      root,
      "config",
      "user.name",
      "RepoSentinel Test",
    ]);
    await writeFile(join(root, "README.md"), "# Before");
    await execFile("git", ["-C", root, "add", "README.md"]);
    await execFile("git", ["-C", root, "commit", "--quiet", "-m", "base"]);
    const baseRef = (
      await execFile("git", ["-C", root, "rev-parse", "HEAD"])
    ).stdout.trim();
    await writeFile(join(root, "README.md"), "# After");
    await writeFile(join(root, "CONTRIBUTING.md"), "# Contributing");
    await execFile("git", ["-C", root, "add", "."]);
    await execFile("git", ["-C", root, "commit", "--quiet", "-m", "change"]);

    const changed = await readChangedPaths(root, baseRef);
    expect(changed.baseRef).toBe(baseRef);
    expect(changed.paths).toEqual(["CONTRIBUTING.md", "README.md"]);
  });
});
