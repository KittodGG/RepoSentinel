import type { Finding } from "@reposentinel/core";
import { describe, expect, it } from "vitest";
import {
  renderHtmlReport,
  renderJsonReport,
  renderMarkdownReport,
  renderSarifReport,
  renderTerminalReport,
} from "./index.js";

const warning: Finding = {
  ruleId: "documentation.quickstart",
  category: "documentation",
  severity: "warning",
  message: "README does not contain a runnable Quick Start command.",
  path: "README.md",
  line: 12,
  evidence: "No setup command was detected.",
  remediation: "Add a Quick Start section with one run command.",
  fingerprint: "documentation.quickstart:README.md:12",
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
      color: false,
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
      threshold: "error",
    });
    expect(output).toContain("# RepoSentinel Report");
    expect(output).toContain("| Warning | 1 |");
    expect(output).toContain("### `documentation.quickstart`");
    expect(output).not.toContain("\\\\n");
    expect(output).toContain("- Network: `disabled`");
  });

  it("escapes Markdown-controlled evidence and remediation text", () => {
    const output = renderMarkdownReport({
      locale: "en",
      repository: "fixture",
      profile: "public",
      findings: [
        {
          ...warning,
          message: "bad [message] *here*",
          evidence: "[click](javascript:alert(1)) | raw",
          remediation: "<script>alert(1)</script>",
        },
      ],
      threshold: "error",
      network: true,
    });
    expect(output).toContain("bad \\[message\\] \\*here\\*");
    expect(output).toContain("\\[click\\](javascript:alert(1)) \\| raw");
    expect(output).toContain("\\<script\\>alert(1)\\</script\\>");
    expect(output).toContain("- Network: `enabled (opt-in)`");
  });

  it("renders SARIF with stable rules, severity levels, and locations", () => {
    const output = renderSarifReport({
      locale: "en",
      repository: "fixture",
      profile: "public",
      findings: [warning],
      threshold: "error",
    });
    const parsed = JSON.parse(output) as {
      version: string;
      runs: Array<{
        results: Array<{
          ruleId: string;
          level: string;
          locations: Array<{
            physicalLocation: {
              artifactLocation: { uri: string };
              region: { startLine: number };
            };
          }>;
        }>;
      }>;
    };
    expect(parsed.version).toBe("2.1.0");
    expect(parsed.runs[0]?.results[0]?.ruleId).toBe("documentation.quickstart");
    expect(parsed.runs[0]?.results[0]?.level).toBe("warning");
    expect(
      parsed.runs[0]?.results[0]?.locations[0]?.physicalLocation
        .artifactLocation.uri,
    ).toBe("README.md");
    expect(
      parsed.runs[0]?.results[0]?.locations[0]?.physicalLocation.region
        .startLine,
    ).toBe(12);
  });

  it("deduplicates SARIF driver rules and emits rule indexes", () => {
    const output = renderSarifReport({
      locale: "en",
      repository: "fixture",
      profile: "public",
      findings: [warning, { ...warning, path: "CONTRIBUTING.md", line: 4 }],
      threshold: "error",
    });
    const parsed = JSON.parse(output) as {
      runs: Array<{
        tool: { driver: { rules: Array<{ id: string }> } };
        results: Array<{ ruleId: string; ruleIndex: number }>;
      }>;
    };
    expect(parsed.runs[0]?.tool.driver.rules).toHaveLength(1);
    expect(parsed.runs[0]?.tool.driver.rules[0]?.id).toBe(
      "documentation.quickstart",
    );
    expect(
      parsed.runs[0]?.results.every((result) => result.ruleIndex === 0),
    ).toBe(true);
  });

  it("renders machine JSON without ANSI escape sequences", () => {
    const output = renderJsonReport({
      locale: "en",
      repository: "fixture",
      profile: "public",
      findings: [warning],
      threshold: "error",
    });
    const parsed = JSON.parse(output) as {
      schemaVersion: string;
      locale: string;
      findings: Finding[];
    };
    expect(parsed.schemaVersion).toBe("reposentinel.report/v1");
    expect(parsed.locale).toBe("en");
    expect(parsed.findings[0]?.ruleId).toBe("documentation.quickstart");
    expect(output).not.toContain("\\u001b[");
  });

  it("exposes changed-files scope in every report family", () => {
    const options = {
      locale: "en" as const,
      repository: "fixture",
      profile: "public" as const,
      findings: [warning],
      threshold: "error" as const,
      changedSince: "origin/main",
      changedFiles: ["README.md"],
    };
    expect(
      renderTerminalReport({
        ...options,
        filesScanned: 2,
        ignoredCount: 0,
        color: false,
      }),
    ).toContain("changed since origin/main");
    expect(renderMarkdownReport(options)).toContain("Changed files: `1`");
    expect(renderJsonReport(options)).toContain('"mode": "changed-files"');
    expect(renderJsonReport(options)).toContain('"network": "disabled"');
    expect(renderSarifReport(options)).toContain('"baseRef": "origin/main"');
    expect(renderSarifReport(options)).toContain('"network": "disabled"');
  });

  it("exposes bounded-scan state across report formats", () => {
    const options = {
      locale: "en" as const,
      repository: "fixture",
      profile: "public" as const,
      findings: [],
      threshold: "error" as const,
      scanBudget: {
        maxFiles: 10,
        maxTotalBytes: 1000,
        filesConsidered: 10,
        textBytesCached: 1000,
        truncated: true,
      },
    };
    expect(
      renderTerminalReport({
        ...options,
        filesScanned: 10,
        ignoredCount: 0,
        color: false,
      }),
    ).toContain("bounded");
    expect(renderMarkdownReport(options)).toContain("Scan budget");
    expect(renderJsonReport(options)).toContain('"truncated": true');
    expect(renderHtmlReport(options)).toContain("bounded");
  });

  it("renders a self-contained escaped HTML report", () => {
    const output = renderHtmlReport({
      locale: "en",
      repository: "fixture <script>",
      profile: "public",
      findings: [
        {
          ...warning,
          message: "Unsafe <message> & value",
          evidence: '"quoted"',
        },
      ],
      threshold: "error",
      changedSince: "origin/main",
      changedFiles: ["README.md"],
    });
    expect(output).toContain("<!doctype html>");
    expect(output).toContain("Changed-files mode");
    expect(output).toContain("Unsafe &lt;message&gt; &amp; value");
    expect(output).toContain("fixture &lt;script&gt;");
    expect(output).not.toContain("<script>");
    expect(output).not.toContain("https://cdn.");
  });

  it("keeps the Markdown report structure stable", () => {
    expect(
      renderMarkdownReport({
        locale: "en",
        repository: "fixture",
        profile: "public",
        findings: [warning],
        threshold: "error",
      }),
    ).toMatchSnapshot();
  });

  it("keeps the plain terminal report structure stable", () => {
    expect(
      renderTerminalReport({
        locale: "en",
        repository: "fixture",
        profile: "public",
        filesScanned: 4,
        ignoredCount: 1,
        findings: [warning],
        threshold: "error",
        color: false,
      }),
    ).toMatchSnapshot();
  });
});
