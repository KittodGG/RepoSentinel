import { createColors } from "picocolors";
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
  throw new Error(`Unknown score status: ${status}`);
}

function colorize(enabled: boolean, color: (value: string) => string, value: string): string {
  return enabled ? color(value) : value;
}

function code(value: string): string {
  return "`" + value + "`";
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
  const colors = createColors(color);
  const { t } = createTranslator(locale);
  const summary = summarizeFindings(findings, threshold);
  const scoreColor = summary.score >= 90 ? colors.green : summary.score >= 75 ? colors.cyan : colors.yellow;
  const status = t(statusMessageKey(summary.status));
  const resultLabel = summary.exitCode === 1 ? t("result.failed") : summary.counts.warning > 0 ? t("result.passedWithWarnings") : t("result.passed");
  const line = colors.dim("──────────────────────────────────────────────────────────────");
  const boxRow = (value: string): string => `│ ${value}`.padEnd(63, " ") + "│";
  const output = [
    `${colors.cyan("◈")} ${colors.bold(colors.white("RepoSentinel"))}`,
    colors.dim(`  ${t("brand.tagline")}`),
    "",
    `${t("scan.repository")} : ${repository}`,
    `${t("scan.profile")}    : ${profile}`,
    `${t("scan.mode")}       : local · network off · locale ${locale}`,
    "",
    colors.blue("╭─ health snapshot ─────────────────────────────────────────────╮"),
    scoreColor(boxRow(`${summary.score} / 100   ${status.toUpperCase()}`)),
    colors.dim(boxRow(`${filesScanned} files · ${ignoredCount} ignored · threshold ${threshold}`)),
    colors.blue("╰────────────────────────────────────────────────────────────────╯"),
    "",
    `${t("scan.findings")}  ${line}`,
    `${colors.red("CRITICAL")} ${summary.counts.critical}   ${colors.red("ERROR")} ${summary.counts.error}   ${colors.yellow("WARNING")} ${summary.counts.warning}   ${colors.cyan("INFO")} ${summary.counts.info}`
  ];

  if (findings.length === 0) {
    output.push(colors.green(`✓ ${t("scan.noFindings")}`));
  } else {
    for (const finding of findings) {
      const marker = finding.severity === "critical" || finding.severity === "error" ? "×" : finding.severity === "warning" ? "!" : "◇";
      const markerColor = finding.severity === "critical" || finding.severity === "error" ? colors.red : finding.severity === "warning" ? colors.yellow : colors.cyan;
      const location = finding.path ? `${finding.path}${finding.line ? `:${finding.line}` : ""}` : "repository";
      output.push("", `${colorize(color, markerColor, marker)}  ${finding.ruleId}  ${location}  ${finding.severity}`);
      output.push(`   ${finding.message}`);
      if (finding.evidence) output.push(`   ${colors.dim(`Evidence: ${finding.evidence}`)}`);
      output.push(`   ${colors.dim(`Fix: ${finding.remediation}`)}`);
    }
  }

  output.push("", `${t("scan.score")}  : ${summary.score} / 100`, `${t("scan.status")} : ${status}`, `${t("scan.result")} : ${resultLabel}`, `Exit code : ${summary.exitCode}`);
  return `${output.join("\n")}\n`;
}

export function renderMarkdownReport(options: Omit<TerminalReportOptions, "color" | "filesScanned" | "ignoredCount">): string {
  const summary = summarizeFindings(options.findings, options.threshold);
  const rows = [
    ["Critical", summary.counts.critical],
    ["Error", summary.counts.error],
    ["Warning", summary.counts.warning],
    ["Info", summary.counts.info]
  ].map(([label, count]) => `| ${label} | ${count} |`).join("\n");
  const findings = options.findings.length === 0
    ? "No findings."
    : options.findings.map((finding) => [
        `### ${code(finding.ruleId)} — ${finding.severity}`,
        "",
        `- Path: ${code(finding.path ?? "repository")}${finding.line ? `:${finding.line}` : ""}`,
        `- Message: ${finding.message}`,
        finding.evidence ? `- Evidence: ${finding.evidence}` : "",
        `- Remediation: ${finding.remediation}`,
        ""
      ].filter(Boolean).join("\n")).join("\n");
  return [
    "# RepoSentinel Report",
    "",
    `- Repository: ${code(options.repository)}`,
    `- Profile: ${code(options.profile)}`,
    `- Locale: ${code(options.locale)}`,
    `- Score: ${code(`${summary.score} / 100`)}`,
    `- Status: ${code(summary.status)}`,
    "",
    "## Summary",
    "",
    "| Severity | Count |",
    "|---|---:|",
    rows,
    "",
    "## Findings",
    "",
    findings,
    ""
  ].join("\n");
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
