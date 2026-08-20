# RepoSentinel — Roadmap Tahapan dari Repository sampai Beta Production

**Status:** `planned`  
**Baseline:** CLI-first, local-first, deterministic, explainable  
**Target akhir dokumen:** beta production yang dapat dipakai pengguna eksternal secara terbatas, dengan CLI package, report output, CI integration dasar, dokumentasi, fixture suite, dan release process yang dapat diulang.

> **Catatan status:** Repository GitHub dan dokumen fondasi dapat dibuat terlebih dahulu. Core scanner, package npm, GitHub Action, domain dokumentasi, serta command target tidak boleh disebut `implemented` atau `verified` sebelum kode, test, dan artefak release benar-benar tersedia dan diuji.

## 1. Definisi Selesai untuk Beta Production

Beta production bukan sekadar repository yang berisi source code. Beta production berarti seorang developer baru dapat meng-install atau menjalankan CLI, memindai repository kecil secara lokal, memahami finding, memperbaiki masalah, menghasilkan report, dan menjalankan kembali scan dengan hasil yang konsisten. Sistem juga harus aman ketika menghadapi repository yang tidak terpercaya.

| Dimensi | Gate beta production |
|---|---|
| Functional | `check`, profile, config, terminal, Markdown, JSON, dan exit threshold bekerja pada fixture suite. |
| Quality | Minimal 15 rule memiliki positive fixture, negative fixture, regression test, evidence, remediation, dan dokumentasi. |
| Security | Scanner read-only, offline by default, tidak menjalankan script target, meredact secret, dan melewati static security review. |
| UX | Interactive TUI rapi pada TTY; plain/CI/JSON output stabil dan tidak memiliki ANSI escape atau spinner. |
| Distribution | Package versioned, changelog, release tag, installation instructions, dan rollback path tersedia. |
| CI | Pull request menjalankan lint/typecheck/unit/integration/fixture test dan branch utama terlindungi. |
| Beta evidence | Minimal 10 external users atau setara sesi uji terstruktur memberi feedback yang dapat ditindaklanjuti. |
| Operational | Issue template, bug triage, support boundary, telemetry/privacy statement, dan release checklist tersedia. |

## 2. Urutan Tahapan Utama

| Tahap | Nama | Output utama | Status target |
|---:|---|---|---|
| 0 | Repository bootstrap | Repository GitHub, README, license decision, instructions, roadmap | `implemented` setelah commit awal |
| 1 | Governance dan branch hygiene | Branch strategy, PR template, CODEOWNERS, issue labels, ruleset | `planned` |
| 2 | Workspace scaffold | pnpm workspace, TypeScript, package boundaries, test runner | `planned` |
| 3 | Core contract | `Finding`, `RepositoryContext`, severity, report schema, score contract | `planned` |
| 4 | Safe discovery | File classification, ignore semantics, Git metadata abstraction, safety boundaries | `planned` |
| 5 | Rule engine dan fixtures | Deterministic engine dan minimal 15 rule dengan fixture suite | `planned` |
| 6 | Reporter dan Sentinel Console | Terminal TUI, plain mode, Markdown, JSON, snapshot tests | `planned` |
| 7 | CLI MVP | `check`, `init`, `rules`, `explain`, `report`, exit codes | `planned` |
| 8 | Package dan local release | Build, pack, install smoke test, versioning, changelog | `planned` |
| 9 | CI dan GitHub Action | PR checks, SARIF target, least-privilege workflow | `planned` |
| 10 | Dogfooding dan hardening | RepoSentinel scan terhadap dirinya sendiri, performance/security fixes | `planned` |
| 11 | Closed beta | Release pre-release, feedback protocol, 3–10 pilot repositories | `planned` |
| 12 | Beta production | Public beta gate, release notes, support/triage, post-beta decision | `planned` |

Tahapan dilakukan berurutan. Sebuah tahap dapat memiliki beberapa pull request, tetapi tidak boleh melompati release gate hanya karena happy path sudah berhasil.

## 3. Tahap 0 — Repository Bootstrap

### Tujuan

Membuat tempat kerja resmi dan menjadikan scope RepoSentinel dapat dibaca sebelum kode ditulis. Repository awal harus menjelaskan bahwa project masih berada pada concept specification/MVP planning dan tidak boleh memberi kesan bahwa package sudah tersedia.

### Pekerjaan satu per satu

1. Membuat repository GitHub `KittodGG/RepoSentinel` dengan visibility yang dipilih. Default bootstrap memakai private agar fondasi belum matang tidak langsung dipublikasikan.
2. Menambahkan `README.md`, `AGENTS.md`, `docs/`, dan `.gitignore`.
3. Menyalin project context, technical design, CLI case examples, dan visual CLI specification ke `docs/`.
4. Menetapkan apakah repository memakai LICENSE sekarang atau menunda keputusan legal. Jangan membuat atau mengubah license pada repository lain tanpa permintaan eksplisit.
5. Menambahkan deskripsi repository dan topik yang sesuai setelah positioning final disepakati.
6. Membuat commit awal yang hanya berisi fondasi dokumentasi dan roadmap.

### Definition of done

Repository dapat dibuka dari GitHub, README menjelaskan status dan batasan, setiap dokumen memiliki status `implemented`, `planned`, `proposed`, atau `backlog`, dan tidak ada klaim package atau action yang belum diverifikasi.

### Risiko dan kontrol

Risiko utama tahap ini adalah scope creep dan status yang tidak jelas. Kontrolnya adalah satu source of truth, changelog keputusan, dan larangan menyebut fitur target sebagai fitur live.

## 4. Tahap 1 — Governance dan Branch Hygiene

### Tujuan

Mencegah branch utama berubah tanpa review, test, dan status check yang diperlukan. Protected branches dapat mensyaratkan pull request review dan passing status checks; required check name juga harus unik agar tidak ambigu. [4]

### Pekerjaan satu per satu

1. Menetapkan branch utama `main`.
2. Menetapkan branch kerja `feature/<area>-<short-name>`, `fix/<area>-<short-name>`, dan `docs/<topic>`.
3. Menambahkan pull request template yang mewajibkan context, problem, proposed solution, acceptance criteria, testing, security impact, dan risk.
4. Menambahkan issue template untuk bug, rule proposal, feature proposal, security concern, dan UX feedback.
5. Menambahkan label `P0`, `P1`, `P2`, `rule`, `core`, `cli`, `reporter`, `security`, `docs`, `beta`, dan `blocked`.
6. Menambahkan `CODEOWNERS` untuk `packages/core`, `packages/rules`, `packages/cli`, `packages/reporters`, dan `.github/workflows` ketika maintainer kedua sudah tersedia.
7. Mengaktifkan ruleset/branch protection secara bertahap: pull request required, status checks required, conversation resolution, no force push, no deletion. Saat project sudah memiliki reviewer, aktifkan minimum satu approval untuk perubahan code.
8. Menetapkan merge method. Squash merge direkomendasikan untuk menjaga histori feature tetap ringkas.

### Definition of done

Pull request tanpa status checks tidak dapat masuk `main`, force push dan branch deletion tidak menjadi jalur normal, template PR memaksa acceptance criteria, dan setidaknya ada satu workflow check yang berhasil.

### Risiko dan kontrol

Proteksi terlalu ketat sebelum workflow tersedia dapat memblokir repository sendiri. Aktifkan ruleset setelah status checks memiliki nama stabil dan uji dengan satu pull request percobaan.

## 5. Tahap 2 — Workspace Scaffold

### Tujuan

Membuat struktur monorepo yang memisahkan core engine, rules, reporters, config, CLI, dan action tanpa memasukkan database, SaaS, dashboard, LLM, atau cloud dependency ke MVP.

### Struktur target

```text
reposentinel/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   ├── workflows/
│   └── pull_request_template.md
├── action/
├── docs/
│   ├── rules/
│   ├── profiles/
│   └── ROADMAP_BETA_PRODUCTION.md
├── fixtures/
├── packages/
│   ├── cli/
│   ├── config/
│   ├── core/
│   ├── reporters/
│   ├── rules/
│   └── shared/
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── vitest.config.ts
```

### Pekerjaan satu per satu

1. Menetapkan Node.js 20+ sebagai runtime target dan package manager pnpm.
2. Membuat workspace package tanpa publish package internal terlebih dahulu.
3. Menambahkan TypeScript strict mode, formatter, linter, dan Vitest.
4. Menetapkan boundary: `core` tidak mengimpor `cli`; `rules` hanya memakai model/utility core; `reporters` tidak menjalankan detector; `cli` menjadi orchestrator.
5. Menambahkan command `pnpm lint`, `pnpm typecheck`, `pnpm test`, dan `pnpm build` sebagai contract scripts.
6. Menambahkan `.nvmrc` atau `engines` dan dokumentasi versi Node yang didukung.

### Definition of done

Workspace dapat di-install dari clean checkout, typecheck dan test kosong berjalan, package boundary dapat diperiksa, dan tidak ada target code yang dieksekusi selama setup discovery.

## 6. Tahap 3 — Core Contract

### Tujuan

Mengunci kontrak data sebelum membuat banyak detector. Rule harus mengembalikan normalized finding yang sama sehingga output terminal, Markdown, JSON, dan SARIF tidak menggandakan logika.

### Kontrak minimum

```ts
type Severity = "critical" | "error" | "warning" | "info";

type Finding = {
  ruleId: string;
  severity: Severity;
  message: string;
  path?: string;
  line?: number;
  column?: number;
  evidence?: string;
  remediation: string;
  docsUrl?: string;
  fingerprint?: string;
  metadata?: Record<string, string | number | boolean>;
};
```

### Pekerjaan satu per satu

1. Menetapkan `Severity`, `Finding`, `RepositoryFile`, `RepositoryContext`, `RepositoryProfile`, dan `ResolvedConfig`.
2. Menentukan severity ranking, sorting findings, fingerprint, dan stable report schema.
3. Menentukan exit decision untuk threshold `critical`, `error`, `warning`, dan `info`.
4. Membuat score service dengan formula awal yang dapat dikalibrasi, tanpa menyebut score sebagai security score.
5. Menulis unit test untuk normalization, sorting, redaction, score, dan exit code.
6. Menulis JSON schema atau Zod schema untuk report agar integrasi downstream stabil.

### Definition of done

Dua scan pada fixture yang sama menghasilkan findings dengan urutan dan JSON yang sama; critical/error tidak hilang karena score; dan setiap finding memiliki remediation yang dapat ditindaklanjuti.

### Gate menuju tahap berikutnya

Schema harus disetujui dan diberi versioning sebelum rule pack dibuat. Perubahan breaking harus menaikkan schema version dan memiliki migration note.

## 7. Tahap 4 — Safe Discovery dan Security Boundary

### Tujuan

Membaca repository sebagai data dan membangun context tanpa mengeksekusi kode target. Discovery harus aman untuk repository yang belum dipercaya.

### Pekerjaan satu per satu

1. Resolve target root dan tolak path yang tidak dapat dibaca.
2. Discover file dengan `fast-glob`/`globby` dan semantics `.gitignore` yang konsisten.
3. Klasifikasikan file menjadi text, binary, symlink, directory, tracked, dan ignored.
4. Batasi file size, menangani binary besar, dan mencegah symlink keluar dari target root.
5. Gunakan fixed allowlisted Git invocation bila diperlukan, misalnya `git rev-parse`, `git ls-files`, dan `git status --porcelain=v1`.
6. Jangan menjalankan `npm install`, `pnpm install`, `npm run build`, package scripts, lifecycle hooks, executable hasil build, atau arbitrary shell command target.
7. Matikan network secara default. Rule yang membutuhkan network harus mengumumkan kebutuhan dan hanya berjalan setelah opt-in eksplisit.
8. Buat redaction utility dan negative security tests yang memastikan secret tidak masuk snapshot, stdout, stderr, JSON, atau Markdown.
9. Tentukan perilaku ketika target bukan Git repository: scan filesystem tetap boleh berjalan dengan rule Git-dependent yang dilewati dan dijelaskan.

### Definition of done

Scanner dapat memproses fixture berisi script berbahaya tanpa menjalankannya, tidak mengikuti symlink berbahaya, tidak melakukan network call default, tidak mencetak secret, dan memiliki test untuk permission/path edge case.

### Risiko dan kontrol

False positive security lebih baik menjadi warning yang jelas daripada klaim kebocoran. Jangan menyebut RepoSentinel sebagai secret scanner penuh atau audit keamanan formal.

## 8. Tahap 5 — Rule Engine dan Fixture Suite

### Tujuan

Membangun minimal 15 rule yang deterministic, modular, explainable, dan memiliki fixture positif/negatif sebelum rule ditampilkan sebagai feature stabil.

### Paket rule MVP yang disarankan

| Kategori | Rule target |
|---|---|
| Documentation | `documentation.readme-exists`, `documentation.quickstart`, `documentation.description`, `docs.structure` |
| Links/assets | `links.valid`, `images.resolve`, `badges.resolve`, `portfolio.demo-visible` |
| Security | `security.env-file`, `security.private-key`, `security.credential-pattern`, `security.env-example` |
| Package | `package.lockfile-single`, `package.manifest-name`, `package.scripts-start` |
| Git/community/CI | `gitignore.exists`, `community.license-present`, `community.issue-template`, `ci.workflow-permissions` |

### Pekerjaan satu per satu

1. Tulis rule inventory dengan ID, kategori, default severity, profile, detector, evidence, remediation, docs URL, fixture, dan test.
2. Buat fixture `clean-public`, `broken-readme`, `security-env-tracked`, `security-private-key`, `credential-pattern`, `license-missing`, `license-mismatch`, dan `package-mismatch`.
3. Implementasikan documentation rules terlebih dahulu.
4. Implementasikan link, image, badge, dan portfolio rules.
5. Implementasikan security rules dengan confidence level high/medium/low serta redaction.
6. Implementasikan package, Git, community, dan workflow rules.
7. Jalankan fixture suite pada setiap perubahan rule.
8. Tambahkan snapshot output untuk finding yang aman dan snapshot negative untuk secret.
9. Dokumentasikan false positive yang diketahui dan cara ignore/override.

### Definition of done

Minimal 15 rule lulus positive fixture, negative fixture, regression test, determinism test, dan security assertion. Rule baru tidak boleh merge tanpa dokumentasi dan remediation.

### Gate menuju tahap berikutnya

Tidak boleh membuat UI besar sebelum finding dari fixture suite stabil. UI harus menjadi reporter atas hasil engine, bukan tempat detector baru disisipkan.

## 9. Tahap 6 — Reporter dan Sentinel Console

### Tujuan

Membuat output yang rapi, interaktif, unik, dan stylish seperti modern coding-agent CLI, tetapi tetap dapat dibaca oleh CI, pipe, SSH, terminal tanpa warna, dan screen reader.

### Pekerjaan satu per satu

1. Implementasikan token `brand`, `muted`, `success`, `info`, `warning`, `error`, `critical`, dan `selected` menggunakan named ANSI colors.
2. Buat fallback `[ok]`, `[warn]`, `[fail]`, `[critical]`, dan `[*]` untuk `NO_COLOR`, `--plain`, `--no-unicode`, atau terminal terbatas.
3. Buat adaptive renderer: TUI untuk TTY, plain untuk pipe/CI, JSON/Markdown/SARIF untuk machine output.
4. Buat live progress surface dengan fase `resolve`, `config`, `discover`, `select rules`, `run rules`, dan `render`.
5. Buat health snapshot panel dengan score, status, severity counts, dan komponen score.
6. Buat finding list dengan `↑/↓`, `Enter`, `Esc`, `f`, `r`, `o`, `e`, `?`, dan `q`.
7. Buat detail panel yang menampilkan rule, location, evidence aman, remediation, dan docs link.
8. Buat Markdown reporter yang mudah ditempel ke issue/pull request.
9. Buat JSON reporter dengan schema version dan stdout yang bebas ANSI.
10. Siapkan SARIF reporter sebagai target CI setelah schema stabil.
11. Tambahkan snapshot test pada ukuran terminal normal, sempit, tanpa warna, tanpa Unicode, dan CI.

### Definition of done

Pengguna dapat memahami repository, score, dan top finding dalam lima detik; dapat membuka detail finding dengan keyboard; dan output yang sama tetap valid saat `CI=true`, `NO_COLOR=1`, `--plain`, atau `--format json`.

### Catatan inspirasi

Pola yang relevan dari terminal UI modern mencakup progress visual, collapsible/detail view, overlay panel, fuzzy picker, shortcut yang terlihat, theme fallback, dan pemisahan sesi interaktif dari mode non-interaktif. [3] [4] [5]

## 10. Tahap 7 — CLI MVP

### Command target

```bash
reposentinel check <path>
reposentinel init
reposentinel rules
reposentinel explain <rule_id>
reposentinel report
reposentinel baseline create
```

### Pekerjaan satu per satu

1. Implementasikan `check <path>` dengan `--profile`, `--fail-on`, `--config`, `--format`, `--output`, `--plain`, `--no-color`, dan `--verbose`.
2. Implementasikan `init` dengan wizard interaktif dan non-interactive defaults.
3. Implementasikan `rules` dengan filter category/profile.
4. Implementasikan `explain <rule_id>` dengan detection, rationale, evidence, remediation, dan network requirement.
5. Implementasikan `report` untuk terminal, Markdown, dan JSON; SARIF setelah diuji.
6. Implementasikan baseline hanya setelah fingerprint stabil; baseline tidak boleh menyembunyikan finding baru.
7. Tetapkan exit codes dan integration test untuk sukses, warning, error, critical, invalid config, invalid path, permission failure, dan unsupported format.
8. Pastikan CLI tidak menulis ke target repository selain directory report yang eksplisit dan aman.
9. Tambahkan `--version` dan `--help` yang akurat sesuai fitur yang benar-benar tersedia.

### Exit code target

| Kondisi | Exit code |
|---|---:|
| Lulus threshold | `0` |
| Finding melewati threshold | `1` |
| Argumen/profile/config invalid | `2` |
| Filesystem atau internal failure | `3` |

### Definition of done

Fresh user dapat menjalankan scan pertama kurang dari lima menit, mendapatkan finding yang dapat dipahami, memperbaiki fixture, dan melihat hasil scan membaik tanpa membaca source code RepoSentinel.

## 11. Tahap 8 — Package dan Local Release

### Tujuan

Memastikan CLI yang dibuat dapat dipasang dan dijalankan dari package artifact, bukan hanya dari workspace developer.

### Pekerjaan satu per satu

1. Buat build bundle CLI dengan entrypoint yang benar.
2. Pastikan package tidak mengirim source code repository target ke server.
3. Jalankan `pnpm pack` pada clean checkout.
4. Install tarball ke temporary directory dan jalankan `--help`, `--version`, `check`, `report`, serta failure path.
5. Uji Node.js support matrix yang dijanjikan.
6. Buat changelog dan release notes berbasis perubahan yang dapat diverifikasi.
7. Tetapkan versioning dan pre-release naming, misalnya `0.1.0-beta.1`.
8. Jangan mempublikasikan package sebelum package metadata, README install, provenance, dan rollback path diverifikasi.

### Definition of done

Tarball yang dibangun pada CI dapat di-install pada clean environment dan menghasilkan output yang sama dengan workspace test.

## 12. Tahap 9 — CI dan GitHub Action

### Tujuan

Membuat pull request dan push ke branch utama memperoleh feedback otomatis tanpa memberikan permission yang berlebihan.

### Pekerjaan satu per satu

1. Buat workflow `quality.yml` untuk install, lint, typecheck, unit test, integration test, fixture test, dan build.
2. Tetapkan `permissions: contents: read` sebagai default dan naikkan permission hanya pada job yang benar-benar memerlukannya. [5]
3. Gunakan `pull_request` untuk memproses perubahan kontribusi dengan privilege minimum.
4. Hindari `pull_request_target` atau `workflow_run` yang checkout untrusted pull request content dalam konteks privileged. [5]
5. Pin third-party action ke full-length commit SHA atau gunakan policy yang setara setelah source diverifikasi. [5]
6. Tambahkan workflow `security.yml` untuk dependency review, secret hygiene, action pinning review, dan code scanning yang sesuai scope.
7. Tambahkan workflow `release.yml` yang hanya berjalan pada tag/release yang disetujui.
8. Reuse core engine dari action; jangan membuat detector berbeda antara local CLI dan CI.
9. Tambahkan Markdown summary dan SARIF hanya jika format telah diuji pada fixture.
10. Aktifkan required status checks pada branch utama setelah job names stabil.

### Definition of done

PR yang mematahkan test atau typecheck terblokir; workflow tidak mengekspos secret; local dan CI menghasilkan finding konsisten; dan action memiliki least-privilege permissions.

## 13. Tahap 10 — Dogfooding dan Hardening

### Tujuan

Menggunakan RepoSentinel untuk memeriksa repository RepoSentinel sendiri dan menemukan masalah yang tidak terlihat pada fixture sintetis.

### Pekerjaan satu per satu

1. Jalankan CLI dari package artifact terhadap repository RepoSentinel.
2. Perbaiki README, Quick Start, package metadata, links, workflow, contributor docs, dan release docs berdasarkan finding.
3. Ukur scan repository kecil: target awal kurang dari tiga detik lokal, tanpa menganggap target sebagai jaminan final. [1]
4. Jalankan scan dua kali dan bandingkan JSON setelah menghapus field dinamis yang memang diperlukan.
5. Uji repository besar, binary besar, symlink, path aneh, file encoding, empty repository, dan non-Git directory.
6. Jalankan threat review: malicious package script, malicious filename, symlink escape, prompt-like content, token-like data, and untrusted workflow input.
7. Review setiap finding false positive dan tambahkan ignore/override hanya jika alasan dapat dijelaskan.
8. Tulis `LIMITATIONS.md` yang jelas tentang bukan SAST, bukan full secret scanner, dan bukan security audit formal.

### Definition of done

Repository RepoSentinel memperoleh scan yang dapat dipahami, tidak memiliki critical/error yang belum ditinjau, fixture regression tetap hijau, dan batasan produk terlihat jelas.

## 14. Tahap 11 — Closed Beta

### Tujuan

Menguji produk pada sejumlah kecil pengguna nyata sebelum membuka beta yang lebih luas.

### Pekerjaan satu per satu

1. Pilih 3–10 pilot user atau repository dengan persona berbeda: portfolio, public project, package, academic, dan internal team.
2. Berikan command install dan satu tugas sederhana tanpa live coaching.
3. Ukur waktu dari install sampai scan pertama, waktu memahami finding, dan waktu mendapatkan scan kedua yang lebih baik.
4. Kumpulkan feedback terstruktur untuk relevansi finding, false positive, UI clarity, performance, privacy, dan output CI.
5. Catat issue dengan label `beta`, `ux`, `false-positive`, `rule-gap`, `crash`, dan `docs-gap`.
6. Prioritaskan perbaikan P0/P1 yang menghalangi scan atau menimbulkan risiko keamanan.
7. Jangan menambah dashboard, AI reviewer, marketplace rule, atau multi-repository SaaS hanya karena feedback beta meminta permukaan baru; validasi core CLI terlebih dahulu.
8. Potong release candidate `0.1.0-beta.1` dari tag yang reproducible.

### Gate closed beta

| Sinyal | Minimum target |
|---|---:|
| Fresh user berhasil scan | ≥70% |
| Median install sampai report | <5 menit |
| Finding dianggap relevan | >80% |
| Crash pada fixture suite | <2% |
| Pilot session dengan scan kedua berhasil | Mayoritas sesi |

Target tersebut berasal dari target beta RepoSentinel dan harus diperlakukan sebagai target validasi, bukan hasil yang sudah tercapai. [1]

## 15. Tahap 12 — Beta Production

### Tujuan

Menerbitkan beta yang dapat dipakai secara nyata oleh pengguna terbatas atau publik dengan release discipline, dokumentasi, dan jalur pemulihan.

### Pekerjaan satu per satu

1. Bekukan schema finding dan command public untuk versi beta; perubahan breaking harus dicatat.
2. Jalankan full quality gate pada clean checkout: lint, typecheck, unit, integration, fixture, snapshot, security, performance, package smoke test, dan documentation link checks yang tidak memerlukan network default.
3. Audit output terminal pada TTY interaktif, Windows Terminal, Linux SSH, terminal 16-color, `NO_COLOR`, pipe, `CI=true`, dan JSON parser.
4. Audit redaction dengan fixture secret dan pastikan value tidak muncul di stdout, stderr, report file, snapshot, atau workflow logs.
5. Review permissions dan action dependencies. GitHub menyarankan least privilege untuk `GITHUB_TOKEN`, masking sensitive data, audit workflow logs, dan pinning third-party action ketika digunakan. [5]
6. Buat tag release `v0.1.0-beta.1` dan GitHub pre-release. GitHub Releases berbasis tag dan dapat memaketkan release notes serta assets yang dapat diunduh. [6]
7. Publikasikan release notes yang menyebut status beta, supported Node versions, known limitations, migration note, dan cara melaporkan bug.
8. Publikasikan package hanya setelah nama package, provenance, README, install smoke test, dan ownership benar-benar diverifikasi.
9. Sediakan rollback: versi package sebelumnya, cara menurunkan versi, cara menonaktifkan Action, dan cara menghapus baseline/report artifact.
10. Pantau issue, crash report, failed CI example, dan feedback UX selama window beta.
11. Jadwalkan evaluasi akhir beta berdasarkan data, bukan jumlah star saja.

### Beta production release gate

Beta dapat disebut production-ready untuk penggunaan beta apabila semua pernyataan berikut benar.

| Gate | Pertanyaan verifikasi |
|---|---|
| Install | Apakah user baru dapat install dari instruksi README pada clean machine? |
| Scan | Apakah `check .` menyelesaikan scan tanpa menjalankan kode target? |
| Finding | Apakah setiap finding mempunyai lokasi, alasan, evidence aman, dan remediation? |
| UI | Apakah TUI terasa rapi tetapi plain/CI output tetap stabil? |
| Security | Apakah secret tidak pernah tercetak dan network tidak aktif default? |
| CI | Apakah PR dapat gagal konsisten berdasarkan threshold? |
| Release | Apakah tag, package artifact, changelog, dan release notes cocok? |
| Support | Apakah pengguna tahu cara melaporkan bug dan memahami limitation? |
| Recovery | Apakah ada rollback path jika beta merusak workflow? |
| Evidence | Apakah data pilot mendukung relevansi, usability, dan performa minimum? |

## 16. Checklist Eksekusi Harian

Gunakan urutan berikut setiap kali mengerjakan fitur.

```text
1. Baca source of truth dan tentukan status fitur.
2. Buat issue dengan context → problem → proposed solution → acceptance criteria → risks.
3. Pilih prioritas P0/P1/P2 dan tulis dependencies.
4. Tulis atau perbarui fixture sebelum detector/rule.
5. Implementasikan perubahan pada branch feature.
6. Jalankan lint, typecheck, unit, integration, fixture, dan security test.
7. Periksa output TUI, plain, CI, JSON, dan Markdown bila reporter berubah.
8. Buka pull request dengan bukti test dan screenshot terminal bila UX berubah.
9. Review security boundary dan data yang mungkin masuk log.
10. Merge hanya setelah required checks dan review selesai.
11. Update changelog, docs, dan roadmap status.
12. Tag release hanya setelah release gate terpenuhi.
```

## 17. Urutan Issue yang Disarankan

Issue di bawah dapat dijadikan backlog awal agar implementasi berjalan satu per satu.

| ID | Issue | Prioritas | Depends on |
|---|---|---:|---|
| RS-001 | Finalize repository governance and branch rules | P0 | Tahap 0 |
| RS-002 | Bootstrap pnpm workspace and TypeScript packages | P0 | RS-001 |
| RS-003 | Define Finding, Context, Config, and Report schemas | P0 | RS-002 |
| RS-004 | Implement deterministic discovery and ignore semantics | P0 | RS-003 |
| RS-005 | Implement redaction and security boundary tests | P0 | RS-004 |
| RS-006 | Add first documentation and link rules | P0 | RS-004 |
| RS-007 | Add security rules and fixtures | P0 | RS-005 |
| RS-008 | Add package/community/CI rules | P1 | RS-006 |
| RS-009 | Implement score, threshold, and exit decisions | P0 | RS-003 |
| RS-010 | Implement terminal plain reporter | P0 | RS-009 |
| RS-011 | Implement Sentinel Console TUI reporter | P1 | RS-010 |
| RS-012 | Implement Markdown and JSON reporters | P0 | RS-009 |
| RS-013 | Implement `check`, `init`, `rules`, and `explain` | P0 | RS-010 |
| RS-014 | Implement report export and baseline | P1 | RS-012 |
| RS-015 | Add CI quality workflow | P0 | RS-002 |
| RS-016 | Add package build and install smoke test | P0 | RS-013 |
| RS-017 | Add GitHub Action and SARIF | P1 | RS-012, RS-015 |
| RS-018 | Dogfood RepoSentinel against itself | P0 | RS-013, RS-016 |
| RS-019 | Run closed beta pilot | P0 | RS-018 |
| RS-020 | Publish beta production release | P0 | RS-019 |

## 18. Keputusan yang Harus Dikunci Sebelum Beta

| Keputusan | Default sederhana | Batas waktu |
|---|---|---|
| Package name | `reposentinel` jika tersedia dan dapat diverifikasi | Sebelum package publish |
| CLI framework | Commander atau alternatif sederhana yang dipilih di scaffold | Tahap 2 |
| Health score formula | Formula awal dengan kalibrasi fixture/user test | Sebelum beta |
| Secret detection scope | High-confidence heuristics + redaction, bukan full scanner | Tahap 4–5 |
| HTML report | Tidak masuk core beta kecuali ada alasan kuat | Setelah CLI stabil |
| Profile tambahan | `academic`/`private-team` setelah profile MVP tervalidasi | Setelah closed beta |
| Network rules | Off by default, explicit opt-in | Sebelum rule remote |
| Release channel | `beta` via GitHub pre-release dan package pre-release | Tahap 12 |

## 19. Post-Beta Decision

Pada akhir beta, keputusan tidak otomatis berarti menambah fitur. Evaluasi harus menjawab apakah core CLI dipercaya. Jika fresh user berhasil scan, finding dianggap relevan, false positive masih terkendali, output CI stabil, dan security boundary lulus, project dapat bergerak ke v0.2 atau stable planning. Jika tidak, hentikan penambahan surface baru dan fokus pada schema, rules, UX, performance, dan dokumentasi.

## References

[1]: ./RepoSentinel_Project_Context.md "RepoSentinel — Project Context & Source of Truth"
[2]: ./RepoSentinel_Tech_Stack_and_Rule_Engine.md "RepoSentinel — Tech Stack and Rule Engine"
[3]: https://freebuff.com/cli "Freebuff CLI"
[4]: https://code.claude.com/docs/en/cli-reference "Claude Code CLI reference"
[5]: https://docs.github.com/en/actions/reference/security/secure-use "GitHub Actions secure use reference"
[6]: https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases "GitHub — About releases"
[7]: https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches "GitHub — About protected branches"
[8]: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions "GitHub Actions workflow syntax"
