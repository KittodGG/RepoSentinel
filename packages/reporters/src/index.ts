import pc from "picocolors";
import {
  summarizeFindings,
  type ExitThreshold,
  type Finding,
  type RepositoryProfile,
  type ScoreStatus
} from "@reposentinel/core";
import { createTranslator, type Locale } from "@reposentinel/i18n";

function statusMessageKey(status: ScoreStatus): "status.ready" | "status.almostReady" | "status.needsAttention" | "status.notReady" {
  switch (status) {
    case "ready": return "status.ready";
    case "almost-ready": return "status.almostReady";
    case "needs-attention": return "status.needsAttention";
    case "not-ready": return "status.notReady";
  }
}

function colorize(enabled: boolean, color: (value: string) => string, value: string): string {
  return enabled ? color(value) : value;
}

export type TerminalReportOptions = {
  locale: Locale;
  repository: string;
  profile: RepositoryProfile;
  filesScanned: number;
  ignoredCount: number;
  findings: readonly Finding[];
  threshold: ExitThreshold;
  color?: boolean;
};

export function renderTerminalReport(options: TerminalReportOptions): string {
  const { locale, repository, profile, filesScanned, ignoredCount, findings, threshold, color = true } = options;
  const { t } = createTranslator(locale);
  const summary = summarizeFindings(findings, threshold);
  const scoreColor = summary.score >= 90 ? pc.green : summary.score >= 75 ? pc.cyan : pc.yellow;
  const status = t(statusMessageKey(summary.status));
  const resultLabel = summary.exitCode === 1 ? t("result.failed") : summary.counts.warning > 0 ? t("result.passedWithWarnings") : t("result.passed");
  const line = colorize(color, pc.dim, "──────────────────────────────────────────────────────────────");
  const output = [
    colorize(color, pc.cyan, "◈ RepoSentinel"),
    colorize(color, pc.dim, `  ${t("brand.tagline")}`),
    "",
    `${t("scan.repository")} : ${repository}`,
    `${t("scan.profile")}    : ${profile}`,
    `${t("scan.mode")}       : local · network off · locale ${locale}`,
    "",
    colorize(color, pc.dim, "╭─ health snapshot ─────────────────────────────────────────────╮"),
    `│  ${colorize(color, scoreColor, `${summary.score} / 100`)}   ${status.toUpperCase()}`.padEnd(64, " ") + "│",
    `│  ${colorize(color, pc.dim, `${filesScanned} files · ${ignoredCount} ignored · threshold ${threshold}`)}`.padEnd(64, " ") + "│",
    colorize(color, pc.dim, "╰────────────────────────────────────────────────────────────────╯"),
    "",
    `${t("scan.findings")}  ${line}`,
    `${colorize(color, pc.red, "CRITICAL")} ${summary.counts.critical}   ${colorize(color, pc.red, "ERROR")} ${summary.counts.error}   ${colorize(color, pc.yellow, "WARNING")} ${summary.counts.warning}   ${colorize(color, pc.blue, "INFO")} ${summary.counts.info}`
  ];

  if (findings.length === 0) {
    output.push(colorize(color, pc.green, `✓ ${t("scan.noFindings")}`));
  } else {
    for (const finding of findings) {
      const marker = finding.severity === "critical" || finding.severity === "error" ? "×" : finding.severity === "warning" ? "!" : "◇";
      const markerColor = finding.severity === "critical" || finding.severity === "error" ? pc.red : finding.severity === "warning" ? pc.yellow : pc.blue;
      const location = finding.path ? `${finding.path}${finding.line ? `:${finding.line}` : ""}` : "repository";
      output.push("", `${colorize(color, markerColor, marker)}  ${finding.ruleId}  ${location}  ${finding.severity}`);
      output.push(`   ${finding.message}`);
      if (finding.evidence) output.push(`   ${colorize(color, pc.dim, `Evidence: ${finding.evidence}`)}`);
      output.push(`   ${colorize(color, pc.dim, `Fix: ${finding.remediation}`)}`);
    }
  }

  output.push("", `${t("scan.score")}  : ${summary.score} / 100`, `${t("scan.status")} : ${status}`, `${t("scan.result")} : ${resultLabel}`, `Exit code : ${summary.exitCode}`);
  return `${output.join("\n")}\n`;
}

export function renderJsonReport(options: Omit<TerminalReportOptions, "color" | "filesScanned" | "ignoredCount">): string {
  const summary = summarizeFindings(options.findings, options.threshold);
  return `${JSON.stringify({
    schemaVersion: "reposentinel.report/v1",
    locale: options.locale,
    repository: options.repository,
    profile: options.profile,
    score: summary.score,
    status: summary.status,
    threshold: options.threshold,
    summary: summary.counts,
    findings: options.findings
  }, null, 2)}\n`;
}
