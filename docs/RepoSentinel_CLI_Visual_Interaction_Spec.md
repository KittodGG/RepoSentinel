# RepoSentinel — Visual & Interactive CLI Specification

**Status:** `proposed / target UX`  
**Design direction:** `Sentinel Console`  
**Scope:** terminal output, interactive scan experience, keyboard navigation, fallback mode, and CI-safe rendering.

> **Design goal:** RepoSentinel harus terasa seperti alat developer modern yang tenang, cepat, dan berkarakter—bukan sekadar scanner yang mencetak dinding teks. Visualnya boleh stylish seperti coding-agent CLI modern, tetapi hasil pemeriksaan tetap deterministic, explainable, local-first, dan aman untuk automation. [1] [2] [3]

## 1. Arah Visual: “Sentinel Console”

RepoSentinel menggunakan konsep **Sentinel Console**: sebuah terminal-native dashboard ringan yang muncul hanya saat pengguna menjalankan scan secara interaktif. Identitas visual dibangun dari satu simbol utama `◈`, garis panel tipis, warna severity yang konsisten, dan kalimat status yang singkat.

Simbol `◈` menjadi penanda RepoSentinel. Saat terminal tidak mendukung Unicode, simbol tersebut turun secara otomatis menjadi `[*]`. Dengan begitu, gaya visual tetap memiliki identitas tanpa mengorbankan kompatibilitas SSH, Windows Terminal lama, log CI, atau terminal dengan font terbatas.

| Elemen | Gaya yang dipilih | Tujuan |
|---|---|---|
| Brand mark | `◈ RepoSentinel` | Identitas yang langsung terlihat tanpa banner besar. |
| Panel | Garis tipis `╭─╮ ╰─╯` | Memberi struktur tanpa membuat output terasa berat. |
| Status sukses | `✓` atau `[ok]` | Memudahkan scanning visual. |
| Status proses | `›` atau `[..]` | Menunjukkan fase yang sedang berjalan. |
| Status warning | `!` atau `[warn]` | Tetap terbaca tanpa bergantung pada warna. |
| Status error | `×` atau `[fail]` | Kontras tinggi untuk masalah yang perlu tindakan. |
| Severity | `critical`, `error`, `warning`, `info` | Nama tetap eksplisit untuk accessibility dan log. |
| Progress | Satu live activity surface | Menghindari terminal dipenuhi baris progress yang berulang. |

Gaya ini mengambil inspirasi dari pola umum terminal UI modern: progress visual, panel yang dapat dibuka, output yang dapat diringkas, keyboard navigation, theme detection, dan fallback ANSI/classic mode. Referensi tersebut digunakan sebagai inspirasi UX, bukan untuk menyalin identitas atau implementasi produk lain. [3]

## 2. Prinsip Interaksi Utama

### 2.1 Interactive by default, automation-safe by design

Ketika stdout adalah TTY dan pengguna menjalankan `reposentinel check .`, RepoSentinel menampilkan pengalaman interaktif. Jika output dipipe, `CI=true` aktif, atau format dipilih secara eksplisit, RepoSentinel menggunakan mode stabil tanpa cursor movement dan tanpa animasi.

| Kondisi | Mode output | Perilaku |
|---|---|---|
| Terminal interaktif | `tui` | Spinner, live progress, summary panel, keyboard navigation. |
| `--plain` | `plain` | Tanpa warna, tanpa animasi, tanpa cursor rewrite. |
| `--no-color` | `plain` | Warna dinonaktifkan; simbol tetap dipertahankan bila aman. |
| `CI=true` | `ci` | Output satu arah, ringkas, cocok untuk log build. |
| `--format json` | `machine` | Hanya JSON valid ke stdout; diagnostic diarahkan ke stderr. |
| `--format markdown` | `machine` | File report ditulis deterministically. |
| `--watch` | `tui` | Live update hanya untuk TTY; otomatis turun ke plain bila dipipe. |

### 2.2 Satu layar ringkas, detail berdasarkan permintaan

Scan tidak langsung mencetak seluruh evidence. Pengguna terlebih dahulu melihat ringkasan, lalu memilih finding dengan `↑`/`↓` dan menekan `Enter` untuk membuka detail. Ini membuat output terasa rapi tanpa menghilangkan informasi.

### 2.3 Stylish tidak boleh mengaburkan status

Warna dan simbol hanya membantu pemindaian visual. Setiap status tetap ditulis dalam teks, misalnya `WARNING`, `ERROR`, atau `CRITICAL`, sehingga output masih dapat dipahami dalam grayscale, screen reader, log file, dan terminal tanpa truecolor.

### 2.4 Tidak ada auto-fix diam-diam

Key `f` digunakan untuk **filter** atau membuka remediation view, bukan mengubah file. RepoSentinel MVP bersifat read-only dan hanya memberi petunjuk perbaikan. [1]

## 3. Palet Warna dan Token UI

Warna harus menggunakan **named ANSI colors** dengan fallback 16-color. Jangan mengikat output pada hex color tertentu karena terminal pengguna dapat memiliki theme berbeda.

| Token | Makna | ANSI target | Fallback |
|---|---|---|---|
| `brand` | Identitas RepoSentinel | cyan/blue | plain |
| `muted` | Metadata sekunder | dim | gray |
| `success` | Selesai atau lulus | green | `[ok]` |
| `info` | Saran | blue/cyan | `[info]` |
| `warning` | Perlu perhatian | yellow | `[warn]` |
| `error` | Gagal threshold | red | `[fail]` |
| `critical` | Risiko tinggi | bright red + bold | `[critical]` |
| `selected` | Item yang sedang dipilih | inverse | `>` |

RepoSentinel harus menghormati `NO_COLOR` dan menyediakan `--no-color`. Link yang dapat diklik boleh digunakan ketika terminal mendukung hyperlink, tetapi URL tetap ditampilkan dalam detail finding agar tidak bergantung pada fitur terminal tertentu. [3]

## 4. Layout Utama: Scan Interaktif

### 4.1 Welcome state sebelum scan

```text
◈ RepoSentinel 0.1.0
  repository readiness, without the noise

  target   ./
  profile  portfolio
  mode     local · network off

  Press Enter to scan  ·  p change profile  ·  ? help  ·  q quit
```

Jika command sudah menyediakan semua parameter, welcome state dapat dilewati dengan `--quiet-start` atau ketika pengguna memanggil CLI dari script.

### 4.2 Live scan state

Saat scan berjalan, hanya satu area yang diperbarui. Contoh tampilan konseptual:

```text
◈ RepoSentinel 0.1.0  ·  scanning portfolio-app

  › resolve target        ✓  0.02s
  › load configuration    ✓  public.yml
  › discover repository   ✓  68 files · 14 ignored
  › select rules          ✓  24 enabled
  › run rules             ›  17/24  links.valid

  [██████████████████░░░░] 71%  checking repository readiness

  esc cancel  ·  space pause  ·  v verbose
```

Progress bar bersifat dekoratif dan tidak boleh digunakan sebagai satu-satunya indikator. Fase aktif dan jumlah `17/24` harus tetap tersedia dalam teks.

### 4.3 Completion state dengan health card

```text
◈ RepoSentinel 0.1.0  ·  portfolio-app

╭─ health snapshot ─────────────────────────────────────────────╮
│                                                                │
│   86 / 100   ALMOST READY                                     │
│   ─────────────────────────────────────────────────────────    │
│   ◆ docs        28/30     ◆ security    30/30                 │
│   ◆ discover    18/25     ◆ community   10/15                 │
│                                                                │
│   0 critical   0 error   2 warnings   3 info                  │
│                                                                │
╰────────────────────────────────────────────────────────────────╯

  Findings
  ──────────────────────────────────────────────────────────────
  › !  documentation.quickstart   README.md:18       warning
      README has no runnable installation command
  ◇    links.valid                README.md:31       warning
      Link could not be resolved
  ◇    portfolio.demo-visible     README.md          info
      Demo section is not visible near the top

  ↑↓ select  ·  enter details  ·  f filter  ·  r rescan  ·  o open report  ·  q quit

  Result: passed with warnings                                      exit 0
```

Karakter `›` menandakan finding yang sedang dipilih. Karakter `!` menandakan warning pertama; baris berikutnya memakai `◇` agar layout lebih tenang. Detail lengkap tidak dipaksakan tampil pada layar utama.

## 5. Detail Finding Interaktif

Ketika pengguna menekan `Enter`, panel detail menggantikan list atau muncul sebagai overlay.

```text
◈ Finding 1 of 5                                      esc back

╭─ WARNING · documentation.quickstart · README.md:18 ───────────╮
│                                                                │
│  README has no runnable installation command                   │
│                                                                │
│  Why it matters                                                │
│  A new reader should know the first successful action          │
│  without guessing.                                             │
│                                                                │
│  Evidence                                                      │
│  No install, setup, or quick-start command was found.          │
│                                                                │
│  Recommended action                                            │
│  Add a Quick Start section with prerequisites, installation,   │
│  and one copy-paste run command.                               │
│                                                                │
│  Rule docs                                                      │
│  GitHub catalog: docs/RULES.md                                  │
│  Anchor: #documentation.quickstart                              │
│                                                                │
╰────────────────────────────────────────────────────────────────╯

  ↑↓ next/previous  ·  e explain rule  ·  o open docs  ·  esc back
```

Untuk finding keamanan, detail harus tetap di-redact:

```text
◈ Finding 1 of 2                                      esc back

╭─ CRITICAL · security.private-key · deploy/id_rsa:1 ───────────╮
│                                                                │
│  Private key material detected                                 │
│                                                                │
│  Evidence                                                      │
│  -----BEGIN OPENSSH PRIVATE KEY----- [REDACTED]                │
│                                                                │
│  Recommended action                                            │
│  Remove the key from the repository and Git history, rotate    │
│  related credentials, and verify the ignore rule.              │
│                                                                │
│  The key contents are never displayed by RepoSentinel.        │
│                                                                │
╰────────────────────────────────────────────────────────────────╯

  ↑↓ next/previous  ·  e explain rule  ·  esc back
```

## 6. Keyboard Map

| Key | Action | Context |
|---|---|---|
| `↑` / `↓` | Memilih finding atau item menu | Semua panel interaktif |
| `Enter` | Membuka detail atau memilih menu | List/menu |
| `Esc` | Kembali ke panel sebelumnya atau membatalkan operasi | Semua panel |
| `f` | Membuka filter severity/category | Summary dan finding list |
| `r` | Menjalankan scan ulang | Completion state |
| `o` | Membuka atau mencetak lokasi report | Completion state/detail |
| `e` | Membuka penjelasan rule | Detail finding |
| `v` | Menampilkan atau menyembunyikan discovery detail | Scan state |
| `space` | Pause/resume scan bila didukung | Live scan |
| `?` | Membuka keyboard help | Semua panel |
| `q` | Keluar tanpa mengubah repository | Semua panel |
| `Ctrl+C` | Membatalkan proses atau keluar | Semua state |

Shortcut harus ditampilkan di footer panel yang sedang aktif. Jangan mengandalkan shortcut yang tidak terlihat oleh pengguna.

## 7. Filter Findings

```text
◈ Findings · 5 total

  Filter: _warning

  [x] warning     2
  [ ] error       0
  [ ] critical    0
  [ ] info        3

  Press Enter to apply  ·  space toggle  ·  esc cancel
```

Setelah filter diterapkan:

```text
◈ RepoSentinel  ·  2 warnings shown / 5 total

  › ! documentation.quickstart   README.md:18
      README has no runnable installation command
  ◇   links.valid                README.md:31
      Link could not be resolved

  f change filter  ·  enter details  ·  r rescan  ·  q quit
```

## 8. Profile Picker

```text
◈ Choose a scan profile

  › public       README, links, security, license, contributors
    portfolio    demo, screenshot, summary, tech stack, setup
    npm-package  manifest, exports, scripts, lockfile, release
    academic     papers, citations, reproducibility, research docs
    private-team internal docs, ownership, security, contributor boundaries
    mobile-app   app metadata, platform assets, CI, release readiness

  ↑↓ move  ·  enter select  ·  esc cancel
```

Profile picker harus menampilkan fokus utama masing-masing profile, bukan hanya nama. Tiga profile tambahan memakai public baseline rule set dengan konteks yang lebih spesifik; profile bukan pengganti review manual atau jaminan keamanan.

## 9. Init Wizard yang Stylish

```text
◈ RepoSentinel setup
  Create a local configuration for this repository.

  Step 1 of 4  ·  choose profile

  › portfolio    first impression, demo, screenshot, setup
    public       sharing, security hygiene, contributors
    npm-package  package metadata, exports, release hygiene

  ↑↓ choose  ·  enter continue  ·  esc cancel
```

```text
◈ RepoSentinel setup
  Step 2 of 4  ·  failure threshold

  › error        fail on critical and error findings
    warning      fail on warnings, errors, and critical findings
    critical    fail only on critical findings

  ↑↓ choose  ·  enter continue  ·  esc cancel
```

```text
◈ RepoSentinel setup
  Step 4 of 4  ·  review

  profile       portfolio
  fail on       error
  reports       terminal, markdown, json, sarif, html
  network       disabled
  ignore        node_modules/**, dist/**, coverage/**

  › create .reposentinel.yml
    go back
    cancel

  ↑↓ choose  ·  enter confirm  ·  esc cancel
```

```text
◈ Configuration created

  .reposentinel.yml

  Next step
  $ reposentinel check . --profile portfolio

  enter run first scan  ·  q exit
```

## 10. Rules Explorer

```text
◈ Rule library  ·  24 rules

  Search: _security

  › security.env-file             error     3 profiles
    security.private-key          critical  3 profiles
    security.credential-pattern   error     3 profiles
    security.sensitive-archive    warning   3 profiles
    security.env-example          info      2 profiles

  ↑↓ select  ·  enter details  ·  / search  ·  q close
```

Detail rule:

```text
◈ security.env-file

  Detect environment files that may contain credentials.

  default severity   error
  profiles           public, portfolio, npm-package, academic, private-team, mobile-app
  network required   no
  modifies files     no

  Detection
  Sensitive environment filename is tracked by Git or present in the workspace.

  Remediation
  Remove tracked files, rotate exposed credentials, add the pattern to .gitignore,
  and keep only safe examples such as .env.example.

  esc back  ·  o open docs  ·  q close
```

## 11. Gaya Error yang Tetap Elegan

### 11.1 Invalid path

```text
◈ RepoSentinel

╭─ cannot scan target ───────────────────────────────────────────╮
│                                                                │
│  Path does not exist                                           │
│  ./does-not-exist                                              │
│                                                                │
│  Try                                                             │
│  reposentinel check <path>                                     │
│                                                                │
╰────────────────────────────────────────────────────────────────╯

  exit 2  ·  ? help  ·  q quit
```

### 11.2 Invalid configuration

```text
◈ RepoSentinel

╭─ configuration error ──────────────────────────────────────────╮
│                                                                │
│  .reposentinel.yml:7                                           │
│  rules.links.valid must be critical, error, warning, info,     │
│  or off.                                                       │
│                                                                │
│  received: urgent                                              │
│                                                                │
│  The scan did not start. No repository files were changed.     │
│                                                                │
╰────────────────────────────────────────────────────────────────╯

  edit config  ·  q quit                                           exit 2
```

### 11.3 Critical finding

```text
◈ RepoSentinel  ·  scan stopped with critical findings

╭─ action required ───────────────────────────────────────────────╮
│                                                                │
│  1 critical   1 error   0 warnings   0 info                    │
│                                                                │
│  deploy/id_rsa:1                                               │
│  security.private-key                                           │
│  Private key material detected [REDACTED]                      │
│                                                                │
│  Remove the key, rotate related credentials, and review Git     │
│  history before publishing this repository.                    │
│                                                                │
╰────────────────────────────────────────────────────────────────╯

  enter view findings  ·  o open report  ·  q quit                 exit 1
```

## 12. Non-Interactive dan CI Output

Mode stylish hanya untuk TTY. CI harus memperoleh output yang ringkas, satu arah, dan stabil.

```text
$ CI=true reposentinel check . --profile public --fail-on error

[reposentinel] scan started: public-api (profile=public, network=false)
[reposentinel] discover: 68 files, 14 ignored
[reposentinel] rules: 24 enabled, 24 completed
[reposentinel] summary: critical=0 error=1 warning=2 info=0 score=61
[reposentinel] error security.env-file .env:1 Environment file is tracked by Git.
[reposentinel] result: failed threshold=error
[reposentinel] exit: 1
```

Mode JSON:

```text
$ reposentinel check . --format json --no-color
{"schemaVersion":"reposentinel.report/v1","repository":"public-api","profile":"public","score":61,"status":"needs-attention","summary":{"critical":0,"error":1,"warning":2,"info":0},"findings":[{"ruleId":"security.env-file","severity":"error","path":".env","message":"Environment file is tracked by Git.","evidence":"Sensitive environment filename is tracked. File content is not displayed.","remediation":"Remove it from Git tracking, rotate exposed credentials, and add the pattern to .gitignore."}]}
```

JSON stdout harus selalu valid JSON tanpa banner, spinner, ANSI escape, atau diagnostic text. Diagnostic error dapat diarahkan ke stderr.

## 13. Command Flags untuk Mengontrol Pengalaman

| Flag | Fungsi |
|---|---|
| `--tui` | Memaksa interactive terminal UI ketika stdout adalah TTY. |
| `--plain` | Memaksa output satu arah tanpa animasi dan panel dinamis. |
| `--no-color` | Mematikan warna ANSI. |
| `--no-unicode` | Menggunakan fallback ASCII seperti `[ok]`, `[warn]`, dan `[*]`. |
| `--quiet-start` | Melewati welcome state dan langsung memulai scan. |
| `--verbose` | Menampilkan discovery dan rule timing tambahan. |
| `--format terminal` | Memilih reporter terminal. Pada TTY, default-nya `tui`. |
| `--format markdown` | Menghasilkan report Markdown deterministically. |
| `--format json` | Menghasilkan JSON machine-readable. |
| `--format sarif` | Menghasilkan SARIF untuk integrasi CI setelah didukung. |
| `--fail-on <severity>` | Menentukan threshold exit code. |

Jika kombinasi flag bertentangan, flag eksplisit pengguna memiliki prioritas lebih tinggi daripada auto-detection, misalnya `--plain` mengalahkan TTY interaktif.

## 14. Fallback untuk Terminal Terbatas

```text
[*] RepoSentinel 0.1.0 - scanning portfolio-app
[ok] resolve target
[ok] load configuration
[ok] discover repository (68 files, 14 ignored)
[..] run rules (17/24)

[==================----] 71%

[ok] score 86/100 - almost ready
[warn] 2 warnings, 3 info

[1] documentation.quickstart README.md:18
    README has no runnable installation command

Keys: up/down select, enter details, f filter, r rescan, q quit
```

Fallback ini tetap memiliki hierarki, status, dan shortcut. Yang hilang hanya warna, Unicode, dan live cursor update.

## 15. Aturan UX untuk Security Finding

RepoSentinel harus memprioritaskan keamanan di atas estetika. Nilai berikut tidak boleh muncul pada layar, report, maupun JSON:

| Data | Perilaku |
|---|---|
| Isi `.env` | Jangan tampilkan. Tampilkan path dan status tracked/untracked yang aman. |
| Private key | Jangan tampilkan full line atau material key. Tampilkan header yang telah dipotong dan `[REDACTED]`. |
| Token | Tampilkan prefix terbatas bila aman, misalnya `ghp_****abcd`, atau `[REDACTED]`. |
| Credential pada history | Jangan mencetak value lama. Tampilkan path/commit reference yang aman bila tersedia. |
| File yang di-ignore | Jangan membocorkan isi hanya untuk menjelaskan bahwa file di-ignore. |

Desain panel tidak boleh memberi opsi “show secret” atau shortcut yang dapat menonaktifkan redaction. Redaction adalah boundary, bukan preferensi tema. [1] [2]

## 16. Acceptance Criteria Visual dan Interaktif

| Area | Kriteria selesai |
|---|---|
| Hierarki | Pengguna memahami repository, profile, score, status, dan jumlah findings dalam lima detik pertama. |
| Interaksi | Finding dapat dipilih dengan `↑`/`↓` dan dibuka dengan `Enter`. |
| Progress | Scan memiliki satu progress surface yang tidak memenuhi terminal dengan baris berulang. |
| Detail | Detail finding memuat rule, lokasi, alasan, evidence aman, remediation, dan shortcut kembali. |
| Konsistensi | Warna, simbol, label severity, panel, dan footer shortcut konsisten di semua command. |
| Fallback | UI tetap terbaca dengan `NO_COLOR`, `--plain`, `--no-unicode`, SSH, dan terminal 16-color. |
| CI | `CI=true`, pipe, JSON, Markdown, dan SARIF tidak memiliki spinner atau escape sequence. |
| Determinism | Result, sorting, JSON, Markdown, dan exit code tidak berubah karena interactive renderer. |
| Safety | Tidak ada secret value yang tampil dan tidak ada file target yang dimodifikasi. |
| Scope | Tidak ada klaim bahwa score berarti repository aman atau bebas vulnerability. |

## 17. Rekomendasi Implementasi MVP

Implementasi pertama sebaiknya tidak langsung membuat full-screen terminal application. Mulailah dari **adaptive terminal reporter** dengan tiga lapisan: `scan activity`, `health snapshot`, dan `finding detail`. Lapisan ini sudah memberi kesan modern tanpa menambah kompleksitas navigasi yang belum dibutuhkan.

Urutan implementasi yang disarankan adalah sebagai berikut. Pertama, buat token warna, simbol, panel, dan plain fallback. Kedua, buat live progress renderer yang hanya aktif pada TTY. Ketiga, buat summary panel dan detail finding dengan `↑`/`↓`, `Enter`, `Esc`, dan `q`. Keempat, buat `--plain`, `--no-color`, `--no-unicode`, dan deteksi `CI=true`. Kelima, tambahkan filter serta rules explorer setelah output inti stabil.

Reporter harus menerima normalized findings dari core engine dan tidak menjalankan detector sendiri. Dengan begitu, gaya visual dapat berubah tanpa mengubah rule, score, schema JSON, atau exit decision. [1]

## 18. Contoh Sesi Ideal End-to-End

```text
$ reposentinel check . --profile portfolio

◈ RepoSentinel 0.1.0  ·  portfolio-app
  local scan · network off

  › resolve target        ✓
  › load profile          ✓ portfolio
  › discover repository   ✓ 68 files · 14 ignored
  › run rules             ✓ 24/24

╭─ health snapshot ─────────────────────────────────────────────╮
│  86 / 100   ALMOST READY                                      │
│  0 critical · 0 error · 2 warnings · 3 info                   │
╰────────────────────────────────────────────────────────────────╯

  › ! documentation.quickstart   README.md:18       warning
      README has no runnable installation command
  ◇   links.valid                README.md:31       warning
      Link could not be resolved
  ◇   portfolio.demo-visible     README.md          info
      Demo section is not visible near the top

  ↑↓ select · enter details · f filter · r rescan · o report · q quit

  Result: passed with warnings                                      exit 0
```

```text
$ CI=true reposentinel check . --profile portfolio --fail-on error

[reposentinel] scan started: portfolio-app
[reposentinel] profile=portfolio network=false
[reposentinel] rules=24 completed=24
[reposentinel] summary score=86 critical=0 error=0 warning=2 info=3
[reposentinel] result=passed-with-warnings threshold=error
[reposentinel] exit=0
```

Dua output tersebut berasal dari scan yang sama. Perbedaannya hanya pada renderer; core finding, score, threshold, dan exit decision harus tetap identik.

## References

[1]: ./RepoSentinel%20%E2%80%94%20Project%20Context%20%26%20Source%20of%20Truth.md "RepoSentinel — Project Context & Source of Truth"
[2]: ./RepoSentinel_Tech_Stack_and_Rule_Engine.md "RepoSentinel — Tech Stack and Rule Engine"
[3]: https://freebuff.com/cli "Freebuff CLI"
[4]: https://code.claude.com/docs/en/cli-reference "Claude Code CLI reference"
[5]: https://kiro.dev/docs/cli/terminal-ui/ "Kiro CLI Terminal UI"
