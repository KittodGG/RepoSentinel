import { posix } from "node:path";
import {
  EMPTY_TARGET_RULE_ID,
  type Finding,
  fingerprintFor,
  normalizeFindings,
  type RepositoryContext,
  type RuleCategory,
  type Severity,
} from "@reposentinel/core";
import { parse } from "yaml";

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

const canonicalPaths = new Set([
  "readme.md",
  "license",
  "license.md",
  "license.txt",
  ".gitignore",
  "contributing.md",
  "code_of_conduct.md",
  "security.md",
  "package.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "package-lock.json",
]);

function matchesCanonicalPath(actual: string, expected: string): boolean {
  if (actual === expected) return true;
  return (
    canonicalPaths.has(expected.toLowerCase()) &&
    actual.toLowerCase() === expected.toLowerCase()
  );
}

function fileExists(context: RepositoryContext, path: string): boolean {
  return context.files.some(
    (file) =>
      matchesCanonicalPath(file.relativePath, path) &&
      file.kind !== "directory" &&
      !file.isIgnored,
  );
}

function textForCanonicalPath(
  context: RepositoryContext,
  path: string,
): string | undefined {
  const exact = context.textCache.get(path);
  if (exact !== undefined) return exact;
  const file = context.files.find(
    (candidate) =>
      matchesCanonicalPath(candidate.relativePath, path) &&
      !candidate.isIgnored &&
      context.textCache.has(candidate.relativePath),
  );
  return file ? context.textCache.get(file.relativePath) : undefined;
}

function actualCanonicalPath(context: RepositoryContext, path: string): string {
  return (
    context.files.find(
      (file) =>
        matchesCanonicalPath(file.relativePath, path) && !file.isIgnored,
    )?.relativePath ?? path
  );
}

function maskMarkdownCode(source: string): string {
  const fenced = source.replace(
    /^ {0,3}(```|~~~)[\s\S]*?^ {0,3}\1[^\n]*$/gmu,
    (match) => match.replace(/[^\n]/gu, " "),
  );
  return fenced.replace(/`[^`\n]*`/gu, (match) => " ".repeat(match.length));
}

function markdownDestination(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("<")) {
    const closing = trimmed.indexOf(">");
    return closing > 0 ? trimmed.slice(1, closing) : "";
  }
  return trimmed.split(/\s+/u)[0] ?? "";
}

function hasPullRequestTargetTrigger(source: string): boolean {
  try {
    const document = parse(source) as JsonRecord | null;
    const trigger = document?.on ?? document?.true;
    if (trigger === "pull_request_target") return true;
    if (Array.isArray(trigger)) return trigger.includes("pull_request_target");
    return (
      typeof trigger === "object" &&
      trigger !== null &&
      Object.hasOwn(trigger, "pull_request_target")
    );
  } catch {
    return false;
  }
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
  const source =
    context.textCache.get(path) ?? textForCanonicalPath(context, path);
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

type JsonRecord = Record<string, unknown>;

type PackageManifestEntry = {
  path: string;
  source: string;
  data: JsonRecord | undefined;
};

function containsDistReference(value: unknown): boolean {
  if (typeof value === "string") {
    const normalized = value.replace(/^\.\//u, "");
    return normalized === "dist" || normalized.startsWith("dist/");
  }
  if (Array.isArray(value)) return value.some(containsDistReference);
  if (typeof value === "object" && value !== null)
    return Object.values(value).some(containsDistReference);
  return false;
}

const connectionPlaceholderPattern =
  /\$\{|\{\{|<[a-z_]+>|%[sd]|\*{2,}|\bYOUR_|\bxxx/iu;
const genericConnectionUserPattern =
  /^(?:user|username|admin|root|login|name)$/iu;
const genericConnectionPasswordPattern =
  /^(?:pass|password|passwd|secret|token|changeme|hunter2)$/iu;

function isInsideBacktick(source: string, index: number): boolean {
  let backticks = 0;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (source[cursor] === "`") backticks += 1;
  }
  return backticks % 2 === 1;
}

function isRealConnectionString(raw: string): boolean {
  if (connectionPlaceholderPattern.test(raw)) return false;
  const credentials = raw.match(
    /^[a-z][a-z0-9+.-]*:\/\/([^:@\s]+):([^@\s]+)@/iu,
  );
  if (!credentials) return false;
  const user = credentials[1] ?? "";
  const password = credentials[2] ?? "";
  if (password.length < 6) return false;
  return !(
    genericConnectionUserPattern.test(user) &&
    genericConnectionPasswordPattern.test(password)
  );
}

function isPlausibleJwt(token: string): boolean {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return false;
  if (
    !/^[A-Za-z0-9_-]{8,}$/u.test(header) ||
    !/^[A-Za-z0-9_-]{8,}$/u.test(payload) ||
    !/^[A-Za-z0-9_-]{20,}$/u.test(signature)
  )
    return false;
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(header, "base64url").toString("utf8"),
    );
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      "alg" in parsed &&
      typeof parsed.alg === "string" &&
      /^(?:HS|RS|ES|PS)(?:256|384|512)$/u.test(parsed.alg)
    );
  } catch {
    return false;
  }
}

/**
 * Directory segments that mark a test or fixture tree, across ecosystems.
 */
const FIXTURE_DIRECTORY =
  /(?:^|\/)(?:test|tests|testdata|spec|specs|fixtures?|examples?|__tests__|__fixtures__|__mocks__|e2e|benches?|benchmarks?)(?:\/|$)/iu;

/**
 * Filename conventions that mark a single test file. Directory names alone miss
 * the dominant per-file conventions — `a.test.ts` in JS/TS, `a_test.go` in Go,
 * `test_a.py` in Python — which would otherwise report synthetic fixture
 * credentials at full severity.
 */
const FIXTURE_FILENAME =
  /(?:^|\/)(?:test_[^/]+|[^/]+_test|[^/]+\.(?:test|spec|fixture|bench)|conftest)\.[a-z0-9]+$/iu;

function isLikelyFixturePath(path: string): boolean {
  return FIXTURE_DIRECTORY.test(path) || FIXTURE_FILENAME.test(path);
}

function isLikelyTestCertificatePath(path: string): boolean {
  const normalized = path.toLowerCase();
  const explicitFixture =
    /(?:^|\/)(?:testdata|tests\/certs|fixtures\/certs|__fixtures__)(?:\/|$)/u.test(
      normalized,
    );
  const segments = normalized.split("/");
  const hasTestSegment = segments.some((segment) => segment.includes("test"));
  const hasCertificateSegment = segments.some((segment) =>
    segment.includes("cert"),
  );
  return explicitFixture || (hasTestSegment && hasCertificateSegment);
}

function packageHasApplicationSignals(data: JsonRecord) {
  if (typeof data.packageManager === "string") return true;
  if (data.workspaces !== undefined) return true;
  const scripts = data.scripts;
  return (
    typeof scripts === "object" &&
    scripts !== null &&
    Object.keys(scripts).some((name) =>
      ["build", "dev", "start", "serve"].includes(name),
    )
  );
}

function packageManifestEntries(
  context: RepositoryContext,
): PackageManifestEntry[] {
  return context.files
    .filter(
      (file) =>
        !file.isIgnored &&
        file.relativePath.toLowerCase().endsWith("package.json") &&
        context.textCache.has(file.relativePath),
    )
    .map((file) => {
      const source = context.textCache.get(file.relativePath) ?? "";
      try {
        const parsed: unknown = JSON.parse(source);
        return {
          path: file.relativePath,
          source,
          data:
            typeof parsed === "object" &&
            parsed !== null &&
            !Array.isArray(parsed)
              ? (parsed as JsonRecord)
              : undefined,
        };
      } catch {
        return { path: file.relativePath, source, data: undefined };
      }
    });
}

function workflowFiles(context: RepositoryContext): Array<{
  path: string;
  source: string;
}> {
  return context.files
    .filter(
      (file) =>
        !file.isIgnored &&
        /^\.github\/workflows\/[^/]+\.(yml|yaml)$/u.test(file.relativePath),
    )
    .map((file) => ({
      path: file.relativePath,
      source: context.textCache.get(file.relativePath) ?? "",
    }));
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
      const path = actualCanonicalPath(context, "README.md");
      const source = textForCanonicalPath(context, "README.md") ?? "";
      const hasHeading =
        /(^|\n)#+\s*(quick\s*start|getting\s*started|install(?:ation)?|setup|usage)\b/iu.test(
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
      const path = actualCanonicalPath(context, "README.md");
      const source = textForCanonicalPath(context, "README.md") ?? "";
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
              path,
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
          /-----BEGIN (?:[A-Z0-9 ]*PRIVATE KEY|PGP PRIVATE KEY BLOCK)-----\s*(?:[A-Za-z0-9+/=]{20,}\s*)+-----END (?:[A-Z0-9 ]*PRIVATE KEY|PGP PRIVATE KEY BLOCK)-----/gu;
        for (const match of source.matchAll(privateKeyPattern)) {
          const matchIndex = match.index ?? 0;
          const line = source.slice(0, matchIndex).split(/\r?\n/u).length;
          const testCertificate = isLikelyTestCertificatePath(path);
          findings.push(
            finding(this, context, {
              severity: testCertificate ? "info" : "critical",
              path,
              line,
              message: testCertificate
                ? "Private key material detected in a test-certificate fixture."
                : "Private key material detected.",
              evidence: testCertificate
                ? "Test-certificate private-key material detected; key body redacted."
                : "Private-key material detected; key body redacted.",
              remediation: testCertificate
                ? "Confirm this is a disposable test certificate, keep it non-production, and rotate or remove it if it was ever used outside tests."
                : "Remove the key from the repository and Git history, rotate related credentials, and verify the ignore rule.",
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
      const extendedCredentialPatterns = [
        {
          pattern:
            /\bhooks\.slack\.com\/services\/T[A-Z0-9]{6,}\/B[A-Z0-9]{6,}\/[A-Za-z0-9_-]{16,}/giu,
          prefix: "hooks.slack.com/services/",
        },
        {
          pattern:
            /\b(?:postgres|postgresql|mongodb(?:\+srv)?|mysql|mariadb|redis):\/\/[^\s"'`<>]{8,200}/giu,
          prefix: "connection-string://",
        },
      ] as const;
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
        "hooks.slack.com/services/",
        "postgres://",
        "postgresql://",
        "mongodb://",
        "mongodb+srv://",
        "mysql://",
        "mariadb://",
        "redis://",
      ] as const;
      for (const [path, source] of securityText(context).entries()) {
        for (const [lineIndex, sourceLine] of source
          .split(/\r?\n/u)
          .entries()) {
          const matches = [
            ...sourceLine.matchAll(credentialPattern),
            ...[...sourceLine.matchAll(jwtPattern)].filter((match) =>
              isPlausibleJwt(match[0] ?? ""),
            ),
            ...extendedCredentialPatterns.flatMap(({ pattern, prefix }) =>
              [...sourceLine.matchAll(pattern)]
                .filter((match) => {
                  if (prefix !== "connection-string://") return true;
                  const value = match[0] ?? "";
                  return (
                    !isInsideBacktick(sourceLine, match.index ?? 0) &&
                    isRealConnectionString(value)
                  );
                })
                .map((match) => ({ ...match, extendedPrefix: prefix })),
            ),
          ].sort((left, right) => (left.index ?? 0) - (right.index ?? 0));
          for (const match of matches) {
            const value = match[0] ?? "credential";
            const prefix =
              ("extendedPrefix" in match ? match.extendedPrefix : undefined) ??
              prefixes.find((candidate) => value.startsWith(candidate)) ??
              "credential";
            findings.push(
              finding(this, context, {
                // Fixture paths win over credential family: a connection
                // string in a test file is no more exposed than a token in the
                // same file, and checking the family first left the two at
                // different severities.
                severity: isLikelyFixturePath(path)
                  ? "info"
                  : prefix === "connection-string://"
                    ? "warning"
                    : "error",
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
    id: "package.manifest-exports",
    category: "package",
    title: "Publishable package exposes an entrypoint",
    defaultSeverity: "warning",
    profiles: ["public", "npm-package"],
    run(context) {
      return packageManifestEntries(context).flatMap((entry) => {
        if (!entry.data || entry.data.private === true) return [];
        const hasExports = entry.data.exports !== undefined;
        const hasEntrypoint =
          typeof entry.data.main === "string" ||
          (typeof entry.data.bin === "object" && entry.data.bin !== null);
        return hasExports || hasEntrypoint
          ? []
          : [
              finding(this, context, {
                path: entry.path,
                message:
                  "Publishable package.json does not define an exports or executable entrypoint.",
                remediation:
                  "Add an explicit exports map or a documented main/bin entrypoint before publishing.",
              }),
            ];
      });
    },
  },
  {
    id: "package.manifest-files",
    category: "package",
    title: "Publishable package allowlists build output",
    defaultSeverity: "warning",
    profiles: ["public", "npm-package"],
    run(context) {
      return packageManifestEntries(context).flatMap((entry) => {
        if (!entry.data || entry.data.private === true) return [];
        const files = entry.data.files;
        const includesDist =
          Array.isArray(files) &&
          files.some(
            (item) =>
              typeof item === "string" &&
              (item === "dist" || item.startsWith("dist/")),
          );
        const expectsDist =
          containsDistReference(entry.data.exports) ||
          containsDistReference(entry.data.main) ||
          containsDistReference(entry.data.bin);
        return !expectsDist || includesDist
          ? []
          : [
              finding(this, context, {
                path: entry.path,
                message:
                  "Publishable package.json does not allowlist its dist output.",
                evidence:
                  "a public entrypoint references dist but files does not include dist",
                remediation:
                  "Add dist to the package files allowlist or change the public entrypoint to the actual published build output.",
              }),
            ];
      });
    },
  },
  {
    id: "package.manifest-engines",
    category: "package",
    title: "Publishable package engine requirement is consistent",
    defaultSeverity: "warning",
    profiles: ["public", "npm-package"],
    run(context) {
      const root = packageManifestEntries(context).find((entry) =>
        matchesCanonicalPath(entry.path, "package.json"),
      );
      const rootNode =
        typeof root?.data?.engines === "object" && root.data.engines !== null
          ? (root.data.engines as JsonRecord).node
          : undefined;
      if (typeof rootNode !== "string") return [];
      return packageManifestEntries(context).flatMap((entry) => {
        if (!entry.data || entry.data.private === true) return [];
        const engines = entry.data.engines;
        const node =
          typeof engines === "object" && engines !== null
            ? (engines as JsonRecord).node
            : undefined;
        return node === rootNode
          ? []
          : [
              finding(this, context, {
                path: entry.path,
                message:
                  "Publishable package.json has a Node.js engine range inconsistent with the workspace root.",
                evidence: `root ${String(rootNode)}; package ${typeof node === "string" ? node : "missing"}`,
                remediation: `Set engines.node to ${rootNode} or document why the package intentionally targets a different runtime.`,
              }),
            ];
      });
    },
  },
  {
    id: "package.lockfile-sync",
    category: "package",
    title: "Package manifests have matching lockfile importers",
    defaultSeverity: "warning",
    profiles: ["public", "npm-package"],
    run(context) {
      const entries = packageManifestEntries(context);
      const root = entries.find((entry) =>
        matchesCanonicalPath(entry.path, "package.json"),
      );
      if (!root?.data) return [];
      const manager = root.data.packageManager;
      const lockfile =
        typeof manager === "string" && manager.startsWith("pnpm@")
          ? "pnpm-lock.yaml"
          : typeof manager === "string" && manager.startsWith("yarn@")
            ? "yarn.lock"
            : "package-lock.json";
      const lockSource = textForCanonicalPath(context, lockfile);
      if (!lockSource) {
        if (!packageHasApplicationSignals(root.data)) return [];
        return [
          finding(this, context, {
            path: lockfile,
            message: `The declared package manager is missing ${lockfile}.`,
            remediation:
              "Regenerate and commit the lockfile with the declared package manager before publishing or enabling CI installs.",
          }),
        ];
      }
      if (lockfile !== "pnpm-lock.yaml") return [];
      const findings: Finding[] = [];
      for (const entry of entries) {
        if (!entry.path.startsWith("packages/")) continue;
        const importer = entry.path.slice(0, -"/package.json".length);
        if (!lockSource.includes(`  ${importer}:`)) {
          findings.push(
            finding(this, context, {
              path: entry.path,
              message:
                "Workspace package is missing from pnpm-lock.yaml importers.",
              evidence: importer,
              remediation:
                "Run pnpm install with the intended workspace package manifests and commit the updated lockfile.",
            }),
          );
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
      const manifestPath = actualCanonicalPath(context, "package.json");
      const source = textForCanonicalPath(context, "package.json");
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
            path: manifestPath,
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
      const present = context.files.some(
        (file) =>
          !file.isIgnored &&
          !file.relativePath.includes("/") &&
          /^(?:LICEN[CS]E|COPYING)(?:[.\-_][\w.-]+)?$/iu.test(
            file.relativePath,
          ),
      );
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
      const linkPattern = /!?\[[^\]]*\]\(([^)\n]+)\)/gu;
      for (const [sourcePath, source] of context.textCache.entries()) {
        if (!sourcePath.toLowerCase().endsWith(".md")) continue;
        const scanSource = maskMarkdownCode(source);
        for (const match of scanSource.matchAll(linkPattern)) {
          const target = markdownDestination(match[1] ?? "");
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
          if (target.startsWith("/")) continue;
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
      const imagePattern = /!\[[^\]]*\]\(([^)\n]+)\)/gu;
      for (const [sourcePath, source] of context.textCache.entries()) {
        if (!sourcePath.toLowerCase().endsWith(".md")) continue;
        const scanSource = maskMarkdownCode(source);
        for (const match of scanSource.matchAll(imagePattern)) {
          const target = markdownDestination(match[1] ?? "");
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
      const readme = textForCanonicalPath(context, "README.md") ?? "";
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
    id: "ci.action-sha-pinned",
    category: "ci",
    title: "Third-party workflow actions are pinned",
    defaultSeverity: "warning",
    profiles: ["public", "npm-package"],
    run(context) {
      const pinPattern = /^\s*(?:-\s*)?uses:\s*([^\s#]+)@([^\s#]+)/u;
      return workflowFiles(context).flatMap(({ path, source }) =>
        source.split(/\r?\n/u).flatMap((line, index) => {
          const match = line.match(pinPattern);
          const reference = match?.[2] ?? "";
          if (
            !match ||
            match[1]?.startsWith("./") ||
            reference.match(/^[a-f0-9]{40}$/iu)
          )
            return [];
          return [
            finding(this, context, {
              path,
              line: index + 1,
              message: "Workflow action is not pinned to a full commit SHA.",
              evidence: match[1] ?? "unknown action",
              remediation:
                "Pin third-party actions to a verified 40-character commit SHA and keep the version in a comment.",
            }),
          ];
        }),
      );
    },
  },
  {
    id: "ci.pull-request-target-safety",
    category: "ci",
    title: "pull_request_target does not execute unchecked pull-request code",
    defaultSeverity: "critical",
    profiles: ["public", "npm-package"],
    run(context) {
      return workflowFiles(context).flatMap(({ path, source }) => {
        const hasTargetTrigger = hasPullRequestTargetTrigger(source);
        const checksOutPullRequestCode =
          /uses:\s*actions\/checkout@[^\s]+[\s\S]{0,500}ref:\s*\$\{\{[^}]*pull_request/iu.test(
            source,
          );
        return hasTargetTrigger && checksOutPullRequestCode
          ? [
              finding(this, context, {
                path,
                message:
                  "pull_request_target checks out pull-request code in a privileged workflow.",
                remediation:
                  "Avoid checking out or executing untrusted pull-request code from pull_request_target; use pull_request or a trusted, reviewable workflow boundary.",
              }),
            ]
          : [];
      });
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
  // Presence rules would otherwise report a missing README, license, and
  // contributor guide for a target that holds no files at all, producing a
  // readiness score for something there is nothing to be ready about.
  const scannable = context.files.filter(
    (file) => !file.isIgnored && file.kind !== "directory",
  );
  if (scannable.length === 0) {
    return [
      {
        ruleId: EMPTY_TARGET_RULE_ID,
        category: "ci",
        severity: "info",
        message:
          "No scannable files were found, so repository readiness cannot be assessed.",
        remediation:
          "Point the scan at a repository with tracked files, or relax the configured ignore patterns.",
        fingerprint: fingerprintFor(EMPTY_TARGET_RULE_ID),
      },
    ];
  }

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
