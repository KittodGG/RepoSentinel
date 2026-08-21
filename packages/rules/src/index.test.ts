import { readFile } from "node:fs/promises";
import type {
  RepositoryContext,
  RepositoryFile,
  ResolvedConfig,
} from "@reposentinel/core";
import { describe, expect, it } from "vitest";
import { enabledRules, rules, runRules, safeAutofixes } from "./index.js";

function file(
  relativePath: string,
  kind: RepositoryFile["kind"] = "text",
  sizeBytes = 20,
  isTracked?: boolean,
): RepositoryFile {
  return {
    relativePath,
    absolutePath: `/fixture/${relativePath}`,
    kind,
    sizeBytes,
    isIgnored: false,
    ...(isTracked === undefined ? {} : { isTracked }),
  };
}

function config(profile: RepositoryContext["profile"]): ResolvedConfig {
  return {
    profile,
    ignore: ["node_modules/**", "dist/**"],
    rules: {},
    ciFailOn: "error",
    security: { network: false, scanHistory: false, redactFindings: true },
  };
}

function context(
  profile: RepositoryContext["profile"],
  files: RepositoryFile[],
  text: Record<string, string>,
  securityText: Record<string, string> = {},
): RepositoryContext {
  return {
    root: "/fixture",
    profile,
    files,
    textCache: new Map(Object.entries(text)),
    ...(Object.keys(securityText).length > 0
      ? { securityTextCache: new Map(Object.entries(securityText)) }
      : {}),
    config: config(profile),
  };
}

describe("rules", () => {
  it("keeps every generated docsUrl anchor present in the public rule catalog", async () => {
    const catalog = await readFile(
      new URL("../../../docs/RULES.md", import.meta.url),
      "utf8",
    );
    for (const rule of rules)
      expect(catalog).toContain(`<a id="${rule.id}"></a>`);
  });

  it("reports missing README and .gitignore", () => {
    const result = runRules(context("public", [], {}));
    expect(result.map((finding) => finding.ruleId)).toContain(
      "documentation.readme-exists",
    );
    expect(result.map((finding) => finding.ruleId)).toContain(
      "gitignore.exists",
    );
  });

  it("accepts lowercase canonical filenames for README and license checks", () => {
    const result = runRules(
      context("public", [file("readme.md"), file("license")], {
        "readme.md":
          "# Demo\n\nA repository readiness scanner for developers.\n\n## Quick Start\n\n```bash\npnpm install\npnpm dev\n```",
        license: "MIT License",
      }),
    );
    expect(result.map((finding) => finding.ruleId)).not.toContain(
      "documentation.readme-exists",
    );
    expect(result.map((finding) => finding.ruleId)).not.toContain(
      "documentation.quickstart",
    );
    expect(result.map((finding) => finding.ruleId)).not.toContain(
      "community.license-present",
    );
  });

  it("accepts a complete README Quick Start", () => {
    const result = runRules(
      context("public", [file("README.md"), file(".gitignore")], {
        "README.md":
          "# Demo\n\nA repository readiness scanner for developers.\n\n## Quick Start\n\n```bash\npnpm install\npnpm dev\n```",
      }),
    );
    expect(result.map((finding) => finding.ruleId)).not.toContain(
      "documentation.quickstart",
    );
    expect(result.map((finding) => finding.ruleId)).not.toContain(
      "documentation.description",
    );
  });

  it("redacts private keys and credential patterns", () => {
    const result = runRules(
      context("public", [file("deploy/id_rsa"), file("src/config.ts")], {
        "deploy/id_rsa":
          "-----BEGIN OPENSSH PRIVATE KEY-----\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB\n-----END OPENSSH PRIVATE KEY-----",
        "src/config.ts": `const token = '${["ghp_", "1234567890abcdef"].join("")}';`,
      }),
    );
    expect(
      result.some((finding) => finding.ruleId === "security.private-key"),
    ).toBe(true);
    expect(
      result.some(
        (finding) => finding.ruleId === "security.credential-pattern",
      ),
    ).toBe(true);
    expect(JSON.stringify(result)).not.toContain("1234567890abcdef");
    expect(JSON.stringify(result)).not.toContain("secret material");
  });

  it("checks package structure and lockfile importers", () => {
    const files = [
      file("package.json"),
      file("packages/cli/package.json"),
      file("pnpm-lock.yaml"),
    ];
    const complete = runRules(
      context("public", files, {
        "package.json": JSON.stringify({
          private: true,
          packageManager: "pnpm@10.15.0",
          engines: { node: ">=24" },
        }),
        "packages/cli/package.json": JSON.stringify({
          name: "demo",
          private: false,
          files: ["dist"],
          exports: { ".": "./dist/index.js" },
          engines: { node: ">=24" },
        }),
        "pnpm-lock.yaml":
          "lockfileVersion: '9.0'\nimporters:\n  packages/cli:\n",
      }),
    );
    expect(
      complete.some((finding) =>
        finding.ruleId.startsWith("package.manifest-"),
      ),
    ).toBe(false);
    expect(
      complete.some((finding) => finding.ruleId === "package.lockfile-sync"),
    ).toBe(false);

    const incomplete = runRules(
      context("public", files, {
        "package.json": JSON.stringify({
          private: true,
          packageManager: "pnpm@10.15.0",
          engines: { node: ">=24" },
        }),
        "packages/cli/package.json": JSON.stringify({
          name: "demo",
          private: false,
        }),
        "pnpm-lock.yaml": "lockfileVersion: '9.0'\nimporters:\n",
      }),
    );
    expect(incomplete.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining([
        "package.manifest-exports",
        "package.manifest-engines",
        "package.lockfile-sync",
      ]),
    );

    const directLibrary = runRules(
      context("npm-package", [file("package.json")], {
        "package.json": JSON.stringify({
          name: "direct-library",
          main: "./index.js",
          files: ["index.js"],
        }),
      }),
    );
    expect(directLibrary.map((finding) => finding.ruleId)).not.toContain(
      "package.manifest-files",
    );
    expect(directLibrary.map((finding) => finding.ruleId)).not.toContain(
      "package.lockfile-sync",
    );

    const distLibrary = runRules(
      context("npm-package", [file("package.json")], {
        "package.json": JSON.stringify({
          name: "dist-library",
          main: "./dist/index.js",
          files: ["index.js"],
        }),
      }),
    );
    expect(distLibrary.map((finding) => finding.ruleId)).toContain(
      "package.manifest-files",
    );
  });

  it("flags mutable actions and privileged pull-request checkouts", () => {
    const action = "actions/checkout@v7";
    const source = `name: Unsafe\non:\n  pull_request_target:\npermissions: read-all\njobs:\n  build:\n    steps:\n      - uses: ${action}\n        with:\n          ref: \${{ github.event.pull_request.head.sha }}`;
    const findings = runRules(
      context("public", [file(".github/workflows/unsafe.yml")], {
        ".github/workflows/unsafe.yml": source,
      }),
    );
    expect(findings.map((finding) => finding.ruleId)).toEqual(
      expect.arrayContaining([
        "ci.action-sha-pinned",
        "ci.pull-request-target-safety",
      ]),
    );
    expect(
      findings.find(
        (finding) => finding.ruleId === "ci.pull-request-target-safety",
      )?.severity,
    ).toBe("critical");
  });

  it.each([
    "on: pull_request_target",
    "on: [pull_request_target]",
    "on:\n  pull_request_target:",
  ])("detects pull_request_target trigger form: %s", (trigger) => {
    const source = `name: Unsafe\n${trigger}\npermissions: read-all\njobs:\n  build:\n    steps:\n      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1\n        with:\n          ref: \${{ github.event.pull_request.head.sha }}`;
    const findings = runRules(
      context("public", [file(".github/workflows/unsafe.yml")], {
        ".github/workflows/unsafe.yml": source,
      }),
    );
    expect(findings.map((finding) => finding.ruleId)).toContain(
      "ci.pull-request-target-safety",
    );
  });

  it("accepts a complete pinned workflow security configuration", () => {
    const source = `name: Safe\non:\n  pull_request:\npermissions:\n  contents: read\njobs:\n  build:\n    steps:\n      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1`;
    const findings = runRules(
      context("public", [file(".github/workflows/safe.yml")], {
        ".github/workflows/safe.yml": source,
      }),
    );
    expect(findings.map((finding) => finding.ruleId)).not.toContain(
      "ci.action-sha-pinned",
    );
    expect(findings.map((finding) => finding.ruleId)).not.toContain(
      "ci.pull-request-target-safety",
    );
  });

  it("keeps the MVP rule pack at or above fifteen rules", () => {
    expect(rules.length).toBeGreaterThanOrEqual(15);
  });

  it("runs npm-package rules only for npm-package profile", () => {
    const files = [file("README.md"), file(".gitignore"), file("package.json")];
    const text = {
      "README.md":
        "# package\n\nA useful package with a clear description and setup instructions.",
      "package.json": '{"name":"demo-package"}',
    };
    expect(
      enabledRules(context("public", files, text)).some(
        (rule) => rule.id === "package.manifest-name",
      ),
    ).toBe(false);
    expect(
      enabledRules(context("npm-package", files, text)).some(
        (rule) => rule.id === "package.manifest-name",
      ),
    ).toBe(true);
  });

  it("checks governance files and tracked generated artifacts", () => {
    const incomplete = runRules(
      context(
        "public",
        [
          file("README.md"),
          file(".gitignore"),
          file("assets/model.bin", "binary", 6 * 1024 * 1024, true),
          file("dist/app.js", "text", 100, true),
        ],
        {},
      ),
    );
    expect(incomplete.map((finding) => finding.ruleId)).toContain(
      "community.contributing-guide",
    );
    expect(incomplete.map((finding) => finding.ruleId)).toContain(
      "community.code-of-conduct",
    );
    expect(incomplete.map((finding) => finding.ruleId)).toContain(
      "git.large-file",
    );
    expect(incomplete.map((finding) => finding.ruleId)).toContain(
      "git.generated-tracked",
    );

    const complete = runRules(
      context(
        "public",
        [
          file("README.md"),
          file(".gitignore"),
          file("CONTRIBUTING.md"),
          file("CODE_OF_CONDUCT.md"),
          file("assets/model.bin", "binary", 6 * 1024 * 1024, false),
        ],
        {},
      ),
    );
    expect(complete.map((finding) => finding.ruleId)).not.toContain(
      "community.contributing-guide",
    );
    expect(complete.map((finding) => finding.ruleId)).not.toContain(
      "community.code-of-conduct",
    );
    expect(complete.map((finding) => finding.ruleId)).not.toContain(
      "git.large-file",
    );
    expect(complete.map((finding) => finding.ruleId)).not.toContain(
      "git.generated-tracked",
    );
  });

  it("detects secrets in README and reports multiple credential matches safely", () => {
    const result = runRules(
      context("public", [file("README.md"), file("docs/deploy.md")], {
        "README.md": `Use ${["ghp_", "1234567890abcdef"].join("")} and ${["AKIA", "1234567890ABCDEF"].join("")} in this example.`,
        "docs/deploy.md":
          "-----BEGIN RSA PRIVATE KEY-----\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB\n-----END RSA PRIVATE KEY-----",
      }),
    );
    const credentialFindings = result.filter(
      (finding) => finding.ruleId === "security.credential-pattern",
    );
    expect(credentialFindings).toHaveLength(2);
    expect(
      result.some((finding) => finding.ruleId === "security.private-key"),
    ).toBe(true);
    expect(JSON.stringify(result)).not.toContain("1234567890abcdef");
    expect(JSON.stringify(result)).not.toContain(
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    );
  });

  it("keeps production keys critical but classifies test certificates as info", () => {
    const key =
      "-----BEGIN RSA PRIVATE KEY-----\n" +
      "A".repeat(40) +
      "\n-----END RSA PRIVATE KEY-----";
    const findings = runRules(
      context(
        "public",
        [file("tests/certs/server.key"), file("src/server.key")],
        {
          "tests/certs/server.key": key,
          "src/server.key": key,
        },
      ),
    ).filter((finding) => finding.ruleId === "security.private-key");
    expect(findings.map((finding) => finding.severity)).toEqual([
      "critical",
      "info",
    ]);
    expect(
      findings.find((finding) => finding.path === "tests/certs/server.key")
        ?.message,
    ).toContain("test-certificate");
  });

  it("detects expanded credential prefixes but ignores short lookalikes", () => {
    const positives = [
      `sk_live_${"a".repeat(24)}`,
      `rk_live_${"b".repeat(24)}`,
      `AIza${"c".repeat(24)}`,
      `sk-proj-${"d".repeat(24)}`,
      `sk-${"e".repeat(24)}`,
      `npm_${"f".repeat(24)}`,
      `github_pat_${"g".repeat(24)}`,
      `xoxb-${"h".repeat(24)}`,
      `xoxp-${"i".repeat(24)}`,
      `AKIA${"j".repeat(20)}`,
      `ASIA${"k".repeat(20)}`,
      `ghp_${"l".repeat(24)}`,
      [
        "eyJhbGciOiJIUzI1NiJ9",
        "eyJzdWIiOiIxMjM0NTY3ODkwIn0",
        "A".repeat(24),
      ].join("."),
    ];
    const negatives = [
      "sk_live_short",
      "rk_live_short",
      "AIza_short",
      "sk-proj-short",
      "sk-short",
      "npm_short",
      "github_pat_short",
      "xoxb-short",
      "xoxp-short",
      "AKIA_short",
      "ASIA_short",
      "ghp_short",
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature",
    ];
    const result = runRules(
      context("public", [file("src/config.ts")], {
        "src/config.ts": [...positives, ...negatives].join("\n"),
      }),
    );
    const credentialFindings = result.filter(
      (finding) => finding.ruleId === "security.credential-pattern",
    );
    expect(credentialFindings).toHaveLength(positives.length);
    expect(credentialFindings.map((finding) => finding.line)).toEqual(
      positives.map((_, index) => index + 1),
    );
    expect(JSON.stringify(result)).not.toContain("aaaaaaaaaaaaaaaaaaaaaaaa");
    expect(JSON.stringify(result)).not.toContain("mmmmmmmmmmmm");
  });

  it("detects extended secret families and ignores short lookalikes", () => {
    const slackWebhook = [
      "https://",
      "hooks.slack.com/services/",
      "T12345678/B12345678/abcdefghijklmnop",
    ].join("");
    const postgresConnection = [
      "postgres://",
      "appuser:long-secret-value@db.example.com:5432/application",
    ].join("");
    const mongoConnection = [
      "mongodb+srv://",
      "appuser:long-secret-value@cluster.example.com/application",
    ].join("");
    const pgpKey =
      "-----BEGIN PGP PRIVATE KEY BLOCK-----\n" +
      "A".repeat(40) +
      "\n-----END PGP PRIVATE KEY BLOCK-----";
    const result = runRules(
      context(
        "public",
        [file("config/secrets.txt"), file("keys/private.asc")],
        {
          "config/secrets.txt": [
            slackWebhook,
            postgresConnection,
            mongoConnection,
            ["hooks.slack.com/services/T1/B2/", "short"].join(""),
            ["postgres://", "short"].join(""),
          ].join("\n"),
          "keys/private.asc": pgpKey,
        },
      ),
    );
    expect(
      result.filter(
        (finding) => finding.ruleId === "security.credential-pattern",
      ),
    ).toHaveLength(3);
    expect(
      result.filter((finding) => finding.ruleId === "security.private-key"),
    ).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain(
      "long-secret-value@db.example.com",
    );
    expect(JSON.stringify(result)).not.toContain("BEGIN PGP PRIVATE KEY BLOCK");
  });

  it("detects secrets from repository-gitignored security text", () => {
    const syntheticToken = ["ghp_", "1234567890abcdef"].join("");
    const result = runRules(
      context(
        "public",
        [file(".env", "text", 20, false), file("README.md")],
        { "README.md": "# Demo" },
        { ".env": `TOKEN="${syntheticToken}"` },
      ),
    );
    expect(
      result.some((finding) => finding.ruleId === "security.env-file"),
    ).toBe(true);
    expect(
      result.some(
        (finding) => finding.ruleId === "security.credential-pattern",
      ),
    ).toBe(true);
  });

  it("reports detached HEAD only when local Git metadata is available", async () => {
    const detached = context(
      "public",
      [file("README.md"), file(".gitignore")],
      {},
    );
    detached.git = { available: true };
    expect(runRules(detached).map((finding) => finding.ruleId)).toContain(
      "branch.default",
    );

    const attached = context(
      "public",
      [file("README.md"), file(".gitignore")],
      {},
    );
    attached.git = { available: true, currentBranch: "main" };
    expect(runRules(attached).map((finding) => finding.ruleId)).not.toContain(
      "branch.default",
    );
  });

  it("resolves nested relative Markdown links and repository directories", () => {
    const result = runRules(
      context(
        "public",
        [
          file("README.md"),
          file("SECURITY.md"),
          file(".github/ISSUE_TEMPLATE/documentation.md"),
          file(".github/ISSUE_TEMPLATE", "directory"),
          file("docs/guide.md"),
        ],
        {
          "README.md": "# RepoSentinel\n\n[Guide](docs/guide.md)",
          ".github/ISSUE_TEMPLATE/documentation.md":
            "[Security](../../SECURITY.md)\n[Templates](./)",
          "docs/guide.md":
            "[Root](../README.md)\n[Templates](../.github/ISSUE_TEMPLATE/)",
        },
      ),
    );
    expect(
      result.filter((finding) => finding.ruleId === "links.valid"),
    ).toEqual([]);
  });

  it("accepts Install and Usage headings and dual-license filenames", () => {
    const install = runRules(
      context("npm-package", [file("readme.md"), file("LICENSE-MIT")], {
        "readme.md":
          "# Package\n\n## Install\n\npnpm install\n\n## Usage\n\nnode index.js",
      }),
    );
    expect(install.map((finding) => finding.ruleId)).not.toContain(
      "documentation.quickstart",
    );
    expect(install.map((finding) => finding.ruleId)).not.toContain(
      "community.license-present",
    );
  });

  it("reports the discovered canonical filename and ignores Markdown code", () => {
    const result = runRules(
      context(
        "public",
        [file("readme.md"), file("docs/my file.md"), file(".gitignore")],
        {
          "readme.md": [
            "# Demo",
            "",
            "```md",
            "[Missing](docs/absent.md)",
            "```",
            "",
            "[Inline](`docs/absent.md`)",
            "[Angle](<docs/my file.md>)",
            "[Broken](docs/absent.md)",
          ].join("\n"),
        },
      ),
    );
    const linkFindings = result.filter(
      (finding) => finding.ruleId === "links.valid",
    );
    expect(linkFindings).toHaveLength(1);
    expect(linkFindings[0]?.evidence).toBe("docs/absent.md");

    const missingQuickstart = runRules(
      context("public", [file("readme.md"), file(".gitignore")], {
        "readme.md": "# Demo",
      }),
    ).find((finding) => finding.ruleId === "documentation.quickstart");
    expect(missingQuickstart?.path).toBe("readme.md");
  });

  it("does not treat root-absolute site routes as repository paths", () => {
    const result = runRules(
      context(
        "public",
        [file("README.md"), file("docs/guide.md"), file(".gitignore")],
        {
          "README.md": "# Demo\n\n[Guide](/docs/guide.md)",
        },
      ),
    );
    expect(
      result.filter((finding) => finding.ruleId === "links.valid"),
    ).toEqual([]);
  });

  it("offers safe autofixes only for missing template files", () => {
    const target = context("public", [], {});
    const findings = runRules(target);
    const fixes = safeAutofixes(target, findings);
    expect(fixes.map((fix) => fix.path)).toEqual([
      ".gitignore",
      "CONTRIBUTING.md",
      "CODE_OF_CONDUCT.md",
    ]);
    expect(
      fixes.every(
        (fix) => !fix.path.includes(".env") && !fix.path.includes("id_rsa"),
      ),
    ).toBe(true);
  });
});
