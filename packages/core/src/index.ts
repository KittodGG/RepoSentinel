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
export type RepositoryProfile =
  | "public"
  | "portfolio"
  | "npm-package"
  | "academic"
  | "private-team"
  | "mobile-app";
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

export type ScanBudget = {
  maxFiles: number;
  maxTotalBytes: number;
  filesConsidered: number;
  textBytesCached: number;
  truncated: boolean;
};

export type FindingLimitResult = {
  findings: Finding[];
  truncated: boolean;
  originalCount: number;
  displayedCount: number;
};

export type RepositoryContext = {
  root: string;
  profile: RepositoryProfile;
  files: readonly RepositoryFile[];
  textCache: ReadonlyMap<string, string>;
  /** Text from ignored files is isolated for security detectors only. */
  securityTextCache?: ReadonlyMap<string, string>;
  scanBudget?: ScanBudget;
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

export type ScoreStatus =
  | "ready"
  | "almost-ready"
  | "needs-attention"
  | "not-ready"
  | "not-applicable";

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
  info: 1,
};

const scorePenalty: Record<Severity, number> = {
  critical: 35,
  error: 18,
  warning: 5,
  info: 1,
};
const PER_RULE_FINDING_CAP = 3;

export function compareFindings(left: Finding, right: Finding): number {
  const severityDifference =
    severityRank[right.severity] - severityRank[left.severity];
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

export function limitFindings(
  findings: readonly Finding[],
  maxFindingsPerRule = 50,
  maxFindings = 500,
): FindingLimitResult {
  const perRuleCounts = new Map<string, number>();
  const selected: Finding[] = [];
  const omittedByRule = new Map<string, number>();
  for (const finding of normalizeFindings(findings)) {
    const ruleCount = perRuleCounts.get(finding.ruleId) ?? 0;
    if (ruleCount >= maxFindingsPerRule || selected.length >= maxFindings) {
      omittedByRule.set(
        finding.ruleId,
        (omittedByRule.get(finding.ruleId) ?? 0) + 1,
      );
      continue;
    }
    perRuleCounts.set(finding.ruleId, ruleCount + 1);
    selected.push(finding);
  }
  if (omittedByRule.size === 0) {
    return {
      findings: selected,
      truncated: false,
      originalCount: findings.length,
      displayedCount: selected.length,
    };
  }
  for (const [ruleId, omitted] of omittedByRule) {
    const displayed = perRuleCounts.get(ruleId) ?? 0;
    selected.push({
      ruleId: "scan.findings-truncated",
      category: "ci",
      severity: "info",
      message: `${ruleId}: ${displayed + omitted} findings detected; ${displayed} displayed and ${omitted} omitted by the scan output budget.`,
      remediation:
        "Review the source files or rerun with narrower scope; a truncated report is not a complete finding inventory.",
      metadata: {
        truncatedRule: ruleId,
        originalCount: displayed + omitted,
        displayedCount: displayed,
        omittedCount: omitted,
      },
    });
  }
  return {
    findings: normalizeFindings(selected),
    truncated: true,
    originalCount: findings.length,
    displayedCount: selected.length,
  };
}

export function scoreFindings(findings: readonly Finding[]): number {
  const seenByRule = new Map<string, number>();
  const penalty = findings.reduce((total, finding) => {
    const seen = seenByRule.get(finding.ruleId) ?? 0;
    if (seen >= PER_RULE_FINDING_CAP) return total;
    seenByRule.set(finding.ruleId, seen + 1);
    return total + scorePenalty[finding.severity];
  }, 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

/**
 * Rule ID emitted when a target holds nothing the rule pack can judge. A
 * readiness score over zero scannable files is meaningless, so its presence
 * switches the summary to `not-applicable` instead of reporting a number.
 */
export const EMPTY_TARGET_RULE_ID = "scan.empty-target";

export function statusForScore(score: number): ScoreStatus {
  if (score >= 90) return "ready";
  if (score >= 75) return "almost-ready";
  if (score >= 50) return "needs-attention";
  return "not-ready";
}

export function countsForFindings(
  findings: readonly Finding[],
): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    critical: 0,
    error: 0,
    warning: 0,
    info: 0,
  };
  for (const finding of findings) counts[finding.severity] += 1;
  return counts;
}

export function thresholdRank(threshold: ExitThreshold): number {
  return severityRank[threshold];
}

export function exitCodeForFindings(
  findings: readonly Finding[],
  threshold: ExitThreshold,
): 0 | 1 {
  const minimumRank = thresholdRank(threshold);
  return findings.some(
    (finding) => severityRank[finding.severity] >= minimumRank,
  )
    ? 1
    : 0;
}

export function summarizeFindings(
  findings: readonly Finding[],
  threshold: ExitThreshold,
): ScanSummary {
  if (findings.some((finding) => finding.ruleId === EMPTY_TARGET_RULE_ID)) {
    return {
      score: 0,
      status: "not-applicable",
      counts: countsForFindings(findings),
      exitCode: exitCodeForFindings(findings, threshold),
    };
  }
  const score = scoreFindings(findings);
  return {
    score,
    status: statusForScore(score),
    counts: countsForFindings(findings),
    exitCode: exitCodeForFindings(findings, threshold),
  };
}

export function redactSensitiveValue(value: string): string {
  if (value.length === 0) return value;
  if (
    /-----BEGIN (?:[A-Z ]*PRIVATE KEY|PGP PRIVATE KEY BLOCK)-----/u.test(value)
  ) {
    return value.replace(
      /-----BEGIN (?:[A-Z ]*PRIVATE KEY|PGP PRIVATE KEY BLOCK)-----[\s\S]*/u,
      "[REDACTED PRIVATE KEY]",
    );
  }
  const slackWebhookPattern =
    /\b(?:https?:\/\/)?hooks\.slack\.com\/services\/T[A-Z0-9]{6,}\/B[A-Z0-9]{6,}\/[A-Za-z0-9_-]{16,}/iu;
  if (slackWebhookPattern.test(value)) {
    return value.replace(slackWebhookPattern, "[REDACTED SLACK WEBHOOK]");
  }
  const connectionStringPattern =
    /\b(?:postgres|postgresql|mongodb(?:\+srv)?|mysql|mariadb|redis):\/\/[^\s"'`<>]{8,200}/iu;
  if (connectionStringPattern.test(value)) {
    return value.replace(
      connectionStringPattern,
      "[REDACTED CONNECTION STRING]",
    );
  }
  const credentialPattern =
    /\b(github_pat_|sk-proj-|sk_live_|rk_live_|ghp_|xoxb-|xoxp-|AIza|AKIA|ASIA|npm_|sk-)[A-Za-z0-9_-]{16,}/u;
  if (credentialPattern.test(value)) {
    return value.replace(credentialPattern, "$1****[REDACTED]");
  }
  const jwtPattern =
    /\b(eyJ)[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/u;
  if (jwtPattern.test(value)) {
    return value.replace(jwtPattern, "$1****[REDACTED]");
  }
  return "[REDACTED]";
}

export function fingerprintFor(ruleId: string, path = "", line = 0): string {
  return `${ruleId}:${path}:${line}`;
}

export {
  BASELINE_SCHEMA,
  createBaselineDocument,
  filterBaselineFindings,
  loadBaseline,
  writeBaseline,
} from "./baseline.js";
export type {
  ChangedFilesResult,
  DiscoveryOptions,
  DiscoveryResult,
} from "./discovery.js";
export {
  createRepositoryContext,
  discoverRepository,
  readChangedPaths,
} from "./discovery.js";
