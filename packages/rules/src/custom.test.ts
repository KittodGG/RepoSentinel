import type { RepositoryContext, ResolvedConfig } from "@reposentinel/core";
import { describe, expect, it } from "vitest";
import { loadCustomRules } from "./custom.js";

const config: ResolvedConfig = {
  profile: "public",
  ignore: [],
  rules: {},
  ciFailOn: "error",
  security: { network: false, scanHistory: false, redactFindings: true },
};

function context(
  files: RepositoryContext["files"],
  text: Record<string, string>,
): RepositoryContext {
  return {
    root: "/fixture",
    profile: "public",
    files,
    textCache: new Map(Object.entries(text)),
    config,
  };
}

describe("custom rule registry", () => {
  it("matches a path glob and content deterministically", () => {
    const [rule] = loadCustomRules(
      JSON.stringify([
        {
          id: "custom.policy",
          severity: "warning",
          path: "docs/*.md",
          contentIncludes: "report",
          message: "Policy is missing.",
          remediation: "Add the policy.",
        },
      ]),
    );
    const files = [
      {
        relativePath: "docs/SECURITY.md",
        absolutePath: "/fixture/docs/SECURITY.md",
        kind: "text" as const,
        sizeBytes: 10,
        isIgnored: false,
      },
    ];
    expect(
      rule?.run(context(files, { "docs/SECURITY.md": "private report path" })),
    ).toEqual([]);
    const finding = rule?.run(
      context(files, { "docs/SECURITY.md": "incomplete" }),
    )[0];
    expect(finding?.ruleId).toBe("custom.policy");
    expect(finding?.fingerprint).toBe("custom.policy::0");
  });

  it("reports positive content matches when explicitly requested", () => {
    const [rule] = loadCustomRules(
      JSON.stringify([
        {
          id: "custom.forbidden-word",
          severity: "error",
          path: "docs/*.md",
          match: "contains",
          contentIncludes: "TODO",
          message: "TODO marker remains.",
          remediation: "Resolve the TODO marker.",
        },
      ]),
    );
    const files = [
      {
        relativePath: "docs/guide.md",
        absolutePath: "/fixture/docs/guide.md",
        kind: "text" as const,
        sizeBytes: 10,
        isIgnored: false,
      },
    ];
    const findings =
      rule?.run(context(files, { "docs/guide.md": "TODO: remove this" })) ?? [];
    expect(findings).toHaveLength(1);
    expect(findings[0]?.fingerprint).toBe(
      "custom.forbidden-word:docs/guide.md:0",
    );
    expect(rule?.run(context(files, { "docs/guide.md": "complete" }))).toEqual(
      [],
    );
  });

  it("rejects invalid IDs and duplicate IDs", () => {
    expect(() =>
      loadCustomRules(
        JSON.stringify([
          {
            id: "policy",
            severity: "info",
            path: "SECURITY.md",
            message: "x",
            remediation: "y",
          },
        ]),
      ),
    ).toThrow("custom.<name>");
    expect(() =>
      loadCustomRules(
        JSON.stringify([
          {
            id: "custom.one",
            severity: "info",
            path: "a",
            message: "x",
            remediation: "y",
          },
          {
            id: "custom.one",
            severity: "info",
            path: "b",
            message: "x",
            remediation: "y",
          },
        ]),
      ),
    ).toThrow("Duplicate custom rule ID");
    expect(() =>
      loadCustomRules(
        JSON.stringify([
          {
            id: "custom.invalid",
            severity: "warning",
            path: "README.md",
            match: "contains",
            message: "x",
            remediation: "y",
          },
        ]),
      ),
    ).toThrow("requires contentIncludes");
  });
});
