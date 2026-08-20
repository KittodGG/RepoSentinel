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
  });

  it("loads a YAML override without enabling network", async () => {
    const root = await mkdtemp(join(tmpdir(), "reposentinel-config-"));
    await writeFile(join(root, ".reposentinel.yml"), [
      "profile: npm-package",
      "ignore:",
      "  - vendor/**",
      "rules:",
      "  security.private-key: critical",
      "ci:",
      "  fail_on: warning",
      "security:",
      "  redact_findings: true",
      ""
    ].join("\n"));

    const loaded = await loadConfig(root);
    expect(loaded.config.profile).toBe("npm-package");
    expect(loaded.config.ignore).toContain("vendor/**");
    expect(loaded.config.ciFailOn).toBe("warning");
    expect(loaded.config.security.network).toBe(false);
    expect(severityOverride(loaded.config, "security.private-key", "warning")).toBe("critical");
  });
});
