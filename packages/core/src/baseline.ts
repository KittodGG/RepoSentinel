import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import type { Finding } from "./index.js";

export const BASELINE_SCHEMA = "reposentinel.baseline/v1";

type BaselineDocument = {
  schemaVersion: typeof BASELINE_SCHEMA;
  fingerprints: string[];
};

function safeBaselinePath(root: string, baselinePath: string): string {
  const resolvedRoot = resolve(root);
  const resolvedPath = resolve(resolvedRoot, baselinePath);
  const relativePath = relative(resolvedRoot, resolvedPath);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error("Baseline path must remain inside the repository root.");
  }
  return resolvedPath;
}

export function createBaselineDocument(findings: readonly Finding[], options: { allowCritical?: boolean } = {}): BaselineDocument {
  if (!options.allowCritical && findings.some((finding) => finding.severity === "critical")) {
    throw new Error("Baseline cannot include critical findings unless --allow-critical is explicitly selected.");
  }
  return {
    schemaVersion: BASELINE_SCHEMA,
    fingerprints: [...new Set(findings.map((finding) => finding.fingerprint).filter((value): value is string => Boolean(value)))].sort()
  };
}

export function filterBaselineFindings(findings: readonly Finding[], fingerprints: ReadonlySet<string>): Finding[] {
  return findings.filter((finding) => !finding.fingerprint || !fingerprints.has(finding.fingerprint));
}

export async function loadBaseline(root: string, baselinePath: string): Promise<ReadonlySet<string>> {
  const path = safeBaselinePath(root, baselinePath);
  try {
    await access(path);
  } catch {
    return new Set();
  }
  const parsed = JSON.parse(await readFile(path, "utf8")) as Partial<BaselineDocument>;
  if (parsed.schemaVersion !== BASELINE_SCHEMA || !Array.isArray(parsed.fingerprints) || parsed.fingerprints.some((value) => typeof value !== "string")) {
    throw new Error(`Invalid baseline schema at ${path}.`);
  }
  return new Set(parsed.fingerprints);
}

export async function writeBaseline(root: string, baselinePath: string, findings: readonly Finding[], options: { allowCritical?: boolean } = {}): Promise<string> {
  const path = safeBaselinePath(root, baselinePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(createBaselineDocument(findings, options), null, 2)}\n`, "utf8");
  return path;
}
