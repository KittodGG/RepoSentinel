#!/usr/bin/env node

import { basename, resolve } from "node:path";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import pc from "picocolors";
import {
  createRepositoryContext,
  summarizeFindings,
  type ExitThreshold,
  type Finding,
  type RepositoryProfile,
  type ScoreStatus
} from "@reposentinel/core";
import { loadConfig } from "@reposentinel/config";
import { runRules } from "@reposentinel/rules";
import { renderJsonReport as renderJsonReportExternal, renderTerminalReport as renderTerminalReportExternal } from "@reposentinel/reporters";
import {
  createTranslator,
  isSupportedLocale,
  resolveLocale,
  supportedLocales,
  type Locale
} from "@reposentinel/i18n";

const VERSION = "0.1.0-dev.1";
const profiles = ["public", "portfolio", "npm-package"] as const;
const thresholds = ["critical", "error", "warning", "info"] as const;

type OutputFormat = "terminal" | "json";

type CheckOptions = {
  profile: string;
  lang?: string;
  color?: boolean;
  failOn: string;
  format: OutputFormat;
};

function explicitLocale(argv: string[]): string | undefined {
  const index = argv.findIndex((value) => value === "--lang");
  if (index >= 0) return argv[index + 1];
  const inline = argv.find((value) => value.startsWith("--lang="));
  return inline?.slice("--lang=".length);
}

function colorize(enabled: boolean, color: (value: string) => string, value: string): string {
  return enabled ? color(value) : value;
}

function statusMessageKey(status: ScoreStatus): "status.ready" | "status.almostReady" | "status.needsAttention" | "status.notReady" {
  switch (status) {
    case "ready": return "status.ready";
    case "almost-ready": return "status.almostReady";
    case "needs-attention": return "status.needsAttention";
    case "not-ready": return "status.notReady";
  }
}

function renderTerminal(
  locale: Locale,
  root: string,
  profile: RepositoryProfile,
  ignoredCount: number,
  filesScanned: number,
  findings: readonly Finding[],
  threshold: ExitThreshold,
  useColor: boolean
): string {
  const { t } = createTranslator(locale);
  const summary = summarizeFindings(findings, threshold);
  const scoreColor = summary.score >= 90 ? pc.green : summary.score >= 75 ? pc.cyan : pc.yellow;
  const status = t(statusMessageKey(summary.status));
  const resultLabel = summary.exitCode === 1 ? t("result.failed") : summary.counts.warning > 0 ? t("result.passedWithWarnings") : t("result.passed");
  const line = colorize(useColor, pc.dim, "──────────────────────────────────────────────────────────────");
  const output = [
    colorize(useColor, pc.cyan, "◈ RepoSentinel"),
    colorize(useColor, pc.dim, `  ${t("brand.tagline")}`),
    "",
    `${t("scan.repository")} : ${basename(root)}`,
    `${t("scan.profile")}    : ${profile}`,
    `${t("scan.mode")}       : local · network off · locale ${locale}`,
    "",
    colorize(useColor, pc.dim, "╭─ health snapshot ─────────────────────────────────────────────╮"),
    `│  ${colorize(useColor, scoreColor, `${summary.score} / 100`)}   ${status.toUpperCase()}`.padEnd(64, " ") + "│",
    `│  ${colorize(useColor, pc.dim, `${filesScanned} files · ${ignoredCount} ignored · threshold ${threshold}`)}`.padEnd(64, " ") + "│",
    colorize(useColor, pc.dim, "╰────────────────────────────────────────────────────────────────╯"),
    "",
    `${t("scan.findings")}  ${line}`,
    `${colorize(useColor, pc.red, "CRITICAL")} ${summary.counts.critical}   ${colorize(useColor, pc.red, "ERROR")} ${summary.counts.error}   ${colorize(useColor, pc.yellow, "WARNING")} ${summary.counts.warning}   ${colorize(useColor, pc.blue, "INFO")} ${summary.counts.info}`
  ];

  if (findings.length === 0) {
    output.push(colorize(useColor, pc.green, `✓ ${t("scan.noFindings")}`));
  } else {
    for (const finding of findings) {
      const marker = finding.severity === "critical" || finding.severity === "error" ? "×" : finding.severity === "warning" ? "!" : "◇";
      const markerColor = finding.severity === "critical" || finding.severity === "error" ? pc.red : finding.severity === "warning" ? pc.yellow : pc.blue;
      const location = finding.path ? `${finding.path}${finding.line ? `:${finding.line}` : ""}` : "repository";
      output.push("", `${colorize(useColor, markerColor, marker)}  ${finding.ruleId}  ${location}  ${finding.severity}`);
      output.push(`   ${finding.message}`);
      if (finding.evidence) output.push(`   ${colorize(useColor, pc.dim, `Evidence: ${finding.evidence}`)}`);
      output.push(`   ${colorize(useColor, pc.dim, `Fix: ${finding.remediation}`)}`);
    }
  }

  output.push("", `${t("scan.score")}  : ${summary.score} / 100`, `${t("scan.status")} : ${status}`, `${t("scan.result")} : ${resultLabel}`, `Exit code : ${summary.exitCode}`);
  return `${output.join("\n")}\n`;
}

function renderJson(
  locale: Locale,
  root: string,
  profile: RepositoryProfile,
  findings: readonly Finding[],
  threshold: ExitThreshold
): string {
  const summary = summarizeFindings(findings, threshold);
  return `${JSON.stringify({
    schemaVersion: "reposentinel.report/v1",
    locale,
    repository: basename(root),
    profile,
    score: summary.score,
    status: summary.status,
    threshold,
    summary: summary.counts,
    findings
  }, null, 2)}\n`;
}

async function runCheck(locale: Locale, target: string, options: CheckOptions): Promise<number> {
  const { t } = createTranslator(locale);
  const root = resolve(target);
  const profile = options.profile as RepositoryProfile;
  const threshold = options.failOn as ExitThreshold;

  try {
    await access(root);
  } catch {
    process.stderr.write(`${colorize(options.color !== false, pc.red, "×")} ${t("error.invalidPath", { path: root })}\n`);
    return 2;
  }

  const loaded = await loadConfig(root, profile);
  const config = { ...loaded.config, ciFailOn: threshold };
  const context = await createRepositoryContext(root, profile, config);
  const findings = runRules(context);
  const summary = summarizeFindings(findings, threshold);

  if (options.format === "json") {
    process.stdout.write(renderJsonReportExternal({ locale, repository: basename(root), profile, findings, threshold }));
  } else {
    process.stdout.write(renderTerminalReportExternal({
      locale,
      repository: basename(root),
      profile,
      filesScanned: context.files.length,
      ignoredCount: context.ignoredCount,
      findings,
      threshold,
      color: options.color !== false
    }));
  }
  return summary.exitCode;
}

function buildProgram(locale: Locale): Command {
  const { t } = createTranslator(locale);
  const program = new Command();
  program
    .name("reposentinel")
    .description(t("cli.help"))
    .version(VERSION, "-v, --version", t("cli.version", { version: VERSION }))
    .option("--lang <locale>", t("cli.option.lang"), locale)
    .option("--no-color", "Disable ANSI color output");

  program
    .command("check [path]")
    .description(t("cli.command.check"))
    .option("--profile <profile>", "Repository profile", "public")
    .option("--lang <locale>", t("cli.option.lang"))
    .option("--fail-on <severity>", "Exit threshold", "error")
    .option("--format <format>", "Output format", "terminal")
    .option("--no-color", "Disable ANSI color output")
    .action(async (target = ".", options: CheckOptions) => {
      if (!profiles.includes(options.profile as RepositoryProfile)) {
        process.stderr.write(`Unknown profile: ${options.profile}. Use: ${profiles.join(", ")}\n`);
        process.exitCode = 2;
        return;
      }
      if (!thresholds.includes(options.failOn as ExitThreshold)) {
        process.stderr.write(`Unknown threshold: ${options.failOn}. Use: ${thresholds.join(", ")}\n`);
        process.exitCode = 2;
        return;
      }
      if (options.format !== "terminal" && options.format !== "json") {
        process.stderr.write(`Unsupported format: ${options.format}. Use: terminal, json.\n`);
        process.exitCode = 2;
        return;
      }
      const selected = resolveLocale(options.lang ?? locale);
      process.exitCode = await runCheck(selected, target, options);
    });

  program
    .command("lang [locale]")
    .description(t("cli.command.lang"))
    .action((requested?: string) => {
      if (requested && !isSupportedLocale(requested)) {
        process.stderr.write(`${t("error.invalidLocale", { locale: requested })}\n`);
        process.exitCode = 2;
        return;
      }
      const selected = requested ? resolveLocale(requested) : locale;
      const selectedTranslator = createTranslator(selected);
      process.stdout.write(`${selectedTranslator.t("brand.tagline")}\n\n`);
      for (const supported of supportedLocales) {
        process.stdout.write(`${supported === selected ? "›" : " "} ${supported}\n`);
      }
    });

  return program;
}

export async function main(argv = process.argv): Promise<void> {
  const explicit = explicitLocale(argv);
  if (explicit && !isSupportedLocale(explicit.split(/[-_]/u)[0] ?? "")) {
    process.stderr.write(`${createTranslator("en").t("error.invalidLocale", { locale: explicit })}\n`);
    process.exitCode = 2;
    return;
  }
  const locale = resolveLocale(explicit);
  await buildProgram(locale).parseAsync(argv);
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === currentFile) {
  await main();
}
