#!/usr/bin/env node

import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { access, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import * as prompts from "@clack/prompts";
import pc from "picocolors";
import {
  createRepositoryContext,
  filterBaselineFindings,
  readChangedPaths,
  loadBaseline,
  summarizeFindings,
  writeBaseline,
  type ExitThreshold,
  type Finding,
  type RepositoryProfile,
  type ScoreStatus
} from "@reposentinel/core";
import { loadConfig } from "@reposentinel/config";
import { rules as ruleDefinitions, runRules } from "@reposentinel/rules";
import { renderHtmlReport as renderHtmlReportExternal, renderJsonReport as renderJsonReportExternal, renderMarkdownReport as renderMarkdownReportExternal, renderSarifReport as renderSarifReportExternal, renderTerminalReport as renderTerminalReportExternal } from "@reposentinel/reporters";
import {
  createTranslator,
  isSupportedLocale,
  resolveLocale,
  supportedLocales,
  type Locale
} from "@reposentinel/i18n";

const VERSION = "0.1.0-beta.1";
const profiles = ["public", "portfolio", "npm-package"] as const;
const thresholds = ["critical", "error", "warning", "info"] as const;

type OutputFormat = "terminal" | "json" | "markdown" | "sarif" | "html";

type CheckOptions = {
  profile: string;
  lang?: string;
  color?: boolean;
  failOn: string;
  format?: OutputFormat;
  output?: string;
  baseline?: string;
  changedSince?: string;
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

function resolveInsideRepository(root: string, candidate: string): string {
  const resolved = resolve(root, candidate);
  const relativePath = relative(root, resolved);
  if (isAbsolute(relativePath) || relativePath === ".." || relativePath.startsWith(".." + "/") || relativePath.startsWith(".." + "\\")) {
    throw new Error(`Configured report output directory must stay inside the repository: ${candidate}`);
  }
  return resolved;
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

type ScanData = {
  root: string;
  profile: RepositoryProfile;
  threshold: ExitThreshold;
  context: Awaited<ReturnType<typeof createRepositoryContext>>;
  findings: Finding[];
  changedSince?: string;
  changedFiles?: readonly string[];
};

async function collectScan(target: string, profile: RepositoryProfile, threshold: ExitThreshold, applyBaseline = true, baselineOverride?: string, changedSince?: string): Promise<ScanData> {
  const root = resolve(target);
  const loaded = await loadConfig(root, profile);
  const config = { ...loaded.config, ciFailOn: threshold };
  const context = await createRepositoryContext(root, profile, config);
  const rawFindings = runRules(context);
  const changed = changedSince ? await readChangedPaths(root, changedSince) : undefined;
  const changedSet = changed ? new Set(changed.paths) : undefined;
  const scopedFindings = changedSet
    ? rawFindings.filter((finding) => !finding.path || changedSet.has(finding.path))
    : rawFindings;
  const baselinePath = baselineOverride ?? config.baseline ?? ".reposentinel/baseline.json";
  const baseline = applyBaseline ? await loadBaseline(root, baselinePath) : new Set<string>();
  return {
    root,
    profile,
    threshold,
    context,
    findings: filterBaselineFindings(scopedFindings, baseline),
    ...(changed ? { changedSince: changed.baseRef, changedFiles: changed.paths } : {})
  };
}

async function runCheck(locale: Locale, target: string, options: CheckOptions): Promise<number> {
  const profile = options.profile as RepositoryProfile;
  const threshold = options.failOn as ExitThreshold;
  const root = resolve(target);

  try {
    await access(root);
    const scan = await collectScan(target, profile, threshold, true, options.baseline, options.changedSince);
    const summary = summarizeFindings(scan.findings, threshold);
    const changedOptions = scan.changedSince ? { changedSince: scan.changedSince, changedFiles: scan.changedFiles ?? [] } : {};
    const renderReport = (format: OutputFormat): string => format === "json"
      ? renderJsonReportExternal({ locale, repository: basename(scan.root), profile, findings: scan.findings, threshold, ...changedOptions })
      : format === "markdown"
        ? renderMarkdownReportExternal({ locale, repository: basename(scan.root), profile, findings: scan.findings, threshold, ...changedOptions })
        : format === "sarif"
          ? renderSarifReportExternal({ locale, repository: basename(scan.root), profile, findings: scan.findings, threshold, ...changedOptions })
          : format === "html"
            ? renderHtmlReportExternal({ locale, repository: basename(scan.root), profile, findings: scan.findings, threshold, ...changedOptions })
            : renderTerminalReportExternal({
              locale,
              repository: basename(scan.root),
              profile,
              filesScanned: scan.context.files.length,
              ignoredCount: scan.context.ignoredCount,
              findings: scan.findings,
              threshold,
              ...changedOptions,
              color: options.color !== false
            });
    if (options.output) {
      const reportPath = resolve(options.output);
      await mkdir(dirname(reportPath), { recursive: true });
      await writeFile(reportPath, renderReport(options.format ?? "terminal"), "utf8");
      process.stderr.write(`Report written to ${reportPath}\n`);
    } else if (options.format) {
      process.stdout.write(renderReport(options.format));
    } else {
      process.stdout.write(renderReport("terminal"));
      const outputDir = scan.context.config.report?.outputDir;
      if (outputDir) {
        const reportDir = resolveInsideRepository(scan.root, outputDir);
        await mkdir(reportDir, { recursive: true });
        const configuredFormats = scan.context.config.report?.formats ?? ["terminal"];
        const extensions: Record<OutputFormat, string> = { terminal: "txt", markdown: "md", json: "json", sarif: "sarif", html: "html" };
        for (const format of configuredFormats) {
          await writeFile(resolve(reportDir, `reposentinel-report.${extensions[format]}`), renderReport(format), "utf8");
        }
        process.stderr.write(`Reports written to ${reportDir}\n`);
      }
    }
    return summary.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${colorize(options.color !== false, pc.red, "×")} ${message}\n`);
    return 2;
  }
}

function starterConfig(profile: RepositoryProfile): string {
  return [
    "extends: recommended",
    `profile: ${profile}`,
    "",
    "security:",
    "  network: false",
    "  scan_history: false",
    "  redact_findings: true",
    "",
    "ci:",
    "  fail_on: error",
    ""
  ].join("\n");
}

async function runInit(locale: Locale, target: string, force: boolean, profile: RepositoryProfile): Promise<number> {
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
    if (!force) {
      process.stderr.write("Interactive init requires a TTY. Use --force to create a default config in CI.\n");
      return 2;
    }
    await writeFile(configPath, starterConfig(profile), "utf8");
    process.stdout.write(`${t("init.created", { path: configPath })}\n`);
    return 0;
  }
  prompts.intro(t("init.title"));
  const selected = await prompts.select({
    message: t("init.profileQuestion"),
    options: profiles.map((value) => ({ value, label: value })),
    initialValue: profile
  });
  if (prompts.isCancel(selected)) {
    prompts.cancel(t("init.cancelled"));
    return 130;
  }
  await writeFile(configPath, starterConfig(String(selected) as RepositoryProfile), "utf8");
  prompts.outro(t("init.created", { path: configPath }));
  return 0;
}

async function runBaselineCreate(locale: Locale, target: string, profile: RepositoryProfile, output?: string): Promise<number> {
  const { t } = createTranslator(locale);
  try {
    const scan = await collectScan(target, profile, "error", false);
    const path = await writeBaseline(scan.root, output ?? ".reposentinel/baseline.json", scan.findings);
    process.stdout.write(`${t("baseline.created", { path, count: scan.findings.length })}\n`);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${colorize(true, pc.red, "×")} ${message}\n`);
    return 2;
  }
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
    .option("--format <format>", "Output format: terminal, markdown, json, sarif, html")
    .option("--output <file>", "Write the report to a file")
    .option("--baseline <file>", "Baseline path relative to the repository root")
    .option("--changed-since <ref>", "Only report findings on files changed since a Git base ref")
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
      if (options.format && options.format !== "terminal" && options.format !== "markdown" && options.format !== "json" && options.format !== "sarif" && options.format !== "html") {
        process.stderr.write(`Unsupported format: ${options.format}. Use: terminal, markdown, json, sarif, html.\n`);
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
    .option("--profile <profile>", "Repository profile", "public")
    .option("--lang <locale>", t("cli.option.lang"))
    .action(async (target = ".", options: { force?: boolean; profile?: string; lang?: string }) => {
      const selectedProfile = options.profile ?? "public";
      if (!profiles.includes(selectedProfile as RepositoryProfile)) {
        process.stderr.write(`Unknown profile: ${selectedProfile}. Use: ${profiles.join(", ")}\n`);
        process.exitCode = 2;
        return;
      }
      const selected = resolveLocale(options.lang ?? locale);
      process.exitCode = await runInit(selected, target, options.force === true, selectedProfile as RepositoryProfile);
    });

  program
    .command("baseline <action> [path]")
    .description(t("cli.command.baseline"))
    .option("--profile <profile>", "Repository profile", "public")
    .option("--lang <locale>", t("cli.option.lang"))
    .option("--output <file>", "Baseline output path", ".reposentinel/baseline.json")
    .action(async (action: string, target = ".", options: { profile?: string; lang?: string; output?: string }) => {
      if (action !== "create") {
        process.stderr.write(`Unsupported baseline action: ${action}. Use: create.\n`);
        process.exitCode = 2;
        return;
      }
      const selectedProfile = options.profile ?? "public";
      if (!profiles.includes(selectedProfile as RepositoryProfile)) {
        process.stderr.write(`Unknown profile: ${selectedProfile}. Use: ${profiles.join(", ")}\n`);
        process.exitCode = 2;
        return;
      }
      const selected = resolveLocale(options.lang ?? locale);
      process.exitCode = await runBaselineCreate(selected, target, selectedProfile as RepositoryProfile, options.output);
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
