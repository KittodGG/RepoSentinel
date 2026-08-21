import {
  type ExitThreshold,
  type Finding,
  type RepositoryProfile,
  type ScanBudget,
  type ScoreStatus,
  summarizeFindings,
} from "@reposentinel/core";
import {
  createTranslator,
  type Locale,
  translateRuleText,
} from "@reposentinel/i18n";
import { createColors } from "picocolors";

function statusMessageKey(
  status: ScoreStatus,
):
  | "status.ready"
  | "status.almostReady"
  | "status.needsAttention"
  | "status.notReady"
  | "status.notApplicable" {
  switch (status) {
    case "ready":
      return "status.ready";
    case "almost-ready":
      return "status.almostReady";
    case "needs-attention":
      return "status.needsAttention";
    case "not-ready":
      return "status.notReady";
    case "not-applicable":
      return "status.notApplicable";
  }
  throw new Error(`Unknown score status: ${status}`);
}

/**
 * A readiness score is only meaningful when there was something to score. An
 * empty target reports `not-applicable`, so the number is replaced by a dash
 * rather than printing a misleading zero.
 */
function scoreLabel(summary: { score: number; status: ScoreStatus }): string {
  return summary.status === "not-applicable" ? "n/a" : `${summary.score} / 100`;
}

/**
 * Localizes the human-facing text of a finding. Applied by the terminal,
 * Markdown, and HTML reporters only — JSON and SARIF keep the English source so
 * machine-readable output stays byte-identical across locales.
 */
function localizeFinding(finding: Finding, locale: Locale): Finding {
  if (locale === "en") return finding;
  return {
    ...finding,
    message: translateRuleText(locale, finding.message),
    remediation: translateRuleText(locale, finding.remediation),
    ...(finding.evidence
      ? { evidence: translateRuleText(locale, finding.evidence) }
      : {}),
  };
}

function code(value: string): string {
  return `\`${value.replaceAll("`", "\\`")}\``;
}

function markdownText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`")
    .replaceAll("*", "\\*")
    .replaceAll("_", "\\_")
    .replaceAll("[", "\\[")
    .replaceAll("]", "\\]")
    .replaceAll("<", "\\<")
    .replaceAll(">", "\\>")
    .replaceAll("|", "\\|")
    .replace(/\r?\n/gu, " ");
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
  network?: boolean;
  scanBudget?: ScanBudget | undefined;
  findingsTruncated?: boolean;
  /** Drawing width; clamped to 56..100. Defaults to 80 so output stays stable. */
  width?: number | undefined;
  color?: boolean;
};

/**
 * Matches an ANSI SGR sequence. Built from the escape code point rather than a
 * literal control character so the source stays copy-safe.
 */
const ESCAPE = String.fromCharCode(27);
const ANSI = new RegExp(`${ESCAPE}${"\\["}[0-9;]*m`, "gu");

/** Visible width of a string, ignoring colour escapes. */
function visibleWidth(value: string): number {
  return value.replace(ANSI, "").length;
}

function padVisible(value: string, width: number): string {
  const pad = Math.max(0, width - visibleWidth(value));
  return value + " ".repeat(pad);
}

/**
 * Wraps text to a column budget without breaking words. Long unbreakable
 * tokens — paths, redacted matches — are emitted on their own line rather than
 * being split, so a value stays selectable in one go.
 */
function wrap(value: string, width: number): string[] {
  if (width <= 0) return [value];
  const lines: string[] = [];
  let current = "";
  for (const word of value.split(/\s+/u).filter(Boolean)) {
    if (current.length === 0) {
      current = word;
      continue;
    }
    if (current.length + 1 + word.length <= width) {
      current = `${current} ${word}`;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current.length > 0) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

const SEVERITY_ORDER = ["critical", "error", "warning", "info"] as const;

const SEVERITY_MARK: Record<Finding["severity"], string> = {
  critical: "✕",
  error: "✕",
  warning: "!",
  info: "·",
};

/**
 * Resolves the drawing width. Terminals narrower than the floor still render;
 * they simply wrap more. The value is a parameter rather than a direct
 * `process.stdout` read so snapshots stay stable regardless of the terminal
 * running the suite.
 */
function resolveWidth(requested: number | undefined): number {
  const raw = requested ?? 80;
  return Math.max(56, Math.min(100, Math.trunc(raw)));
}

function gauge(score: number, cells: number): string {
  const filled = Math.max(
    0,
    Math.min(cells, Math.round((score / 100) * cells)),
  );
  return "▰".repeat(filled) + "▱".repeat(cells - filled);
}

export function renderTerminalReport(options: TerminalReportOptions): string {
  const {
    locale,
    repository,
    profile,
    filesScanned,
    ignoredCount,
    findings,
    threshold,
    changedSince,
    changedFiles = [],
    network = false,
    scanBudget,
    findingsTruncated = false,
    width: requestedWidth,
    color = true,
  } = options;

  const colors = createColors(color);
  const { t } = createTranslator(locale);
  const summary = summarizeFindings(findings, threshold);
  const width = resolveWidth(requestedWidth);
  const inner = width - 6; // two-space gutter plus box borders
  const notApplicable = summary.status === "not-applicable";

  const accent =
    notApplicable || summary.score < 50
      ? colors.red
      : summary.score < 75
        ? colors.yellow
        : summary.score < 90
          ? colors.cyan
          : colors.green;

  const out: string[] = [];
  const push = (line = "") => out.push(line);

  // ---- masthead ------------------------------------------------------------
  push();
  push(`  ${colors.cyan("◈")} ${colors.bold(colors.white("RepoSentinel"))}`);
  push(`    ${colors.dim(t("brand.tagline"))}`);
  push();

  const context = [
    repository,
    profile,
    `network ${network ? "on" : "off"}`,
    `locale ${locale}`,
  ];
  push(`    ${colors.dim(context.join("  ·  "))}`);
  push();

  // ---- score panel ---------------------------------------------------------
  const status = t(statusMessageKey(summary.status)).toUpperCase();
  const top = `╭${"─".repeat(inner)}╮`;
  const bottom = `╰${"─".repeat(inner)}╯`;
  const row = (content: string): string =>
    `  ${colors.dim("│")} ${padVisible(content, inner - 1)}${colors.dim("│")}`;

  push(`  ${colors.dim(top)}`);
  if (notApplicable) {
    push(row(`${accent(colors.bold("n/a"))}  ${colors.bold(accent(status))}`));
  } else {
    const bar = gauge(summary.score, Math.max(10, inner - 26));
    push(
      row(
        `${accent(colors.bold(`${summary.score}`))}${colors.dim("/100")}  ${accent(bar)}  ${colors.bold(accent(status))}`,
      ),
    );
  }
  const facts = [
    `${filesScanned} ${t("scan.files").toLocaleLowerCase(locale)}`,
    `${ignoredCount} ${t("scan.ignored")
      .toLocaleLowerCase(locale)
      .replace(/^files?\s+/u, "")}`,
    `${t("scan.failsOn")} ${threshold}`,
  ];
  push(row(colors.dim(facts.join(" · "))));
  push(`  ${colors.dim(bottom)}`);
  push();

  // ---- counts --------------------------------------------------------------
  const countColor: Record<(typeof SEVERITY_ORDER)[number], typeof colors.red> =
    {
      critical: colors.red,
      error: colors.red,
      warning: colors.yellow,
      info: colors.cyan,
    };
  const counts = SEVERITY_ORDER.map((severity) => {
    const value = summary.counts[severity];
    const label = `${value} ${t(`finding.${severity}` as const)}`;
    return value === 0 ? colors.dim(label) : countColor[severity](label);
  });
  push(`    ${counts.join("   ")}`);

  // ---- scope notes ---------------------------------------------------------
  const notes: string[] = [];
  if (changedSince)
    notes.push(
      `${t("scan.changedScope")} ${changedSince} · ${changedFiles.length}`,
    );
  if (scanBudget?.truncated) notes.push(t("scan.boundedScan"));
  if (findingsTruncated) notes.push(t("scan.truncatedOutput"));
  if (notes.length > 0) {
    push();
    for (const note of notes)
      push(`    ${colors.yellow("▲")} ${colors.dim(note)}`);
  }
  push();

  // ---- findings, grouped by severity ---------------------------------------
  if (findings.length === 0) {
    push(`    ${colors.green("✓")} ${t("scan.noFindings")}`);
  } else {
    const localized = findings.map((finding) =>
      localizeFinding(finding, locale),
    );
    for (const severity of SEVERITY_ORDER) {
      const group = localized.filter(
        (finding) => finding.severity === severity,
      );
      if (group.length === 0) continue;

      const heading = t(`finding.${severity}` as const).toUpperCase();
      const rule = "─".repeat(Math.max(0, width - heading.length - 5));
      push();
      push(`  ${countColor[severity](heading)} ${colors.dim(rule)}`);
      push();

      for (const finding of group) {
        const location = finding.path
          ? `${finding.path}${finding.line ? `:${finding.line}` : ""}`
          : "repository";
        const idWidth = Math.max(0, width - 7 - location.length - 2);
        push(
          `    ${countColor[severity](SEVERITY_MARK[severity])}  ${padVisible(colors.bold(finding.ruleId), idWidth)} ${colors.dim(location)}`,
        );
        for (const line of wrap(finding.message, width - 7))
          push(`       ${line}`);

        const detailLabel = Math.max(
          visibleWidth(t("finding.evidenceLabel")),
          visibleWidth(t("finding.fixLabel")),
        );
        const detail = (label: string, value: string): void => {
          const body = wrap(value, width - 10 - detailLabel);
          body.forEach((line, index) => {
            const prefix =
              index === 0
                ? colors.dim(padVisible(label, detailLabel))
                : " ".repeat(detailLabel);
            push(`       ${prefix}  ${index === 0 ? line : colors.dim(line)}`);
          });
        };
        if (finding.evidence)
          detail(t("finding.evidenceLabel"), colors.dim(finding.evidence));
        detail(t("finding.fixLabel"), colors.dim(finding.remediation));
        push();
      }
    }
  }

  // ---- footer --------------------------------------------------------------
  const resultLabel =
    summary.exitCode === 1
      ? t("result.failed")
      : summary.counts.warning > 0
        ? t("result.passedWithWarnings")
        : t("result.passed");
  const scoreText = notApplicable ? "n/a" : `${summary.score}/100`;
  push(`  ${colors.dim("─".repeat(width - 4))}`);
  push(
    `    ${accent(scoreText)}${colors.dim(` · ${t(statusMessageKey(summary.status))} · ${resultLabel} · ${t("scan.exitCode")} ${summary.exitCode}`)}`,
  );
  push();

  return `${out.join("\n")}\n`;
}

export function renderMarkdownReport(
  options: Omit<
    TerminalReportOptions,
    "color" | "filesScanned" | "ignoredCount"
  >,
): string {
  const summary = summarizeFindings(options.findings, options.threshold);
  const rows = [
    ["Critical", summary.counts.critical],
    ["Error", summary.counts.error],
    ["Warning", summary.counts.warning],
    ["Info", summary.counts.info],
  ]
    .map(([label, count]) => `| ${label} | ${count} |`)
    .join("\n");
  const findings =
    options.findings.length === 0
      ? "No findings."
      : options.findings
          .map((raw) => localizeFinding(raw, options.locale))
          .map((finding) =>
            [
              `### ${code(finding.ruleId)} — ${finding.severity}`,
              "",
              `- Path: ${code(finding.path ?? "repository")}${finding.line ? `:${finding.line}` : ""}`,
              `- Message: ${markdownText(finding.message)}`,
              finding.evidence
                ? `- Evidence: ${markdownText(finding.evidence)}`
                : "",
              `- Remediation: ${markdownText(finding.remediation)}`,
              "",
            ]
              .filter(Boolean)
              .join("\n"),
          )
          .join("\n");
  return [
    "# RepoSentinel Report",
    "",
    `- Repository: ${code(options.repository)}`,
    `- Profile: ${code(options.profile)}`,
    `- Locale: ${code(options.locale)}`,
    `- Network: ${code(options.network ? "enabled (opt-in)" : "disabled")}`,
    ...(options.scanBudget?.truncated
      ? [
          `- Scan budget: ${code(`bounded; ${options.scanBudget.filesConsidered} files considered, ${options.scanBudget.textBytesCached} text bytes cached`)}`,
        ]
      : []),
    ...(options.findingsTruncated
      ? [
          "- Finding output: `truncated`; review `scan.findings-truncated` summaries.",
        ]
      : []),
    ...(options.changedSince
      ? [
          `- Changed since: ${code(options.changedSince)}`,
          `- Changed files: ${code(String(options.changedFiles?.length ?? 0))}`,
        ]
      : []),
    `- Score: ${code(scoreLabel(summary))}`,
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
    "",
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

export function renderHtmlReport(
  options: Omit<
    TerminalReportOptions,
    "color" | "filesScanned" | "ignoredCount"
  >,
): string {
  const summary = summarizeFindings(options.findings, options.threshold);
  const rows =
    options.findings.length === 0
      ? `<tr><td colspan="4" class="empty">No findings. The repository passed this scan.</td></tr>`
      : options.findings
          .map((raw) => localizeFinding(raw, options.locale))
          .map(htmlFindingRow)
          .join("\n");
  const changedScope = options.changedSince
    ? `<div class="scope"><span>Changed-files mode</span><code>${escapeHtml(options.changedSince)}</code><span>${options.changedFiles?.length ?? 0} changed file(s)</span></div>`
    : "";
  const truncationNote = options.findingsTruncated
    ? `<div class="scope"><span>Output budget</span><span>Findings were truncated; review the scan.findings-truncated summaries.</span></div>`
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
<body><main><div class="brand">◈ <span>RepoSentinel</span></div><div class="sub">Repository readiness, without the noise.</div><div class="hero"><div class="meta"><span>Repository <code>${escapeHtml(options.repository)}</code></span><span>Profile <code>${escapeHtml(options.profile)}</code></span><span>Locale <code>${escapeHtml(options.locale)}</code></span><span>Threshold <code>${escapeHtml(options.threshold)}</code></span><span>Network <code>${escapeHtml(options.network ? "enabled (opt-in)" : "disabled")}</code></span>${options.scanBudget?.truncated ? `<span>Scan <code>bounded</code></span>` : ""}</div><div class="score"><strong>${summary.status === "not-applicable" ? "n/a" : `${summary.score}/100`}</strong><span class="status">${escapeHtml(summary.status)}</span></div>${changedScope}${truncationNote}<div class="stats"><div class="stat critical"><b>${summary.counts.critical}</b>Critical</div><div class="stat error"><b>${summary.counts.error}</b>Error</div><div class="stat warning"><b>${summary.counts.warning}</b>Warning</div><div class="stat info"><b>${summary.counts.info}</b>Info</div></div></div><section><h2>Findings</h2><div class="table-wrap"><table><thead><tr><th>Severity</th><th>Rule</th><th>Location</th><th>Message and remediation</th></tr></thead><tbody>${rows}</tbody></table></div></section><p class="note">This report is generated locally.${options.scanBudget?.truncated ? " The scan was bounded and some files were not read." : ""} A readiness score is not proof of security or a substitute for a formal security audit.</p></main></body></html>\n`;
}

export function renderJsonReport(
  options: Omit<
    TerminalReportOptions,
    "color" | "filesScanned" | "ignoredCount"
  >,
): string {
  const summary = summarizeFindings(options.findings, options.threshold);
  return `${JSON.stringify(
    {
      schemaVersion: "reposentinel.report/v1",
      locale: options.locale,
      repository: options.repository,
      profile: options.profile,
      score: summary.score,
      status: summary.status,
      threshold: options.threshold,
      scan: {
        mode: options.changedSince ? "changed-files" : "offline",
        network: options.network ? "enabled" : "disabled",
        findingsTruncated: options.findingsTruncated ?? false,
        ...(options.scanBudget ? { budget: options.scanBudget } : {}),
        ...(options.changedSince
          ? {
              changedSince: options.changedSince,
              changedFiles: options.changedFiles ?? [],
            }
          : {}),
      },
      summary: summary.counts,
      findings: options.findings,
    },
    null,
    2,
  )}\n`;
}

function sarifLevel(
  severity: Finding["severity"],
): "error" | "warning" | "note" {
  return severity === "critical" || severity === "error"
    ? "error"
    : severity === "warning"
      ? "warning"
      : "note";
}

export function renderSarifReport(
  options: Omit<
    TerminalReportOptions,
    "color" | "filesScanned" | "ignoredCount"
  >,
): string {
  const ruleIds = [
    ...new Set(options.findings.map((finding) => finding.ruleId)),
  ];
  const ruleIndex = new Map(ruleIds.map((ruleId, index) => [ruleId, index]));
  return `${JSON.stringify(
    {
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      version: "2.1.0",
      runs: [
        {
          tool: {
            driver: {
              name: "RepoSentinel",
              informationUri: "https://github.com/KittodGG/RepoSentinel",
              rules: ruleIds.map((ruleId) => {
                const finding = options.findings.find(
                  (candidate) => candidate.ruleId === ruleId,
                );
                return {
                  id: ruleId,
                  name: ruleId,
                  shortDescription: { text: finding?.message ?? ruleId },
                  ...(finding?.docsUrl ? { helpUri: finding.docsUrl } : {}),
                };
              }),
            },
          },
          invocations: [
            {
              properties: {
                scanMode: options.changedSince ? "changed-files" : "offline",
                network: options.network ? "enabled" : "disabled",
                findingsTruncated: options.findingsTruncated ?? false,
                ...(options.changedSince
                  ? {
                      baseRef: options.changedSince,
                      changedFiles: options.changedFiles ?? [],
                    }
                  : {}),
              },
            },
          ],
          results: options.findings.map((finding) => ({
            ruleId: finding.ruleId,
            ruleIndex: ruleIndex.get(finding.ruleId),
            level: sarifLevel(finding.severity),
            message: { text: finding.message },
            locations: finding.path
              ? [
                  {
                    physicalLocation: {
                      artifactLocation: { uri: finding.path },
                      ...(finding.line
                        ? {
                            region: {
                              startLine: finding.line,
                              ...(finding.column
                                ? { startColumn: finding.column }
                                : {}),
                            },
                          }
                        : {}),
                    },
                  },
                ]
              : undefined,
            properties: {
              severity: finding.severity,
              category: finding.category,
              remediation: finding.remediation,
              ...(finding.evidence ? { evidence: finding.evidence } : {}),
            },
          })),
        },
      ],
    },
    null,
    2,
  )}\n`;
}
