# RepoSentinel — Tech Stack & Initial Rules Engine Design

> Dokumen ini menerjemahkan konsep RepoSentinel menjadi rancangan implementasi teknis yang dapat langsung dijadikan dasar repository awal. RepoSentinel tetap diposisikan sebagai **CLI-first, local-first, deterministic, dan explainable**.

**Status:** Proposed technical design  
**Target MVP:** CLI lokal + 15 rule + terminal/Markdown/JSON output  
**Runtime target:** Node.js 20+  
**Bahasa implementasi:** TypeScript  
**Catatan:** Package dan command di bawah belum dianggap tersedia sampai benar-benar dibangun, diuji, dan dipublikasikan.

---

## 1. Rekomendasi Singkat

Gunakan **Node.js + TypeScript dalam pnpm workspace**. Bangun core engine sebagai library internal yang tidak bergantung pada CLI, lalu buat CLI sebagai adapter tipis. Gunakan parser Markdown AST untuk memahami README, `fast-glob` atau `globby` untuk discovery, `ignore` untuk menghormati `.gitignore`, `yaml` + `zod` untuk konfigurasi, Commander untuk command-line interface, Vitest untuk testing, dan reporter terpisah untuk terminal, Markdown, JSON, serta SARIF.

Untuk rules sensitif, jangan langsung menganggap semua file `.env`, `.pem`, atau `.key` sebagai secret. Pisahkan antara **file sensitif**, **secret high-confidence**, dan **indikasi yang memerlukan review**. Untuk license, jangan membuat asumsi legal dari nama file saja. Deteksi keberadaan, validitas deklarasi SPDX, dan kecocokan antara manifest serta file license; tampilkan hasilnya sebagai readiness finding, bukan nasihat legal.

---

## 2. Tech Stack yang Disarankan

### 2.1 Stack inti MVP

| Layer | Pilihan | Alasan |
|---|---|---|
| Runtime | Node.js 20+ | Cocok untuk distribusi npm, CLI linting, dan GitHub Action berbasis JavaScript. |
| Language | TypeScript | Memberi type-safety pada rule schema, config, reporter, dan plugin boundary. |
| Package manager | pnpm | Mendukung workspace, dependency deduplication, dan monorepo dengan baik. |
| Monorepo | pnpm workspace | Memisahkan `core`, `cli`, `rules`, `reporters`, dan `action` tanpa memaksa publish semua package. |
| CLI | Commander | API kecil, mudah dipahami, cocok untuk MVP dan command yang tidak terlalu kompleks. |
| File discovery | `fast-glob` + `picomatch` | Pattern matching cepat dan exclude/include yang eksplisit. |
| Ignore semantics | `ignore` | Memproses pola `.gitignore` secara lebih sesuai daripada glob biasa. |
| Config | `yaml` + `zod` | YAML nyaman untuk pengguna; Zod memvalidasi konfigurasi dan memberi error yang jelas. |
| Markdown | Unified/Remark AST | Dapat menemukan heading, link, image, code block, dan source location. |
| Terminal output | `picocolors` + formatter custom | Warna ringan tanpa mengikat output pada tabel terminal yang kaku. |
| JSON output | Native JSON + Zod schema | Mudah dipakai oleh script, CI, dan integrasi lain. |
| Markdown output | Reporter custom | Dapat menghasilkan summary yang mudah ditempel ke issue atau pull request. |
| Test runner | Vitest | Cepat, cocok dengan TypeScript, dan mudah dipakai untuk fixture serta snapshot. |
| Build | `tsup` | Membuat bundle CLI yang ringkas dan tetap mendukung ESM. |
| Package publish | npm | Mendukung pengalaman `npx reposentinel check .` dan instalasi global. |

### 2.2 Stack tahap GitHub Action

| Layer | Pilihan | Catatan |
|---|---|---|
| Action runtime | Node.js Action | Reuse core engine dan menghindari container startup untuk scan sederhana. |
| Action SDK | `@actions/core` | Membaca input, menulis output, warning, dan failure state. |
| GitHub context | `@actions/github` | Dipakai hanya saat membutuhkan PR metadata atau repository context. |
| File matching | `@actions/glob` atau core discovery | Gunakan satu semantics yang konsisten agar hasil lokal dan CI tidak berbeda. |
| SARIF | SARIF 2.1.0 JSON generator | Integrasikan ke code scanning atau upload artifact secara eksplisit. |
| Permissions | Least privilege | Default cukup `contents: read`; `security-events: write` hanya jika upload SARIF. |

### 2.3 Teknologi yang belum perlu dipakai pada MVP

Jangan menambahkan database, Redis, Docker, dashboard SaaS, authentication, cloud storage, vector database, LLM API, atau microservices pada MVP. RepoSentinel harus terlebih dahulu membuktikan bahwa satu developer dapat menjalankan scan lokal, memahami finding, memperbaiki repository, lalu memperoleh hasil yang lebih baik.

VS Code extension, HTML report, rule registry, remote organization policy, dan dashboard multi-repository cocok menjadi tahap P1/P2 setelah schema finding dan rule engine stabil.

---

## 3. Struktur Repository yang Disarankan

```text
reposentinel/
├── packages/
│   ├── core/
│   │   └── src/
│   │       ├── discovery/
│   │       ├── engine/
│   │       ├── model/
│   │       ├── scoring/
│   │       └── security/
│   ├── rules/
│   │   └── src/
│   │       ├── documentation/
│   │       ├── links/
│   │       ├── security/
│   │       ├── metadata/
│   │       └── community/
│   ├── reporters/
│   │   └── src/
│   │       ├── terminal.ts
│   │       ├── markdown.ts
│   │       ├── json.ts
│   │       └── sarif.ts
│   ├── config/
│   │   └── src/
│   ├── cli/
│   │   └── src/
│   │       ├── commands/
│   │       ├── main.ts
│   │       └── cli.ts
│   └── shared/
├── action/
│   ├── action.yml
│   └── src/
├── fixtures/
│   ├── clean-public/
│   ├── tracked-env/
│   ├── private-key/
│   ├── high-confidence-secret/
│   ├── license-missing/
│   ├── license-invalid/
│   └── broken-documentation/
├── docs/
│   ├── rules/
│   ├── profiles/
│   └── architecture.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vitest.config.ts
└── README.md
```

### Prinsip dependency

`core` tidak boleh mengimpor `cli`. `rules` hanya mengimpor model dan utility dari `core`. `reporters` menerima normalized findings dan tidak menjalankan detector. `cli` mengorkestrasi config, discovery, engine, dan reporter. `action` memanggil CLI/core dengan input dari GitHub Actions.

---

## 4. Pipeline Discovery dan Rule Execution

### 4.1 Alur pipeline

```text
Target path
   ↓
Resolve root + validate path
   ↓
Load .reposentinel.yml + profile
   ↓
Load ignore rules + default excludes
   ↓
Discover files and metadata
   ↓
Build RepositoryContext
   ↓
Select enabled rules
   ↓
Run rules in deterministic order
   ↓
Normalize and sort findings
   ↓
Score + exit decision
   ↓
Render terminal / Markdown / JSON / SARIF
```

### 4.2 Discovery harus membaca data, bukan menjalankan kode

Discovery boleh membaca nama file, isi file teks, manifest, Git index, dan metadata repository. Discovery tidak boleh menjalankan `npm install`, `pnpm install`, `npm run build`, script package, executable hasil build, atau arbitrary shell command dari target repository.

Untuk informasi Git, gunakan command yang fixed dan allowlisted bila diperlukan, misalnya `git rev-parse --show-toplevel`, `git ls-files`, dan `git status --porcelain=v1`. Jangan meneruskan input pengguna langsung sebagai shell command. Untuk MVP, scan working tree dan Git index terlebih dahulu; history scan menjadi fitur terpisah yang harus diberi peringatan karena dapat membaca data sensitif lama.

### 4.3 RepositoryContext

```ts
export type RepositoryContext = {
  root: string;
  profile: RepositoryProfile;
  config: ResolvedConfig;
  files: readonly RepositoryFile[];
  git?: GitContext;
  manifests: readonly ManifestInfo[];
  markdown: ReadonlyMap<string, MarkdownDocument>;
  textCache: ReadonlyMap<string, string>;
};

export type RepositoryFile = {
  relativePath: string;
  absolutePath: string;
  kind: "text" | "binary" | "symlink" | "directory";
  sizeBytes: number;
  isIgnored: boolean;
  isTracked?: boolean;
};
```

### 4.4 Urutan rule harus stabil

Jalankan rule dalam urutan deterministik: sort berdasarkan kategori lalu `rule_id`. Sort findings berdasarkan `severity rank`, path, line, dan `rule_id`. Jangan mengandalkan urutan filesystem atau urutan async completion karena output yang berubah-ubah menyulitkan snapshot test dan review pull request.

---

## 5. Kontrak Rule Engine

### 5.1 Model rule

```ts
export type Severity = "critical" | "error" | "warning" | "info";

export type RuleDefinition = {
  id: string;
  category: RuleCategory;
  title: string;
  description: string;
  defaultSeverity: Severity;
  profiles: readonly RepositoryProfile[];
  requiresNetwork?: boolean;
  shouldRun(context: RepositoryContext): boolean;
  run(context: RepositoryContext): Promise<RuleResult> | RuleResult;
};

export type RuleResult = {
  findings: Finding[];
  stats?: Record<string, number>;
};
```

### 5.2 Normalized finding

```ts
export type Finding = {
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

### 5.3 Rule contract

Setiap rule harus menjawab pertanyaan berikut:

| Pertanyaan | Wajib diisi |
|---|---|
| Apa yang diperiksa? | `title`, `description`, dan category |
| Kapan rule aktif? | profile dan `shouldRun()` |
| Apa kondisi gagal? | deterministic detector |
| Di mana masalahnya? | path/line bila tersedia |
| Seberapa penting? | default severity + override config |
| Bagaimana memperbaiki? | remediation yang konkret |
| Bagaimana mengujinya? | fixture positif, negatif, dan regression test |
| Apakah ada jaringan? | `requiresNetwork`; default harus false |

Rule tidak boleh memodifikasi file pada MVP. Rule hanya membaca context dan menghasilkan findings.

---

## 6. Rancangan Rule Sensitif

### 6.1 Filosofi deteksi

Gunakan tiga level confidence:

| Confidence | Contoh | Default severity |
|---|---|---|
| High | Private key header, `.env` tracked, token prefix yang jelas + entropy tinggi. | error/critical |
| Medium | File `.pem`, `.p12`, `credentials.json`, assignment yang tampak seperti secret. | warning atau error |
| Low | Kata `password`, `secret`, atau `token` di dokumentasi biasa. | info atau skip |

Jangan membuat rule yang hanya mencari kata `secret` di semua file. Itu akan menghasilkan false positive tinggi karena README, test fixture, dan dokumentasi sering membahas secret secara aman.

### 6.2 Rule `security.env-file`

**Tujuan:** menemukan file environment yang berpotensi berisi credential.

**Deteksi file:**

- `.env`
- `.env.local`
- `.env.development`
- `.env.production`
- `.env.test`
- `*.env`
- `config/secrets.*`
- `config/credentials.*`

**Pengecualian default:**

- `.env.example`
- `.env.sample`
- `.env.template`
- dokumentasi atau fixture yang secara eksplisit diberi label safe example

**Severity:**

- `critical` atau `error` bila file non-example tracked oleh Git.
- `warning` bila file ada di working tree tetapi belum terbukti tracked.
- `info` bila hanya `.env.example` tidak tersedia, tergantung profile.

**Finding example:**

```json
{
  "ruleId": "security.env-file",
  "severity": "error",
  "path": ".env",
  "message": "Environment file is tracked by Git.",
  "evidence": "The file matches a sensitive environment filename and is present in the Git index.",
  "remediation": "Remove the file from Git tracking, rotate exposed credentials, and add the pattern to .gitignore."
}
```

**Penting:** jangan pernah mencetak isi `.env`. Bahkan preview satu baris dapat membocorkan credential.

### 6.3 Rule `security.private-key`

**Tujuan:** mendeteksi private key dan certificate bundle yang berisiko.

**Filename hints:**

- `id_rsa`, `id_ed25519`, `id_ecdsa`
- `*.pem`, `*.key`, `*.p12`, `*.pfx`
- `server.key`, `private.key`, `credentials.pem`

**Content signatures high-confidence:**

```text
-----BEGIN PRIVATE KEY-----
-----BEGIN RSA PRIVATE KEY-----
-----BEGIN OPENSSH PRIVATE KEY-----
-----BEGIN EC PRIVATE KEY-----
```

**Severity:** `critical` bila signature private key ditemukan pada file tracked; `warning` bila file hanya filename hint tanpa signature; `info` untuk certificate publik yang tidak mengandung private material.

### 6.4 Rule `security.credential-pattern`

**Tujuan:** menemukan token dengan format high-confidence tanpa menjadi full secret scanner.

Mulai hanya dari pattern yang memiliki prefix jelas dan panjang minimum, misalnya:

- GitHub classic token prefix seperti `ghp_` atau `github_pat_`.
- AWS access key ID prefix `AKIA` atau `ASIA` sebagai indikasi, bukan secret final.
- Slack token prefix `xoxb-`, `xoxp-`, atau format terkait.
- Generic assignment dengan key name sensitif **dan** entropy tinggi.

Jangan membuat rule berdasarkan satu kata saja. Contoh buruk:

```regex
password=.+
```

Contoh lebih aman:

```text
key name sensitif
+ value tidak sama dengan placeholder
+ value memiliki panjang minimum
+ value memiliki entropy atau karakteristik token
+ file bukan fixture/documentation yang di-ignore
```

**Redaction:** tampilkan `ghp_****abcd` atau `[REDACTED]`, bukan token asli. Fingerprint boleh dibuat dengan hash satu arah untuk deduplication, tetapi jangan tampilkan hash jika bisa dipakai untuk menebak input pendek.

### 6.5 Rule `security.sensitive-archive`

Deteksi `*.zip`, `*.tar`, `*.gz`, `*.7z`, `*.sqlite`, `*.db`, `*.dump`, dan backup file hanya sebagai `warning` atau `info`. File-file ini tidak otomatis mengandung secret. Temuan harus meminta review, bukan menyatakan kebocoran.

### 6.6 Rule `security.env-example`

Untuk profile `public` dan `portfolio`, beri `info` atau `warning` jika project terlihat memakai environment variable tetapi tidak memiliki `.env.example` atau dokumentasi variable.

Rule ini harus memeriksa apakah project benar-benar menggunakan env variable melalui manifest, source hints, atau dokumentasi; jangan selalu mewajibkan `.env.example` pada semua repository.

---

## 7. Rancangan Rule License

Rule license adalah **repository readiness check**, bukan penentuan legalitas project.

### 7.1 Rule `community.license-present`

Cari file di root:

- `LICENSE`
- `LICENSE.md`
- `LICENSE.txt`
- `COPYING`
- `COPYING.md`

Kemudian cari deklarasi manifest, misalnya `license` pada `package.json`. File license yang berada jauh di dalam dependency atau folder generated tidak dihitung sebagai license project.

**Severity berdasarkan profile:**

| Profile | Jika tidak ada LICENSE |
|---|---|
| `public` | warning |
| `portfolio` | info atau warning ringan |
| `npm-package` | warning |
| `private-team` | info atau off |
| `academic` | info atau warning berdasarkan kebutuhan distribusi |

### 7.2 Rule `community.license-valid`

Validasi sederhana:

1. File license memiliki isi non-trivial.
2. Manifest license, jika ada, memiliki SPDX expression yang valid.
3. Nama/license declaration tidak saling kontradiktif.
4. Placeholder seperti `TBD`, `choose a license`, atau `TODO` dianggap belum valid.

Gunakan parser SPDX untuk **validasi expression**, bukan untuk menentukan apakah pengguna secara legal boleh memakai sebuah license. Hasil rule harus berbunyi “declaration is missing or invalid”, bukan “you are legally unlicensed”.

### 7.3 Rule `community.license-mismatch`

Jika `package.json` menyatakan `MIT` tetapi file root berisi deklarasi yang tampak berbeda, buat `warning` atau `info` dengan evidence yang aman. Jangan mencoba menyelesaikan konflik secara otomatis.

### 7.4 Contoh finding license

```json
{
  "ruleId": "community.license-present",
  "severity": "warning",
  "message": "Public profile has no recognizable repository license file.",
  "path": "",
  "remediation": "Decide whether the repository should be open source. If yes, add an appropriate license after reviewing the legal implications."
}
```

---

## 8. Rule Lain untuk Paket MVP

| Rule ID | Tujuan | Default |
|---|---|---|
| `documentation.readme-exists` | README root tersedia. | warning |
| `documentation.quickstart` | README memiliki install/setup/run command. | warning |
| `documentation.description` | Project memiliki deskripsi yang jelas. | info |
| `links.valid` | Link Markdown/HTML tidak 404 atau malformed. | warning |
| `images.resolve` | Asset image tidak memakai path lokal yang rusak. | warning |
| `badges.resolve` | Badge tidak memakai endpoint mati atau URL invalid. | info/warning |
| `gitignore.exists` | Repository memiliki `.gitignore` yang relevan. | info |
| `package.lockfile-single` | Tidak ada konflik beberapa lockfile. | warning |
| `package.manifest-name` | Manifest memiliki nama package yang valid. | warning |
| `package.scripts-start` | Ada command start/dev/build yang terdokumentasi bila relevan. | info |
| `community.issue-template` | Public project memiliki jalur issue yang jelas. | info |
| `ci.workflow-permissions` | Workflow memakai permissions yang tidak berlebihan. | warning |
| `portfolio.demo-visible` | Profile portfolio memiliki demo atau screenshot yang mudah ditemukan. | warning |

---

## 9. Konfigurasi Rules

```yaml
extends: recommended
profile: public

rules:
  security.env-file: error
  security.private-key: critical
  security.credential-pattern: error
  security.sensitive-archive: warning
  community.license-present: warning
  community.license-valid: warning
  community.license-mismatch: info

ignore:
  - node_modules/**
  - dist/**
  - coverage/**
  - generated/**
  - fixtures/safe-secrets/**

security:
  scan_history: false
  network: false
  redact_findings: true

ci:
  fail_on: error
```

### Override severity

Severity override harus disimpan setelah rule default, sehingga pengguna dapat menaikkan atau menurunkan tingkat tanpa mengubah detector. `off` berarti rule tidak dijalankan, bukan finding dibuat lalu disembunyikan.

### Ignore harus terlihat

Jika sebuah path di-ignore, report verbose sebaiknya mencatat jumlah file yang di-ignore dan alasan pattern. Jangan mencetak secret dari path yang di-ignore hanya untuk menjelaskan bahwa path tersebut diabaikan.

---

## 10. Testing Strategy

### 10.1 Fixture layout

```text
fixtures/
├── security-env-untracked/
│   ├── .env
│   └── .gitignore
├── security-env-tracked/
│   ├── .env
│   └── .git/index-fixture.json
├── security-private-key/
│   └── id_rsa.fixture
├── security-placeholder-only/
│   └── README.md
├── license-missing/
│   ├── package.json
│   └── README.md
├── license-valid-mit/
│   ├── LICENSE
│   └── package.json
├── license-mismatch/
│   ├── LICENSE
│   └── package.json
└── clean-public/
```

Untuk test yang membutuhkan status Git tracked/untracked, jangan memalsukan parsing dengan string biasa bila bisa membuat temporary Git repository yang kecil. Jika fixture Git terlalu berat, buat `GitContext` abstraction sehingga unit test dapat memberi fake context, lalu tambahkan minimal satu integration test dengan real Git.

### 10.2 Test cases wajib

| Rule | Positive case | Negative case | Security assertion |
|---|---|---|---|
| `security.env-file` | `.env` tracked | `.env.example` only | Output tidak berisi nilai env. |
| `security.private-key` | Private key header | Public certificate/no key | Private material tidak pernah tercetak. |
| `security.credential-pattern` | High-confidence token | Placeholder `YOUR_TOKEN_HERE` | Value di-redact dan tidak masuk snapshot. |
| `community.license-present` | Root `LICENSE` | No license file | Tidak menganggap nested dependency license sebagai project license. |
| `community.license-valid` | Valid SPDX declaration | `TBD`/invalid expression | Message hanya menyatakan declaration invalid/missing. |
| `community.license-mismatch` | Manifest MIT + file Apache | Matching declarations | Tidak auto-fix atau memberi legal conclusion. |

### 10.3 Determinism checks

- Jalankan scan dua kali pada fixture yang sama.
- Pastikan output JSON identik setelah menghapus timestamp yang memang dinamis.
- Pastikan findings sudah di-sort.
- Pastikan parallel execution tidak mengubah urutan report.
- Pastikan locale dan operating system path separator tidak mengubah rule ID atau relative path.

---

## 11. Security Boundary

RepoSentinel membaca repository sebagai data. Batas keamanan minimal:

1. Jangan menjalankan script dari `package.json` target.
2. Jangan melakukan network call kecuali rule mengumumkan dan pengguna mengaktifkannya.
3. Jangan mencetak secret, private key, atau full sensitive line.
4. Jangan menulis ke repository pada MVP.
5. Jangan mengunggah report otomatis.
6. Batasi file size dan abaikan binary besar agar tidak terjadi memory exhaustion.
7. Tolak symlink yang keluar dari target root atau perlakukan sebagai metadata saja.
8. Gunakan fixed argument list saat memanggil Git; jangan membangun shell command dari input mentah.
9. Jangan membaca seluruh Git history pada default scan.
10. Jelaskan bahwa rule heuristik bukan audit keamanan formal.

---

## 12. Milestone Implementasi

### Milestone 1 — Core

- `RepositoryContext` dan `Finding` schema.
- File discovery dengan ignore semantics.
- Config loader + Zod validation.
- Deterministic finding sort.

### Milestone 2 — Security rules

- `security.env-file`.
- `security.private-key`.
- `security.credential-pattern`.
- Redaction utility.
- Fixture dan security regression tests.

### Milestone 3 — Community/documentation rules

- README rules.
- Link/image rules.
- `community.license-present`.
- `community.license-valid`.
- `community.license-mismatch`.

### Milestone 4 — CLI/reporters

- `reposentinel check .`.
- Terminal reporter.
- Markdown reporter.
- JSON reporter.
- Exit threshold.

### Milestone 5 — GitHub Action

- Node.js Action.
- PR summary.
- SARIF output.
- Least privilege permissions.

---

## 13. Contoh Minimal Rule

```ts
import type { RuleDefinition } from "@reposentinel/core";

export const envFileRule: RuleDefinition = {
  id: "security.env-file",
  category: "security",
  title: "Sensitive environment file",
  description: "Detect environment files that may contain credentials.",
  defaultSeverity: "error",
  profiles: ["public", "portfolio", "npm-package", "private-team"],

  shouldRun(context) {
    return context.files.some((file) => isSensitiveEnvName(file.relativePath));
  },

  run(context) {
    const findings = [];

    for (const file of context.files) {
      if (!isSensitiveEnvName(file.relativePath)) continue;
      if (isSafeExampleName(file.relativePath)) continue;

      const tracked = file.isTracked === true;
      findings.push({
        ruleId: "security.env-file",
        severity: tracked ? "error" : "warning",
        message: tracked
          ? "Environment file is tracked by Git."
          : "Environment file exists in the repository workspace.",
        path: file.relativePath,
        remediation: tracked
          ? "Remove it from Git tracking, rotate exposed credentials, and add it to .gitignore."
          : "Review the file and ensure it is ignored before committing.",
        metadata: { tracked }
      });
    }

    return { findings };
  }
};
```

Utility `isSensitiveEnvName()` dan `isSafeExampleName()` harus memiliki unit test terpisah. Jangan membaca isi file untuk rule filename-only sebelum diperlukan.

---

## 14. Keputusan yang Direkomendasikan

1. Pilih **Commander + TypeScript + pnpm** untuk CLI MVP.
2. Gunakan **Unified/Remark** untuk README, bukan regex penuh.
3. Gunakan **fast-glob + ignore** dengan default excludes.
4. Mulai dengan custom high-confidence secret heuristics dan redaction; integrasi engine eksternal dapat ditambahkan setelah batas false positive dipahami.
5. Perlakukan license sebagai repository readiness check, bukan legal analyzer.
6. Pisahkan core, rules, reporters, CLI, dan action sejak struktur awal walaupun belum semuanya dipublish.
7. Tulis fixture sebelum menulis banyak rule.
8. Jadikan RepoSentinel dogfooding target pertama.

---

## 15. Referensi

[1] [Node.js Documentation](https://nodejs.org/docs/latest/api/) — runtime dan filesystem primitives.

[2] [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) — type system dan project configuration.

[3] [pnpm Workspaces](https://pnpm.io/workspaces) — workspace dan monorepo management.

[4] [Unified / Remark](https://unifiedjs.com/) — ecosystem parser dan transformer Markdown AST.

[5] [GitHub SARIF documentation](https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/sarif-support-for-code-scanning) — format integrasi code scanning.

[6] [Open Source Guides](https://opensource.guide/starting-a-project/) — praktik dokumentasi, kontribusi, dan project readiness.
