import { posix } from "node:path";
import {
  type Finding,
  fingerprintFor,
  normalizeFindings,
  type RepositoryContext,
  type RuleCategory,
  type Severity,
} from "@reposentinel/core";

export type RuleDefinition = {
  id: string;
  category: RuleCategory;
  title: string;
  defaultSeverity: Severity;
  profiles: readonly string[];
  run(context: RepositoryContext): Finding[];
};

export type AutofixOperation = {
  ruleId: string;
  path: string;
  content: string;
  description: string;
};

function finding(
  rule: RuleDefinition,
  _context: RepositoryContext,
  input: Omit<Finding, "ruleId" | "category" | "severity" | "fingerprint"> & {
    severity?: Severity;
  },
): Finding {
  const severity = input.severity ?? rule.defaultSeverity;
  const path = input.path;
  const line = input.line;
  return {
    ...input,
    ruleId: rule.id,
    category: rule.category,
    severity,
    fingerprint: fingerprintFor(rule.id, path, line),
    docsUrl: `https://github.com/KittodGG/RepoSentinel/blob/main/docs/RULES.md#${rule.id}`,
  };
}

function fileExists(context: RepositoryContext, path: string): boolean {
  return context.files.some(
    (file) =>
      file.relativePath === path &&
      file.kind !== "directory" &&
      !file.isIgnored,
  );
}

function securityText(context: RepositoryContext): ReadonlyMap<string, string> {
  return new Map([
    ...context.textCache.entries(),
    ...(context.securityTextCache?.entries() ?? []),
  ]);
}

function resolveRepositoryReference(
  sourcePath: string,
  target: string,
): string {
  const normalizedTarget = target.split(/[?#]/u, 1)[0]?.trim() ?? "";
  if (!normalizedTarget) return "";
  const repositoryTarget = normalizedTarget.startsWith("/")
    ? normalizedTarget.slice(1)
    : posix.join(posix.dirname(sourcePath), normalizedTarget);
  return posix.normalize(repositoryTarget).replace(/^\.\//u, "");
}

function repositoryPathExists(
  context: RepositoryContext,
  path: string,
): boolean {
  const normalized = path.replace(/\/$/u, "");
  return (
    context.files.some(
      (file) => file.relativePath === normalized && !file.isIgnored,
    ) ||
    context.files.some(
      (file) =>
        file.relativePath.startsWith(`${normalized}/`) && !file.isIgnored,
    )
  );
}

function firstTextLine(
  context: RepositoryContext,
  path: string,
  predicate: (line: string) => boolean,
): number | undefined {
  const source = context.textCache.get(path);
  if (!source) return undefined;
  const index = source.split(/\r?\n/u).findIndex(predicate);
  return index >= 0 ? index + 1 : undefined;
}

function hasAnyFile(
  context: RepositoryContext,
  paths: readonly string[],
): boolean {
  return paths.some((path) => fileExists(context, path));
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KiB`;
}

function isLikelyGeneratedPath(path: string): boolean {
  return (
    /(^|\/)(dist|build|coverage|out|generated|\.next|storybook-static)(\/|$)/iu.test(
      path,
    ) || /\.map$/iu.test(path)
  );
}

export type { CustomRuleSpec } from "./custom.js";
export { loadCustomRules } from "./custom.js";
export type { NetworkLinkCheckOptions } from "./network.js";
export { runNetworkLinkChecks } from "./network.js";

export const rules: readonly RuleDefinition[] = [
  {
    id: "documentation.readme-exists",
    category: "documentation",
    title: "README exists",
    defaultSeverity: "warning",
    profiles: ["public", "portfolio", "npm-package"],
    run(context) {
      return fileExists(context, "README.md")
        ? []
        : [
            finding(this, context, {
              message: "README.md was not found at the repository root.",
              path: "README.md",
              remediation:
                "Add README.md with a project summary and a runnable Quick Start.",
            }),
          ];
    },
  },
  {
    id: "documentation.quickstart",
    category: "documentation",
    title: "README has a runnable Quick Start",
    defaultSeverity: "warning",
    profiles: ["public", "portfolio", "npm-package"],
    run(context) {
      const path = "README.md";
      const source = context.textCache.get(path) ?? "";
      const hasHeading =
        /(^|\n)#+\s*(quick\s*start|getting\s*started|installation|setup)\b/iu.test(
          source,
        );
      const hasCommand =
        /\b(?:npm|pnpm|yarn)\s+(?:install|add|run|dev|start|test|build)\b|\bnpx\s+\S+|\bnode\s+\S+/iu.test(
          source,
        );
      if (hasHeading && hasCommand) return [];
      return [
        finding(this, context, {
          message: "README does not contain a runnable Quick Start command.",
          path,
          line: firstTextLine(context, path, (line) => /^#/.test(line)) ?? 1,
          evidence:
            "No install/setup heading with a copy-paste command was detected.",
          remediation:
            "Add a Quick Start section with prerequisites, installation, and one run command.",
        }),
      ];
    },
  },
  {
    id: "documentation.description",
    category: "documentation",
    title: "README has a project description",
    defaultSeverity: "info",
    profiles: ["public", "portfolio", "npm-package"],
    run(context) {
      const source = context.textCache.get("README.md") ?? "";
      const lines = source
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter(Boolean);
      const hasMeaningfulDescription = lines
        .slice(1, 8)
        .some(
          (line) =>
            line.length >= 40 &&
            !line.startsWith("#") &&
            !line.startsWith("!["),
        );
      return hasMeaningfulDescription
        ? []
        : [
            finding(this, context, {
              message:
                "README does not have a clear project description near the top.",
              path: "README.md",
              remediation:
                "Describe the problem, primary capability, and intended user in one or two sentences.",
            }),
          ];
    },
  },
  {
    id: "gitignore.exists",
    category: "git",
    title: ".gitignore exists",
    defaultSeverity: "info",
    profiles: ["public", "portfolio", "npm-package"],
    run(context) {
      return fileExists(context, ".gitignore")
        ? []
        : [
            finding(this, context, {
              message: ".gitignore was not found.",
              path: ".gitignore",
              remediation:
                "Add relevant ignore patterns before committing generated files or local configuration.",
            }),
          ];
    },
  },
  {
    id: "security.env-file",
    category: "security",
    title: "Sensitive environment file",
    defaultSeverity: "error",
    profiles: ["public", "portfolio", "npm-package"],
    run(context) {
      const sensitive = context.files.filter(
        (file) =>
          /(^|\/)(\.env(?:\.[^./]+)?|[^/]+\.env)$/u.test(file.relativePath) &&
          !/(\.example|\.sample|\.template)$/u.test(file.relativePath),
      );
      return sensitive.map((file) =>
        finding(this, context, {
          severity: file.isTracked ? "error" : "warning",
          message: file.isTracked
            ? "Environment file is tracked by Git."
            : "Environment file exists in the repository workspace.",
          path: file.relativePath,
          evidence:
            "Sensitive environment filename matched. File content is not displayed.",
          remediation: file.isTracked
            ? "Remove the file from Git tracking, rotate exposed credentials, and add the pattern to .gitignore."
            : "Review the file and ensure it is ignored before committing.",
        }),
      );
    },
  },
  {
    id: "security.private-key",
    category: "security",
    title: "Private key material",
    defaultSeverity: "critical",
    profiles: ["public", "portfolio", "npm-package"],
    run(context) {
      const findings: Finding[] = [];
      for (const [path, source] of securityText(context).entries()) {
        const privateKeyPattern =
          /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----\s*(?:[A-Za-z0-9+/=]{20,}\s*)+-----END [A-Z0-9 ]*PRIVATE KEY-----/gu;
        for (const match of source.matchAll(privateKeyPattern)) {
          const matchIndex = match.index ?? 0;
          const line = source.slice(0, matchIndex).split(/\r?\n/u).length;
          findings.push(
            finding(this, context, {
              severity: "critical",
              path,
              line,
              message: "Private key material detected.",
              evidence: "Private-key material detected; key body redacted.",
              remediation:
                "Remove the key from the repository and Git history, rotate related credentials, and verify the ignore rule.",
            }),
          );
        }
      }
      return findings;
    },
  },
  {
    id: "security.credential-pattern",
    category: "security",
    title: "High-confidence credential pattern",
    defaultSeverity: "error",
    profiles: ["public", "portfolio", "npm-package"],
    run(context) {
      const findings: Finding[] = [];
      const credentialPattern =
        /\b(?:github_pat_|sk-proj-|sk_live_|rk_live_|ghp_|xoxb-|xoxp-|AIza|AKIA|ASIA|npm_|sk-)[A-Za-z0-9_-]{16,}/gu;
      const jwtPattern =
        /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/gu;
      const prefixes = [
        "github_pat_",
        "sk-proj-",
        "sk_live_",
        "rk_live_",
        "ghp_",
        "xoxb-",
        "xoxp-",
        "AIza",
        "AKIA",
        "ASIA",
        "npm_",
        "sk-",
        "eyJ",
      ] as const;
      for (const [path, source] of securityText(context).entries()) {
        for (const [lineIndex, sourceLine] of source
          .split(/\r?\n/u)
          .entries()) {
          const matches = [
            ...sourceLine.matchAll(credentialPattern),
            ...sourceLine.matchAll(jwtPattern),
          ].sort((left, right) => (left.index ?? 0) - (right.index ?? 0));
          for (const match of matches) {
            const value = match[0] ?? "credential";
            const prefix =
              prefixes.find((candidate) => value.startsWith(candidate)) ??
              "credential";
            findings.push(
              finding(this, context, {
                severity: "error",
                path,
                line: lineIndex + 1,
                message: "A high-confidence credential pattern was detected.",
                evidence: `${prefix}****[REDACTED] at column ${(match.index ?? 0) + 1}`,
                remediation:
                  "Revoke and rotate the credential, remove it from the repository, and review Git history.",
              }),
            );
          }
        }
      }
      return findings;
    },
  },
  {
    id: "package.lockfile-single",
    category: "package",
    title: "One package-manager lockfile",
    defaultSeverity: "warning",
    profiles: ["public", "portfolio", "npm-package"],
    run(context) {
      const lockfiles = context.files
        .filter((file) => !file.isIgnored)
        .map((file) => file.relativePath)
        .filter((path) =>
          [
            "package-lock.json",
            "pnpm-lock.yaml",
            "yarn.lock",
            "bun.lockb",
            "bun.lock",
          ].includes(path),
        );
      return lockfiles.length <= 1
        ? []
        : [
            finding(this, context, {
              message: "Multiple package-manager lockfiles were found.",
              evidence: lockfiles.join(", "),
              remediation:
                "Keep the lockfile used by the selected package manager and remove stale alternatives.",
            }),
          ];
    },
  },
  {
    id: "package.manifest-name",
    category: "package",
    title: "Package manifest name",
    defaultSeverity: "warning",
    profiles: ["npm-package"],
    run(context) {
      const source = context.textCache.get("package.json");
      if (!source) return [];
      try {
        const manifest = JSON.parse(source) as { name?: unknown };
        if (
          typeof manifest.name === "string" &&
          manifest.name.length > 0 &&
          /^[a-z0-9@][a-z0-9._\-/]*$/u.test(manifest.name)
        )
          return [];
      } catch {
        return [
          finding(this, context, {
            message: "package.json could not be parsed.",
            path: "package.json",
            remediation:
              "Fix package.json syntax before publishing the package.",
          }),
        ];
      }
      return [
        finding(this, context, {
          message: "package.json has an invalid or missing package name.",
          path: "package.json",
          remediation:
            "Use a valid package name and verify the intended publish scope.",
        }),
      ];
    },
  },
  {
    id: "community.license-present",
    category: "community",
    title: "Repository license is present",
    defaultSeverity: "warning",
    profiles: ["public", "npm-package"],
    run(context) {
      const present = [
        "LICENSE",
        "LICENSE.md",
        "LICENSE.txt",
        "COPYING",
        "COPYING.md",
      ].some((path) => fileExists(context, path));
      return present
        ? []
        : [
            finding(this, context, {
              message:
                "No recognizable repository license file was found at the project root.",
              remediation:
                "Decide whether the repository should be open source and add an appropriate license after review.",
            }),
          ];
    },
  },
  {
    id: "links.valid",
    category: "links",
    title: "Markdown links resolve",
    defaultSeverity: "warning",
    profiles: ["public", "portfolio", "npm-package"],
    run(context) {
      const findings: Finding[] = [];
      const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/gu;
      for (const [sourcePath, source] of context.textCache.entries()) {
        if (!sourcePath.toLowerCase().endsWith(".md")) continue;
        for (const match of source.matchAll(linkPattern)) {
          const target = match[1]?.trim().split(/\s+/u)[0] ?? "";
          if (!target || target.startsWith("#") || target.startsWith("mailto:"))
            continue;
          if (/^https?:\/\//iu.test(target)) {
            try {
              new URL(target);
            } catch {
              findings.push(
                finding(this, context, {
                  path: sourcePath,
                  message: "Markdown link has an invalid URL.",
                  evidence: target,
                  remediation:
                    "Replace the URL with a valid absolute URL or remove the link.",
                }),
              );
            }
            continue;
          }
          const normalized = resolveRepositoryReference(sourcePath, target);
          const exists = repositoryPathExists(context, normalized);
          if (!exists) {
            findings.push(
              finding(this, context, {
                path: sourcePath,
                message: "Markdown link points to a missing repository path.",
                evidence: target,
                remediation:
                  "Create the referenced file or update the link to a path that exists.",
              }),
            );
          }
        }
      }
      return findings;
    },
  },
  {
    id: "images.resolve",
    category: "links",
    title: "Markdown images resolve",
    defaultSeverity: "warning",
    profiles: ["public", "portfolio"],
    run(context) {
      const findings: Finding[] = [];
      const imagePattern = /!\[[^\]]*\]\(([^)]+)\)/gu;
      for (const [sourcePath, source] of context.textCache.entries()) {
        if (!sourcePath.toLowerCase().endsWith(".md")) continue;
        for (const match of source.matchAll(imagePattern)) {
          const target = match[1]?.trim().split(/\s+/u)[0] ?? "";
          if (
            !target ||
            /^https?:\/\//iu.test(target) ||
            target.startsWith("data:")
          )
            continue;
          const normalized = resolveRepositoryReference(sourcePath, target);
          if (!repositoryPathExists(context, normalized)) {
            findings.push(
              finding(this, context, {
                path: sourcePath,
                message: "Markdown image points to a missing repository asset.",
                evidence: target,
                remediation:
                  "Add the asset at the referenced path or update the image reference.",
              }),
            );
          }
        }
      }
      return findings;
    },
  },
  {
    id: "badges.resolve",
    category: "links",
    title: "Badges use valid URLs",
    defaultSeverity: "info",
    profiles: ["public", "portfolio", "npm-package"],
    run(context) {
      const findings: Finding[] = [];
      const imagePattern = /!\[[^\]]*\]\(([^)]+)\)/gu;
      for (const [path, source] of context.textCache.entries()) {
        if (!path.toLowerCase().endsWith(".md")) continue;
        for (const match of source.matchAll(imagePattern)) {
          const target = match[1]?.trim().split(/\s+/u)[0] ?? "";
          if (!/badge|shield|status/iu.test(target)) continue;
          if (!/^https?:\/\//iu.test(target)) {
            findings.push(
              finding(this, context, {
                severity: "warning",
                path,
                message: "Badge image does not use an absolute URL.",
                evidence: target,
                remediation:
                  "Use a valid HTTPS badge endpoint or remove the badge.",
              }),
            );
          }
        }
      }
      return findings;
    },
  },
  {
    id: "portfolio.demo-visible",
    category: "portfolio",
    title: "Portfolio demo is visible",
    defaultSeverity: "warning",
    profiles: ["portfolio"],
    run(context) {
      const readme = context.textCache.get("README.md") ?? "";
      const visible =
        /(^|\n)#+\s*(live\s+demo|demo|preview)\b/iu.test(readme) ||
        /https?:\/\/[^\s)]+/iu.test(readme) ||
        context.files.some(
          (file) =>
            !file.isIgnored &&
            /(^|\/)(demo|preview)(\/|\.|$)/iu.test(file.relativePath),
        );
      return visible
        ? []
        : [
            finding(this, context, {
              path: "README.md",
              message:
                "No visible demo, preview, or live URL was detected for the portfolio profile.",
              remediation:
                "Add a Demo or Preview section near the top of README.md.",
            }),
          ];
    },
  },
  {
    id: "community.contributing-guide",
    category: "community",
    title: "Contributor guide is present",
    defaultSeverity: "info",
    profiles: ["public", "portfolio", "npm-package"],
    run(context) {
      return hasAnyFile(context, [
        "CONTRIBUTING.md",
        ".github/CONTRIBUTING.md",
        "docs/CONTRIBUTING.md",
      ])
        ? []
        : [
            finding(this, context, {
              message: "No contributor guide was detected.",
              remediation:
                "Add CONTRIBUTING.md with setup, test, review, and pull request guidance.",
            }),
          ];
    },
  },
  {
    id: "community.code-of-conduct",
    category: "community",
    title: "Code of conduct is present",
    defaultSeverity: "info",
    profiles: ["public", "portfolio"],
    run(context) {
      return hasAnyFile(context, [
        "CODE_OF_CONDUCT.md",
        "CODE_OF_CONDUCT.txt",
        ".github/CODE_OF_CONDUCT.md",
        "docs/CODE_OF_CONDUCT.md",
      ])
        ? []
        : [
            finding(this, context, {
              message: "No code of conduct was detected.",
              remediation:
                "Add CODE_OF_CONDUCT.md with expected behavior and a private reporting path for community concerns.",
            }),
          ];
    },
  },
  {
    id: "git.large-file",
    category: "git",
    title: "Tracked files stay below the large-file threshold",
    defaultSeverity: "warning",
    profiles: ["public", "portfolio", "npm-package"],
    run(context) {
      const thresholdBytes = 5 * 1024 * 1024;
      return context.files
        .filter(
          (file) =>
            !file.isIgnored &&
            file.isTracked === true &&
            file.sizeBytes > thresholdBytes,
        )
        .map((file) =>
          finding(this, context, {
            path: file.relativePath,
            message:
              "A tracked file exceeds the 5 MiB repository hygiene threshold.",
            evidence: `${formatBytes(file.sizeBytes)} tracked file`,
            remediation:
              "Move large binaries to Git LFS or release storage, or document why the file must remain tracked.",
          }),
        );
    },
  },
  {
    id: "git.generated-tracked",
    category: "git",
    title: "Generated output is not tracked accidentally",
    defaultSeverity: "warning",
    profiles: ["public", "portfolio", "npm-package"],
    run(context) {
      return context.files
        .filter(
          (file) =>
            !file.isIgnored &&
            file.isTracked === true &&
            isLikelyGeneratedPath(file.relativePath),
        )
        .map((file) =>
          finding(this, context, {
            path: file.relativePath,
            message: "A generated-looking file is tracked by Git.",
            evidence: file.relativePath,
            remediation:
              "Confirm the artifact is intentionally versioned; otherwise ignore the generated path and remove it from Git tracking.",
          }),
        );
    },
  },
  {
    id: "branch.default",
    category: "git",
    title: "Default branch context is available",
    defaultSeverity: "info",
    profiles: ["public", "portfolio", "npm-package"],
    run(context) {
      if (!context.git?.available || context.git.currentBranch) return [];
      return [
        finding(this, context, {
          path: ".git/HEAD",
          message:
            "The repository is in a detached HEAD state, so the default branch cannot be inferred locally.",
          remediation:
            "Check out the intended working branch or provide branch context explicitly in CI.",
        }),
      ];
    },
  },
  {
    id: "community.issue-template",
    category: "community",
    title: "Issue template is available",
    defaultSeverity: "info",
    profiles: ["public"],
    run(context) {
      const present =
        fileExists(context, ".github/ISSUE_TEMPLATE.md") ||
        context.files.some(
          (file) =>
            !file.isIgnored &&
            file.relativePath.startsWith(".github/ISSUE_TEMPLATE/"),
        );
      return present
        ? []
        : [
            finding(this, context, {
              message: "No issue template was detected.",
              remediation:
                "Add an issue template when accepting public bug reports or feature requests.",
            }),
          ];
    },
  },
  {
    id: "ci.workflow-permissions",
    category: "ci",
    title: "Workflow permissions are explicit",
    defaultSeverity: "warning",
    profiles: ["public", "npm-package"],
    run(context) {
      const workflowPaths = context.files.filter(
        (file) =>
          !file.isIgnored &&
          /^\.github\/workflows\/[^/]+\.(yml|yaml)$/u.test(file.relativePath),
      );
      return workflowPaths.flatMap((file) => {
        const source = context.textCache.get(file.relativePath) ?? "";
        return /(^|\n)permissions\s*:/mu.test(source)
          ? []
          : [
              finding(this, context, {
                path: file.relativePath,
                message:
                  "Workflow does not declare an explicit permissions block.",
                remediation:
                  "Add least-privilege permissions at workflow or job scope.",
              }),
            ];
      });
    },
  },
];

const profileBase: Partial<Record<string, string>> = {
  academic: "public",
  "private-team": "public",
  "mobile-app": "public",
};

export function enabledRules(context: RepositoryContext): RuleDefinition[] {
  const baseProfile = profileBase[context.profile];
  return rules
    .filter(
      (rule) =>
        rule.profiles.includes(context.profile) ||
        (baseProfile ? rule.profiles.includes(baseProfile) : false),
    )
    .sort(
      (left, right) =>
        left.category.localeCompare(right.category) ||
        left.id.localeCompare(right.id),
    );
}

export function runRules(
  context: RepositoryContext,
  selectedRules = enabledRules(context),
): Finding[] {
  const findings: Finding[] = [];
  for (const rule of selectedRules) {
    const configured = context.config.rules[rule.id];
    if (configured === "off") continue;
    const result = rule
      .run(context)
      .map((item) => (configured ? { ...item, severity: configured } : item));
    findings.push(...result);
  }
  return normalizeFindings(findings);
}

export function safeAutofixes(
  context: RepositoryContext,
  findings: readonly Finding[],
): AutofixOperation[] {
  const operations: AutofixOperation[] = [];
  const missing = new Set(findings.map((finding) => finding.ruleId));
  if (missing.has("gitignore.exists") && !fileExists(context, ".gitignore")) {
    operations.push({
      ruleId: "gitignore.exists",
      path: ".gitignore",
      content: "node_modules/\ndist/\ncoverage/\n.reposentinel/\n",
      description:
        "Create a conservative starter .gitignore for local and generated files.",
    });
  }
  if (
    missing.has("community.contributing-guide") &&
    !hasAnyFile(context, [
      "CONTRIBUTING.md",
      ".github/CONTRIBUTING.md",
      "docs/CONTRIBUTING.md",
    ])
  ) {
    operations.push({
      ruleId: "community.contributing-guide",
      path: "CONTRIBUTING.md",
      content:
        "# Contributing\n\nDescribe local setup, tests, review expectations, and pull request requirements here.\n",
      description:
        "Create a minimal contributor-guide template for maintainer review.",
    });
  }
  if (
    missing.has("community.code-of-conduct") &&
    !hasAnyFile(context, [
      "CODE_OF_CONDUCT.md",
      "CODE_OF_CONDUCT.txt",
      ".github/CODE_OF_CONDUCT.md",
      "docs/CODE_OF_CONDUCT.md",
    ])
  ) {
    operations.push({
      ruleId: "community.code-of-conduct",
      path: "CODE_OF_CONDUCT.md",
      content:
        "# Code of Conduct\n\nDefine expected behavior, unacceptable conduct, and a private reporting path here.\n",
      description:
        "Create a minimal code-of-conduct template for maintainer review.",
    });
  }
  return operations;
}
