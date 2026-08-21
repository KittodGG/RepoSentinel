# RepoSentinel Usage Guide / Panduan Penggunaan

> **Stable release:** `reposentinel@1.0.0` · **Runtime:** Node.js 24 LTS · **Mode:** local-first, network disabled by default
>
> **Rilis stable:** `reposentinel@1.0.0` · **Runtime:** Node.js 24 LTS · **Mode:** local-first, network nonaktif secara default

Dokumen ini adalah referensi operasional untuk pengguna RepoSentinel. README menjelaskan positioning dan Quick Start; dokumen ini menjelaskan pilihan teknis yang sering dibutuhkan saat menjalankan scanner di local repository atau CI.

This guide is the operational reference for RepoSentinel. The README covers positioning and Quick Start; this document explains the technical choices users commonly need when running the scanner locally or in CI.

## 1. Installation / Instalasi

```bash
npm install --global reposentinel@latest
reposentinel --version
```

Untuk reproduksi yang ketat, gunakan versi eksplisit:

```bash
npm install --global reposentinel@1.0.0
```

For reproducible installation, use an explicit version:

```bash
npm install --global reposentinel@1.0.0
```

RepoSentinel juga dapat dijalankan tanpa instalasi global melalui `npx reposentinel`, atau dari workspace contributor melalui `node packages/cli/dist/index.js` setelah `pnpm build`.

## 2. Command map / Peta command

| Command | Fungsi / Purpose | Status |
|---|---|---|
| `reposentinel --help` | Menampilkan command dan global options. / Show commands and global options. | Stable |
| `reposentinel --version` | Menampilkan versi CLI. / Show the CLI version. | Stable |
| `reposentinel check [path]` | Menjalankan scan utama. / Run the primary scan. | Stable |
| `reposentinel report [path]` | Alias dari `check`, bukan pembaca report historis. / Alias of `check`, not a historical-report reader. | Stable |
| `reposentinel lang [locale]` | Menampilkan atau menguji locale yang didukung. / List or inspect supported locales. | Stable |
| `reposentinel init [path]` | Membuat starter `.reposentinel.yml`. / Create a starter configuration. | Stable |
| `reposentinel baseline create [path]` | Menyimpan finding saat ini sebagai baseline fingerprint. / Save current findings as fingerprints. | Stable |
| `reposentinel dashboard [path]` | Menggabungkan local JSON reports menjadi HTML dashboard. / Aggregate local JSON reports into an HTML dashboard. | Stable |
| `reposentinel rules` | Menampilkan rule catalogue dan filter kategori. / List the rule catalogue and filter by category. | Stable |
| `reposentinel explain <ruleId>` | Menjelaskan severity, profile, dan dokumentasi rule. / Explain a rule's severity, profile, and documentation. | Stable |

Path bersifat opsional pada `check`, `report`, `init`, dan `baseline create`; default-nya adalah current directory (`.`). `report` tetap melakukan scan baru, sehingga tidak boleh dipahami sebagai command untuk membuka file report lama.

## 3. Repository profiles / Profile repository

Profile menentukan **konteks kesiapan** dan rule set yang diaktifkan. Profile tidak menggantikan code review, security audit, dependency scanner, atau release review manual.

A profile selects a repository's **readiness context** and enabled rule set. It does not replace code review, a security audit, a dependency scanner, or manual release review.

| Profile | Cocok untuk / Best for | Fokus utama / Main focus | Catatan perilaku / Behavior |
|---|---|---|---|
| `public` | Open-source repository yang dibaca publik. / Public open-source repositories. | README, Quick Start, links, assets, security hygiene, license, community, package, Git, CI. | Baseline umum untuk repository publik. / General public-repository baseline. |
| `portfolio` | Project showcase, personal project, demo, atau case study. / Showcases, personal projects, demos, case studies. | Documentation, links, assets, security hygiene, Git hygiene, dan demo/preview visibility. / Documentation, links, assets, security hygiene, Git hygiene, and demo/preview visibility. | Tidak mengaktifkan package/community/CI rules yang hanya ditujukan untuk `public` atau `npm-package`. / Does not enable package/community/CI rules exclusive to `public` or `npm-package`. |
| `npm-package` | Package yang akan didistribusikan melalui npm. / Packages distributed through npm. | Documentation, security, package name, entrypoint, exports, files, engine, lockfile, community, dan CI metadata. / Documentation, security, package structure, community, and CI metadata. | Gunakan untuk library atau CLI yang akan dipublish. / Use for libraries or CLIs intended for publication. |
| `academic` | Paper companion, research code, dataset tooling, atau educational repository. / Research and educational repositories. | Menggunakan public baseline dengan konteks akademik. / Uses the public baseline with an academic context. | Belum memiliki rule akademik khusus. / No academic-only rules are currently enabled. |
| `private-team` | Repository internal yang tetap ingin memakai readiness checks. / Internal repositories that still need readiness checks. | Public baseline yang relevan untuk hygiene dan governance internal. / Relevant public baseline checks for internal hygiene and governance. | Profile tidak mengubah local-first atau network-off defaults. / Does not change local-first or network-off defaults. |
| `mobile-app` | Repository aplikasi mobile. / Mobile application repositories. | Public baseline untuk docs, security, Git, community, dan CI. / Public baseline for docs, security, Git, community, and CI. | Belum memiliki rule mobile-specific khusus. / No mobile-specific rules are currently enabled. |

### Memilih profile / Choosing a profile

```bash
reposentinel check . --profile public
reposentinel check . --profile portfolio
reposentinel check . --profile npm-package
reposentinel check . --profile academic
reposentinel check . --profile private-team
reposentinel check . --profile mobile-app
```

Jika profile tidak diberikan, RepoSentinel menggunakan `public`. Profile pada command mengambil prioritas atas profile dari `.reposentinel.yml`.

If no profile is provided, RepoSentinel uses `public`. A profile supplied on the command line takes precedence over the profile in `.reposentinel.yml`.

## 4. Languages and locale / Bahasa dan locale

Stable release saat ini mendukung dua locale UI:

The current stable release supports two UI locales:

| Locale | Bahasa / Language | Contoh |
|---|---|---|
| `en` | English | `reposentinel check . --lang en` |
| `id` | Bahasa Indonesia | `reposentinel check . --lang id` |

Gunakan command berikut untuk melihat locale yang tersedia:

Use the following command to list supported locales:

```bash
reposentinel lang
reposentinel lang en
reposentinel lang id
```

Locale resolution order adalah `--lang`, `REPOSENTINEL_LANG`, `LC_ALL`, `LANG`, lalu deterministic fallback ke `en`. Configuration YAML tidak memiliki key `lang`; gunakan command option atau environment variable.

Locale resolution order is `--lang`, `REPOSENTINEL_LANG`, `LC_ALL`, `LANG`, then a deterministic fallback to `en`. The YAML configuration has no `lang` key; use the command option or an environment variable.

```bash
REPOSENTINEL_LANG=id reposentinel check .
LANG=en_US.UTF-8 reposentinel check .
reposentinel check . --lang en
```

`en-US` dan locale serupa dapat dinormalisasi ke base locale pada `check`, tetapi dokumentasi dan script CI sebaiknya memakai `en` atau `id` secara eksplisit. Rule IDs, configuration keys, JSON keys, schema version, severity values, dan exit codes tetap berbahasa teknis dan stabil di kedua locale.

`en-US` and similar locale values can be normalized to a base locale by `check`, but documentation and CI scripts should use explicit `en` or `id`. Rule IDs, configuration keys, JSON keys, schema version, severity values, and exit codes remain stable technical identifiers in both locales.

## 5. Scan options / Opsi scan

| Option | Nilai / Values | Perilaku / Behavior |
|---|---|---|
| `--profile <profile>` | Enam profile di atas. / The six profiles above. | Memilih konteks rule. / Selects the rule context. |
| `--lang <locale>` | `en`, `id` | Memilih bahasa UI untuk command tersebut. / Selects UI language for that command. |
| `--fail-on <severity>` | `critical`, `error`, `warning`, `info` | Menentukan finding minimum yang membuat exit code `1`. / Sets the minimum failing severity. Default: `error`. |
| `--format <format>` | `terminal`, `markdown`, `json`, `sarif`, `html` | Memilih reporter. / Selects the reporter. |
| `--output <file>` | File path | Menulis report ke file; tanpa option ini report dikirim ke stdout. / Writes to a file; otherwise writes to stdout. |
| `--baseline <file>` | JSON baseline path | Menekan finding lama berdasarkan fingerprint. / Suppresses known findings by fingerprint. |
| `--changed-since <ref>` | Git ref | Membatasi finding pada path yang berubah sejak ref. / Limits findings to paths changed since a Git ref. |
| `--fix [ruleId]` | Optional rule ID | Hanya preview safe autofix yang allowlisted. / Preview only allowlisted safe autofixes. |
| `--apply-fix` | Flag | Menerapkan preview fix; harus dipakai bersama `--fix`. / Apply the preview; must be paired with `--fix`. |
| `--watch` | Flag | Scan ulang saat file berubah dengan debounce; di CI menjadi one-shot. / Re-scan on changes; becomes one-shot in CI. |
| `--rules-file <file>` | Repository-local JSON | Memuat custom rule registry. / Load a custom-rule registry. |
| `--network` | Flag | Opt in bounded HTTP checks; default tetap offline. / Opt in to bounded HTTP checks; offline remains default. |
| `--no-color` | Global flag | Menonaktifkan ANSI color. / Disable ANSI color. |

Contoh command yang umum digunakan:

```bash
# Local scan standar / Standard local scan
reposentinel check .

# CI dengan locale dan threshold eksplisit / CI with explicit locale and threshold
CI=true reposentinel check . --profile public --lang en --fail-on error --format json --output report.json

# Portfolio review / Review portfolio
reposentinel check . --profile portfolio --lang id

# npm package review / Review package npm
reposentinel check . --profile npm-package --format markdown --output package-readiness.md

# Hanya perubahan sejak main / Only changes since main
reposentinel check . --changed-since origin/main --format sarif --output findings.sarif

# Offline HTML report / Report HTML offline
reposentinel check . --format html --output report.html
```

## 6. Output formats / Format report

| Format | Kapan digunakan / Use when | Kontrak output / Output contract |
|---|---|---|
| `terminal` | Local interactive review. / Review lokal interaktif. | Human-readable Sentinel Console dengan score, status, counts, findings, dan exit code. |
| `markdown` | Pull Request, review manual, atau artifact yang mudah dibaca. / PRs and human review. | Markdown report berisi repository, profile, mode, score, summary, dan findings. |
| `json` | Automation, dashboard, atau integration. / Automation and integrations. | Schema stabil `reposentinel.report/v1`. |
| `sarif` | GitHub Code Scanning dan security tooling. / Code Scanning and security tooling. | SARIF `2.1.0` dengan rule metadata dan locations. |
| `html` | Report offline yang dapat dibuka di browser. / Offline browser-readable report. | Self-contained HTML; tidak memerlukan server atau network call. |

Default tanpa `--format` adalah terminal. Jika `--output` diberikan, report ditulis ke file dan tidak dicampur dengan terminal output. JSON, Markdown, SARIF, dan HTML tidak boleh memuat ANSI escape sequence.

The default without `--format` is terminal. With `--output`, the report is written to the file instead of mixed into terminal output. JSON, Markdown, SARIF, and HTML do not contain ANSI escape sequences.

```bash
reposentinel check . --format terminal
reposentinel check . --format markdown --output .reposentinel/reports/report.md
reposentinel check . --format json --output .reposentinel/reports/report.json
reposentinel check . --format sarif --output .reposentinel/reports/report.sarif
reposentinel check . --format html --output .reposentinel/reports/report.html
```

### Terminal example / Contoh terminal

Output berikut adalah hasil nyata dari stable CLI dengan `--no-color`, sehingga dapat disalin ke log atau dokumentasi tanpa ANSI escape sequence:

```text
$ reposentinel check . --profile public --lang en --no-color
◈ RepoSentinel
  repository readiness, without the noise
Repository : my-project
Profile    : public
Mode       : local · network off · locale en
╭─ health snapshot ───────────────────────────────────────────╮
│ 100 / 100   READY                                           │
│ 42 files · 18 ignored · threshold error                    │
╰─────────────────────────────────────────────────────────────╯
Findings  ──────────────────────────────────────────────────────────────
CRITICAL 0   ERROR 0   WARNING 0   INFO 0
✓ No findings.
Score  : 100 / 100
Status : ready
Result : passed
Exit code : 0
```

Pada terminal berwarna, palette cyan-violet digunakan untuk brand dan panel, sementara warning berwarna kuning serta error/critical berwarna merah. Jumlah file dan score bergantung pada repository yang dipindai.

In a colored terminal, the cyan-violet palette is used for brand and panels, while warnings are yellow and errors/critical findings are red. File counts and scores depend on the scanned repository.

### Input validation / Validasi input

Profile, locale, dan format yang tidak dikenal ditolak sebelum scan dimulai:

```text
$ reposentinel check . --profile showcase --no-color
Unknown profile: showcase. Use: public, portfolio, npm-package, academic, private-team, mobile-app
```

Perintah dengan input invalid mengembalikan exit code `2` dan tidak menjalankan scan. / Invalid input returns exit code `2` and does not start the scan.

### JSON minimum shape / Bentuk minimum JSON

```json
{
  "schemaVersion": "reposentinel.report/v1",
  "locale": "en",
  "repository": "my-project",
  "profile": "public",
  "score": 92,
  "status": "almost-ready",
  "threshold": "error",
  "scan": {
    "mode": "local",
    "network": false
  },
  "summary": {
    "critical": 0,
    "error": 0,
    "warning": 1,
    "info": 2
  },
  "findings": []
}
```

`score` dan `status` menggambarkan kesehatan menurut rule yang aktif; keduanya bukan jaminan bahwa repository aman atau bebas vulnerability. `scan.network` menunjukkan apakah network opt-in digunakan.

## 7. Severity and exit codes / Severity dan exit code

### Severity

| Severity | Arti / Meaning | Default effect on exit code |
|---|---|---|
| `critical` | Risiko sangat tinggi, misalnya private key material atau unsafe privileged workflow. / Very high risk. | Gagal bila threshold `critical` atau lebih permisif. |
| `error` | Masalah penting yang perlu diperbaiki sebelum readiness dianggap lulus. / Important issue. | Gagal pada default threshold `error`. |
| `warning` | Masalah kualitas, discoverability, atau hygiene. / Quality or hygiene issue. | Tidak gagal pada default `error`. |
| `info` | Saran atau metadata tambahan. / Suggestion or additional metadata. | Tidak gagal pada default `error`. |

### Exit codes

| Exit code | Arti / Meaning |
|---:|---|
| `0` | Scan selesai dan tidak ada finding pada atau di atas threshold. / Completed without findings at or above threshold. |
| `1` | Scan selesai tetapi ada finding pada atau di atas threshold. / Completed with findings at or above threshold. |
| `2` | Input, path, profile, locale, format, configuration, atau penggunaan command tidak valid. / Invalid input, path, configuration, or command usage. |
| `130` | Interactive `init` dibatalkan pengguna. / Interactive `init` was cancelled by the user. |

Contoh threshold:

```bash
# Default: error dan critical menggagalkan check
reposentinel check . --fail-on error

# Warning juga menggagalkan check
reposentinel check . --fail-on warning

# Hanya critical yang menggagalkan check
reposentinel check . --fail-on critical
```

Score dapat menunjukkan `needs-attention` sementara exit code tetap `0` jika semua finding berada di bawah threshold. Ini disengaja: score memberi konteks, sedangkan threshold menentukan gate automation.

## 8. Configuration / Konfigurasi `.reposentinel.yml`

Buat starter configuration dengan:

```bash
reposentinel init --profile public
```

Dalam CI non-interaktif, gunakan `--force` secara eksplisit:

```bash
reposentinel init --force --profile npm-package
```

Contoh configuration lengkap:

```yaml
extends: recommended
profile: npm-package

baseline: .reposentinel/baseline.json
custom_rules: .reposentinel/custom-rules.json

rules:
  documentation.quickstart: warning
  links.valid: error
  security.private-key: critical
  security.credential-pattern: error
  ci.action-sha-pinned: warning
  package.manifest-files: warning

ignore:
  - vendor/**
  - fixtures/large/**

report:
  formats:
    - terminal
    - markdown
    - json
  output_dir: .reposentinel/reports

security:
  network: false
  scan_history: false
  redact_findings: true

ci:
  fail_on: error
```

### Configuration keys / Key konfigurasi

| Key | Nilai / Values | Penjelasan / Explanation |
|---|---|---|
| `extends` | `recommended` | Memakai recommended ignore set. / Use the recommended ignore set. |
| `profile` | Enam profile | Default profile ketika command tidak memberikan `--profile`. / Default when CLI does not provide `--profile`. |
| `baseline` | Repository-relative path | Lokasi baseline fingerprint. / Fingerprint baseline path. |
| `custom_rules` | Repository-relative JSON path | Registry custom rules. / Custom-rule registry. |
| `rules` | Rule ID → severity atau `off` | Override severity atau menonaktifkan rule. / Override severity or disable a rule. |
| `ignore` | Array glob | Tambahan path yang tidak diproses oleh general rule scan. / Additional paths excluded from general rule scanning. |
| `report.formats` | Array format | Format otomatis ketika `report.output_dir` dipakai. / Automatic formats when `output_dir` is configured. |
| `report.output_dir` | Repository-relative path | Directory report lokal. / Local report directory. |
| `security.network` | Boolean | Default `false`; tidak ada HTTP check tanpa opt-in. / Default `false`; no HTTP checks without opt-in. |
| `security.scan_history` | Boolean | Reserved configuration boundary; tidak mengaktifkan history scan yang belum menjadi CLI command. / Configuration boundary; does not add an unsupported history command. |
| `security.redact_findings` | Boolean | Default `true`; evidence sensitif tetap harus aman. / Default `true`; sensitive evidence remains redacted. |
| `ci.fail_on` | `critical`, `error`, `warning`, `info` | Default threshold dari configuration. / Configuration-level default threshold. |

`rules.<ruleId>: off` berarti rule tidak dijalankan. Unknown key pada YAML ditolak agar typo tidak diam-diam mengubah kebijakan scan. `--profile` dan `--fail-on` pada command mengambil prioritas atas nilai configuration.

## 9. Baseline, changed-files, autofix, and watch / Baseline, perubahan, autofix, dan watch

### Baseline

Baseline menyimpan fingerprint finding yang sudah direview. Baseline tidak boleh dipakai untuk menyembunyikan secret baru atau menghapus kewajiban remediation.

```bash
reposentinel baseline create .
reposentinel check . --baseline .reposentinel/baseline.json
```

`--allow-critical` hanya boleh digunakan setelah critical finding ditinjau secara eksplisit.

### Changed-files mode

```bash
reposentinel check . --changed-since origin/main --format json --output changed.json
```

Mode ini tetap melakukan discovery dan rule evaluation lokal, lalu membatasi finding yang ditampilkan pada path yang berubah sejak Git ref yang diberikan.

### Safe autofix

```bash
reposentinel check . --fix --no-color
reposentinel check . --fix gitignore.exists --apply-fix
```

Default `--fix` hanya preview. `--apply-fix` harus ditulis eksplisit bersama `--fix`, dan hanya operasi allowlisted yang boleh diterapkan. Secret-related findings tidak memiliki autofix otomatis.

### Watch mode

```bash
reposentinel check . --watch
```

Watch mode menjalankan initial scan lalu melakukan rerun setelah perubahan file dengan debounce. Saat `CI=true`, command menyelesaikan satu scan dan keluar agar tidak menggantung pada runner.

## 10. Security and privacy boundaries / Batas keamanan dan privasi

> RepoSentinel membaca target repository sebagai data. Ia tidak menjalankan package scripts, lifecycle hooks, build commands, arbitrary executables, atau `npm install` dari target repository.
>
> RepoSentinel reads the target repository as data. It does not execute package scripts, lifecycle hooks, build commands, arbitrary executables, or `npm install` from the target repository.

Network disabled secara default. `--network` hanya mengaktifkan bounded HTTP link checks dengan SSRF guard; gunakan hanya ketika validasi remote memang diperlukan. Source code tidak dikirim ke server pada local scan.

Network is disabled by default. `--network` only enables bounded HTTP link checks with SSRF protection; use it only when remote validation is needed. Source code is not uploaded during a local scan.

Credential evidence, private key material, dan sensitive filenames harus ditampilkan dalam bentuk redacted. Built-in detectors mencakup documented GitHub, Slack token, AWS, Stripe, Google API, OpenAI, npm, JWT-like, Slack webhook, common database connection-string, serta PEM/PGP private-key signatures, tetapi tidak mencakup setiap provider, webhook, connection-string variant, atau high-entropy secret. RepoSentinel bukan full secret scanner, SAST engine, dependency vulnerability scanner, atau formal security audit. Gunakan dedicated security tooling untuk kebutuhan tersebut.

## 11. Common workflows / Alur kerja umum

### Local repository review / Review repository lokal

```bash
reposentinel check . --profile public --lang id
reposentinel explain security.credential-pattern --lang id
reposentinel check . --format markdown --output .reposentinel/reports/readiness.md
```

### npm package release review / Review sebelum publish npm

```bash
reposentinel check . --profile npm-package --lang en --fail-on error
pnpm release:gate
```

### CI machine-readable gate / Gate CI machine-readable

```yaml
- name: Scan repository readiness
  run: reposentinel check . --profile public --lang en --fail-on error --format sarif --output reposentinel.sarif
```

### Portfolio dashboard / Dashboard portfolio

```bash
reposentinel check project-a --profile portfolio --format json --output .reposentinel/reports/project-a.json
reposentinel check project-b --profile portfolio --format json --output .reposentinel/reports/project-b.json
reposentinel dashboard .reposentinel/reports --output dashboard.html
```

## 12. Further references / Referensi lanjutan

| Dokumen | Isi / Contents |
|---|---|
| [README](../README.md) | Product overview, visual preview, Quick Start, dan governance links. |
| [CLI Case Examples](RepoSentinel_CLI_Case_Examples.md) | Transcripts dan ilustrasi berbagai case CLI. |
| [Rule Catalog](RULES.md) | Severity, scope, remediation, dan limitations setiap rule. |
| [Custom Rules](CUSTOM_RULES.md) | JSON registry dan matching semantics. |
| [CI and Action Policy](CI_AND_ACTION.md) | GitHub Action, CI, permission, pinning, dan release policy. |
| [Release Readiness](RELEASE_READINESS.md) | Quality, security, packaging, dan stable release gates. |
| [Security Policy](../SECURITY.md) | Private vulnerability disclosure dan batas safe contribution. |

## References

[1]: ../packages/cli/src/index.ts "RepoSentinel CLI command and option implementation"
[2]: ../packages/i18n/src/index.ts "RepoSentinel locale catalog and locale resolution"
[3]: ../packages/config/src/index.ts "RepoSentinel configuration schema and defaults"
[4]: ../packages/reporters/src/index.ts "RepoSentinel report format contracts"
[5]: ../packages/core/src/index.ts "RepoSentinel core severity, exit-code, and redaction contracts"
