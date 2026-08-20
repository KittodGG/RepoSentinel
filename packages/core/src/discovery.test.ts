import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, mkdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createRepositoryContext } from "./discovery.js";
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
  });
});
