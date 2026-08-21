import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import type { ReportFormat, RepositoryProfile, ResolvedConfig, Severity } from "@reposentinel/core";

const severitySchema = z.enum(["critical", "error", "warning", "info", "off"]);
const profileSchema = z.enum(["public", "portfolio", "npm-package"]);
const reportFormatSchema = z.enum(["terminal", "markdown", "json", "sarif", "html"]);

const rawConfigSchema = z.object({
  extends: z.string().optional(),
  baseline: z.string().optional(),
  profile: profileSchema.optional(),
  rules: z.record(z.string(), severitySchema).optional(),
  ignore: z.array(z.string()).optional(),
  report: z.object({
    formats: z.array(reportFormatSchema).optional(),
    output_dir: z.string().optional()
  }).optional(),
  security: z.object({
    network: z.boolean().optional(),
    scan_history: z.boolean().optional(),
    redact_findings: z.boolean().optional()
  }).optional(),
  ci: z.object({ fail_on: z.enum(["critical", "error", "warning", "info"]).optional() }).optional()
}).strict();

export type ConfigLoadResult = {
  config: ResolvedConfig;
  path?: string;
};

export const defaultIgnore = ["node_modules/**", "dist/**", "coverage/**", ".reposentinel/**"] as const;

export function defaultConfig(profile: RepositoryProfile = "public"): ResolvedConfig {
  return {
    profile,
    report: { formats: ["terminal", "markdown", "json"] },
    ignore: [...defaultIgnore],
    rules: {},
    ciFailOn: "error",
    security: {
      network: false,
      scanHistory: false,
      redactFindings: true
    }
  };
}

function resolveConfig(root: string, raw: z.infer<typeof rawConfigSchema>, profileOverride?: RepositoryProfile): ResolvedConfig {
  const profile = profileOverride ?? raw.profile ?? "public";
  const defaults = defaultConfig(profile);
  return {
    profile,
    ...(raw.baseline ? { baseline: raw.baseline } : {}),
    report: {
      formats: (raw.report?.formats ?? ["terminal", "markdown", "json"]) as ReportFormat[],
      ...(raw.report?.output_dir ? { outputDir: raw.report.output_dir } : {})
    },
    ignore: [...defaults.ignore, ...(raw.ignore ?? [])],
    rules: raw.rules ?? {},
    ciFailOn: raw.ci?.fail_on ?? defaults.ciFailOn,
    security: {
      network: raw.security?.network ?? defaults.security.network,
      scanHistory: raw.security?.scan_history ?? defaults.security.scanHistory,
      redactFindings: raw.security?.redact_findings ?? defaults.security.redactFindings
    }
  };
}

export async function loadConfig(root: string, profileOverride?: RepositoryProfile): Promise<ConfigLoadResult> {
  const path = join(root, ".reposentinel.yml");
  try {
    await access(path);
  } catch {
    return { config: defaultConfig(profileOverride) };
  }
  const source = await readFile(path, "utf8");
  const parsed = rawConfigSchema.parse(parse(source) ?? {});
  return { config: resolveConfig(root, parsed, profileOverride), path };
}

export function severityOverride(config: ResolvedConfig, ruleId: string, fallback: Severity): Severity | "off" {
  return config.rules[ruleId] ?? fallback;
}
