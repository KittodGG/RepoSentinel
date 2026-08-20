# RepoSentinel — Contoh Semua Case dan Tampilan CLI

**Status dokumen:** `proposed / target UX`  
**Visual UI addendum:** [RepoSentinel — Visual & Interactive CLI Specification](./RepoSentinel_CLI_Visual_Interaction_Spec.md)  
**Status produk:** `concept specification / MVP planning`  
**Bahasa output:** Penjelasan pengguna menggunakan Bahasa Indonesia; command, rule ID, konfigurasi, dan istilah teknis tetap dalam Bahasa Inggris.  
**Positioning:** *RepoSentinel — cek repository Anda sebelum orang lain menilainya.*

> **Penting:** RepoSentinel belum merupakan package yang sudah dipublikasikan. Seluruh command, nama package, URL dokumentasi, dan output pada dokumen ini adalah **contoh kontrak UX target**, bukan bukti bahwa fitur tersebut sudah tersedia atau sudah diverifikasi. [1]

## 1. Tujuan Dokumen

Dokumen ini menjadi acuan fungsional untuk seluruh case RepoSentinel di terminal. Untuk arah visual yang lebih rapi, interaktif, unik, dan stylish, gunakan juga [Visual & Interactive CLI Specification](./RepoSentinel_CLI_Visual_Interaction_Spec.md), yang menetapkan layout panel, progress surface, keyboard navigation, theme/fallback, dan mode CI.

Dokumen ini menjadi acuan visual dan fungsional untuk pengalaman RepoSentinel di terminal. Setiap case berisi tujuan, command, mock output, exit code, dan catatan perilaku. Contoh-contoh ini mencakup alur normal, repository yang memiliki temuan, konfigurasi, pelaporan, baseline, keamanan, serta kegagalan input.

RepoSentinel dirancang sebagai CLI yang **local-first, deterministic, explainable, dan aman secara default**. Pada local scan, source code tidak dikirim ke server dan repository target diperlakukan sebagai data; tool tidak boleh menjalankan `npm install`, build script, package script, executable hasil build, atau arbitrary shell command dari repository target. [1] [2]

## 2. Konvensi Output

Semua contoh di bawah menggunakan format berikut.

| Notasi | Arti |
|---|---|
| `$` | Command yang diketik pengguna. Tidak perlu diketik ulang bersama tanda `$`. |
| `Exit code: 0` | Proses selesai tanpa melewati threshold kegagalan. |
| `Exit code: 1` | Ditemukan `critical` atau `error` yang melewati threshold. |
| `Exit code: 2` | Input, konfigurasi, atau penggunaan command tidak valid. |
| `Exit code: 3` | Kegagalan internal atau filesystem yang tidak dapat diproses. |
| `CRITICAL` | Indikasi berisiko tinggi, misalnya private key tracked. Selalu tampil dan secara default menggagalkan check. |
| `ERROR` | Masalah penting yang dapat membuat repository belum siap atau CI gagal. |
| `WARNING` | Masalah kualitas atau discoverability. Secara default tidak menggagalkan check lokal. |
| `INFO` | Saran peningkatan. Tidak menggagalkan check. |
| `[REDACTED]` | Nilai sensitif sengaja tidak ditampilkan. Path dan line boleh ditampilkan bila aman. |

Format severity dan exit behavior mengikuti severity model RepoSentinel: `critical` dan `error` dapat menggagalkan check, sedangkan `warning` dan `info` tidak menggagalkan check secara default. [1]

## 3. Ringkasan Command Target

| Command | Kegunaan | Status target |
|---|---|---|
| `reposentinel --help` | Menampilkan bantuan command dan opsi. | Planned |
| `reposentinel --version` | Menampilkan versi CLI. | Planned |
| `reposentinel check <path>` | Menjalankan scan utama. | P0 / target MVP |
| `reposentinel init` | Membuat `.reposentinel.yml`. | P0 / target MVP |
| `reposentinel rules` | Menampilkan rule yang tersedia atau aktif. | P0 / target MVP |
| `reposentinel explain <rule_id>` | Menjelaskan tujuan, severity, evidence, dan remediation suatu rule. | P0 / target MVP |
| `reposentinel report` | Menghasilkan ulang report dari hasil scan terakhir. | P0 / target MVP |
| `reposentinel baseline create` | Menyimpan finding lama sebagai baseline. | Planned; target setelah core stabil |
| `reposentinel check --watch` | Menjalankan scan ulang ketika file berubah. | Proposed / backlog awal |
| `reposentinel check --network` | Mengaktifkan rule yang memerlukan network secara eksplisit. | Proposed; default tetap off |

Nama package dan command tersebut masih merupakan rancangan UX sampai implementasi, test, dan publikasi selesai diverifikasi. [1] [3]

## 4. Case A — Bantuan dan Versi CLI

### A1. Menampilkan bantuan umum

```text
$ reposentinel --help

RepoSentinel — check your repository before others judge it.

Usage:
  reposentinel <command> [options]

Commands:
  check <path>                 Scan a repository
  init                         Create a .reposentinel.yml configuration
  rules                        List available or enabled rules
  explain <rule_id>            Explain a rule and its remediation
  report                       Render the latest scan report
  baseline create              Save current findings as a baseline

Options:
  -p, --profile <name>         public | portfolio | npm-package
      --fail-on <severity>     critical | error | warning | info
      --format <format>        terminal | markdown | json | sarif
      --config <path>          Configuration file path
      --no-color                Disable terminal colors
  -v, --verbose                Show discovery and rule statistics
  -h, --help                   Show help

Examples:
  reposentinel check .
  reposentinel check . --profile portfolio
  reposentinel rules --category security
  reposentinel explain documentation.quickstart
```

**Expected behavior:** command berhasil, tidak membaca atau memindai repository.  
**Exit code:** `0`.

### A2. Menampilkan versi

```text
$ reposentinel --version
reposentinel 0.1.0
```

**Catatan:** versi di atas hanya contoh. Jangan menampilkan versi tersebut sebagai versi aktual sebelum package benar-benar tersedia.  
**Exit code:** `0`.

### A3. Command tidak dikenal

```text
$ reposentinel chek .

Error: Unknown command "chek".
Did you mean "check"?

Run "reposentinel --help" to see available commands.
```

**Exit code:** `2`.

## 5. Case B — Inisialisasi Konfigurasi dengan `init`

### B1. `init` interaktif pada repository baru

```text
$ reposentinel init

RepoSentinel configuration setup
Target       : /work/my-project

? Choose a profile: (Use arrow keys)
❯ public
  portfolio
  npm-package

? Fail the check when findings reach: error
? Create default ignore patterns? Yes
? Enable Markdown and JSON reports? Yes

Created .reposentinel.yml

Next steps:
  1. Review .reposentinel.yml
  2. Run reposentinel check .
  3. Fix findings marked as critical or error
```

**Exit code:** `0`.

### B2. `init` dengan profile langsung

```text
$ reposentinel init --profile portfolio

Created .reposentinel.yml
Profile      : portfolio
Fail on      : error
Ignore paths : node_modules/**, dist/**, coverage/**, generated/**
Reports      : terminal, markdown, json

Run:
  reposentinel check . --profile portfolio
```

**Exit code:** `0`.

### B3. Konfigurasi sudah ada

```text
$ reposentinel init

Error: .reposentinel.yml already exists.

No file was changed.
Use --force only if you intend to replace the existing configuration.
```

**Exit code:** `2`.

### B4. Contoh file `.reposentinel.yml`

```yaml
extends: recommended
profile: public

rules:
  documentation.quickstart: warning
  links.valid: error
  community.license-present: off
  security.env-file: error
  security.private-key: critical

ignore:
  - node_modules/**
  - dist/**
  - coverage/**
  - generated/**

report:
  formats: [terminal, markdown, json]
  output_dir: .reposentinel/reports

security:
  scan_history: false
  network: false
  redact_findings: true

ci:
  fail_on: error
```

`off` berarti rule tidak dijalankan, bukan finding dibuat lalu disembunyikan. Nilai `network: false` menjaga local scan tetap offline secara default. [2]

## 6. Case C — `check` Berhasil Tanpa Finding

### C1. Repository siap dengan profile `public`

```text
$ reposentinel check . --profile public

RepoSentinel Report
Repository : clean-public
Root       : /work/clean-public
Profile    : public
Mode       : local, network disabled

Discovery
  Files scanned     : 42
  Files ignored     : 18
  Rules enabled     : 24
  Duration          : 0.41s

Score      : 100 / 100
Status     : ready

CRITICAL  0    ERROR  0    WARNING  0    INFO  0

No findings.

This result describes repository readiness. It is not a guarantee that the repository is secure
or free from vulnerabilities.

Exit code: 0
```

**Catatan:** status `ready` berarti tidak ada finding aktif menurut rule dan profile yang dipilih. Status ini tidak boleh dipasarkan sebagai “aman” atau “bebas vulnerability”. [1]

### C2. Repository hampir siap dengan `info`

```text
$ reposentinel check . --profile portfolio

RepoSentinel Report
Repository : portfolio-app
Profile    : portfolio
Mode       : local, network disabled

Score      : 96 / 100
Status     : almost ready

CRITICAL  0    ERROR  0    WARNING  0    INFO  4

INFO     documentation.description
         README.md:3 has a short or generic project description
         Fix: Describe the problem, main capability, and intended user in one or two sentences.

INFO     community.contributing
         CONTRIBUTING.md was not found
         Fix: Add contribution guidance if you expect external contributors.

INFO     project.summary
         Repository summary is not visible in the README opening section
         Fix: Add a concise project summary near the top of README.md.

INFO     techstack.visible
         Technology stack is not clearly listed
         Fix: Add a short Technology or Built With section.

Result: ready with suggestions

Exit code: 0
```

## 7. Case D — `warning` Saja, Check Tetap Lulus

```text
$ reposentinel check . --profile portfolio

RepoSentinel Report
Repository : demo-dashboard
Profile    : portfolio

Score      : 78 / 100
Status     : needs attention

CRITICAL  0    ERROR  0    WARNING  4    INFO  2

WARNING  documentation.quickstart
         README.md:18 has no runnable installation command
         Evidence: No install, setup, or quick-start command was found.
         Fix: Add a Quick Start section with one copy-paste command.

WARNING  links.valid
         README.md:26 contains a link that could not be resolved
         Evidence: https://example.invalid/demo
         Fix: Replace the URL or remove the link.

WARNING  images.resolve
         README.md:9 references a missing image
         Evidence: ./screenshots/home.png
         Fix: Add the image at that path or update the reference.

WARNING  package.lockfile-single
         Multiple lockfiles were found
         Evidence: package-lock.json, pnpm-lock.yaml
         Fix: Keep the lockfile used by the selected package manager and remove stale alternatives.

INFO     community.issue-template
         No issue template was detected
         Fix: Add a GitHub issue template when accepting public bug reports.

INFO     gitignore.exists
         .gitignore was not found
         Fix: Add a relevant .gitignore before committing generated files or local configuration.

Result: needs attention
Warnings do not fail the default local threshold.

Exit code: 0
```

**Perilaku penting:** health score dan status boleh menunjukkan `needs attention`, tetapi exit code tetap `0` karena threshold default adalah `error`. Pengguna dapat menaikkan threshold menjadi `warning` jika ingin warning menggagalkan CI.

## 8. Case E — `error` dan Threshold Gagal

```text
$ reposentinel check . --profile public

RepoSentinel Report
Repository : public-api
Profile    : public
Threshold  : error

Score      : 61 / 100
Status     : needs attention

CRITICAL  0    ERROR  2    WARNING  3    INFO  1

ERROR    security.env-file
         .env is tracked by Git
         Evidence: Sensitive environment filename is present in the Git index.
         Fix: Remove the file from Git tracking, rotate exposed credentials, and add the pattern to .gitignore.

ERROR    security.credential-pattern
         config/runtime.ts:44 contains a high-confidence credential pattern
         Evidence: Value starts with "ghp_" and has been redacted: ghp_****abcd
         Fix: Revoke and rotate the credential, remove it from the repository, and review Git history.

WARNING  documentation.quickstart
         README.md:12 has no runnable installation command
         Fix: Add one copy-paste installation and run command.

WARNING  community.license-present
         No recognizable repository license file was found at the project root
         Fix: Decide whether the repository should be open source and add an appropriate license after review.

WARNING  ci.workflow-permissions
         .github/workflows/ci.yml does not declare least-privilege permissions
         Fix: Add an explicit permissions block and grant only the access required by the workflow.

INFO     community.issue-template
         No issue template was detected
         Fix: Add an issue template if this is a public project.

Result: failed
Reason : 2 findings meet or exceed the error threshold.
Report : .reposentinel/reports/report.md

Exit code: 1
```

**Security rule:** output tidak boleh menampilkan isi `.env`, token lengkap, private key, atau full sensitive line. Hanya path, line, evidence yang telah di-redact, dan remediation yang aman yang boleh tampil. [2]

## 9. Case F — `critical` Private Key atau Secret Berisiko Tinggi

```text
$ reposentinel check . --profile public --fail-on critical

RepoSentinel Report
Repository : infrastructure-tools
Profile    : public
Threshold  : critical

Score      : 0 / 100
Status     : not ready

CRITICAL  1    ERROR  1    WARNING  0    INFO  0

CRITICAL security.private-key
         deploy/id_rsa:1 contains a private key header
         Evidence: -----BEGIN OPENSSH PRIVATE KEY----- [REDACTED]
         Fix: Remove the private key from the repository and Git history, rotate related credentials,
              and verify that the file is ignored.

ERROR    security.env-file
         .env.production is tracked by Git
         Evidence: Sensitive environment filename is tracked. File content is not displayed.
         Fix: Remove it from Git tracking, rotate exposed credentials, and add it to .gitignore.

Result: failed
Security boundary: content was redacted.

Exit code: 1
```

**Catatan:** private key yang tracked menggunakan severity `critical`; filename hint tanpa signature private key dapat menjadi `warning`, sedangkan certificate publik tanpa private material tidak boleh langsung dianggap secret. [2]

## 10. Case G — Path, Repository, dan Filesystem Tidak Valid

### G1. Path tidak ditemukan

```text
$ reposentinel check ./does-not-exist

Error: Target path does not exist.
Path: /work/does-not-exist

Check the path and run the command again.
```

**Exit code:** `2`.

### G2. Target adalah file, bukan directory

```text
$ reposentinel check ./README.md

Error: Target must be a repository directory.
Received a file: /work/project/README.md

Usage: reposentinel check <path>
```

**Exit code:** `2`.

### G3. Directory bukan Git repository

```text
$ reposentinel check ./untracked-folder

RepoSentinel Report
Repository : untracked-folder
Git        : not detected
Profile    : public
Mode       : filesystem-only, network disabled

Warning: Git metadata is unavailable. Rules that require tracked/untracked status,
branch information, or history are skipped.

Score      : 84 / 100
Status     : almost ready

CRITICAL  0    ERROR  0    WARNING  2    INFO  1

WARNING  documentation.quickstart
         README.md:10 has no runnable installation command
         Fix: Add a Quick Start section.

WARNING  gitignore.exists
         .gitignore was not found
         Fix: Add a relevant .gitignore before committing the repository.

INFO     git.metadata-unavailable
         Git-dependent checks were skipped
         Fix: Run the check inside a Git working tree for complete repository metadata coverage.

Exit code: 0
```

### G4. Target tidak dapat dibaca

```text
$ reposentinel check ./restricted-repository

Error: Cannot read target directory.
Path: /work/restricted-repository
Reason: Permission denied

No repository files were modified.
```

**Exit code:** `3`.

### G5. Symlink keluar dari root

```text
$ reposentinel check . --verbose

RepoSentinel Report
Repository : symlink-test

Discovery warnings:
  Skipped symlink: docs/internal -> /outside/project/docs
  Reason         : resolved path is outside the target root

Files scanned     : 18
Files skipped     : 1

CRITICAL  0    ERROR  0    WARNING  1    INFO  1

WARNING  docs.structure
         A documentation path could not be resolved safely
         Fix: Keep referenced files inside the repository root.

Exit code: 0
```

RepoSentinel tidak boleh mengikuti symlink yang keluar dari target root secara bebas. [2]

## 11. Case H — Repository Kosong atau Terlalu Sedikit File

```text
$ reposentinel check ./empty-repository

RepoSentinel Report
Repository : empty-repository
Profile    : public

Discovery
  Files scanned     : 0
  Files ignored     : 0
  Rules enabled     : 24

Score      : 22 / 100
Status     : not ready

CRITICAL  0    ERROR  0    WARNING  5    INFO  2

WARNING  documentation.readme-exists
         README.md was not found at the repository root
         Fix: Add a README.md with project summary and Quick Start instructions.

WARNING  documentation.quickstart
         No Quick Start content was found
         Fix: Add installation, setup, and run commands.

WARNING  project.summary
         No project summary was detected
         Fix: Describe the purpose and intended user of the repository.

WARNING  gitignore.exists
         .gitignore was not found
         Fix: Add a relevant .gitignore.

WARNING  community.license-present
         No recognizable repository license file was found
         Fix: Decide whether a license is required for this project.

INFO     portfolio.demo-visible
         No demo or screenshot was detected
         Fix: Add a demo URL or screenshot when using the portfolio profile.

INFO     community.contributing
         No contributor guidance was detected
         Fix: Add CONTRIBUTING.md if the project is intended to accept contributions.

Result: needs attention

Exit code: 0
```

## 12. Case I — Memilih Profile

### I1. Profile `public`

```text
$ reposentinel check . --profile public

RepoSentinel Report
Profile    : public
Focus      : README, links, assets, security hygiene, license, contributor readiness
Rules      : 27 enabled

Score      : 88 / 100
Status     : almost ready
CRITICAL  0    ERROR  0    WARNING  2    INFO  4

WARNING  community.license-present
         No recognizable repository license file was found
         Fix: Add an appropriate license after reviewing the project’s distribution intent.

WARNING  community.issue-template
         No issue template was detected
         Fix: Add an issue template for public bug reports.

Exit code: 0
```

### I2. Profile `portfolio`

```text
$ reposentinel check . --profile portfolio

RepoSentinel Report
Profile    : portfolio
Focus      : README first impression, summary, demo, screenshot, tech stack, setup
Rules      : 25 enabled

Score      : 72 / 100
Status     : needs attention
CRITICAL  0    ERROR  0    WARNING  5    INFO  1

WARNING  portfolio.demo-visible
         No visible demo URL or runnable preview was detected
         Fix: Add a Demo section near the top of README.md.

WARNING  portfolio.screenshot-exists
         No project screenshot was detected
         Fix: Add one representative screenshot with a repository-relative path.

WARNING  project.summary
         README opening section does not explain the project clearly
         Fix: Add a concise summary describing purpose and audience.

Exit code: 0
```

### I3. Profile `npm-package`

```text
$ reposentinel check . --profile npm-package

RepoSentinel Report
Profile    : npm-package
Focus      : manifest, package name, exports, scripts, lockfile, API and release metadata
Rules      : 23 enabled

Score      : 69 / 100
Status     : needs attention
CRITICAL  0    ERROR  1    WARNING  3    INFO  2

ERROR    package.manifest-name
         package.json:2 contains an invalid or missing package name
         Fix: Use a valid package name and verify the intended publish scope.

WARNING  package.lockfile-single
         Multiple package-manager lockfiles were found
         Fix: Keep only the lockfile for the selected package manager.

WARNING  package.exports
         No exports map was detected for a package marked for distribution
         Fix: Define the public entry points when package compatibility requires it.

WARNING  release.metadata
         package.json is missing repository or publish metadata
         Fix: Add repository, homepage, bugs, and relevant publish fields.

Exit code: 1
```

Profile hanya menentukan konteks dan rule yang aktif; profile bukan pengganti review manual dan tidak membuktikan package siap dipublikasikan. Daftar profile awal yang disepakati mencakup `public`, `portfolio`, dan `npm-package`; profile lain seperti `academic` dan `private-team` masih perlu keputusan implementasi lanjutan. [1]

## 13. Case J — Severity Override, Ignore, dan Threshold

### J1. Menjadikan warning sebagai kegagalan

```text
$ reposentinel check . --fail-on warning

RepoSentinel Report
Threshold  : warning

CRITICAL  0    ERROR  0    WARNING  2    INFO  0

WARNING  documentation.quickstart
         README.md:18 has no runnable installation command
         Fix: Add a Quick Start section.

WARNING  links.valid
         README.md:31 contains an unresolved link
         Fix: Replace or remove the URL.

Result: failed
Reason : 2 findings meet or exceed the warning threshold.

Exit code: 1
```

### J2. Mematikan rule tertentu melalui konfigurasi

```text
$ reposentinel check . --verbose

RepoSentinel Report
Configuration : .reposentinel.yml

Rules
  Enabled   : 21
  Disabled  : 1
  Disabled rule: community.license-present (configured as off)

CRITICAL  0    ERROR  0    WARNING  1    INFO  0

WARNING  documentation.quickstart
         README.md:18 has no runnable installation command
         Fix: Add a Quick Start section.

Exit code: 0
```

### J3. File di-ignore

```text
$ reposentinel check . --verbose

Discovery
  Files scanned     : 91
  Files ignored     : 1,248
  Ignore patterns   : node_modules/**, dist/**, generated/**

Ignored paths are excluded from rule execution.

CRITICAL  0    ERROR  0    WARNING  0    INFO  0
No findings.

Exit code: 0
```

Report verbose sebaiknya mencatat jumlah dan pola ignore tanpa mencetak isi file sensitif. [2]

### J4. Konfigurasi invalid

```text
$ reposentinel check .

Configuration error: .reposentinel.yml:7
  rules.links.valid must be one of:
    critical | error | warning | info | off
  Received: "urgent"

The scan was not started.
Fix the configuration and run the command again.
```

**Exit code:** `2`.

### J5. Profile tidak dikenal

```text
$ reposentinel check . --profile showcase

Error: Unknown profile "showcase".

Available profiles:
  public
  portfolio
  npm-package

No files were scanned.
```

**Exit code:** `2`.

## 14. Case K — Melihat dan Menjelaskan Rules

### K1. Semua rule aktif

```text
$ reposentinel rules

RepoSentinel Rules

ID                              CATEGORY             DEFAULT  PROFILES
--------------------------------------------------------------------------------
documentation.readme-exists     documentation        warning  public, portfolio, npm-package
documentation.quickstart        documentation        warning  public, portfolio, npm-package
links.valid                     links                 warning  public, portfolio
images.resolve                  links                 warning  public, portfolio
security.env-file               security              error    public, portfolio, npm-package
security.private-key            security              critical public, portfolio, npm-package
security.credential-pattern     security              error    public, portfolio, npm-package
package.lockfile-single         package               warning  npm-package, public
package.manifest-name           package               warning  npm-package
community.license-present       community             warning  public, npm-package
community.issue-template        community             info     public
ci.workflow-permissions         ci                    warning  public, npm-package
portfolio.demo-visible          portfolio             warning  portfolio
portfolio.screenshot-exists     portfolio             warning  portfolio

Showing 14 of 24 rules. Use --all to show every rule.

Exit code: 0
```

### K2. Filter berdasarkan kategori

```text
$ reposentinel rules --category security

RepoSentinel Rules — category: security

security.env-file
  Detect environment files that may contain credentials.
  Default severity: error

security.private-key
  Detect private key material and high-risk key files.
  Default severity: critical

security.credential-pattern
  Detect high-confidence credential formats without printing secret values.
  Default severity: error

security.sensitive-archive
  Flag archives or database dumps for manual review.
  Default severity: warning

security.env-example
  Suggest documenting required environment variables when project usage indicates them.
  Default severity: info

Exit code: 0
```

### K3. Menjelaskan rule yang dikenal

```text
$ reposentinel explain documentation.quickstart

Rule: documentation.quickstart
Category: documentation
Default severity: warning

What it checks
  README.md contains a runnable installation, setup, or Quick Start instruction.

Why it matters
  A reader should be able to understand the first successful action without guessing.

Evidence examples
  - No install/setup/quick-start heading
  - No copy-paste command in the setup section

Remediation
  Add a Quick Start section containing prerequisites, installation, and one run command.

Security and network
  Network is not required for this rule.

Documentation
  https://docs.reposentinel.dev/rules/documentation.quickstart

Exit code: 0
```

### K4. Rule tidak dikenal

```text
$ reposentinel explain readme.magic

Error: Rule "readme.magic" was not found.

Try:
  reposentinel rules
  reposentinel rules --category documentation
```

**Exit code:** `2`.

## 15. Case L — Export Report Terminal, Markdown, JSON, dan SARIF

### L1. Export Markdown

```text
$ reposentinel report --format markdown

Rendered report: .reposentinel/reports/report.md
Findings        : 7
Format          : markdown

Exit code: 0
```

Contoh isi `report.md`:

```markdown
# RepoSentinel Report

- Repository: `public-api`
- Profile: `public`
- Score: `61 / 100`
- Status: `needs attention`
- Threshold: `error`

## Summary

| Severity | Count |
|---|---:|
| Critical | 0 |
| Error | 2 |
| Warning | 3 |
| Info | 1 |

## Findings

### `security.env-file` — error

- Path: `.env`
- Message: Environment file is tracked by Git.
- Remediation: Remove it from Git tracking, rotate exposed credentials, and add the pattern to `.gitignore`.
```

### L2. Export JSON

```text
$ reposentinel report --format json --output .reposentinel/reports/report.json

Rendered report: .reposentinel/reports/report.json
Format          : json
Schema          : reposentinel.report/v1

Exit code: 0
```

Contoh JSON yang aman:

```json
{
  "schemaVersion": "reposentinel.report/v1",
  "repository": "public-api",
  "profile": "public",
  "score": 61,
  "status": "needs-attention",
  "summary": {
    "critical": 0,
    "error": 2,
    "warning": 3,
    "info": 1
  },
  "findings": [
    {
      "ruleId": "security.env-file",
      "severity": "error",
      "path": ".env",
      "message": "Environment file is tracked by Git.",
      "evidence": "Sensitive environment filename is tracked. File content is not displayed.",
      "remediation": "Remove it from Git tracking, rotate exposed credentials, and add the pattern to .gitignore."
    }
  ]
}
```

### L3. Export SARIF

```text
$ reposentinel report --format sarif --output .reposentinel/reports/report.sarif

Rendered report: .reposentinel/reports/report.sarif
Format          : sarif
Schema          : SARIF 2.1.0

Exit code: 0
```

SARIF adalah target integrasi CI/code scanning. Output ini perlu diuji melalui integration test sebelum dinyatakan tersedia. [1] [3]

### L4. Format tidak didukung

```text
$ reposentinel report --format html

Error: Unsupported report format "html".

Supported formats:
  terminal
  markdown
  json
  sarif

Note: HTML report is not part of the MVP contract.
```

**Exit code:** `2`.

### L5. Belum ada hasil scan untuk di-render

```text
$ reposentinel report --format json

Error: No previous scan result was found.

Run a scan first:
  reposentinel check .
```

**Exit code:** `2`.

## 16. Case M — Baseline

### M1. Membuat baseline

```text
$ reposentinel baseline create

RepoSentinel Baseline
Repository : legacy-project

Current findings
  Critical : 0
  Error    : 1
  Warning  : 6
  Info     : 2

Created .reposentinel/baseline.json

The baseline stores finding fingerprints, not secret values.
Future checks can focus on new findings.

Exit code: 0
```

### M2. Check dengan baseline, tanpa regresi baru

```text
$ reposentinel check . --baseline .reposentinel/baseline.json

RepoSentinel Report
Repository : legacy-project
Baseline   : .reposentinel/baseline.json

Findings
  Existing and baselined : 9
  New                    : 0
  Resolved               : 1

CRITICAL  0    ERROR  0    WARNING  0    INFO  0

Result: passed — no new findings
Note: 9 existing findings remain recorded in the baseline.

Exit code: 0
```

### M3. Check dengan regresi baru

```text
$ reposentinel check . --baseline .reposentinel/baseline.json

RepoSentinel Report
Repository : legacy-project
Baseline   : .reposentinel/baseline.json
Threshold  : error

Existing and baselined : 9
New findings           : 1

NEW ERROR security.credential-pattern
     src/config.ts:44 contains a high-confidence credential pattern
     Evidence: Value has been redacted: [REDACTED]
     Fix: Revoke and rotate the credential, remove it from the repository, and review Git history.

Result: failed — new findings exceed threshold

Exit code: 1
```

Baseline tidak boleh menjadi cara untuk menyembunyikan secret baru. Finding baru tetap harus muncul dan harus tetap mengikuti threshold. Baseline merupakan fitur target setelah core CLI dan fingerprint stabil. [1]

## 17. Case N — Watch Mode

### N1. Watch mode dimulai

```text
$ reposentinel check . --profile portfolio --watch

RepoSentinel Watch Mode
Repository : portfolio-app
Profile    : portfolio
Watching   : README.md, package.json, docs/**, public/**
Press Ctrl+C to stop.

[10:14:02] Initial scan
Score      : 72 / 100
Status     : needs attention
Findings   : 5 warning, 1 info

[10:14:15] Change detected: README.md
[10:14:15] Re-running scan...
Score      : 81 / 100
Status     : almost ready
Findings   : 2 warning, 1 info

[10:14:31] Change detected: public/demo.png
[10:14:31] Re-running scan...
Score      : 86 / 100
Status     : almost ready
Findings   : 1 warning, 1 info
```

### N2. Watch mode dihentikan

```text
^C

Watch mode stopped.
Last result: almost ready (86 / 100)
```

**Exit code:** `0` jika proses dihentikan tanpa finding yang melewati threshold; `1` jika implementasi memilih mengembalikan status threshold terakhir. Perilaku final harus ditetapkan melalui integration test sebelum fitur ini dianggap stabil. Watch mode belum termasuk kontrak inti MVP. [3]

## 18. Case O — Network dan History Scan

### O1. Local scan default tanpa network

```text
$ reposentinel check . --verbose

Security policy
  Network calls       : disabled
  Git history scan    : disabled
  Secret redaction    : enabled

All enabled rules completed without network access.

CRITICAL  0    ERROR  0    WARNING  1    INFO  0

Exit code: 0
```

### O2. Rule yang memerlukan network tidak dijalankan

```text
$ reposentinel check . --verbose

Skipped rules
  links.remote-status
  Reason: rule requires network and network is disabled

No network request was made.

CRITICAL  0    ERROR  0    WARNING  0    INFO  1

INFO     links.remote-status
         Remote link status was not checked in offline mode
         Fix: Re-run with explicit network opt-in only when remote validation is appropriate.

Exit code: 0
```

### O3. History scan belum diaktifkan

```text
$ reposentinel check . --history

Error: Git history scanning is disabled by default.

History scanning may inspect old sensitive data and can be expensive.
Use the explicit opt-in flag supported by the installed version and review the privacy impact first.
```

**Exit code:** `2` jika flag belum menjadi bagian dari versi implementasi. RepoSentinel tidak boleh membaca seluruh history secara default. [2]

## 19. Case P — Tidak Menjalankan Kode dari Target Repository

### P1. Repository memiliki script berbahaya

```text
$ reposentinel check . --verbose

Discovery policy
  package scripts        : not executed
  install hooks          : not executed
  build commands         : not executed
  arbitrary executables  : not executed

Read-only scan completed.

CRITICAL  0    ERROR  0    WARNING  1    INFO  0

WARNING  package.scripts-review
         package.json contains lifecycle or custom scripts that require manual review
         Fix: Review scripts before running them; RepoSentinel will not execute them during scanning.

Exit code: 0
```

Contoh ini penting untuk memperjelas batas keamanan: scanner membaca manifest sebagai data, tetapi tidak menjalankan script dari manifest. [1] [2]

## 20. Case Q — Output Verbose dan Deterministic

```text
$ reposentinel check . --verbose --no-color

RepoSentinel Report
Repository : sample-project
Profile    : public
Mode       : local, network disabled

Phase 1/6  Resolve target       done
Phase 2/6  Load configuration   done
Phase 3/6  Discover files       done (68 files, 14 ignored)
Phase 4/6  Select rules         done (24 enabled, 0 disabled)
Phase 5/6  Run rules            done (24 completed, 0 skipped)
Phase 6/6  Render report        done

Rule timing
  documentation.readme-exists   4ms
  documentation.quickstart      7ms
  links.valid                  11ms
  security.env-file             2ms
  security.private-key          3ms

Score      : 92 / 100
Status     : ready
CRITICAL  0    ERROR  0    WARNING  1    INFO  7

WARNING  links.valid
         README.md:31 contains an unresolved link
         Fix: Replace or remove the URL.

Output is deterministic: findings are sorted by severity, path, line, and rule ID.

Exit code: 0
```

Urutan findings tidak boleh bergantung pada urutan filesystem atau completion asynchronous agar snapshot test dan review CI stabil. [2]

## 21. Case R — Command yang Aman untuk CI

### R1. CI gagal hanya jika `error` atau lebih tinggi

```text
$ reposentinel check . --profile public --fail-on error --format json \
    --output .reposentinel/reports/ci.json

RepoSentinel Report
Repository : pull-request-42
Profile    : public
Threshold  : error
Format     : json

CRITICAL  0    ERROR  1    WARNING  2    INFO  0

Result: failed
Report : .reposentinel/reports/ci.json

Exit code: 1
```

### R2. CI tetap lulus untuk warning

```text
$ reposentinel check . --profile public --fail-on error

CRITICAL  0    ERROR  0    WARNING  3    INFO  1
Result: passed with warnings

Exit code: 0
```

### R3. CI dengan file konfigurasi eksplisit

```text
$ reposentinel check . \
    --config config/reposentinel.public.yml \
    --fail-on error \
    --format markdown \
    --output .reposentinel/reports/pr-summary.md

Configuration : config/reposentinel.public.yml
Profile       : public
Format        : markdown

Result: passed
Report : .reposentinel/reports/pr-summary.md

Exit code: 0
```

CLI harus memakai exit code yang konsisten agar dapat dipakai oleh CI. GitHub Action dan URL action masih target design dan harus diverifikasi sebelum dicantumkan dalam workflow nyata. [1]

## 22. Case S — Ringkasan Status yang Konsisten

Reporter terminal sebaiknya memakai blok ringkasan yang konsisten pada semua command `check`.

```text
Score      : <0-100> / 100
Status     : <ready | almost ready | needs attention | not ready>

CRITICAL  <n>    ERROR  <n>    WARNING  <n>    INFO  <n>

Result: <passed | passed with warnings | failed | needs attention>
```

| Score target | Label | Makna UX |
|---:|---|---|
| `90–100` | `ready` | Tidak ada masalah besar berdasarkan rule aktif. |
| `75–89` | `almost ready` | Workflow utama cukup jelas, tetapi masih ada saran atau perbaikan. |
| `50–74` | `needs attention` | Beberapa masalah mengganggu readiness atau discoverability. |
| `0–49` | `not ready` | Repository memerlukan perbaikan dasar sebelum dibagikan. |

Score adalah ringkasan repository readiness, bukan skor keamanan absolut. Critical dan error harus tetap terlihat walaupun score tinggi. Formula awal masih perlu dikalibrasi melalui fixture dan user testing. [1]

## 23. Case T — Kontrak Error dan Exit Code

| Situasi | Pesan minimal yang wajib ditampilkan | Exit code target |
|---|---|---:|
| Scan sukses, tanpa finding | Summary dan `No findings.` | `0` |
| Hanya `warning`/`info` pada threshold default `error` | Findings, remediation, dan `passed with warnings` | `0` |
| `error` melewati threshold | Finding, path, remediation, report path, dan `failed` | `1` |
| `critical` ditemukan | Finding yang di-redact dan `failed` | `1` |
| Target tidak ditemukan | Path dan petunjuk perbaikan | `2` |
| Target bukan directory | Tipe input yang diterima dan usage | `2` |
| Profile/format/rule tidak dikenal | Nilai invalid dan daftar nilai yang valid | `2` |
| YAML/config invalid | File, line bila tersedia, field, nilai yang salah | `2` |
| Permission denied atau read failure | Path dan alasan filesystem | `3` |
| Unexpected internal error | Error ID aman dan instruksi melaporkan bug tanpa secret | `3` |

Nilai exit code di atas adalah kontrak UX target yang perlu dikunci melalui integration test. Apabila implementasi memilih nilai berbeda, perubahan harus didokumentasikan dan diterapkan konsisten pada CLI, reporter, dan GitHub Action.

## 24. Acceptance Criteria Tampilan CLI

Implementasi CLI dianggap memenuhi kontrak UX minimum apabila memenuhi seluruh kondisi berikut.

| Area | Acceptance criteria |
|---|---|
| Identitas | Setiap report menampilkan repository, profile, mode, score, dan status. |
| Findings | Setiap finding memiliki `ruleId`, severity, message, path bila tersedia, line bila tersedia, evidence aman, dan remediation. |
| Security | Nilai secret, private key, isi `.env`, dan full sensitive line tidak pernah dicetak. |
| Exit code | Threshold menghasilkan exit code konsisten dan dapat dipakai oleh CI. |
| Explainability | Pengguna dapat menemukan alasan dan remediation dari finding melalui `explain` atau output langsung. |
| Determinism | Scan berulang pada input yang sama menghasilkan urutan findings yang sama. |
| Privacy | Local scan tidak melakukan network call secara default. |
| Safety | Scanner tidak menjalankan package script, build script, install hook, atau arbitrary code dari target repository. |
| Reports | Terminal, Markdown, dan JSON tersedia sebagai target MVP; SARIF tersedia setelah integrasi CI diuji. |
| Scope | Output tidak menyatakan repository aman, bebas vulnerability, atau telah melewati audit keamanan formal. |

## 25. Alur Pengguna yang Direkomendasikan

Alur utama yang hendak dicapai adalah:

```text
install → check → understand finding → fix → check again → share
```

Contoh sesi lengkap:

```text
$ npx reposentinel check . --profile portfolio
# 5 warnings ditemukan, exit code 0

$ reposentinel explain documentation.quickstart
# Pengguna memahami cara memperbaiki README

$ reposentinel check . --profile portfolio --format markdown \
    --output .reposentinel/reports/portfolio.md
# Report dapat ditempel ke issue atau pull request

$ reposentinel check . --profile portfolio
# Score meningkat dan jumlah finding berkurang
```

`npx reposentinel check .` juga masih merupakan target command, bukan command yang boleh dinyatakan sudah live sebelum package diverifikasi. [1]

## References

[1]: ./RepoSentinel%20%E2%80%94%20Project%20Context%20%26%20Source%20of%20Truth.md "RepoSentinel — Project Context & Source of Truth"
[2]: ./RepoSentinel_Tech_Stack_and_Rule_Engine.md "RepoSentinel — Tech Stack and Rule Engine"
[3]: ./RepoSentinel_Product_Technical_Specification.docx "RepoSentinel — Product, Technical, and Implementation Specification"
