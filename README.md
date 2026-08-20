# RepoSentinel

> **Cek repository Anda sebelum orang lain menilainya.**

RepoSentinel adalah rancangan **CLI-first, local-first, deterministic, dan explainable** untuk memeriksa kesiapan sebuah repository sebelum dibagikan, dipublikasikan, dipamerkan sebagai portfolio, atau menerima kontribusi.

## Status saat ini

Repository ini berada pada tahap **concept specification / MVP planning**. Package npm, command, GitHub Action, URL dokumentasi, dan output CLI yang tercantum di dalam dokumen masih merupakan **target design** sampai benar-benar diimplementasikan dan diverifikasi melalui test.

## Fokus MVP

MVP akan memeriksa dokumentasi, README, Quick Start, link, image, badge, metadata, package hygiene, `.gitignore`, workflow CI, security hygiene dasar, license readiness, dan kesiapan contributor. Output target mencakup terminal interaktif, terminal plain/CI, Markdown, JSON, dan kemudian SARIF.

RepoSentinel **bukan** pengganti SAST, secret scanner enterprise, dependency vulnerability scanner penuh, atau audit keamanan formal. Health score adalah ringkasan repository readiness dan tidak boleh dibaca sebagai jaminan bahwa repository aman atau bebas vulnerability.

## Prinsip keamanan

Local scan tidak mengirim source code ke server dan tidak melakukan network call secara default. Scanner membaca repository sebagai data; scanner tidak menjalankan `npm install`, package script, lifecycle hook, build command, executable hasil build, atau arbitrary shell command dari repository target. Nilai secret, private key, isi `.env`, dan full sensitive line tidak boleh ditampilkan.

## Command target

Command berikut adalah kontrak UX target dan belum dianggap tersedia sebelum implementasi dipublikasikan dan diuji:

```bash
npx reposentinel check .
reposentinel check . --profile portfolio
reposentinel rules --category security
reposentinel explain documentation.quickstart
reposentinel report --format markdown
reposentinel baseline create
```

Untuk desain tampilan terminal yang rapi dan interaktif, lihat [Visual & Interactive CLI Specification](docs/RepoSentinel_CLI_Visual_Interaction_Spec.md). Untuk seluruh skenario dan mock output, lihat [CLI Case Examples](docs/RepoSentinel_CLI_Case_Examples.md). Untuk urutan implementasi sampai beta production, lihat [Roadmap Beta Production](docs/ROADMAP_BETA_PRODUCTION.md).

## Struktur awal

```text
reposentinel/
├── .github/
├── docs/
├── fixtures/
├── packages/
│   ├── cli/
│   ├── config/
│   ├── core/
│   ├── reporters/
│   ├── rules/
│   └── shared/
├── action/
├── AGENTS.md
├── package.json                 # akan dibuat pada fase bootstrap implementasi
└── README.md
```

## Cara berkontribusi pada tahap awal

Pada tahap spesifikasi, perubahan sebaiknya dimulai dari context, problem, proposed solution, acceptance criteria, dependencies, risks, dan prioritas P0/P1/P2. Jangan menambah rule tanpa `rule_id`, kategori, severity, detector, evidence, remediation, fixture positif/negatif, regression test, dan dokumentasi.

## Referensi internal

- [Project Context & Source of Truth](docs/RepoSentinel_Project_Context.md)
- [Tech Stack and Rule Engine](docs/RepoSentinel_Tech_Stack_and_Rule_Engine.md)
- [CLI Case Examples](docs/RepoSentinel_CLI_Case_Examples.md)
- [Visual & Interactive CLI Specification](docs/RepoSentinel_CLI_Visual_Interaction_Spec.md)
- [Roadmap Beta Production](docs/ROADMAP_BETA_PRODUCTION.md)
