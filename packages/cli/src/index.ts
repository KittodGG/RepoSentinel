#!/usr/bin/env node

import { basename, resolve } from "node:path";
import { access, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import * as prompts from "@clack/prompts";
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
import { rules as ruleDefinitions, runRules } from "@reposentinel/rules";
import { renderJsonReport as renderJsonReportExternal, renderMarkdownReport as renderMarkdownReportExternal, renderTerminalReport as renderTerminalReportExternal } from "@reposentinel/reporters";
import {
  createTranslator,
  isSupportedLocale,
  resolveLocale,
  supportedLocales,
  type Locale
} from "@reposentinel/i18n";

const VERSION = "0.1.0-alpha.1";
const profiles = ["public", "portfolio", "npm-package"] as const;
const thresholds = ["critical", "error", "warning", "info"] as const;

type OutputFormat = "terminal" | "json" | "markdown";

type CheckOptions = {
  profile: string;
  lang?: string;
  color?: boolean;
  failOn: string;
  format: OutputFormat;
  output?: string;
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

  const report = options.format === "json"
    ? renderJsonReportExternal({ locale, repository: basename(root), profile, findings, threshold })
    : options.format === "markdown"
      ? renderMarkdownReportExternal({ locale, repository: basename(root), profile, findings, threshold })
      : renderTerminalReportExternal({
      locale,
      repository: basename(root),
      profile,
      filesScanned: context.files.length,
      ignoredCount: context.ignoredCount,
      findings,
      threshold,
      color: options.color !== false
    });
  if (options.output) {
    await writeFile(resolve(options.output), report, "utf8");
    process.stderr.write(`Report written to ${resolve(options.output)}\n`);
  } else {
    process.stdout.write(report);
  }
  return summary.exitCode;
}

async function runInit(locale: Locale, target: string, force: boolean): Promise<number> {
  const { t } = createTranslator(locale);
  const root = resolve(target);
  const configPath = resolve(root, ".reposentinel.yml");
  if (!force) {
    try {
      await access(configPath);
      process.stderr.write(`Configuration already exists at ${configPath}. Use --force to replace it.\n`);
      return 2;
    } catch {
      // The file does not exist; continue with the wizard.
    }
  }
  if (!process.stdin.isTTY || process.env.CI) {
    process.stderr.write("Interactive init requires a TTY. Use --force with a prepared config in CI.\n");
    return 2;
  }
  prompts.intro(t("init.title"));
  const selected = await prompts.select({
    message: t("init.profileQuestion"),
    options: profiles.map((profile) => ({ value: profile, label: profile }))
  });
  if (prompts.isCancel(selected)) {
    prompts.cancel(t("init.cancelled"));
    return 130;
  }
  await writeFile(configPath, [
    "extends: recommended",
    `profile: ${String(selected)}`,
    "",
    "security:",
    "  network: false",
    "  scan_history: false",
    "  redact_findings: true",
    "",
    "ci:",
    "  fail_on: error",
    ""
  ].join("\\n"), "utf8");
  prompts.outro(t("init.created", { path: configPath }));
  return 0;
}

function renderRules(locale: Locale, category?: string): string {
  const { t } = createTranslator(locale);
  const selected = ruleDefinitions.filter((rule) => !category || rule.category === category);
  const lines = [`${t("rules.header")} (${selected.length})`, ""];
  for (const rule of selected) lines.push(`  ${rule.id.padEnd(34)} ${rule.defaultSeverity.padEnd(8)} ${rule.category}`);
  return `${lines.join("\n")}\n`;
}

function renderRuleExplanation(locale: Locale, ruleId: string): string | undefined {
  const { t } = createTranslator(locale);
  const rule = ruleDefinitions.find((candidate) => candidate.id === ruleId);
  if (!rule) return undefined;
  return [
    t("explain.header", { ruleId: rule.id }),
    "",
    `${rule.title}`,
    `${t("explain.category")}: ${rule.category}`,
    `${t("explain.severity")}: ${rule.defaultSeverity}`,
    `Profiles: ${rule.profiles.join(", ")}`,
    `${t("explain.remediation")}: see finding-specific remediation in the report.`
  ].join("\n") + "\n";
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
    .alias("report")
    .description(t("cli.command.check"))
    .option("--profile <profile>", "Repository profile", "public")
    .option("--lang <locale>", t("cli.option.lang"))
    .option("--fail-on <severity>", "Exit threshold", "error")
    .option("--format <format>", "Output format: terminal, markdown, json", "terminal")
    .option("--output <file>", "Write the report to a file")
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
      if (options.format !== "terminal" && options.format !== "markdown" && options.format !== "json") {
        process.stderr.write(`Unsupported format: ${options.format}. Use: terminal, markdown, json.\n`);
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

  program
    .command("init [path]")
    .description(t("cli.command.init"))
    .option("--force", "Replace an existing .reposentinel.yml")
    .option("--lang <locale>", t("cli.option.lang"))
    .action(async (target = ".", options: { force?: boolean; lang?: string }) => {
      const selected = resolveLocale(options.lang ?? locale);
      process.exitCode = await runInit(selected, target, options.force === true);
    });

  program
    .command("rules")
    .description(t("cli.command.rules"))
    .option("--category <category>", "Filter by rule category")
    .option("--lang <locale>", t("cli.option.lang"))
    .action((options: { category?: string; lang?: string }) => {
      const selected = resolveLocale(options.lang ?? locale);
      process.stdout.write(renderRules(selected, options.category));
    });

  program
    .command("explain <ruleId>")
    .description(t("cli.command.explain"))
    .option("--lang <locale>", t("cli.option.lang"))
    .action((ruleId: string, options: { lang?: string }) => {
      const selected = resolveLocale(options.lang ?? locale);
      const explanation = renderRuleExplanation(selected, ruleId);
      if (!explanation) {
        process.stderr.write(`${createTranslator(selected).t("explain.notFound", { ruleId })}\n`);
        process.exitCode = 2;
        return;
      }
      process.stdout.write(explanation);
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
