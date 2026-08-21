export type DashboardFinding = {
  severity: "critical" | "error" | "warning" | "info";
};

export type DashboardReport = {
  repository: string;
  profile: string;
  score: number;
  status: string;
  findings: DashboardFinding[];
  sourceFile?: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeReport(value: unknown, sourceFile: string): DashboardReport {
  if (!value || typeof value !== "object") throw new Error(`Report ${sourceFile} is not a JSON object.`);
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== "reposentinel.report/v1") throw new Error(`Report ${sourceFile} has an unsupported schema.`);
  if (typeof record.repository !== "string" || typeof record.profile !== "string" || typeof record.score !== "number" || typeof record.status !== "string") {
    throw new Error(`Report ${sourceFile} is missing dashboard metadata.`);
  }
  const findings = Array.isArray(record.findings)
    ? record.findings.filter((finding): finding is Record<string, unknown> => Boolean(finding) && typeof finding === "object").map((finding) => ({ severity: finding.severity })).filter((finding): finding is DashboardFinding => finding.severity === "critical" || finding.severity === "error" || finding.severity === "warning" || finding.severity === "info")
    : [];
  return { repository: record.repository, profile: record.profile, score: record.score, status: record.status, findings, sourceFile };
}

export function parseDashboardReport(source: string, sourceFile = "report.json"): DashboardReport {
  return normalizeReport(JSON.parse(source) as unknown, sourceFile);
}

export function renderDashboardReport(reports: readonly DashboardReport[]): string {
  const ordered = [...reports].sort((left, right) => left.repository.localeCompare(right.repository));
  const average = ordered.length === 0 ? 0 : Math.round(ordered.reduce((sum, report) => sum + report.score, 0) / ordered.length);
  const counts = ordered.reduce((total, report) => {
    for (const finding of report.findings) total[finding.severity] += 1;
    return total;
  }, { critical: 0, error: 0, warning: 0, info: 0 });
  const rows = ordered.length === 0
    ? `<tr><td colspan="5" class="empty">No valid RepoSentinel reports were found.</td></tr>`
    : ordered.map((report) => `<tr><td><strong>${escapeHtml(report.repository)}</strong></td><td><code>${escapeHtml(report.profile)}</code></td><td><strong class="score-${report.score >= 90 ? "good" : report.score >= 75 ? "mid" : "risk"}">${report.score}/100</strong></td><td>${escapeHtml(report.status)}</td><td>${report.findings.length}</td></tr>`).join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>RepoSentinel Portfolio Dashboard</title><style>
:root{color-scheme:dark;--bg:#07111f;--panel:#0b1930;--panel2:#0f2740;--text:#e2e8f0;--muted:#94a3b8;--cyan:#67e8f9;--violet:#a78bfa;--green:#4ade80;--yellow:#facc15;--red:#fb7185}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 12% 0%,#102d49 0,#07111f 42%,#11102b 100%);color:var(--text);font:15px/1.5 ui-sans-serif,system-ui,sans-serif;padding:32px}main{max-width:1100px;margin:auto}.brand{font:700 22px ui-monospace,monospace;color:var(--cyan)}.brand span{color:var(--text)}.sub,.note{color:var(--muted)}.hero{margin-top:24px;border:1px solid #245276;border-radius:18px;background:linear-gradient(135deg,#0b1930,#11102b);padding:26px}.hero h1{margin:0 0 6px;font-size:26px}.summary{display:flex;gap:28px;align-items:end;flex-wrap:wrap}.average{font:700 48px ui-monospace,monospace;color:var(--cyan)}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:24px}.card{border:1px solid #1d3b58;border-radius:10px;background:#07111f;padding:12px}.card b{display:block;font:700 22px ui-monospace,monospace}.card.critical b,.card.error b{color:var(--red)}.card.warning b{color:var(--yellow)}.card.info b{color:var(--cyan)}section{margin-top:26px}h2{font-size:18px;color:var(--cyan)}.wrap{overflow:auto;border:1px solid #245276;border-radius:12px}table{width:100%;border-collapse:collapse;min-width:680px}th,td{padding:13px 14px;text-align:left;border-bottom:1px solid #1d3b58}th{background:var(--panel2);color:var(--cyan);font-size:12px;text-transform:uppercase;letter-spacing:.08em}tr:last-child td{border-bottom:0}.score-good{color:var(--green)}.score-mid{color:var(--yellow)}.score-risk{color:var(--red)}code{background:#07111f;border:1px solid #245276;border-radius:5px;padding:3px 6px;color:var(--cyan)}.empty{text-align:center;color:var(--muted);padding:28px}@media(max-width:700px){body{padding:16px}.cards{grid-template-columns:repeat(2,1fr)}}
</style></head><body><main><div class="brand">◈ <span>RepoSentinel</span></div><p class="sub">Local portfolio readiness dashboard · network off</p><div class="hero"><h1>Repository Portfolio</h1><div class="summary"><div class="average">${average}/100</div><div class="sub">Average readiness score across ${ordered.length} report(s)</div></div><div class="cards"><div class="card critical"><b>${counts.critical}</b>Critical</div><div class="card error"><b>${counts.error}</b>Error</div><div class="card warning"><b>${counts.warning}</b>Warning</div><div class="card info"><b>${counts.info}</b>Info</div></div></div><section><h2>Repositories</h2><div class="wrap"><table><thead><tr><th>Repository</th><th>Profile</th><th>Score</th><th>Status</th><th>Findings</th></tr></thead><tbody>${rows}</tbody></table></div></section><p class="note">This dashboard reads local RepoSentinel JSON reports only. It does not contact repositories, execute repository code, or provide a security audit.</p></main></body></html>\n`;
}
