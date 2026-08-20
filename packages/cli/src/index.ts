#!/usr/bin/env node

import { readdir } from "node:fs/promises";
import { dirname, resolve, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import pc from "picocolors";
import {
  createTranslator,
  isSupportedLocale,
  resolveLocale,
  supportedLocales,
  type Locale
} from "@reposentinel/i18n";

const VERSION = "0.1.0-dev.1";
const IGNORED_DIRECTORIES = new Set([".git", "node_modules", "dist", "coverage", ".reposentinel"]);

type Finding = {
  severity: "warning" | "info";
  ruleId: string;
  path: string;
  message: string;
  remediation: string;
};

type DiscoveryResult = {
  files: string[];
  ignored: number;
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

async function discover(root: string): Promise<DiscoveryResult> {
  const files: string[] = [];
  let ignored = 0;

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = resolve(directory, entry.name);
      const relativePath = relative(root, absolute) || entry.name;
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name)) {
          ignored += 1;
          continue;
        }
        await visit(absolute);
        continue;
      }
      if (entry.isFile()) files.push(relativePath);
    }
  }

  await visit(root);
  return { files: files.sort(), ignored };
}

function statusFor(score: number): "ready" | "almostReady" | "needsAttention" | "notReady" {
  if (score >= 90) return "ready";
  if (score >= 75) return "almostReady";
  if (score >= 50) return "needsAttention";
  return "notReady";
}

function renderCheck(
  locale: Locale,
  root: string,
  profile: string,
  result: DiscoveryResult,
  findings: Finding[],
  useColor: boolean
): string {
  const { t } = createTranslator(locale);
  const warningCount = findings.filter((finding) => finding.severity === "warning").length;
  const infoCount = findings.filter((finding) => finding.severity === "info").length;
  const score = Math.max(0, Math.min(100, 100 - warningCount * 5 - infoCount));
  const statusKey = statusFor(score);
  const status = t(`status.${statusKey}` as const);
  const passed = warningCount === 0;
  const resultLabel = passed ? t("result.passed") : t("result.passedWithWarnings");
  const brand = colorize(useColor, pc.cyan, "◈ RepoSentinel");
  const line = colorize(useColor, pc.dim, "──────────────────────────────────────────────────────────────");
  const warningLabel = colorize(useColor, pc.yellow, "warning");
  const infoLabel = colorize(useColor, pc.blue, "info");
  const scoreLabel = score >= 90 ? pc.green : score >= 75 ? pc.cyan : pc.yellow;
  const output: string[] = [
    brand,
    colorize(useColor, pc.dim, `  ${t("brand.tagline")}`),
    "",
    `${t("scan.repository")} : ${basename(root)}`,
    `${t("scan.profile")}    : ${profile}`,
    `${t("scan.mode")}       : local · network off · locale ${locale}`,
    "",
    colorize(useColor, pc.dim, "╭─ health snapshot ─────────────────────────────────────────────╮"),
    `│  ${colorize(useColor, scoreLabel, `${score} / 100`)}   ${status.toUpperCase()}`.padEnd(64, " ") + "│",
    `│  ${colorize(useColor, pc.dim, `${result.files.length} files · ${result.ignored} ignored`)}`.padEnd(64, " ") + "│",
    colorize(useColor, pc.dim, "╰────────────────────────────────────────────────────────────────╯"),
    "",
    `${t("scan.findings")}  ${line}`
  ];

  if (findings.length === 0) {
    output.push(colorize(useColor, pc.green, `✓ ${t("scan.noFindings")}`));
  } else {
    for (const finding of findings) {
      const marker = finding.severity === "warning" ? "!" : "◇";
      const severity = finding.severity === "warning" ? warningLabel : infoLabel;
      output.push(`${colorize(useColor, finding.severity === "warning" ? pc.yellow : pc.blue, marker)}  ${finding.ruleId}  ${finding.path}  ${severity}`);
      output.push(`   ${finding.message}`);
      output.push(`   ${colorize(useColor, pc.dim, `Fix: ${finding.remediation}`)}`);
    }
  }

  output.push("", `${t("scan.score")}  : ${score} / 100`, `${t("scan.status")} : ${status}`, `${t("scan.result")} : ${resultLabel}`);
  return `${output.join("\n")}\n`;
}

async function runCheck(
  locale: Locale,
  target: string,
  profile: string,
  useColor: boolean,
  stderr: NodeJS.WriteStream = process.stderr
): Promise<number> {
  const { t } = createTranslator(locale);
  const root = resolve(target);
  let result: DiscoveryResult;
  try {
    result = await discover(root);
  } catch {
    stderr.write(`${colorize(useColor, pc.red, "×")} ${t("error.invalidPath", { path: root })}\n`);
    return 2;
  }

  const files = new Set(result.files);
  const findings: Finding[] = [];
  if (!files.has("README.md")) {
    findings.push({
      severity: "warning",
      ruleId: "documentation.readme-exists",
      path: "README.md",
      message: locale === "id" ? "README.md tidak ditemukan di root repository." : "README.md was not found at the repository root.",
      remediation: locale === "id" ? "Tambahkan README.md dengan ringkasan dan Quick Start." : "Add README.md with a summary and Quick Start."
    });
  }
  if (!files.has(".gitignore")) {
    findings.push({
      severity: "info",
      ruleId: "gitignore.exists",
      path: ".gitignore",
      message: locale === "id" ? ".gitignore belum ditemukan." : ".gitignore was not found.",
      remediation: locale === "id" ? "Tambahkan pola ignore yang relevan sebelum commit." : "Add relevant ignore patterns before committing."
    });
  }

  process.stdout.write(renderCheck(locale, root, profile, result, findings, useColor));
  return findings.some((finding) => finding.severity === "warning") ? 0 : 0;
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
    .option("--no-color", "Disable ANSI color output")
    .action(async (target = ".", options: { profile: string; lang?: string; color?: boolean }) => {
      const selected = resolveLocale(options.lang ?? locale);
      const exitCode = await runCheck(selected, target, options.profile, options.color !== false);
      process.exitCode = exitCode;
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
        const marker = supported === selected ? "›" : " ";
        process.stdout.write(`${marker} ${supported}\n`);
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
