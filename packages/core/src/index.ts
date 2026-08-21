export const severityOrder = ["critical", "error", "warning", "info"] as const;

export type Severity = (typeof severityOrder)[number];
export type RuleCategory =
  | "documentation"
  | "links"
  | "security"
  | "package"
  | "git"
  | "community"
  | "ci"
  | "portfolio"
  | "custom";
export type RepositoryProfile = "public" | "portfolio" | "npm-package" | "academic" | "private-team" | "mobile-app";
export type ExitThreshold = Severity;
export type ReportFormat = "terminal" | "markdown" | "json" | "sarif" | "html";
export type FileKind = "text" | "binary" | "symlink" | "directory";

export type Finding = {
  ruleId: string;
  category: RuleCategory;
  severity: Severity;
  message: string;
  path?: string;
  line?: number;
  column?: number;
  evidence?: string;
  remediation: string;
  docsUrl?: string;
  fingerprint?: string;
  metadata?: Record<string, string | number | boolean>;
};

export type RepositoryFile = {
  relativePath: string;
  absolutePath: string;
  kind: FileKind;
  sizeBytes: number;
  isIgnored: boolean;
  isTracked?: boolean;
};

export type GitMetadata = {
  available: boolean;
  currentBranch?: string;
  defaultBranch?: string;
};

export type RepositoryContext = {
  root: string;
  profile: RepositoryProfile;
  files: readonly RepositoryFile[];
  textCache: ReadonlyMap<string, string>;
  config: ResolvedConfig;
  git?: GitMetadata;
};

export type ResolvedConfig = {
  profile: RepositoryProfile;
  baseline?: string;
  customRules?: string;
  report?: {
    formats: readonly ReportFormat[];
    outputDir?: string;
  };
  ignore: readonly string[];
  rules: Readonly<Record<string, Severity | "off">>;
  ciFailOn: ExitThreshold;
  security: {
    network: boolean;
    scanHistory: boolean;
    redactFindings: boolean;
  };
};

export type ScoreStatus = "ready" | "almost-ready" | "needs-attention" | "not-ready";

export type ScanSummary = {
  score: number;
  status: ScoreStatus;
  counts: Record<Severity, number>;
  exitCode: 0 | 1;
};

const severityRank: Record<Severity, number> = {
  critical: 4,
  error: 3,
  warning: 2,
  info: 1
};

const scorePenalty: Record<Severity, number> = {
  critical: 35,
  error: 18,
  warning: 5,
  info: 1
};

export function compareFindings(left: Finding, right: Finding): number {
  const severityDifference = severityRank[right.severity] - severityRank[left.severity];
  if (severityDifference !== 0) return severityDifference;
  const pathDifference = (left.path ?? "").localeCompare(right.path ?? "");
  if (pathDifference !== 0) return pathDifference;
  const lineDifference = (left.line ?? 0) - (right.line ?? 0);
  if (lineDifference !== 0) return lineDifference;
  return left.ruleId.localeCompare(right.ruleId);
}

export function normalizeFindings(findings: readonly Finding[]): Finding[] {
  return [...findings].sort(compareFindings);
}

export function scoreFindings(findings: readonly Finding[]): number {
  const penalty = findings.reduce((total, finding) => total + scorePenalty[finding.severity], 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

export function statusForScore(score: number): ScoreStatus {
  if (score >= 90) return "ready";
  if (score >= 75) return "almost-ready";
  if (score >= 50) return "needs-attention";
  return "not-ready";
}

export function countsForFindings(findings: readonly Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { critical: 0, error: 0, warning: 0, info: 0 };
  for (const finding of findings) counts[finding.severity] += 1;
  return counts;
}

export function thresholdRank(threshold: ExitThreshold): number {
  return severityRank[threshold];
}

export function exitCodeForFindings(findings: readonly Finding[], threshold: ExitThreshold): 0 | 1 {
  const minimumRank = thresholdRank(threshold);
  return findings.some((finding) => severityRank[finding.severity] >= minimumRank) ? 1 : 0;
}

export function summarizeFindings(findings: readonly Finding[], threshold: ExitThreshold): ScanSummary {
  const score = scoreFindings(findings);
  return {
    score,
    status: statusForScore(score),
    counts: countsForFindings(findings),
    exitCode: exitCodeForFindings(findings, threshold)
  };
}

export function redactSensitiveValue(value: string): string {
  if (value.length === 0) return value;
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/u.test(value)) {
    return value.replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*/u, "[REDACTED PRIVATE KEY]");
  }
  if (/\b(?:ghp_|github_pat_|xoxb-|xoxp-|AKIA|ASIA)[A-Za-z0-9_\-]{8,}/u.test(value)) {
    return value.replace(/\b(ghp_|github_pat_|xoxb-|xoxp-|AKIA|ASIA)[A-Za-z0-9_\-]{8,}/gu, "$1****[REDACTED]");
  }
  return "[REDACTED]";
}

export function fingerprintFor(ruleId: string, path = "", line = 0): string {
  return `${ruleId}:${path}:${line}`;
}

export { createRepositoryContext, discoverRepository, readChangedPaths } from "./discovery.js";
export type { ChangedFilesResult, DiscoveryOptions, DiscoveryResult } from "./discovery.js";

export { createBaselineDocument, filterBaselineFindings, loadBaseline, writeBaseline, BASELINE_SCHEMA } from "./baseline.js";
