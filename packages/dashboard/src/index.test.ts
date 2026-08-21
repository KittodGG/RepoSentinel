import { describe, expect, it } from "vitest";
import { parseDashboardReport, renderDashboardReport } from "./index.js";

describe("dashboard", () => {
  it("parses report metadata and renders deterministic repository ordering", () => {
    const first = parseDashboardReport(JSON.stringify({ schemaVersion: "reposentinel.report/v1", repository: "zeta", profile: "public", score: 80, status: "almost-ready", findings: [{ severity: "warning" }] }), "zeta.json");
    const second = parseDashboardReport(JSON.stringify({ schemaVersion: "reposentinel.report/v1", repository: "alpha", profile: "portfolio", score: 100, status: "ready", findings: [] }), "alpha.json");
    const output = renderDashboardReport([first, second]);
    expect(output.indexOf("alpha")).toBeLessThan(output.indexOf("zeta"));
    expect(output).toContain("90/100");
    expect(output).toContain("Repository Portfolio");
  });

  it("rejects unsupported report schemas and escapes repository names", () => {
    expect(() => parseDashboardReport(JSON.stringify({ schemaVersion: "wrong" }), "bad.json")).toThrow("unsupported schema");
    const report = parseDashboardReport(JSON.stringify({ schemaVersion: "reposentinel.report/v1", repository: "<script>", profile: "public", score: 0, status: "not-ready", findings: [] }));
    const output = renderDashboardReport([report]);
    expect(output).toContain("&lt;script&gt;");
    expect(output).not.toContain("<script>");
  });
});
