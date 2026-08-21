import { describe, expect, it } from "vitest";
import {
  exitCodeForFindings,
  type Finding,
  fingerprintFor,
  limitFindings,
  normalizeFindings,
  redactSensitiveValue,
  scoreFindings,
  summarizeFindings,
} from "./index.js";

const finding = (overrides: Partial<Finding>): Finding => ({
  ruleId: "documentation.quickstart",
  category: "documentation",
  severity: "warning",
  message: "message",
  remediation: "fix",
  ...overrides,
});

describe("core contracts", () => {
  it("sorts findings deterministically by severity, path, line, and rule ID", () => {
    const result = normalizeFindings([
      finding({
        ruleId: "b.rule",
        path: "README.md",
        line: 4,
        severity: "warning",
      }),
      finding({
        ruleId: "a.rule",
        path: "README.md",
        line: 4,
        severity: "warning",
      }),
      finding({
        ruleId: "critical.rule",
        path: "src/a.ts",
        severity: "critical",
      }),
      finding({ ruleId: "error.rule", path: "src/a.ts", severity: "error" }),
    ]);
    expect(result.map((item) => item.ruleId)).toEqual([
      "critical.rule",
      "error.rule",
      "a.rule",
      "b.rule",
    ]);
  });

  it("calculates the initial score penalty model", () => {
    expect(
      scoreFindings([
        finding({ severity: "error" }),
        finding({ severity: "warning" }),
        finding({ severity: "info" }),
      ]),
    ).toBe(76);
  });

  it("limits noisy findings and emits a truncation summary", () => {
    const result = limitFindings(
      Array.from({ length: 8 }, (_, index) =>
        finding({
          ruleId: index < 6 ? "links.valid" : "images.resolve",
          line: index + 1,
        }),
      ),
      3,
      4,
    );
    expect(result.truncated).toBe(true);
    expect(result.originalCount).toBe(8);
    expect(
      result.findings.filter((item) => item.ruleId === "links.valid"),
    ).toHaveLength(3);
    expect(
      result.findings.some((item) => item.ruleId === "scan.findings-truncated"),
    ).toBe(true);
    expect(
      result.findings.every(
        (item) => item.ruleId !== "images.resolve" || item.line === 7,
      ),
    ).toBe(true);
  });

  it("caps score penalty contribution from a single noisy rule", () => {
    const noisyRule = Array.from({ length: 20 }, () =>
      finding({ ruleId: "ci.action-sha-pinned", severity: "warning" }),
    );
    expect(scoreFindings(noisyRule)).toBe(85);
    expect(
      scoreFindings([
        finding({ ruleId: "first.rule", severity: "warning" }),
        finding({ ruleId: "second.rule", severity: "warning" }),
        finding({ ruleId: "third.rule", severity: "warning" }),
        finding({ ruleId: "fourth.rule", severity: "warning" }),
      ]),
    ).toBe(80);
  });

  it("applies threshold decisions without hiding warnings", () => {
    const findings = [finding({ severity: "warning" })];
    expect(exitCodeForFindings(findings, "error")).toBe(0);
    expect(exitCodeForFindings(findings, "warning")).toBe(1);
    expect(summarizeFindings(findings, "error").counts.warning).toBe(1);
  });

  it("redacts private keys and high-confidence tokens", () => {
    expect(
      redactSensitiveValue("-----BEGIN RSA PRIVATE KEY-----\nsecret material"),
    ).toBe("[REDACTED PRIVATE KEY]");
    expect(
      redactSensitiveValue(
        ["-----BEGIN PGP PRIVATE KEY BLOCK-----\n", "secret material"].join(""),
      ),
    ).toBe("[REDACTED PRIVATE KEY]");
    expect(
      redactSensitiveValue(
        [
          "https://",
          "hooks.slack.com/services/",
          "T12345678/B12345678/abcdefghijklmnop",
        ].join(""),
      ),
    ).toBe("[REDACTED SLACK WEBHOOK]");
    expect(
      redactSensitiveValue(
        ["postgres://", "user:password@db.example.com:5432/application"].join(
          "",
        ),
      ),
    ).toBe("[REDACTED CONNECTION STRING]");
    expect(redactSensitiveValue(["ghp_", "1234567890abcdef"].join(""))).toBe(
      "ghp_****[REDACTED]",
    );
    expect(redactSensitiveValue("password")).toBe("[REDACTED]");
    expect(redactSensitiveValue("long-unclassified-secret-value")).toBe(
      "[REDACTED]",
    );
    const expanded = [
      `sk_live_${"a".repeat(24)}`,
      `rk_live_${"b".repeat(24)}`,
      `AIza${"c".repeat(24)}`,
      `sk-proj-${"d".repeat(24)}`,
      `sk-${"e".repeat(24)}`,
      `npm_${"f".repeat(24)}`,
      [
        "eyJhbGciOiJIUzI1NiJ9",
        "eyJzdWIiOiIxMjM0NTY3ODkwIn0",
        "A".repeat(24),
      ].join("."),
    ];
    for (const value of expanded) {
      const redacted = redactSensitiveValue(value);
      expect(redacted).toContain("****[REDACTED]");
      expect(redacted).not.toContain(value.slice(3));
    }
  });

  it("creates stable fingerprints without secret content", () => {
    expect(fingerprintFor("security.env-file", ".env", 1)).toBe(
      "security.env-file:.env:1",
    );
  });
});
