import { describe, expect, it } from "vitest";
import type { Finding } from "@reposentinel/core";
import { renderJsonReport, renderMarkdownReport, renderTerminalReport } from "./index.js";

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
