import {
  fingerprintFor,
  normalizeFindings,
  redactSensitiveValue,
  type Finding,
  type RepositoryContext,
  type RuleCategory,
  type Severity
} from "@reposentinel/core";

export type RuleDefinition = {
  id: string;
  category: RuleCategory;
  title: string;
  defaultSeverity: Severity;
  profiles: readonly string[];
  run(context: RepositoryContext): Finding[];
};

function finding(
  rule: RuleDefinition,
  context: RepositoryContext,
  input: Omit<Finding, "ruleId" | "category" | "severity" | "fingerprint"> & { severity?: Severity }
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
    docsUrl: `https://docs.reposentinel.dev/rules/${rule.id}`
  };
}

function fileExists(context: RepositoryContext, path: string): boolean {
  return context.files.some((file) => file.relativePath === path && file.kind !== "directory");
}

function firstTextLine(context: RepositoryContext, path: string, predicate: (line: string) => boolean): number | undefined {
  const source = context.textCache.get(path);
  if (!source) return undefined;
  const index = source.split(/\r?\n/u).findIndex(predicate);
  return index >= 0 ? index + 1 : undefined;
}

function isSafeExamplePath(path: string): boolean {
  return path.startsWith("docs/") || path.startsWith("fixtures/") || /(^|[./_-])(test|spec)([./_-]|$)/iu.test(path) || path.toLowerCase().includes("readme");
}

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
        : [finding(this, context, {
            message: "README.md was not found at the repository root.",
            path: "README.md",
            remediation: "Add README.md with a project summary and a runnable Quick Start."
          })];
    }
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
      const hasHeading = /(^|\n)#+\s*(quick\s*start|getting\s*started|installation|setup)\b/iu.test(source);
      const hasCommand = /\b(?:npm|pnpm|yarn)\s+(?:install|add|run|dev|start|test|build)\b|\bnpx\s+\S+|\bnode\s+\S+/iu.test(source);
      if (hasHeading && hasCommand) return [];
      return [finding(this, context, {
        message: "README does not contain a runnable Quick Start command.",
        path,
        line: firstTextLine(context, path, (line) => /^#/.test(line)) ?? 1,
        evidence: "No install/setup heading with a copy-paste command was detected.",
        remediation: "Add a Quick Start section with prerequisites, installation, and one run command."
      })];
    }
  },
  {
    id: "documentation.description",
    category: "documentation",
    title: "README has a project description",
    defaultSeverity: "info",
    profiles: ["public", "portfolio", "npm-package"],
    run(context) {
      const source = context.textCache.get("README.md") ?? "";
      const lines = source.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
      const hasMeaningfulDescription = lines.slice(1, 8).some((line) => line.length >= 40 && !line.startsWith("#") && !line.startsWith("!["));
      return hasMeaningfulDescription
        ? []
        : [finding(this, context, {
            message: "README does not have a clear project description near the top.",
            path: "README.md",
            remediation: "Describe the problem, primary capability, and intended user in one or two sentences."
          })];
    }
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
        : [finding(this, context, {
            message: ".gitignore was not found.",
            path: ".gitignore",
            remediation: "Add relevant ignore patterns before committing generated files or local configuration."
          })];
    }
  },
  {
    id: "security.env-file",
    category: "security",
    title: "Sensitive environment file",
    defaultSeverity: "error",
    profiles: ["public", "portfolio", "npm-package"],
    run(context) {
      const sensitive = context.files.filter((file) => /(^|\/)(\.env(?:\.[^.\/]+)?|[^/]+\.env)$/u.test(file.relativePath) && !/(\.example|\.sample|\.template)$/u.test(file.relativePath));
      return sensitive.map((file) => finding(this, context, {
        severity: file.isTracked ? "error" : "warning",
        message: file.isTracked ? "Environment file is tracked by Git." : "Environment file exists in the repository workspace.",
        path: file.relativePath,
        evidence: "Sensitive environment filename matched. File content is not displayed.",
        remediation: file.isTracked
          ? "Remove the file from Git tracking, rotate exposed credentials, and add the pattern to .gitignore."
          : "Review the file and ensure it is ignored before committing."
      }));
    }
  },
  {
    id: "security.private-key",
    category: "security",
    title: "Private key material",
    defaultSeverity: "critical",
    profiles: ["public", "portfolio", "npm-package"],
    run(context) {
      const findings: Finding[] = [];
      for (const [path, source] of context.textCache.entries()) {
        if (isSafeExamplePath(path)) continue;
        const match = source.match(/-----BEGIN [A-Z ]*PRIVATE KEY-----\s*[A-Za-z0-9+/=]{20,}\s*-----END [A-Z ]*PRIVATE KEY-----/u);
        if (!match) continue;
        const lineNumber = firstTextLine(context, path, (line) => line.includes("BEGIN") && line.includes("PRIVATE KEY"));
        findings.push(finding(this, context, {
          severity: "critical",
          path,
          ...(lineNumber === undefined ? {} : { line: lineNumber }),
          message: "Private key material detected.",
          evidence: redactSensitiveValue(match[0].split(/\r?\n/u)[0] ?? "private key"),
          remediation: "Remove the key from the repository and Git history, rotate related credentials, and verify the ignore rule."
        }));
      }
      return findings;
    }
  },
  {
    id: "security.credential-pattern",
    category: "security",
    title: "High-confidence credential pattern",
    defaultSeverity: "error",
    profiles: ["public", "portfolio", "npm-package"],
    run(context) {
      const findings: Finding[] = [];
      const pattern = /\b(?:ghp_|github_pat_|xoxb-|xoxp-|AKIA|ASIA)[A-Za-z0-9_\-]{8,}/u;
      for (const [path, source] of context.textCache.entries()) {
        if (isSafeExamplePath(path)) continue;
        const line = source.split(/\r?\n/u).findIndex((value) => pattern.test(value));
        if (line < 0) continue;
        const raw = source.split(/\r?\n/u)[line] ?? "";
        findings.push(finding(this, context, {
          severity: "error",
          path,
          line: line + 1,
          message: "A high-confidence credential pattern was detected.",
          evidence: redactSensitiveValue(raw),
          remediation: "Revoke and rotate the credential, remove it from the repository, and review Git history."
        }));
      }
      return findings;
    }
  },
  {
    id: "package.lockfile-single",
    category: "package",
    title: "One package-manager lockfile",
    defaultSeverity: "warning",
    profiles: ["public", "portfolio", "npm-package"],
    run(context) {
      const lockfiles = context.files.map((file) => file.relativePath).filter((path) => ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb", "bun.lock"].includes(path));
      return lockfiles.length <= 1
        ? []
        : [finding(this, context, {
            message: "Multiple package-manager lockfiles were found.",
            evidence: lockfiles.join(", "),
            remediation: "Keep the lockfile used by the selected package manager and remove stale alternatives."
          })];
    }
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
        if (typeof manifest.name === "string" && manifest.name.length > 0 && /^[a-z0-9@][a-z0-9._\-/]*$/u.test(manifest.name)) return [];
      } catch {
        return [finding(this, context, {
          message: "package.json could not be parsed.",
          path: "package.json",
          remediation: "Fix package.json syntax before publishing the package."
        })];
      }
      return [finding(this, context, {
        message: "package.json has an invalid or missing package name.",
        path: "package.json",
        remediation: "Use a valid package name and verify the intended publish scope."
      })];
    }
  },
  {
    id: "community.license-present",
    category: "community",
    title: "Repository license is present",
    defaultSeverity: "warning",
    profiles: ["public", "npm-package"],
    run(context) {
      const present = ["LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING", "COPYING.md"].some((path) => fileExists(context, path));
      return present
        ? []
        : [finding(this, context, {
            message: "No recognizable repository license file was found at the project root.",
            remediation: "Decide whether the repository should be open source and add an appropriate license after review."
          })];
    }
  }
];

export function enabledRules(context: RepositoryContext): RuleDefinition[] {
  return rules
    .filter((rule) => rule.profiles.includes(context.profile))
    .sort((left, right) => left.category.localeCompare(right.category) || left.id.localeCompare(right.id));
}

export function runRules(context: RepositoryContext, selectedRules = enabledRules(context)): Finding[] {
  const findings: Finding[] = [];
  for (const rule of selectedRules) {
    const configured = context.config.rules[rule.id];
    if (configured === "off") continue;
    const result = rule.run(context).map((item) => configured ? { ...item, severity: configured } : item);
    findings.push(...result);
  }
  return normalizeFindings(findings);
}
