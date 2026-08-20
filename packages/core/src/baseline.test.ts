import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createBaselineDocument,
  filterBaselineFindings,
  loadBaseline,
  writeBaseline
} from "./baseline.js";
import type { Finding } from "./index.js";

const finding: Finding = {
  ruleId: "documentation.quickstart",
  category: "documentation",
  severity: "warning",
  message: "Missing Quick Start",
  path: "README.md",
  line: 12,
  remediation: "Add a Quick Start section.",
  fingerprint: "documentation.quickstart:README.md:12"
};

describe("baseline", () => {
  it("creates a stable sorted fingerprint document and filters known findings", () => {
    const document = createBaselineDocument([finding, finding]);
    expect(document.schemaVersion).toBe("reposentinel.baseline/v1");
    expect(document.fingerprints).toEqual([finding.fingerprint]);
    expect(filterBaselineFindings([finding], new Set(document.fingerprints))).toEqual([]);
  });

  it("writes and loads a repository-local baseline", async () => {
    const root = await mkdtemp(join(tmpdir(), "reposentinel-baseline-"));
    const path = await writeBaseline(root, ".reposentinel/baseline.json", [finding]);
    expect(JSON.parse(await readFile(path, "utf8")).schemaVersion).toBe("reposentinel.baseline/v1");
    expect(await loadBaseline(root, ".reposentinel/baseline.json")).toEqual(new Set([finding.fingerprint]));
  });

  it("rejects a baseline path outside the repository root", async () => {
    const root = await mkdtemp(join(tmpdir(), "reposentinel-baseline-boundary-"));
    await expect(writeBaseline(root, "../baseline.json", [finding])).rejects.toThrow("inside the repository root");
  });
});
