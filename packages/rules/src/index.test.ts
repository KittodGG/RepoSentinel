import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { RepositoryContext, RepositoryFile, ResolvedConfig } from "@reposentinel/core";
import { enabledRules, rules, runRules, safeAutofixes } from "./index.js";

function file(relativePath: string, kind: RepositoryFile["kind"] = "text", sizeBytes = 20, isTracked?: boolean): RepositoryFile {
  return {
    relativePath,
    absolutePath: `/fixture/${relativePath}`,
    kind,
    sizeBytes,
    isIgnored: false,
    ...(isTracked === undefined ? {} : { isTracked })
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

function context(profile: RepositoryContext["profile"], files: RepositoryFile[], text: Record<string, string>, securityText: Record<string, string> = {}): RepositoryContext {
  return {
    root: "/fixture",
    profile,
    files,
    textCache: new Map(Object.entries(text)),
    ...(Object.keys(securityText).length > 0 ? { securityTextCache: new Map(Object.entries(securityText)) } : {}),
    config: config(profile)
  };
}

describe("rules", () => {
  it("keeps every generated docsUrl anchor present in the public rule catalog", async () => {
    const catalog = await readFile(new URL("../../../docs/RULES.md", import.meta.url), "utf8");
    for (const rule of rules) expect(catalog).toContain(`<a id="${rule.id}"></a>`);
  });

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
        "deploy/id_rsa": "-----BEGIN OPENSSH PRIVATE KEY-----\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB\n-----END OPENSSH PRIVATE KEY-----",
        "src/config.ts": `const token = '${["ghp_", "1234567890abcdef"].join("")}';`
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

  it("checks governance files and tracked generated artifacts", () => {
    const incomplete = runRules(context("public", [
      file("README.md"),
      file(".gitignore"),
      file("assets/model.bin", "binary", 6 * 1024 * 1024, true),
      file("dist/app.js", "text", 100, true)
    ], {}));
    expect(incomplete.map((finding) => finding.ruleId)).toContain("community.contributing-guide");
    expect(incomplete.map((finding) => finding.ruleId)).toContain("community.code-of-conduct");
    expect(incomplete.map((finding) => finding.ruleId)).toContain("git.large-file");
    expect(incomplete.map((finding) => finding.ruleId)).toContain("git.generated-tracked");

    const complete = runRules(context("public", [
      file("README.md"),
      file(".gitignore"),
      file("CONTRIBUTING.md"),
      file("CODE_OF_CONDUCT.md"),
      file("assets/model.bin", "binary", 6 * 1024 * 1024, false)
    ], {}));
    expect(complete.map((finding) => finding.ruleId)).not.toContain("community.contributing-guide");
    expect(complete.map((finding) => finding.ruleId)).not.toContain("community.code-of-conduct");
    expect(complete.map((finding) => finding.ruleId)).not.toContain("git.large-file");
    expect(complete.map((finding) => finding.ruleId)).not.toContain("git.generated-tracked");
  });

  it("detects secrets in README and reports multiple credential matches safely", () => {
    const result = runRules(context("public", [file("README.md"), file("docs/deploy.md")], {
      "README.md": `Use ${["ghp_", "1234567890abcdef"].join("")} and ${["AKIA", "1234567890ABCDEF"].join("")} in this example.`,
      "docs/deploy.md": "-----BEGIN RSA PRIVATE KEY-----\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB\n-----END RSA PRIVATE KEY-----"
    }));
    const credentialFindings = result.filter((finding) => finding.ruleId === "security.credential-pattern");
    expect(credentialFindings).toHaveLength(2);
    expect(result.some((finding) => finding.ruleId === "security.private-key")).toBe(true);
    expect(JSON.stringify(result)).not.toContain("1234567890abcdef");
    expect(JSON.stringify(result)).not.toContain("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
  });

  it("detects secrets from repository-gitignored security text", () => {
    const syntheticToken = ["ghp_", "1234567890abcdef"].join("");
    const result = runRules(context("public", [file(".env", "text", 20, false), file("README.md")], { "README.md": "# Demo" }, { ".env": `TOKEN=\"${syntheticToken}\"` }));
    expect(result.some((finding) => finding.ruleId === "security.env-file")).toBe(true);
    expect(result.some((finding) => finding.ruleId === "security.credential-pattern")).toBe(true);
  });

  it("reports detached HEAD only when local Git metadata is available", async () => {
    const detached = context("public", [file("README.md"), file(".gitignore")], {});
    detached.git = { available: true };
    expect(runRules(detached).map((finding) => finding.ruleId)).toContain("branch.default");

    const attached = context("public", [file("README.md"), file(".gitignore")], {});
    attached.git = { available: true, currentBranch: "main" };
    expect(runRules(attached).map((finding) => finding.ruleId)).not.toContain("branch.default");
  });

  it("resolves nested relative Markdown links and repository directories", () => {
    const result = runRules(context("public", [
      file("README.md"),
      file("SECURITY.md"),
      file(".github/ISSUE_TEMPLATE/documentation.md"),
      file(".github/ISSUE_TEMPLATE", "directory"),
      file("docs/guide.md")
    ], {
      "README.md": "# RepoSentinel\n\n[Guide](docs/guide.md)",
      ".github/ISSUE_TEMPLATE/documentation.md": "[Security](../../SECURITY.md)\n[Templates](./)",
      "docs/guide.md": "[Root](../README.md)\n[Templates](../.github/ISSUE_TEMPLATE/)"
    }));
    expect(result.filter((finding) => finding.ruleId === "links.valid")).toEqual([]);
  });

  it("resolves repository-root absolute Markdown links", () => {
    const result = runRules(context("public", [file("README.md"), file("docs/guide.md"), file(".gitignore")], {
      "README.md": "# Demo\n\n[Guide](/docs/guide.md)"
    }));
    expect(result.filter((finding) => finding.ruleId === "links.valid")).toEqual([]);
  });

  it("offers safe autofixes only for missing template files", () => {
    const target = context("public", [], {});
    const findings = runRules(target);
    const fixes = safeAutofixes(target, findings);
    expect(fixes.map((fix) => fix.path)).toEqual([".gitignore", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md"]);
    expect(fixes.every((fix) => !fix.path.includes(".env") && !fix.path.includes("id_rsa"))).toBe(true);
  });
});
