# RepoSentinel — Project Context & Source of Truth

> **Tujuan dokumen:** menjadi sumber konteks utama untuk Project RepoSentinel. Baca dokumen ini sebelum merancang fitur, menulis kode, membuat issue, menyusun roadmap, atau mengambil keputusan produk.

**Pemilik konsep:** Kitna Mahardika Favian / KittodGG  
**Status:** Concept specification / MVP planning  
**Versi konteks:** 1.0  
**Tanggal pembaruan:** 17 Agustus 2026  
**Dokumen teknis lengkap:** `RepoSentinel_Product_Technical_Specification.docx`

---

## 1. Ringkasan Produk

**RepoSentinel** adalah developer tool untuk memeriksa kesehatan sebuah repository sebelum repository tersebut dibagikan, dipublikasikan, dipamerkan sebagai portfolio, atau menerima kontribusi. Bentuk awalnya adalah **CLI lokal**, kemudian diperluas menjadi **GitHub Action**, dengan kemungkinan integrasi VS Code pada tahap berikutnya.

RepoSentinel memeriksa dokumentasi, README, link, gambar, badge, metadata, package hygiene, konfigurasi, workflow CI, security hygiene dasar, dan kesiapan contributor. Tool ini menghasilkan finding yang actionable, health score, serta report dalam terminal, Markdown, JSON, dan kemudian SARIF.

> **Positioning utama:** “RepoSentinel — cek repository Anda sebelum orang lain menilainya.”

> **Positioning bahasa Inggris:** “Make every repository ready to be understood, trusted, and shared.”

RepoSentinel **belum merupakan package yang sudah dipublikasikan**. Semua nama package, command instalasi, URL action, dan contoh konfigurasi harus diperlakukan sebagai **target design** sampai benar-benar diimplementasikan dan diverifikasi.

---

## 2. Keputusan Produk yang Sudah Disepakati

Keputusan berikut dianggap sebagai baseline dan jangan diubah tanpa alasan yang jelas atau persetujuan pemilik project.

| Area | Keputusan |
|---|---|
| Bentuk awal | CLI-first, local-first, dan berjalan tanpa akun. |
| SaaS | RepoSentinel tidak harus menjadi SaaS. Cloud dashboard bukan prioritas MVP. |
| Privasi | Source code tidak dikirim ke server pada local scan. Network rule harus opt-in. |
| Arsitektur | Core engine deterministic, rule modular, reporter terpisah. |
| Urutan pengembangan | Core schema → CLI → rule pack → output → GitHub Action → profiles → extension. |
| Auto-fix | Tidak masuk MVP. Mulai dari remediation guidance agar tidak menimbulkan side effect. |
| AI | Tidak menjadi dependency inti MVP. Jangan mulai dari fitur AI atau dashboard. |
| Lisensi/repository profil | Jangan membuat atau mengubah LICENSE/CONTRIBUTING pada repository KittodGG tanpa permintaan eksplisit. Ini berbeda dari rule RepoSentinel yang boleh mendeteksi apakah dokumen tersebut tersedia. |
| Gaya komunikasi | Jelaskan perbedaan antara fitur yang sudah ada, rancangan target, dan ide backlog. Jangan menyatakan fitur sudah live bila belum diuji. |

---

## 3. Masalah yang Diselesaikan

Repository yang memiliki kode bagus sering tetap terlihat tidak siap karena README tidak menjelaskan cara mulai, demo mengarah ke link mati, gambar menggunakan path lokal, badge tidak tampil, package manager tidak konsisten, file `.env` ikut ter-commit, atau contributor tidak tahu cara membantu.

Tool yang ada biasanya terlalu sempit. Linter fokus pada source code, secret scanner fokus pada credential, dan link checker tidak memahami konteks dokumentasi. RepoSentinel berada di antara **code quality**, **security hygiene**, dan **repository readiness**.

RepoSentinel tidak boleh diposisikan sebagai pengganti SAST, secret scanner enterprise, dependency vulnerability scanner penuh, atau audit keamanan formal.

---

## 4. Target Pengguna

| Persona | Kebutuhan | Profile awal |
|---|---|---|
| Portfolio developer | Memastikan README, demo, screenshot, dan link terlihat profesional. | `portfolio` |
| Open-source maintainer | Menyiapkan dokumentasi, issue template, dan onboarding contributor. | `public` |
| Student/researcher | Membuat project dapat direproduksi oleh orang lain. | `academic` |
| Package author | Memeriksa manifest, exports, scripts, API docs, dan release hygiene. | `npm-package` |
| Engineering team | Menjaga konsistensi banyak repository dan mempercepat onboarding. | `private-team` |
| Educator/bootcamp | Menilai repository peserta menggunakan checklist yang objektif. | `portfolio` |

### Jobs to be done

1. Sebelum mengirim portfolio, pengguna ingin tahu apakah repository terlihat profesional.
2. Sebelum membuka repository menjadi public, pengguna ingin memeriksa link, asset, metadata, dan data sensitif.
3. Sebelum merge pull request, maintainer ingin mendeteksi regresi dokumentasi dan metadata.
4. Saat onboarding contributor, tim ingin menemukan bagian yang belum terdokumentasi.
5. Saat merawat banyak repository, organisasi ingin memakai standar yang konsisten.

---

## 5. Prinsip Produk

- **Local-first by default:** source code tetap berada di perangkat pengguna kecuali pengguna memilih mengirim report.
- **Actionable findings:** setiap temuan harus memiliki alasan, lokasi, dampak, dan cara memperbaiki.
- **Profile-driven:** kebutuhan portfolio, package, mobile app, academic project, dan public project berbeda.
- **Low ceremony:** pengguna dapat menjalankan scan pertama tanpa akun dan tanpa konfigurasi panjang.
- **Safe failure:** false positive lebih baik menjadi warning yang dapat di-ignore daripada perubahan otomatis yang merusak file.
- **Extensible rules:** rule baru dapat ditambahkan tanpa mengubah seluruh engine.
- **Trust over novelty:** deterministic engine yang dapat dipercaya lebih penting daripada dashboard atau AI yang spektakuler.

---

## 6. Scope MVP

### Termasuk dalam MVP

- Repository discovery dan file classification.
- Pemeriksaan README dan Markdown.
- Pemeriksaan heading, quick start, deskripsi, screenshot, link, image, dan badge.
- Pemeriksaan security hygiene dasar: `.env`, private key, credential pattern yang jelas, dan sensitive file pattern.
- Pemeriksaan package manager, manifest, lockfile, scripts, dan metadata.
- Pemeriksaan `.gitignore`, workflow CI, issue template, repository description, dan metadata GitHub dasar.
- Konfigurasi melalui `.reposentinel.yml`.
- Profiles `public`, `portfolio`, dan `npm-package`.
- Output terminal, Markdown, dan JSON.
- Exit code berdasarkan severity threshold.
- Minimal GitHub Action basic.
- Rule fixture dan unit test.

### Tidak termasuk MVP

- Full SAST atau proof vulnerability.
- Audit keamanan formal.
- Upload source code ke cloud secara default.
- Automatic refactor massal.
- Dashboard multi-repository sebagai dependency inti.
- Marketplace rule eksternal.
- VS Code extension.
- AI reviewer yang menjadi komponen wajib.
- Jaminan bahwa repository bebas credential atau vulnerability.

---

## 7. Alur Kerja Utama

1. Pengguna meng-install atau menjalankan RepoSentinel dengan `npx`.
2. Pengguna menjalankan `reposentinel check .`.
3. Tool memuat profile dan `.reposentinel.yml`.
4. Tool menemukan file, folder, `.git`, manifest, lockfile, README, image, workflow, dan metadata.
5. Rule engine memilih rule berdasarkan profile dan jenis project.
6. Rule berjalan secara terisolasi dan menghasilkan normalized findings.
7. Findings dikelompokkan berdasarkan severity.
8. Health score dihitung sebagai ringkasan readiness, bukan jaminan keamanan.
9. Reporter menghasilkan terminal, Markdown, JSON, atau SARIF.
10. Pengguna memperbaiki repository dan menjalankan scan kembali.

Workflow inti harus terasa sesingkat ini:

```text
install → check → understand finding → fix → check again → share
```

---

## 8. Arsitektur Logis

```text
Developer / CI / VS Code
          │
          ▼
   RepoSentinel CLI
          │
          ▼
 Repository Discovery
          │
          ▼
      Rule Engine
   ┌──────┼────────┬──────────┐
   ▼      ▼        ▼          ▼
Docs   Security  Links      Metadata
Rules  Rules     Rules      & Workflow
   └──────┼────────┴──────────┘
          ▼
  Normalized Findings
          │
          ▼
 Health Score + Severity
   ┌──────┼─────────┬────────┐
   ▼      ▼         ▼        ▼
Terminal Markdown JSON     SARIF
```

### Prinsip arsitektur

Rule tidak boleh mengetahui detail reporter. Semua rule mengembalikan schema finding yang sama. Reporter terminal, Markdown, JSON, SARIF, dan PR annotation harus dapat ditambahkan tanpa menduplikasi detector.

Discovery harus membaca repository sebagai data. Jangan menjalankan `npm install`, build script, package script, arbitrary shell command, atau kode dari repository target selama proses discovery.

---

## 9. Rule Engine

Setiap rule minimal memiliki:

- `rule_id` stabil.
- Kategori.
- Default severity.
- Detector.
- Evidence builder.
- Remediation message.
- Documentation URL atau reference.
- Fixture positif.
- Fixture negatif.
- Regression test.

### Kategori rule awal

| Kategori | Contoh rule | Severity default |
|---|---|---|
| Documentation | `readme.exists`, `readme.quickstart`, `readme.description`, `docs.structure` | warning |
| Links & assets | `links.valid`, `images.resolve`, `badges.resolve`, `demo.url` | warning |
| Security hygiene | `secrets.env`, `credential.pattern`, `private.key`, `history.sensitive` | error/critical |
| Package & dependencies | `lockfile.single`, `package-manager.consistent`, `scripts.start`, `manifest.name` | warning |
| Git metadata | `gitignore.exists`, `branch.default`, `large.file`, `generated.tracked` | info/warning |
| Community readiness | `license.detected`, `contributing.detected`, `issue.template`, `code.of.conduct` | info |
| CI & automation | `workflow.syntax`, `workflow.permissions`, `release.metadata` | warning |
| Portfolio profile | `screenshot.exists`, `demo.visible`, `project.summary`, `techstack.visible` | warning |

### Severity model

| Severity | Makna | Default exit behavior |
|---|---|---|
| `critical` | Potensi secret atau kondisi dengan dampak serius. | Exit 1; selalu tampil. |
| `error` | Masalah penting yang membuat repository tidak siap. | Exit 1 jika threshold meminta. |
| `warning` | Masalah kualitas atau discoverability. | Exit 0 secara default. |
| `info` | Saran peningkatan. | Exit 0; tampil pada verbose report. |

### Normalized finding schema

```json
{
  "rule_id": "readme.quickstart",
  "severity": "warning",
  "message": "README tidak memiliki quick start yang dapat dijalankan.",
  "path": "README.md",
  "line": 18,
  "evidence": "Tidak ditemukan heading install, setup, atau quick start.",
  "remediation": "Tambahkan langkah instalasi dan satu contoh command.",
  "docs_url": "https://docs.reposentinel.dev/rules/readme.quickstart"
}
```

---

## 10. Target CLI dan Konfigurasi

RepoSentinel belum dipublikasikan. Command berikut adalah **kontrak UX target**.

```bash
npm install --global reposentinel
reposentinel --version

# One-shot
npx reposentinel check .

# Scan dengan profile
reposentinel check . --profile portfolio

# Lihat rule
reposentinel rules --category security

# Jelaskan rule
reposentinel explain readme.quickstart

# Export report
reposentinel report --format markdown
reposentinel report --format json
reposentinel report --format sarif

# Baseline
reposentinel baseline create
```

### Target `.reposentinel.yml`

```yaml
extends: recommended
profile: public

rules:
  readme.quickstart: warning
  links.valid: error
  license.detected: off

ignore:
  - node_modules/**
  - dist/**
  - coverage/**
  - generated/**

report:
  formats: [terminal, markdown, json]
  output_dir: .reposentinel/reports

ci:
  fail_on: error
```

### Target output

```text
RepoSentinel Report
Repository : my-project
Profile    : portfolio
Score      : 78 / 100

CRITICAL  0    ERROR  1    WARNING  4    INFO  6

ERROR    secrets.env
         .env is tracked by Git
         Fix: remove it from history and add it to .gitignore

WARNING  readme.quickstart
         README.md:18 has no runnable installation command
         Fix: add a Quick Start section

Result: needs attention
```

---

## 11. Health Score

Health score hanya meringkas repository readiness. Score tidak boleh menyembunyikan critical atau error dan tidak boleh disebut sebagai skor keamanan absolut.

| Komponen | Bobot target |
|---|---:|
| Documentation | 30% |
| Security hygiene | 30% |
| Discoverability | 25% |
| Community readiness | 15% |

Rancangan sederhana:

```text
score = 100
score -= critical_count * 35
score -= error_count * 18
score -= warning_count * 5
score -= info_count * 1
score = max(0, min(score, 100))
```

| Rentang | Label |
|---:|---|
| 90–100 | Ready |
| 75–89 | Almost ready |
| 50–74 | Needs attention |
| 0–49 | Not ready |

Bobot harus dikalibrasi melalui fixture dan user testing. Jangan menganggap formula awal sebagai keputusan final.

---

## 12. GitHub Action

GitHub Action adalah tahap setelah CLI dan exit code stabil. Target awal:

```yaml
name: Repository Health

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read
  security-events: write

jobs:
  reposentinel:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: KittodGG/reposentinel-action@v1
        with:
          profile: public
          fail-on: error
          output: sarif,markdown
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: .reposentinel/reports/report.sarif
```

URL action dan nama package di atas masih target design. Verifikasi sebelum digunakan.

---

## 13. Teknologi dan Struktur Repository

### Rekomendasi teknologi

| Layer | Pilihan target |
|---|---|
| Runtime | Node.js + TypeScript |
| CLI | Commander atau Oclif |
| Markdown | Unified/Remark AST |
| Config | YAML + Zod |
| Test | Vitest |
| Output CI | SARIF + Markdown summary |
| Extension tahap lanjut | VS Code API |

### Struktur folder target

```text
reposentinel/
├── packages/
│   ├── cli/
│   ├── core/
│   ├── rules/
│   ├── reporters/
│   ├── config/
│   └── shared/
├── fixtures/
│   ├── clean-public/
│   ├── broken-readme/
│   ├── secret-risk/
│   └── package-mismatch/
├── action/
├── docs/
├── .github/workflows/
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

---

## 14. MVP dan Roadmap

### MVP/P0

1. Finding schema, severity model, dan score sederhana.
2. CLI `check` dengan target path dan exit code.
3. Minimal 15 rule dengan fixture positif/negatif.
4. Output terminal, Markdown, dan JSON.
5. `.reposentinel.yml` dengan profile, ignore, rule override, dan threshold.
6. Profile `public`, `portfolio`, dan `npm-package`.
7. Dokumentasi README, install, examples, rule reference, dan limitation.
8. GitHub Action basic setelah CLI stabil.

### Fase implementasi

| Fase | Deliverable | Definition of done |
|---|---|---|
| 0. Discovery | Rule inventory, persona, fixture list, user flow. | Scope dan acceptance criteria disepakati. |
| 1. Core engine | Discovery, context, finding schema, severity. | Rule dapat diuji secara deterministic. |
| 2. CLI MVP | `check`, `init`, `rules`, `explain`, Markdown/JSON. | Fresh user dapat scan pertama kurang dari 5 menit. |
| 3. Rule pack | Docs, links, security, package rules. | Minimal 15 rule memiliki test dan remediation. |
| 4. CI | GitHub Action dan SARIF. | PR dapat menampilkan annotation dan threshold exit. |
| 5. Profiles | `public`, `portfolio`, `npm-package`. | False positive berkurang berdasarkan konteks. |
| 6. Beta | Docs, demo, releases, issue templates. | Minimal 10 external users memberi feedback. |

### P1/P2 backlog

- Baseline dan changed-files mode.
- SARIF dan PR annotation yang lebih lengkap.
- HTML report.
- Safe autofix untuk kasus sederhana.
- VS Code diagnostics.
- Custom rule API.
- Rule registry.
- Multi-repository dashboard.

---

## 15. Testing, Security, dan Privasi

### Testing

Wajib mencakup unit test detector/parser/score, fixture test, snapshot output, integration test CLI, GitHub Action test, security test, performance benchmark, dan usability test.

### Security boundaries

- Jangan menjalankan package script, build script, atau arbitrary code dari repository target.
- Jangan mencetak nilai secret; mask value dan tampilkan path/line jika aman.
- Local scan tidak memiliki network call secara default.
- Resolve path harus tetap berada di dalam target root.
- GitHub Action memakai least-privilege permissions.
- Report tidak boleh di-upload otomatis tanpa pilihan pengguna.
- Tampilkan disclaimer bahwa tool bukan audit keamanan formal.

### Acceptance criteria MVP

- Fresh user dapat menjalankan scan pertama maksimal lima menit.
- Setiap finding memiliki `rule_id`, severity, path, line jika tersedia, message, dan remediation.
- CLI memiliki exit code konsisten berdasarkan threshold.
- Tidak ada source code yang dikirim ke server saat local scan.
- Lima belas rule memiliki fixture dan regression test.
- Report Markdown dapat ditempel ke issue atau pull request.
- GitHub Action berjalan tanpa database atau login tambahan.

---

## 16. Metrik Keberhasilan

| Metrik | Target beta |
|---|---:|
| Fresh user berhasil scan pertama | ≥70% |
| Median install sampai report | <5 menit |
| Finding dianggap relevan | >80% |
| Scan repository kecil | <3 detik lokal |
| Repository mencoba tool dalam 30 hari | 50 |
| Kontribusi eksternal rule | 3 |
| Crash pada fixture suite | <2% |

Jumlah star boleh menjadi sinyal discovery, tetapi bukan satu-satunya target. Repository yang berhasil diperbaiki, pengguna yang kembali menjalankan tool, dan kontribusi rule lebih penting.

---

## 17. Strategi Validasi

1. Bangun 4–6 fixture repository yang sengaja memiliki masalah berbeda.
2. Gunakan RepoSentinel pada repository pribadi/portfolio sebagai dogfooding.
3. Minta tiga developer mencoba scan tanpa penjelasan langsung.
4. Ukur apakah mereka memahami finding dan dapat memperbaikinya.
5. Kumpulkan false positive dan rule yang paling membantu.
6. Stabilkan schema dan exit code sebelum menambah dashboard atau AI.
7. Rilis CLI dan GitHub Action setelah workflow lokal dipercaya.

---

## 18. Keputusan yang Belum Final

- Nama package npm dan organisasi/action GitHub belum dipastikan.
- Formula health score masih perlu kalibrasi.
- Pilihan Commander vs Oclif belum final.
- Scope secret detection harus dibatasi agar tidak menjanjikan audit keamanan.
- Apakah HTML report masuk P1 atau P2.
- Apakah profile `mobile-app`, `academic`, dan `private-team` dibuat setelah beta.
- Apakah custom rule memakai JavaScript API, executable process, atau schema deklaratif.

Saat ada ambiguitas, pilih opsi yang paling sederhana, deterministic, local-first, dan mudah diuji.

---

## 19. Aturan Kerja untuk Project Baru

- Selalu baca dokumen ini sebelum membuat keputusan besar.
- Jangan mengklaim package, GitHub Action, domain, atau command sudah tersedia sebelum diverifikasi.
- Bedakan label **implemented**, **planned**, **proposed**, dan **backlog**.
- Jangan memperluas scope ke SaaS, dashboard, AI, atau marketplace tanpa validasi MVP CLI.
- Saat menulis issue, gunakan format: context → problem → proposed solution → acceptance criteria → risks.
- Saat menambah rule, wajib sertakan rule ID, severity, fixture, test, evidence, remediation, dan dokumentasi.
- Saat menulis dokumentasi, gunakan contoh yang dapat disalin dan jelaskan batasannya.
- Saat memproses repository pengguna, jangan menjalankan kode dari repository target secara otomatis.
- Jangan membuat atau mengubah LICENSE/CONTRIBUTING pada repository KittodGG tanpa permintaan eksplisit.

---

## 20. Artefak yang Sudah Tersedia

- `RepoSentinel_Product_Technical_Specification.docx` — spesifikasi produk dan teknis lengkap.
- `RepoSentinel_Project_Context.md` — dokumen konteks ini.
- `RepoSentinel_Project_Instructions.md` — instruksi singkat untuk ditempel di Project Instructions.
- `open_source_tools_catalog.md` — katalog ide tools, termasuk alternatif seperti KirimAman, BuktiKita, dan RepoSentinel.
- `product-spec-docx-builder` — skill reusable untuk membuat spesifikasi DOCX serupa.

---

## 21. Referensi

[1] [Open Source Guides — Starting an Open Source Project](https://opensource.guide/starting-a-project/) — prinsip dokumentasi, kontribusi, dan kesiapan project.

[2] [Ink & Switch — Local-first software](https://www.inkandswitch.com/essay/local-first/) — prinsip ownership data, offline capability, dan optional network.

[3] [Digital Public Goods Alliance — Digital Public Goods Standard](https://www.digitalpublicgoods.net/standard) — dokumentasi, privacy, security, platform independence, dan open standards.
