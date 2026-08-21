# Contributing to RepoSentinel / Panduan Kontribusi RepoSentinel

## English

Thank you for helping improve RepoSentinel. RepoSentinel is **CLI-first, local-first, deterministic, explainable, and safe by default**. A good contribution adds value without weakening trustworthy output, repository privacy, compatibility, or the contributor experience.

The project is currently private while production-readiness and documentation gates are being completed. The contribution process is public and ready to review through the [Governance Hub](GOVERNANCE.md). Repository visibility will change only after explicit maintainer approval.

### 1. Choose the right path

For a change larger than a typo or a small documentation correction, open an Issue before implementing. Use the most specific template:

| Goal | Template |
|---|---|
| Reproducible defect | [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) |
| New feature or rule | [Feature Proposal](.github/ISSUE_TEMPLATE/feature_proposal.md) |
| Documentation improvement | [Documentation](.github/ISSUE_TEMPLATE/documentation.md) |
| Usage question | [Question](.github/ISSUE_TEMPLATE/question.md) |
| Product feedback | [Product Feedback](.github/ISSUE_TEMPLATE/feedback.md) |
| Private vulnerability | [SECURITY.md](SECURITY.md), never a public Issue |

Describe `context → problem → proposed solution → acceptance criteria → dependencies → risks`. Maintainers may ask for a proposal to be split into smaller Pull Requests.

### 2. Local setup

RepoSentinel targets Node.js 24 LTS and uses a pnpm workspace.

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm dogfood
node scripts/hardening-checks.mjs
```

To validate the package artifact that users will install:

```bash
pnpm pack:release
node scripts/release-gate.mjs
```

The scanner reads a target repository as data. Do not add behavior that runs `npm install`, package scripts, build hooks, target executables, or arbitrary shell commands from the target repository. Network access must remain disabled by default and may be enabled only through explicit opt-in.

### 3. Code and rule requirements

Every new or changed rule must have a stable rule ID, category, default severity, deterministic detector, safe evidence, actionable remediation, documentation, a positive fixture, a negative fixture, and a regression test. Rules must not depend on reporter details; reporters consume normalized findings.

Changes affecting JSON schema, SARIF, exit codes, fingerprints, baseline behavior, configuration, or terminal output must explain backward-compatibility impact. Security changes must describe redaction, path boundaries, symlink handling, network behavior, subprocess behavior, and target-code-execution impact.

Safe autofix is restricted to allowlisted, new, predictable files that can be reviewed in a dry-run. Do not add autofix for secret deletion, history rewriting, arbitrary source transformation, or destructive operations without a separate design and security review.

### 4. Branches, commits, and Pull Requests

Use a descriptive branch such as `feat/html-report`, `fix/sarif-location`, or `docs/contributing`. Do not work directly on `main` unless a maintainer requests an emergency fix.

Keep commits focused and reversible. Conventional Commits are recommended, for example `feat: add HTML reporter`, `fix: redact credential evidence`, or `docs: clarify release gate`. Do not commit `dist/`, coverage output, temporary reports, secrets, or unnecessary generated artifacts.

Use the repository [Pull Request template](.github/pull_request_template.md). One Pull Request should ideally solve one verifiable problem. Reviewers may request fixtures, tests, documentation, security review, compatibility analysis, or a narrower scope.

### 5. Testing and evidence

Run relevant checks before requesting review and record the result in the Pull Request. When terminal UX changes, include evidence for colored TTY output, `--no-color`, plain/CI output, machine JSON, and Markdown. When a report changes, review escaping, deterministic ordering, output-path safety, and schema compatibility.

Tests must not depend on external network access. Network tests must use mocks or local fixtures. Benchmarks must state their environment and must not be presented as a performance guarantee for every machine.

### 6. Security and privacy

Never put secrets, access tokens, private keys, `.env` contents, proprietary source, private URLs, unredacted logs, or unredacted personal paths into an Issue, Pull Request, fixture, screenshot, or CI artifact. Report an unpatched vulnerability privately using [SECURITY.md](SECURITY.md).

The project must preserve local-first scanning, network-off defaults, symlink boundaries, bounded file reads, deterministic machine-readable schemas, strict configuration validation, safe output paths, and the rule that target repository code is never executed by default.

### 7. License and contributor rights

RepoSentinel uses the **MIT License**. Submit only work you created or work you have permission to distribute under the repository license. By opening a Pull Request, you confirm that the contribution may be distributed under the repository license and that you have not knowingly included incompatible third-party code or undisclosed license obligations.

The project does not currently require a CLA or DCO sign-off. If that policy changes, it will be announced in the repository and contribution templates before it becomes effective. See [License Policy](docs/LICENSE_POLICY.md) for the MIT and Apache-2.0 comparison.

### 8. Review and maintainer decisions

Maintainers evaluate correctness, deterministic behavior, UX, security/privacy, compatibility, tests, documentation, and maintenance cost. Approval does not guarantee that a change is free of every bug. Maintainers may decline changes that expand the documented scope into SaaS, hosted dashboards, AI reviewers, remote marketplaces, or network-by-default behavior without an explicit product decision.

All participants must follow the [Code of Conduct](CODE_OF_CONDUCT.md). For general questions, use the appropriate Issue template. For security vulnerabilities, use the private process in [SECURITY.md](SECURITY.md).

## Bahasa Indonesia

Terima kasih telah membantu meningkatkan RepoSentinel. RepoSentinel bersifat **CLI-first, local-first, deterministic, explainable, dan aman secara default**. Kontribusi yang baik menambah nilai tanpa melemahkan output yang dapat dipercaya, privasi repository, kompatibilitas, atau pengalaman contributor.

Project saat ini masih private karena production-readiness dan documentation gate sedang diselesaikan. Proses kontribusi sudah dapat dibaca melalui [Governance Hub](GOVERNANCE.md). Visibility repository hanya akan diubah setelah persetujuan maintainer secara eksplisit.

### 1. Pilih jalur yang tepat

Untuk perubahan yang lebih besar daripada typo atau koreksi dokumentasi kecil, buka Issue sebelum implementasi. Gunakan template yang paling spesifik:

| Tujuan | Template |
|---|---|
| Bug yang dapat direproduksi | [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) |
| Feature atau rule baru | [Feature Proposal](.github/ISSUE_TEMPLATE/feature_proposal.md) |
| Perbaikan dokumentasi | [Documentation](.github/ISSUE_TEMPLATE/documentation.md) |
| Pertanyaan penggunaan | [Question](.github/ISSUE_TEMPLATE/question.md) |
| Feedback produk | [Product Feedback](.github/ISSUE_TEMPLATE/feedback.md) |
| Vulnerability privat | [SECURITY.md](SECURITY.md), bukan Issue publik |

Jelaskan `context → problem → proposed solution → acceptance criteria → dependencies → risks`. Maintainer dapat meminta proposal dipecah menjadi beberapa Pull Request yang lebih kecil.

### 2. Local setup

RepoSentinel menargetkan Node.js 24 LTS dan menggunakan pnpm workspace.

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm dogfood
node scripts/hardening-checks.mjs
```

Untuk memvalidasi package artifact yang akan dipasang pengguna:

```bash
pnpm pack:release
node scripts/release-gate.mjs
```

Scanner membaca target repository sebagai data. Jangan menambahkan perilaku yang menjalankan `npm install`, package script, build hook, executable target, atau arbitrary shell command dari target repository. Network harus tetap disabled by default dan hanya dapat diaktifkan melalui opt-in yang eksplisit.

### 3. Persyaratan code dan rule

Setiap rule baru atau yang diubah wajib memiliki stable rule ID, kategori, default severity, detector deterministic, evidence aman, remediation actionable, dokumentasi, fixture positif, fixture negatif, dan regression test. Rule tidak boleh bergantung pada detail reporter; reporter hanya mengonsumsi normalized findings.

Perubahan yang memengaruhi JSON schema, SARIF, exit code, fingerprint, baseline, configuration, atau terminal output harus menjelaskan dampak backward compatibility. Perubahan security harus menjelaskan redaction, path boundary, symlink, network, subprocess, dan target-code-execution impact.

Safe autofix hanya dibatasi pada file baru yang allowlisted, predictable, dan dapat direview melalui dry-run. Jangan menambahkan autofix untuk penghapusan secret, history rewrite, arbitrary source transformation, atau operasi destruktif tanpa design dan security review terpisah.

### 4. Branch, commit, dan Pull Request

Gunakan branch deskriptif seperti `feat/html-report`, `fix/sarif-location`, atau `docs/contributing`. Jangan bekerja langsung pada `main` kecuali maintainer meminta emergency fix.

Jaga commit tetap fokus dan mudah dibatalkan. Conventional Commits disarankan, misalnya `feat: add HTML reporter`, `fix: redact credential evidence`, atau `docs: clarify release gate`. Jangan commit `dist/`, coverage output, temporary report, secret, atau generated artifact lokal yang tidak diperlukan.

Gunakan [Pull Request template](.github/pull_request_template.md). Satu Pull Request idealnya menyelesaikan satu masalah yang dapat diverifikasi. Reviewer dapat meminta fixture, test, dokumentasi, security review, compatibility analysis, atau scope yang lebih sempit.

### 5. Testing dan evidence

Jalankan checks yang relevan sebelum meminta review dan cantumkan hasilnya di Pull Request. Jika terminal UX berubah, sertakan evidence untuk colored TTY, `--no-color`, plain/CI output, machine JSON, dan Markdown. Jika report berubah, periksa escaping, deterministic ordering, output-path safety, dan schema compatibility.

Test tidak boleh bergantung pada network eksternal. Network test harus menggunakan mock atau local fixture. Benchmark harus menyebutkan environment dan tidak boleh dipresentasikan sebagai jaminan performa untuk semua mesin.

### 6. Security dan privacy

Jangan pernah memasukkan secret, access token, private key, isi `.env`, proprietary source, private URL, log yang belum disanitasi, atau personal path yang belum disanitasi ke Issue, Pull Request, fixture, screenshot, atau CI artifact. Laporkan vulnerability yang belum ditambal secara privat melalui [SECURITY.md](SECURITY.md).

Project harus mempertahankan local-first scan, default network off, symlink boundary, bounded file reads, deterministic machine-readable schema, strict configuration validation, safe output path, dan aturan bahwa code dari target repository tidak dijalankan secara default.

### 7. License dan hak contributor

RepoSentinel menggunakan **MIT License**. Kirim hanya karya yang Anda buat sendiri atau karya yang Anda berhak distribusikan berdasarkan license repository. Dengan membuka Pull Request, Anda menyatakan bahwa kontribusi dapat didistribusikan berdasarkan license repository dan Anda tidak dengan sengaja memasukkan third-party code yang inkompatibel atau kewajiban lisensi yang tidak didokumentasikan.

Project saat ini tidak mewajibkan CLA atau DCO sign-off. Jika kebijakan berubah, pengumuman akan dibuat di repository dan contribution template sebelum berlaku. Lihat [License Policy](docs/LICENSE_POLICY.md) untuk perbandingan MIT dan Apache-2.0.

### 8. Review dan keputusan maintainer

Maintainer menilai correctness, deterministic behavior, UX, security/privacy, compatibility, test, dokumentasi, dan maintenance cost. Approval bukan jaminan bahwa perubahan bebas dari semua bug. Maintainer dapat menolak perubahan yang memperluas scope ke SaaS, hosted dashboard, AI reviewer, remote marketplace, atau network-by-default tanpa keputusan produk yang eksplisit.

Semua peserta wajib mengikuti [Code of Conduct](CODE_OF_CONDUCT.md). Untuk pertanyaan umum, gunakan Issue template yang sesuai. Untuk security vulnerability, gunakan proses privat di [SECURITY.md](SECURITY.md).
