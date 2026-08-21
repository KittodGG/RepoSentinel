import type {
  RepositoryContext,
  RepositoryFile,
  ResolvedConfig,
} from "@reposentinel/core";
import {
  hasRuleTextTranslation,
  ruleTextCatalog,
  supportedLocales,
  translateRuleText,
} from "@reposentinel/i18n";
import { describe, expect, it } from "vitest";
import { rules, runRules } from "./index.js";

/**
 * The Indonesian rule catalog is keyed by the English source string, so editing
 * a rule message silently orphans its translation. This suite drives every rule
 * with a fixture that makes it fire, collects the emitted text, and fails when
 * anything is missing from the catalog — turning that fragility into a build
 * error instead of English leaking into an Indonesian report.
 */

function file(
  relativePath: string,
  kind: RepositoryFile["kind"] = "text",
  sizeBytes = 20,
  isTracked = true,
): RepositoryFile {
  return {
    relativePath,
    absolutePath: `/fixture/${relativePath}`,
    kind,
    sizeBytes,
    isIgnored: false,
    isTracked,
  };
}

function config(): ResolvedConfig {
  return {
    profile: "public",
    ignore: [],
    rules: {},
    ciFailOn: "error",
    security: { network: false, scanHistory: false, redactFindings: true },
  };
}

function context(
  profile: RepositoryContext["profile"],
  files: RepositoryFile[],
  text: Record<string, string>,
): RepositoryContext {
  return {
    root: "/fixture",
    profile,
    files,
    textCache: new Map(Object.entries(text)),
    config: { ...config(), profile },
  };
}

// Assembled at runtime so this source file contains no secret-shaped literal;
// the scanner would otherwise report its own test fixtures.
const SYNTHETIC_TOKEN = ["ghp_", "0".repeat(31), "canary"].join("");
const SYNTHETIC_DSN = [
  "postgres",
  "://svcuser:",
  "Xk9mQ2vBn7pLw4Zt",
  "@db.invalid:5432/prod",
].join("");

const PEM = [
  "-----BEGIN RSA PRIVATE KEY-----",
  "MIIEowIBAAKCAQEAx7Zk9vQpL2mN4rTyU8wKjHgF3sDcV6bXnM1oP5qR7tYuI0aZ",
  "b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdz",
  "-----END RSA PRIVATE KEY-----",
].join("\n");

/** Fixtures chosen so that between them every rule in the pack emits at least once. */
const scenarios: RepositoryContext[] = [
  // Bare project: every presence rule fires.
  context("public", [file("src/index.ts")], {}),

  // Portfolio profile with a thin README.
  context("portfolio", [file("README.md"), file("src/a.ts")], {
    "README.md": "# demo\n",
  }),

  // Secrets, environment files, and private keys.
  context(
    "public",
    [file(".env"), file("deploy/id_rsa"), file("src/config.ts")],
    {
      ".env": "TOKEN=1\n",
      "deploy/id_rsa": PEM,
      "tests/certs/server.key": PEM,
      "src/config.ts": `const t = "${SYNTHETIC_TOKEN}";\nconst u = "${SYNTHETIC_DSN}";\n`,
    },
  ),

  // Broken links, images, and badges.
  context("public", [file("README.md")], {
    "README.md": [
      "# demo",
      "[missing](docs/nope.md)",
      "[bad](http://)",
      "![gone](assets/nope.png)",
      "[![badge](relative-badge.svg)](x)",
    ].join("\n"),
  }),

  // Package hygiene, including a broken manifest.
  context(
    "npm-package",
    [
      file("package.json"),
      file("package-lock.json"),
      file("pnpm-lock.yaml"),
      file("dist/app.js"),
      file("assets/model.bin", "binary", 6 * 1024 * 1024),
    ],
    { "package.json": "{ not json" },
  ),

  // Valid manifest that still fails the structural package rules.
  context("npm-package", [file("package.json"), file("src/a.ts")], {
    "package.json": '{"name":"demo","version":"1.0.0","files":["lib"]}',
  }),

  // CI workflows: unpinned actions, missing permissions, unsafe trigger.
  context(
    "public",
    [file(".github/workflows/a.yml"), file(".github/workflows/b.yml")],
    {
      ".github/workflows/a.yml":
        "name: A\non: push\njobs:\n  x:\n    steps:\n      - uses: actions/checkout@v4\n",
      ".github/workflows/b.yml": [
        "name: B",
        "on: pull_request_target",
        "jobs:",
        "  x:",
        "    steps:",
        "      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262",
        "        with:",
        // biome-ignore lint/suspicious/noTemplateCurlyInString: GitHub Actions expression inside a YAML fixture, not a JS template.
        "          ref: ${{ github.event.pull_request.head.sha }}",
      ].join("\n"),
    },
  ),

  // Untracked environment file and a test-certificate private key.
  context(
    "public",
    [
      file(".env.local", "text", 20, false),
      file("tests/certs/server.key"),
      file("src/a.ts"),
    ],
    { "tests/certs/server.key": PEM },
  ),

  // Invalid package name plus a dist entrypoint missing from the files list.
  context(
    "npm-package",
    [file("package.json"), file("dist/cli.js"), file("src/a.ts")],
    {
      "package.json":
        '{"name":"..Bad Name..","version":"1.0.0","files":["lib"],"bin":{"demo":"dist/cli.js"}}',
    },
  ),

  // Workspace whose lockfile does not list the member package.
  context(
    "npm-package",
    [
      file("package.json"),
      file("pnpm-lock.yaml"),
      file("pnpm-workspace.yaml"),
      file("packages/a/package.json"),
    ],
    {
      "package.json":
        '{"name":"root","version":"1.0.0","private":true,"packageManager":"pnpm@10.15.0","engines":{"node":">=24"}}',
      "packages/a/package.json":
        '{"name":"a","version":"1.0.0","engines":{"node":">=18"},"exports":"./index.js"}',
      "pnpm-workspace.yaml": "packages:\n  - packages/*\n",
      "pnpm-lock.yaml": "lockfileVersion: '9.0'\nimporters:\n  .: {}\n",
    },
  ),

  // Declared package manager with no matching lockfile committed.
  context("npm-package", [file("package.json"), file("src/a.ts")], {
    "package.json":
      '{"name":"demo","version":"1.0.0","packageManager":"npm@10.0.0","exports":"./src/a.ts","files":["src"]}',
  }),

  // Portfolio profile with no demo, preview, or live URL anywhere. The heading
  // deliberately avoids the words "demo" and "preview" so the rule can fire.
  context("portfolio", [file("README.md")], {
    "README.md":
      "# toolkit\n\nA description sentence that is long enough here.\n",
  }),

  // Empty target.
  context("public", [], {}),
];

function detachedHeadContext(): RepositoryContext {
  const base = context("public", [file("src/a.ts")], {});
  base.git = { available: true };
  return base;
}

describe("rule text localization", () => {
  const prose = new Set<string>();
  const evidence = new Set<string>();
  for (const scenario of [...scenarios, detachedHeadContext()]) {
    for (const finding of runRules(scenario)) {
      prose.add(finding.message);
      prose.add(finding.remediation);
      if (finding.evidence) evidence.add(finding.evidence);
    }
  }

  it("exercises a broad slice of the rule pack", () => {
    // Guards against the fixtures silently drifting into covering almost nothing.
    expect(prose.size).toBeGreaterThanOrEqual(50);
  });

  for (const locale of supportedLocales) {
    if (locale === "en") continue;

    it(`translates every message and remediation into ${locale}`, () => {
      const missing = [...prose]
        .filter((text) => !hasRuleTextTranslation(locale, text))
        .sort();
      expect(missing).toEqual([]);
    });

    it(`leaves no English prose in a ${locale} report`, () => {
      // Parameterised text is covered by pattern substitution, so nothing a
      // rule emits may come back unchanged unless it is genuinely identical in
      // both languages.
      const unchanged = [...prose]
        .filter((text) => translateRuleText(locale, text) === text)
        .sort();
      expect(unchanged).toEqual([]);
    });

    it(`never renders a raw catalog key in ${locale}`, () => {
      // Evidence is mostly data — paths, sizes, redacted match positions — so it
      // is translated best-effort. What must never happen is an empty or
      // key-shaped string reaching the reader.
      for (const text of evidence) {
        const rendered = translateRuleText(locale, text);
        expect(rendered.length).toBeGreaterThan(0);
        expect(rendered).not.toMatch(/^rule\.[a-z]/u);
      }
    });
  }

  it("treats per-file test conventions as fixtures across ecosystems", () => {
    // Directory names alone miss `a.test.ts`, `a_test.go`, and `test_a.py`,
    // which are the dominant conventions in JS/TS, Go, and Python. Missing them
    // reports synthetic fixture credentials at production severity.
    const token = ["ghp_", "0".repeat(31), "canary"].join("");
    const paths = [
      "src/config.test.ts",
      "src/config.spec.ts",
      "pkg/handler_test.go",
      "app/test_handler.py",
      "spec/thing_spec.rb",
      "src/__tests__/a.ts",
      "e2e/login.ts",
    ];
    for (const path of paths) {
      const findings = runRules(
        context("public", [file(path)], { [path]: `const k = "${token}";` }),
      ).filter((finding) => finding.ruleId === "security.credential-pattern");
      expect(findings.map((finding) => finding.severity)).toEqual(["info"]);
    }

    const production = "src/config.ts";
    const findings = runRules(
      context("public", [file(production)], {
        [production]: `const k = "${token}";`,
      }),
    ).filter((finding) => finding.ruleId === "security.credential-pattern");
    expect(findings.map((finding) => finding.severity)).toEqual(["error"]);
  });

  it("keeps every catalog entry reachable from the rule pack", () => {
    // A stale entry means a rule message changed and the translation was left
    // behind; it would otherwise sit unnoticed and never render.
    const staticText = new Set<string>();
    for (const rule of rules) staticText.add(rule.title);
    const catalog = ruleTextCatalog("id");
    const unreachable = Object.keys(catalog).filter(
      (key) => !prose.has(key) && !evidence.has(key) && !staticText.has(key),
    );
    // Only the output-budget remediation is unreachable from static fixtures;
    // it is emitted by the reporter layer, not by a rule.
    expect(unreachable).toEqual([
      "Review the source files or rerun with narrower scope; a truncated report is not a complete finding inventory.",
    ]);
  });
});
