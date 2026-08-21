# RepoSentinel Pilot Validation / Validasi Pilot RepoSentinel

## English

This document defines external pilot validation before stable publication. The purpose is to test RepoSentinel against itself and a varied set of real repository shapes without collecting source code or sensitive user data.

### Dogfooding target

The first dogfooding target is the RepoSentinel repository itself. The scan runs locally with network disabled, English or Indonesian locale, the selected profile, and the configured `error` threshold. Local reports belong outside Git history unless a sanitized fixture or release artifact intentionally requires them.

A green dogfood result means that typecheck, tests, build, schema validation, rule-pack validation, packaging, and self-scan pass. It does not mean that every repository is ready or secure.

### Pilot cohort

The cohort should include varied repository shapes rather than only polished repositories:

| Cohort | Repository shape | What it validates |
|---|---|---|
| A | Public TypeScript library | Package metadata, lockfile, license, README, and CI rules. |
| B | Portfolio web project | Demo visibility, images, links, screenshots, and README clarity. |
| C | Small Python or Go utility | Language-neutral discovery, documentation, Git hygiene, and profile defaults. |
| D | Intentionally incomplete repository | Finding quality, remediation clarity, severity grouping, and score behavior. |
| E | Repository with sensitive-looking fixtures | False-positive control, redaction, and safe handling of examples. |

Participants must use local clones or synthetic fixtures. They must never submit secrets, private keys, proprietary source, credentials, private URLs, or unredacted logs.

### Pilot protocol

Each pilot repository should use a documented command matrix:

```bash
reposentinel check . --profile public --lang en --format json
reposentinel check . --profile public --lang id --format markdown --output report-id.md
reposentinel rules
reposentinel explain documentation.quickstart
```

The evaluator records installation method, runtime, file count, finding count by severity, false positives, missed findings, remediation clarity, report readability, translation consistency, and whether the exit code matches the configured threshold. The evaluator also verifies that no network call is made and that no secret value appears in terminal, Markdown, JSON, SARIF, or HTML output.

### Feedback classification

| Priority | Meaning | Required response |
|---|---|---|
| P0 | Secret disclosure, arbitrary code execution, path escape, destructive behavior, or release compromise. | Stop the pilot and contain the release immediately. |
| P1 | Incorrect critical/error finding, broken report schema, exit-code regression, or severe installation failure. | Patch or block stable promotion before expanding the cohort. |
| P2 | Incorrect warning/info, confusing remediation, compatibility issue, or measurable performance regression. | Schedule a fix, document a limitation, or block release if the impact is broad. |
| P3 | Wording, visual polish, translation gap, accessibility improvement, or enhancement. | Record in the normal backlog without weakening the safety boundary. |

### Stable pilot exit gate

Stable publication may begin only when all P0/P1 issues are closed or explicitly accepted by the owner, the self-scan is green, the clean-install package smoke test passes, CI passes on supported runtimes, the Action configuration is valid, the report schemas have a compatibility policy, the governance links are reachable, and the pilot metrics meet the agreed threshold.

Recommended thresholds are at least 80% first-scan success, at least 85% finding relevance, no open P0/P1 issues, no critical usability blocker, and at least 90% user understanding that network is off by default and the readiness score is not a security certification.

## Bahasa Indonesia

Dokumen ini mendefinisikan validasi external pilot sebelum stable publication. Tujuannya adalah menguji RepoSentinel terhadap dirinya sendiri dan berbagai bentuk repository nyata tanpa mengumpulkan source code atau data sensitif pengguna.

### Target dogfooding

Target dogfooding pertama adalah repository RepoSentinel sendiri. Scan dijalankan secara lokal dengan network disabled, locale English atau Indonesia, profile yang dipilih, dan threshold `error`. Local report harus berada di luar Git history kecuali fixture atau release artifact yang sudah disanitasi memang membutuhkannya.

Hasil dogfood hijau berarti typecheck, test, build, schema validation, rule-pack validation, packaging, dan self-scan lulus. Itu bukan berarti semua repository siap atau aman.

### Cohort pilot

Cohort harus mencakup bentuk repository yang beragam, bukan hanya repository yang sudah rapi. Jenis cohort dan hal yang divalidasi tercantum pada tabel English di atas agar istilah teknis tetap konsisten.

Peserta wajib menggunakan local clone atau synthetic fixture. Peserta tidak boleh mengirim secret, private key, proprietary source, credential, private URL, atau log yang belum disanitasi.

### Protokol pilot

Setiap repository pilot menggunakan command matrix yang terdokumentasi. Evaluator mencatat metode instalasi, runtime, jumlah file, jumlah finding per severity, false positive, finding yang terlewat, kejelasan remediation, keterbacaan report, konsistensi terjemahan, serta kecocokan exit code dengan threshold. Evaluator juga memverifikasi tidak ada network call dan tidak ada nilai secret dalam output.

### Gate keluar menuju stable

Stable publication hanya boleh dimulai ketika seluruh P0/P1 sudah ditutup atau diterima secara eksplisit oleh owner, self-scan hijau, package smoke test clean-install lulus, CI lulus pada runtime yang didukung, Action configuration valid, report schema memiliki compatibility policy, governance link dapat diakses, dan metrik pilot memenuhi threshold yang disepakati.
