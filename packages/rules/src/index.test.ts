import { describe, expect, it } from "vitest";
import type { RepositoryContext, RepositoryFile, ResolvedConfig } from "@reposentinel/core";
import { enabledRules, rules, runRules } from "./index.js";

function file(relativePath: string, kind: RepositoryFile["kind"] = "text"): RepositoryFile {
  return {
    relativePath,
    absolutePath: `/fixture/${relativePath}`,
    kind,
    sizeBytes: 20,
    isIgnored: false
  };
}

function config(profile: RepositoryContext["profile"]): ResolvedConfig {
  return {
    profile,
    ignore: ["node_modules/**", "dist/**"],
    rules: {},
    ciFailOn: "error",
    security: { network: false, scanHistory: false, redactFindings: true }
  };
}

function context(profile: RepositoryContext["profile"], files: RepositoryFile[], text: Record<string, string>): RepositoryContext {
  return {
    root: "/fixture",
    profile,
    files,
    textCache: new Map(Object.entries(text)),
    config: config(profile)
  };
}

describe("rules", () => {
  it("reports missing README and .gitignore", () => {
    const result = runRules(context("public", [], {}));
    expect(result.map((finding) => finding.ruleId)).toContain("documentation.readme-exists");
    expect(result.map((finding) => finding.ruleId)).toContain("gitignore.exists");
  });

  it("accepts a complete README Quick Start", () => {
    const result = runRules(context(
      "public",
      [file("README.md"), file(".gitignore")],
      { "README.md": "# Demo\n\nA repository readiness scanner for developers.\n\n## Quick Start\n\n```bash\npnpm install\npnpm dev\n```" }
    ));
    expect(result.map((finding) => finding.ruleId)).not.toContain("documentation.quickstart");
    expect(result.map((finding) => finding.ruleId)).not.toContain("documentation.description");
  });

  it("redacts private keys and credential patterns", () => {
    const result = runRules(context(
      "public",
      [file("deploy/id_rsa"), file("src/config.ts")],
      {
        "deploy/id_rsa": "-----BEGIN OPENSSH PRIVATE KEY-----\nAAAAAAAAAAAAAAAAAAAAAAAAAAAA\n-----END OPENSSH PRIVATE KEY-----",
        "src/config.ts": "const token = 'ghp_1234567890abcdef';"
      }
    ));
    expect(result.some((finding) => finding.ruleId === "security.private-key")).toBe(true);
    expect(result.some((finding) => finding.ruleId === "security.credential-pattern")).toBe(true);
    expect(JSON.stringify(result)).not.toContain("1234567890abcdef");
    expect(JSON.stringify(result)).not.toContain("secret material");
  });

  it("keeps the MVP rule pack at or above fifteen rules", () => {
    expect(rules.length).toBeGreaterThanOrEqual(15);
  });

  it("runs npm-package rules only for npm-package profile", () => {
    const files = [file("README.md"), file(".gitignore"), file("package.json")];
    const text = { "README.md": "# package\n\nA useful package with a clear description and setup instructions.", "package.json": "{\"name\":\"demo-package\"}" };
    expect(enabledRules(context("public", files, text)).some((rule) => rule.id === "package.manifest-name")).toBe(false);
    expect(enabledRules(context("npm-package", files, text)).some((rule) => rule.id === "package.manifest-name")).toBe(true);
  });
});
