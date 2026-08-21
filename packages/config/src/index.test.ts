import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { defaultConfig, loadConfig, severityOverride } from "./index.js";

describe("configuration", () => {
  it("provides safe defaults", () => {
    const config = defaultConfig("portfolio");
    expect(config.profile).toBe("portfolio");
    expect(config.security.network).toBe(false);
    expect(config.security.scanHistory).toBe(false);
    expect(config.security.redactFindings).toBe(true);
    expect(config.ciFailOn).toBe("error");
    expect(config.ignore).toContain("build/**");
    expect(config.ignore).toContain("target/**");
  });

  it("accepts all supported named profiles with public baseline rules", async () => {
    for (const profile of ["academic", "private-team", "mobile-app"] as const) {
      const root = await mkdtemp(join(tmpdir(), "reposentinel-profile-"));
      await writeFile(join(root, ".reposentinel.yml"), `profile: ${profile}\n`);
      expect((await loadConfig(root)).config.profile).toBe(profile);
    }
  });

  it("loads a YAML override without enabling network", async () => {
    const root = await mkdtemp(join(tmpdir(), "reposentinel-config-"));
    await writeFile(
      join(root, ".reposentinel.yml"),
      [
        "extends: recommended",
        "profile: npm-package",
        "custom_rules: .reposentinel/custom-rules.json",
        "baseline: .reposentinel/baseline.json",
        "ignore:",
        "  - vendor/**",
        "report:",
        "  formats: [json, sarif]",
        "  output_dir: .reposentinel/reports",
        "rules:",
        "  security.private-key: critical",
        "ci:",
        "  fail_on: warning",
        "security:",
        "  redact_findings: true",
        "",
      ].join("\n"),
    );

    const loaded = await loadConfig(root);
    expect(loaded.config.profile).toBe("npm-package");
    expect(loaded.config.baseline).toBe(".reposentinel/baseline.json");
    expect(loaded.config.customRules).toBe(".reposentinel/custom-rules.json");
    expect(loaded.config.ignore).toContain("vendor/**");
    expect(loaded.config.ignore).toContain("build/**");
    expect(loaded.config.ignore).toContain("__pycache__/**");
    expect(loaded.config.report?.formats).toEqual(["json", "sarif"]);
    expect(loaded.config.report?.outputDir).toBe(".reposentinel/reports");
    expect(loaded.config.ciFailOn).toBe("warning");
    expect(loaded.config.security.network).toBe(false);
    expect(
      severityOverride(loaded.config, "security.private-key", "warning"),
    ).toBe("critical");
  });
});
