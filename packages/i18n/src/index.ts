export const supportedLocales = ["en", "id"] as const;

export type Locale = (typeof supportedLocales)[number];

export type MessageKey =
  | "brand.tagline"
  | "brand.description"
  | "cli.help"
  | "cli.version"
  | "cli.usage"
  | "cli.command.check"
  | "cli.command.lang"
  | "cli.option.lang"
  | "scan.started"
  | "scan.completed"
  | "scan.repository"
  | "scan.profile"
  | "scan.mode"
  | "scan.files"
  | "scan.ignored"
  | "scan.score"
  | "scan.status"
  | "scan.findings"
  | "scan.noFindings"
  | "scan.result"
  | "status.ready"
  | "status.almostReady"
  | "status.needsAttention"
  | "status.notReady"
  | "result.passed"
  | "result.passedWithWarnings"
  | "result.failed"
  | "finding.warning"
  | "finding.error"
  | "finding.critical"
  | "finding.info"
  | "error.invalidLocale"
  | "error.invalidPath";

type MessageValue = string | ((vars: Record<string, string | number>) => string);

type Catalog = Record<MessageKey, MessageValue>;

const catalogs: Record<Locale, Catalog> = {
  en: {
    "brand.tagline": "repository readiness, without the noise",
    "brand.description": "Check your repository before others judge it.",
    "cli.help": "A local-first repository readiness scanner.",
    "cli.version": "RepoSentinel version {version}",
    "cli.usage": "Usage: reposentinel <command> [options]",
    "cli.command.check": "Scan a repository",
    "cli.command.lang": "List or inspect supported UI languages",
    "cli.option.lang": "UI language: en or id",
    "scan.started": "Scan started",
    "scan.completed": "Scan completed",
    "scan.repository": "Repository",
    "scan.profile": "Profile",
    "scan.mode": "Mode",
    "scan.files": "Files scanned",
    "scan.ignored": "Files ignored",
    "scan.score": "Score",
    "scan.status": "Status",
    "scan.findings": "Findings",
    "scan.noFindings": "No findings.",
    "scan.result": "Result",
    "status.ready": "ready",
    "status.almostReady": "almost ready",
    "status.needsAttention": "needs attention",
    "status.notReady": "not ready",
    "result.passed": "passed",
    "result.passedWithWarnings": "passed with warnings",
    "result.failed": "failed",
    "finding.warning": "warning",
    "finding.error": "error",
    "finding.critical": "critical",
    "finding.info": "info",
    "error.invalidLocale": ({ locale }) => `Unsupported locale "${locale}". Use: en, id.`,
    "error.invalidPath": ({ path }) => `Target path does not exist: ${path}`
  },
  id: {
    "brand.tagline": "kesiapan repository, tanpa kebisingan",
    "brand.description": "Cek repository Anda sebelum orang lain menilainya.",
    "cli.help": "Scanner kesiapan repository yang local-first.",
    "cli.version": "Versi RepoSentinel {version}",
    "cli.usage": "Penggunaan: reposentinel <command> [options]",
    "cli.command.check": "Memindai repository",
    "cli.command.lang": "Menampilkan atau memeriksa bahasa UI yang tersedia",
    "cli.option.lang": "Bahasa UI: en atau id",
    "scan.started": "Scan dimulai",
    "scan.completed": "Scan selesai",
    "scan.repository": "Repository",
    "scan.profile": "Profile",
    "scan.mode": "Mode",
    "scan.files": "File dipindai",
    "scan.ignored": "File di-ignore",
    "scan.score": "Score",
    "scan.status": "Status",
    "scan.findings": "Finding",
    "scan.noFindings": "Tidak ada finding.",
    "scan.result": "Hasil",
    "status.ready": "siap",
    "status.almostReady": "hampir siap",
    "status.needsAttention": "perlu perhatian",
    "status.notReady": "belum siap",
    "result.passed": "lulus",
    "result.passedWithWarnings": "lulus dengan warning",
    "result.failed": "gagal",
    "finding.warning": "warning",
    "finding.error": "error",
    "finding.critical": "critical",
    "finding.info": "info",
    "error.invalidLocale": ({ locale }) => `Locale "${locale}" tidak didukung. Gunakan: en, id.`,
    "error.invalidPath": ({ path }) => `Path target tidak ditemukan: ${path}`
  }
};

function normalizeLocale(value: string | undefined): Locale | undefined {
  if (!value) return undefined;
  const base = value.trim().toLowerCase().split(/[-_]/u)[0];
  return supportedLocales.includes(base as Locale) ? (base as Locale) : undefined;
}

export function resolveLocale(explicit?: string, environment: NodeJS.ProcessEnv = process.env): Locale {
  const candidates = [explicit, environment.REPOSENTINEL_LANG, environment.LC_ALL, environment.LANG];
  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate);
    if (locale) return locale;
  }
  return "en";
}

export function isSupportedLocale(value: string): value is Locale {
  return supportedLocales.includes(value as Locale);
}

export function createTranslator(locale: Locale) {
  return {
    locale,
    t(key: MessageKey, vars: Record<string, string | number> = {}) {
      const value = catalogs[locale][key];
      return typeof value === "function" ? value(vars) : value;
    }
  } as const;
}

export function getCatalog(locale: Locale): Readonly<Catalog> {
  return catalogs[locale];
}
