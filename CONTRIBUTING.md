# Contributing to RepoSentinel

Terima kasih telah membantu meningkatkan RepoSentinel. RepoSentinel adalah **CLI-first, local-first, deterministic, explainable**, dan aman secara default. Kontribusi yang baik tidak hanya menambah fitur, tetapi juga mempertahankan output yang dapat dipercaya, privasi repository, dan pengalaman yang mudah dipahami.

> Bahasa diskusi boleh English atau Bahasa Indonesia. Nama command, rule ID, configuration key, schema, dan technical identifier harus tetap menggunakan bentuk stabil dalam bahasa Inggris.

## 1. Sebelum mulai

Untuk perubahan yang lebih besar daripada typo atau perbaikan dokumentasi kecil, buka Issue terlebih dahulu. Jelaskan `context → problem → proposed solution → acceptance criteria → dependencies → risks`. Maintainer dapat meminta perubahan dipecah menjadi beberapa Pull Request agar lebih mudah direview.

Jangan menggunakan Issue atau Pull Request publik untuk membagikan secret, access token, private key, `.env`, proprietary source, private URL, atau log yang belum disanitasi. Kerentanan yang belum ditambal harus mengikuti [Security Policy](SECURITY.md), bukan jalur Issue publik.

## 2. Local setup

RepoSentinel menargetkan Node.js 24 LTS dan menggunakan pnpm workspace.

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm dogfood
node scripts/hardening-checks.mjs
```

Untuk memeriksa artifact yang akan dipasang oleh pengguna:

```bash
pnpm pack:beta
node scripts/release-gate.mjs
```

Scanner membaca target repository sebagai data. Jangan menambahkan implementasi yang menjalankan `npm install`, package script, build hook, executable hasil build, atau arbitrary shell command dari target repository. Network harus tetap disabled by default dan hanya aktif melalui opt-in yang jelas.

## 3. Aturan perubahan kode

Setiap rule baru wajib memiliki stable rule ID, category, default severity, detector deterministik, safe evidence, remediation, dokumentasi, positive fixture, negative fixture, dan regression test. Rule tidak boleh mengetahui detail reporter. Reporter hanya boleh mengonsumsi normalized findings.

Perubahan yang memengaruhi schema JSON, SARIF, exit code, fingerprint, baseline, config, atau output terminal harus menjelaskan backward-compatibility impact. Perubahan security harus menjelaskan redaction, path-boundary, symlink, network, dan target-code-execution impact.

Safe autofix hanya boleh menulis file yang allowlisted, baru, predictable, dan dapat direview melalui dry-run. Jangan menambahkan autofix untuk secret deletion, history rewrite, arbitrary source transformation, atau operasi yang berpotensi merusak tanpa desain dan review terpisah.

## 4. Branch, commit, dan Pull Request

Gunakan branch yang deskriptif, misalnya `feat/html-report`, `fix/sarif-location`, atau `docs/contributing`. Jangan bekerja langsung pada `main` kecuali maintainer meminta emergency fix.

Commit harus fokus dan mudah dibatalkan. Format Conventional Commits disarankan, misalnya `feat: add HTML reporter`, `fix: redact credential evidence`, atau `docs: clarify release gate`. Jangan commit `dist/`, coverage output, temporary reports, secrets, atau generated local artifacts yang tidak diperlukan.

Pull Request harus menggunakan [template repository](.github/pull_request_template.md). Satu Pull Request idealnya menyelesaikan satu masalah yang dapat diverifikasi. Reviewer berhak meminta fixture, test, documentation, security review, atau perubahan scope sebelum approval.

## 5. Testing dan evidence

Sebelum meminta review, jalankan checks yang relevan dan cantumkan hasilnya di Pull Request. Jika terminal UX berubah, sertakan evidence untuk colored TTY, `--no-color`, plain/CI output, machine JSON, dan Markdown. Jika report berubah, cek escaping, deterministic ordering, output path safety, dan schema compatibility.

Perubahan tidak boleh mengandalkan network eksternal agar unit test lulus. Network tests harus menggunakan mock atau local fixture. Benchmark harus menyebutkan environment dan tidak boleh dianggap sebagai performance guarantee untuk semua mesin.

## 6. License dan contributor rights

Repository saat ini menggunakan **MIT License**. Kontributor hanya boleh mengirim karya miliknya sendiri atau karya yang memiliki hak untuk dilisensikan. Dengan mengirim Pull Request, kontributor menyatakan bahwa kontribusi tersebut dapat didistribusikan sesuai license repository dan tidak sengaja memasukkan third-party code yang inkompatibel atau memiliki kewajiban yang tidak didokumentasikan.

RepoSentinel saat ini tidak mewajibkan CLA atau DCO sign-off. Jika kebijakan tersebut diubah, perubahan harus diumumkan melalui repository dan template kontribusi sebelum diberlakukan.

## 7. Review dan keputusan maintainer

Maintainer menilai correctness, deterministic behavior, UX, security/privacy, compatibility, tests, dan maintenance cost. Approval bukan jaminan bahwa perubahan bebas dari semua bug. Maintainer dapat menolak perubahan yang memperluas scope ke SaaS, hosted dashboard, AI reviewer, remote marketplace, atau network-by-default tanpa keputusan scope yang terdokumentasi.

Semua peserta wajib mengikuti [Code of Conduct](CODE_OF_CONDUCT.md). Pertanyaan umum boleh diajukan melalui Issue dengan template yang sesuai. Untuk kerentanan privat, ikuti [Security Policy](SECURITY.md).
