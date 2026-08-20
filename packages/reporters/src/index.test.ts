import { describe, expect, it } from "vitest";
import type { Finding } from "@reposentinel/core";
import { renderJsonReport, renderMarkdownReport, renderSarifReport, renderTerminalReport } from "./index.js";

const warning: Finding = {
  ruleId: "documentation.quickstart",
  category: "documentation",
  severity: "warning",
  message: "README does not contain a runnable Quick Start command.",
  path: "README.md",
  line: 12,
  evidence: "No setup command was detected.",
  remediation: "Add a Quick Start section with one run command.",
  fingerprint: "documentation.quickstart:README.md:12"
};

describe("reporters", () => {
  it("renders a stable plain Indonesian terminal report", () => {
    const output = renderTerminalReport({
      locale: "id",
      repository: "fixture",
      profile: "portfolio",
      filesScanned: 4,
      ignoredCount: 1,
      findings: [warning],
      threshold: "error",
      color: false
    });
    expect(output).toContain("kesiapan repository, tanpa kebisingan");
    expect(output).toContain("SIAP");
    expect(output).toContain("documentation.quickstart");
    const lines = output.split("\n");
    const top = lines.find((line) => line.startsWith("╭─ health snapshot"));
    const row = lines.find((line) => line.startsWith("│"));
    const bottom = lines.find((line) => line.startsWith("╰"));
    expect(top).toBeDefined();
    expect(row).toBeDefined();
    expect(bottom).toBeDefined();
    expect(top?.length).toBe(row?.length);
    expect(row?.length).toBe(bottom?.length);
    expect(output).not.toContain("\\u001b[");
  });

  it("renders Markdown with a summary table and finding section", () => {
    const output = renderMarkdownReport({
      locale: "en",
      repository: "fixture",
      profile: "public",
      findings: [warning],
      threshold: "error"
    });
    expect(output).toContain("# RepoSentinel Report");
    expect(output).toContain("| Warning | 1 |");
    expect(output).toContain("### `documentation.quickstart`");
    expect(output).not.toContain("\\\\n");
  });

  it("renders SARIF with stable rules, severity levels, and locations", () => {
    const output = renderSarifReport({
      locale: "en",
      repository: "fixture",
      profile: "public",
      findings: [warning],
      threshold: "error"
    });
    const parsed = JSON.parse(output) as { version: string; runs: Array<{ results: Array<{ ruleId: string; level: string; locations: Array<{ physicalLocation: { artifactLocation: { uri: string }; region: { startLine: number } } }> }> }> };
    expect(parsed.version).toBe("2.1.0");
    expect(parsed.runs[0]?.results[0]?.ruleId).toBe("documentation.quickstart");
    expect(parsed.runs[0]?.results[0]?.level).toBe("warning");
    expect(parsed.runs[0]?.results[0]?.locations[0]?.physicalLocation.artifactLocation.uri).toBe("README.md");
    expect(parsed.runs[0]?.results[0]?.locations[0]?.physicalLocation.region.startLine).toBe(12);
  });

  it("renders machine JSON without ANSI escape sequences", () => {
    const output = renderJsonReport({
      locale: "en",
      repository: "fixture",
      profile: "public",
      findings: [warning],
      threshold: "error"
    });
    const parsed = JSON.parse(output) as { schemaVersion: string; locale: string; findings: Finding[] };
    expect(parsed.schemaVersion).toBe("reposentinel.report/v1");
    expect(parsed.locale).toBe("en");
    expect(parsed.findings[0]?.ruleId).toBe("documentation.quickstart");
    expect(output).not.toContain("\\u001b[");
  });
});
