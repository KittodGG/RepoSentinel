# RepoSentinel Security Policy / Kebijakan Keamanan RepoSentinel

## English

RepoSentinel is a local-first repository readiness tool. During a default local scan, source files are read as data; package scripts, build hooks, arbitrary executables, and network calls are not executed. Findings must redact credentials and private-key material.

RepoSentinel is **not** a SAST replacement, full dependency vulnerability scanner, secret-management platform, or formal security audit. A successful readiness score must never be interpreted as proof that a repository is secure or free from vulnerabilities.

### Reporting a vulnerability

**Do not open a public Issue or Pull Request for an unpatched security vulnerability.** Use [GitHub Private Vulnerability Reporting/Security Advisories](https://github.com/KittodGG/RepoSentinel/security/advisories/new) when available. If that channel is unavailable, contact the repository maintainer through a private method listed in the repository settings.

Include only the minimum safe information needed to triage the report:

- Affected version, commit, package, or workflow.
- Security impact and likely affected users.
- Reproducible steps using synthetic data only.
- Attack preconditions and whether exploitation is confirmed.
- Suggested mitigation or patch direction, if known.

Never attach real credentials, private keys, `.env` contents, proprietary source code, private URLs, unredacted logs, or unredacted personal paths. Replace sensitive values with placeholders and explain what was redacted.

Please do not publicly disclose the vulnerability before a fix or coordinated-disclosure decision is available. Maintainers may request additional details through the private channel and will determine remediation and disclosure timing based on impact, exploitability, and affected users.

### Response boundary

Maintainers will acknowledge and triage reports as capacity allows, keep communication private where reasonably possible, and provide updates when a remediation or disclosure decision is available. We do not promise a fixed response time, a specific bounty, or a particular outcome.

Reports about third-party dependencies may be redirected to the upstream security process. General bugs, feature requests, and UX feedback should use the public [Issue templates](.github/ISSUE_TEMPLATE/).

### Hardening requirements

The project must preserve the following boundaries:

- Network is disabled by default.
- Symlinks cannot escape the target root.
- File reads are bounded and binary/large files are handled safely.
- Machine-readable schemas and findings remain deterministic.
- Evidence is redacted and secret values are never printed.
- Configuration is validated strictly.
- Output paths remain inside approved boundaries.
- Target repository code, package scripts, build hooks, and arbitrary executables are never run by default.
- Reports are not uploaded automatically.
- Git commands use fixed, allowlisted arguments.

Any change that weakens a boundary requires explicit security review, a regression test, and release-note treatment.

### Supported release boundary

The current supported stable release is `1.0.0`, published in the [GitHub release notes](https://github.com/KittodGG/RepoSentinel/releases/tag/v1.0.0). A readiness result is not a security certification. Users should update to the latest supported patch release and rotate credentials if they believe sensitive material was exposed.

## Bahasa Indonesia

RepoSentinel adalah repository readiness tool yang bersifat local-first. Saat local scan default, source file dibaca sebagai data; package script, build hook, arbitrary executable, dan network call tidak dijalankan. Finding wajib melakukan redaction terhadap credential dan material private key.

RepoSentinel **bukan** pengganti SAST, full dependency vulnerability scanner, secret-management platform, atau formal security audit. Readiness score yang berhasil tidak boleh dianggap sebagai bukti bahwa repository aman atau bebas vulnerability.

### Cara melaporkan vulnerability

**Jangan membuka Issue atau Pull Request publik untuk security vulnerability yang belum ditambal.** Gunakan [GitHub Private Vulnerability Reporting/Security Advisories](https://github.com/KittodGG/RepoSentinel/security/advisories/new) bila tersedia. Jika channel tersebut tidak tersedia, hubungi maintainer melalui metode privat yang tercantum pada repository settings.

Sertakan hanya informasi minimum yang aman untuk triage:

- Version, commit, package, atau workflow yang terdampak.
- Dampak security dan pengguna yang mungkin terdampak.
- Langkah reproduksi menggunakan data sintetis saja.
- Attack precondition dan apakah exploit sudah terkonfirmasi.
- Dugaan mitigasi atau arah patch, jika diketahui.

Jangan pernah melampirkan credential asli, private key, isi `.env`, proprietary source code, private URL, log yang belum disanitasi, atau personal path yang belum disanitasi. Ganti nilai sensitif dengan placeholder dan jelaskan bagian yang disamarkan.

Jangan mempublikasikan vulnerability sebelum fix atau keputusan coordinated disclosure tersedia. Maintainer dapat meminta detail tambahan melalui channel privat dan akan menentukan remediation serta waktu disclosure berdasarkan impact, exploitability, dan pengguna yang terdampak.

### Batasan response

Maintainer akan mengakui dan melakukan triage sesuai kapasitas, menjaga komunikasi tetap privat sejauh memungkinkan, serta memberikan update ketika remediation atau keputusan disclosure tersedia. Kami tidak menjanjikan response time tertentu, bounty, atau hasil tertentu.

Laporan mengenai third-party dependency dapat diarahkan ke proses security upstream. Bug biasa, feature request, dan UX feedback harus menggunakan [Issue templates](.github/ISSUE_TEMPLATE/) publik.

### Persyaratan hardening

Project wajib mempertahankan batas berikut:

- Network disabled by default.
- Symlink tidak boleh keluar dari target root.
- File read dibatasi dan binary/large file ditangani secara aman.
- Machine-readable schema dan finding tetap deterministic.
- Evidence disanitasi dan nilai secret tidak pernah dicetak.
- Configuration divalidasi secara strict.
- Output path tetap berada dalam boundary yang diizinkan.
- Code dari target repository, package script, build hook, dan arbitrary executable tidak pernah dijalankan secara default.
- Report tidak di-upload secara otomatis.
- Git command menggunakan argumen fixed dan allowlisted.

Perubahan yang melemahkan boundary apa pun wajib memiliki security review eksplisit, regression test, dan catatan release.

### Batas release yang didukung

Supported stable version saat ini adalah `1.0.0`, yang dipublikasikan pada [GitHub release notes](https://github.com/KittodGG/RepoSentinel/releases/tag/v1.0.0). Hasil readiness bukan security certification. Pengguna sebaiknya memperbarui ke patch release supported terbaru dan melakukan credential rotation jika menduga ada material sensitif yang terekspos.

### Triage classification / Klasifikasi triage

| Priority | Meaning / Makna | Target action / Tindakan awal |
|---|---|---|
| P0 | Active exploit, credential exposure, arbitrary code execution, or release artifact compromise. / Exploit aktif, credential bocor, arbitrary code execution, atau artifact release terkompromi. | Immediate maintainer response and release containment. / Response maintainer segera dan containment release. |
| P1 | High-impact security boundary bypass or reproducible data exposure. / Bypass security boundary berdampak tinggi atau data exposure yang dapat direproduksi. | Prioritized patch and coordinated disclosure decision. / Patch prioritas dan keputusan coordinated disclosure. |
| P2 | Defense-in-depth weakness with limited practical impact. / Kelemahan defense-in-depth dengan dampak praktis terbatas. | Scheduled hardening and regression coverage. / Hardening terjadwal dan regression coverage. |
| P3 | Documentation, warning quality, or low-risk security improvement. / Perbaikan dokumentasi, kualitas warning, atau security improvement berisiko rendah. | Normal backlog and public contribution path. / Backlog normal dan jalur kontribusi publik. |
