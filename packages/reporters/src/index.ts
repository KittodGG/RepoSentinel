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
  return "`" + value.replaceAll("`", "\\`") + "`";
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
  const boxWidth = 63;
  const boxTitle = "╭─ health snapshot ";
  const boxTop = `${boxTitle}${"─".repeat(boxWidth - boxTitle.length - 1)}╮`;
  const boxBottom = `╰${"─".repeat(boxWidth - 2)}╯`;
  const boxRow = (value: string): string => `│ ${value}`.padEnd(boxWidth - 1, " ") + "│";
  const output = [
    `${colors.cyan("◈")} ${colors.bold(colors.white("RepoSentinel"))}`,
    colors.dim(`  ${t("brand.tagline")}`),
    "",
    `${t("scan.repository")} : ${repository}`,
    `${t("scan.profile")}    : ${profile}`,
    `${t("scan.mode")}       : local · network off · locale ${locale}`,
    "",
    colors.blue(boxTop),
    scoreColor(boxRow(`${summary.score} / 100   ${status.toUpperCase()}`)),
    colors.dim(boxRow(`${filesScanned} files · ${ignoredCount} ignored · threshold ${threshold}`)),
    colors.blue(boxBottom),
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

function sarifLevel(severity: Finding["severity"]): "error" | "warning" | "note" {
  return severity === "critical" || severity === "error" ? "error" : severity === "warning" ? "warning" : "note";
}

export function renderSarifReport(options: Omit<TerminalReportOptions, "color" | "filesScanned" | "ignoredCount">): string {
  return `${JSON.stringify({
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [{
      tool: {
        driver: {
          name: "RepoSentinel",
          informationUri: "https://github.com/KittodGG/RepoSentinel",
          rules: options.findings.map((finding) => ({
            id: finding.ruleId,
            name: finding.ruleId,
            shortDescription: { text: finding.message },
            helpUri: finding.docsUrl
          }))
        }
      },
      results: options.findings.map((finding) => ({
        ruleId: finding.ruleId,
        level: sarifLevel(finding.severity),
        message: { text: finding.message },
        locations: finding.path ? [{
          physicalLocation: {
            artifactLocation: { uri: finding.path },
            ...(finding.line ? { region: { startLine: finding.line, ...(finding.column ? { startColumn: finding.column } : {}) } } : {})
          }
        }] : undefined,
        properties: {
          severity: finding.severity,
          category: finding.category,
          remediation: finding.remediation,
          ...(finding.evidence ? { evidence: finding.evidence } : {})
        }
      }))
    }]
  }, null, 2)}\n`;
}
