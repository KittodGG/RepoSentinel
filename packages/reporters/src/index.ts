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
  changedSince?: string;
  changedFiles?: readonly string[];
  color?: boolean;
};

export function renderTerminalReport(options: TerminalReportOptions): string {
  const { locale, repository, profile, filesScanned, ignoredCount, findings, threshold, changedSince, changedFiles = [], color = true } = options;
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
    ...(changedSince ? [`Scope      : changed since ${changedSince} · ${changedFiles.length} changed file(s)`] : []),
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
    ...(options.changedSince ? [`- Changed since: ${code(options.changedSince)}`, `- Changed files: ${code(String(options.changedFiles?.length ?? 0))}`] : []),
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function htmlFindingRow(finding: Finding): string {
  const location = `${finding.path ?? "repository"}${finding.line ? `:${finding.line}` : ""}`;
  return `<tr><td><span class="severity severity-${escapeHtml(finding.severity)}">${escapeHtml(finding.severity)}</span></td><td><code>${escapeHtml(finding.ruleId)}</code></td><td><code>${escapeHtml(location)}</code></td><td><strong>${escapeHtml(finding.message)}</strong>${finding.evidence ? `<br><span class="muted">Evidence: ${escapeHtml(finding.evidence)}</span>` : ""}<br><span class="fix">Fix: ${escapeHtml(finding.remediation)}</span></td></tr>`;
}

export function renderHtmlReport(options: Omit<TerminalReportOptions, "color" | "filesScanned" | "ignoredCount">): string {
  const summary = summarizeFindings(options.findings, options.threshold);
  const rows = options.findings.length === 0
    ? `<tr><td colspan="4" class="empty">No findings. The repository passed this scan.</td></tr>`
    : options.findings.map(htmlFindingRow).join("\n");
  const changedScope = options.changedSince
    ? `<div class="scope"><span>Changed-files mode</span><code>${escapeHtml(options.changedSince)}</code><span>${options.changedFiles?.length ?? 0} changed file(s)</span></div>`
    : "";
  const title = `${escapeHtml(options.repository)} · RepoSentinel report`;
  return `<!doctype html>
<html lang="${escapeHtml(options.locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
:root{color-scheme:dark;--bg:#07111f;--panel:#0b1930;--panel2:#0f2740;--text:#e2e8f0;--muted:#94a3b8;--cyan:#67e8f9;--violet:#a78bfa;--green:#4ade80;--yellow:#facc15;--red:#fb7185}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 12% 0%,#102d49 0,#07111f 42%,#11102b 100%);font:15px/1.55 ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;color:var(--text);padding:32px}main{max-width:1160px;margin:0 auto}.brand{display:flex;align-items:center;gap:12px;color:var(--cyan);font:700 22px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.brand span{color:var(--text)}.sub{color:var(--muted);margin:4px 0 28px}.hero{border:1px solid #245276;background:linear-gradient(135deg,#0b1930,#11102b);border-radius:18px;padding:26px;box-shadow:0 18px 60px #0006}.meta{display:flex;gap:12px;flex-wrap:wrap;color:var(--muted);font-size:13px}.meta code,.scope code{color:var(--cyan);background:#07111f;border:1px solid #245276;border-radius:6px;padding:3px 7px}.score{display:flex;align-items:end;gap:16px;margin-top:22px}.score strong{font:700 48px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:${summary.score >= 90 ? "var(--green)" : summary.score >= 75 ? "var(--cyan)" : "var(--yellow)"}}.status{font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${summary.status === "ready" ? "var(--green)" : "var(--yellow)"}}.scope{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:18px;border-left:3px solid var(--violet);padding:8px 12px;background:#11102b;color:var(--muted)}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:22px 0}.stat{padding:12px 14px;background:#07111f;border:1px solid #1d3b58;border-radius:10px}.stat b{display:block;font:700 22px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.critical b,.error b{color:var(--red)}.warning b{color:var(--yellow)}.info b{color:var(--cyan)}section{margin-top:24px}h2{font-size:18px;margin:0 0 10px;color:var(--cyan)}.table-wrap{overflow:auto;border:1px solid #245276;border-radius:12px}table{width:100%;border-collapse:collapse;min-width:760px}th,td{text-align:left;vertical-align:top;padding:13px 14px;border-bottom:1px solid #1d3b58}th{background:#0f2740;color:var(--cyan);font-size:12px;text-transform:uppercase;letter-spacing:.08em}tr:last-child td{border-bottom:0}code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}.severity{display:inline-block;border-radius:999px;padding:2px 8px;font:700 12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;text-transform:uppercase}.severity-critical,.severity-error{background:#4b1d2b;color:var(--red)}.severity-warning{background:#463915;color:var(--yellow)}.severity-info{background:#123b4a;color:var(--cyan)}.muted,.fix{color:var(--muted)}.fix{font-size:13px}.empty{text-align:center;color:var(--green);padding:28px}.note{color:var(--muted);font-size:13px;margin-top:18px;border-top:1px solid #1d3b58;padding-top:14px}@media(max-width:700px){body{padding:16px}.stats{grid-template-columns:repeat(2,1fr)}.score strong{font-size:38px}}
</style>
</head>
<body><main><div class="brand">◈ <span>RepoSentinel</span></div><div class="sub">Repository readiness, without the noise.</div><div class="hero"><div class="meta"><span>Repository <code>${escapeHtml(options.repository)}</code></span><span>Profile <code>${escapeHtml(options.profile)}</code></span><span>Locale <code>${escapeHtml(options.locale)}</code></span><span>Threshold <code>${escapeHtml(options.threshold)}</code></span></div><div class="score"><strong>${summary.score}/100</strong><span class="status">${escapeHtml(summary.status)}</span></div>${changedScope}<div class="stats"><div class="stat critical"><b>${summary.counts.critical}</b>Critical</div><div class="stat error"><b>${summary.counts.error}</b>Error</div><div class="stat warning"><b>${summary.counts.warning}</b>Warning</div><div class="stat info"><b>${summary.counts.info}</b>Info</div></div></div><section><h2>Findings</h2><div class="table-wrap"><table><thead><tr><th>Severity</th><th>Rule</th><th>Location</th><th>Message and remediation</th></tr></thead><tbody>${rows}</tbody></table></div></section><p class="note">This report is generated locally. A readiness score is not proof of security or a substitute for a formal security audit.</p></main></body></html>\n`;
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
    ...(options.changedSince ? { scan: { mode: "changed-files", baseRef: options.changedSince, changedFiles: options.changedFiles ?? [] } } : {}),
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
      ...(options.changedSince ? { invocations: [{ properties: { scanMode: "changed-files", baseRef: options.changedSince, changedFiles: options.changedFiles ?? [] } }] } : {}),
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
