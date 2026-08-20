# RepoSentinel — Multilingual Architecture and Tech Stack Decisions

**Status:** `proposed`  
**Decision scope:** CLI MVP through beta production  
**Decision date:** 20 August 2026

## 1. Decision Summary

RepoSentinel akan menggunakan **Node.js 24 LTS + TypeScript strict + pnpm workspace**. Node.js 24 dipilih karena berada pada status LTS pada saat keputusan ini dibuat; production applications sebaiknya memakai release Active LTS atau Maintenance LTS, bukan release Current atau EOL. [1]

CLI command parsing menggunakan **Commander** karena memiliki parser command/option, usage error, help system, strict unknown-option handling, dan TypeScript support yang sesuai untuk CLI multi-command. [2]

Interactive onboarding memakai **`@clack/prompts`** karena menyediakan typed prompts, selection menus, autocomplete, spinner, progress, tasks, dan styling yang dapat dipakai untuk init wizard serta profile picker. [3] Full-screen finding explorer tetap dibuat sebagai reporter terpisah agar core engine tidak bergantung pada UI.

## 2. Stack Target

| Layer | Pilihan | Alasan |
|---|---|---|
| Runtime | Node.js 24 LTS | Runtime modern, ESM, native promises, dan lifecycle dukungan LTS. |
| Language | TypeScript strict | Kontrak `Finding`, config, report, dan rule menjadi eksplisit. |
| Workspace | pnpm workspace | Monorepo ringan, dependency deduplication, dan package boundary. |
| CLI parser | Commander | Multi-command, option validation, help, dan low ceremony. |
| Interactive prompts | `@clack/prompts` | Wizard, select, autocomplete, spinner, progress, dan UX terminal modern. |
| Terminal color | `picocolors` | Dependency kecil dan mudah fallback ketika `NO_COLOR` aktif. |
| Config | `yaml` + `zod` | YAML yang nyaman untuk user dan schema validation yang eksplisit. |
| Discovery | `fast-glob` + `ignore` | File discovery cepat dengan semantics ignore yang terkontrol. |
| Markdown | Unified/Remark AST | Heading, link, image, code block, dan location lebih reliable daripada regex penuh. |
| Runtime filesystem | Node built-ins | `node:fs/promises`, `node:path`, `node:url`, dan `node:crypto` mengurangi dependency. |
| Reporter | Custom deterministic reporters | Terminal/TUI, plain, Markdown, JSON, dan SARIF menerima normalized findings yang sama. |
| Test | Vitest | Unit, fixture, integration, snapshot, dan deterministic output test. |
| Build | `tsup` pada fase awal | Bundle CLI dan package entrypoint dengan konfigurasi sederhana; dapat dievaluasi ulang jika build performance menjadi bottleneck. |
| Release | npm package + GitHub Release | Distribusi CLI dan release notes yang dapat diulang. |

## 3. Prinsip Multilingual

### 3.1 Bahasa yang disediakan

MVP dimulai dengan `en` dan `id`. Struktur locale dibuat extensible agar `ja`, `zh`, `ko`, `es`, atau bahasa lain dapat ditambahkan tanpa mengubah detector dan rule ID.

### 3.2 Yang diterjemahkan

UI copy, help text, progress message, error message, severity labels, status labels, remediation templates, README, documentation page, dan interactive prompt diterjemahkan melalui message catalog.

### 3.3 Yang tidak diterjemahkan

`ruleId`, config keys, JSON keys, schema version, command names, file paths, exit codes, package names, dan technical identifiers tetap stabil dalam English. Ini menjaga kompatibilitas script, CI, snapshot, dan integrasi downstream.

### 3.4 Locale resolution

Prioritas locale:

```text
--lang <locale>
  ↓
REPOSENTINEL_LANG
  ↓
config.locale
  ↓
LANG/LC_ALL hanya sebagai hint interaktif
  ↓
en sebagai deterministic fallback
```

Locale unsupported tidak boleh diam-diam menghasilkan campuran bahasa. CLI menampilkan warning singkat dan fallback ke `en`, sementara machine output mencatat `locale` yang benar-benar dipakai.

### 3.5 Machine output

JSON dan SARIF selalu memakai key/schema teknis dalam English. `message`, `evidence`, `remediation`, dan `title` dapat mengikuti locale yang dipilih, tetapi report mencatat `locale` dan `schemaVersion`. Untuk CI yang memerlukan hasil stabil, `--lang en --format json` direkomendasikan.

## 4. Batas Performa

Discovery harus membaca file secara streaming atau terkontrol, membatasi ukuran file, menghindari seluruh Git history pada default, dan tidak melakukan network call kecuali opt-in. Reporter tidak boleh menunggu UI untuk menyelesaikan rule engine; core menghasilkan normalized result terlebih dahulu atau memakai event progress yang tidak mengubah hasil.

Target awal repository kecil adalah scan lokal di bawah tiga detik, tetapi target tersebut harus dikalibrasi melalui benchmark dan fixture; angka itu bukan jaminan untuk semua repository. [4]

## 5. Batas Dependency

MVP tidak menambahkan database, cloud storage, authentication, LLM API, dashboard, Docker, microservices, atau remote rule registry. Dependency yang masuk harus memiliki alasan performa, security, atau UX yang jelas dan harus dipakai oleh code yang diuji.

## 6. Contoh API Localization

```ts
export type Locale = "en" | "id";

export type MessageKey =
  | "brand.tagline"
  | "cli.help"
  | "scan.started"
  | "scan.completed"
  | "finding.warning"
  | "finding.error"
  | "error.invalidLocale";

export type Translator = {
  locale: Locale;
  t(key: MessageKey, vars?: Record<string, string | number>): string;
};
```

Rule detector hanya mengembalikan data terstruktur. Localization diterapkan oleh reporter atau message layer, bukan dengan menyimpan kalimat Bahasa Indonesia di dalam detector.

## 7. Release Compatibility

Perubahan locale tidak boleh mengubah rule ID atau exit code. Perubahan message dapat memengaruhi snapshot terminal, sehingga snapshot harus menyatakan locale secara eksplisit. Penambahan bahasa baru wajib memiliki catalog completeness test, placeholder test, dan sample output.

## References

[1]: https://nodejs.org/en/about/previous-releases "Node.js Releases"
[2]: https://github.com/tj/commander.js/ "Commander.js"
[3]: https://bomb.sh/docs/clack/basics/getting-started/ "Clack Getting Started"
[4]: ./RepoSentinel_Project_Context.md "RepoSentinel Project Context & Source of Truth"
