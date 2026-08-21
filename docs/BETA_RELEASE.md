# RepoSentinel — Historical Prerelease Record / Catatan Historis Prerelease

> This document records the historical `0.1.0-beta.1` release process. It is not the active production-release contract. / Dokumen ini mencatat proses release historis `0.1.0-beta.1`. Dokumen ini bukan kontrak production release aktif.

## Historical release candidate / Release candidate historis

| Field / Field | Value / Nilai |
|---|---|
| Version / Versi | `0.1.0-beta.1` |
| Release channel / Channel release | `beta` — historical only / hanya historis |
| Runtime | Node.js 24 LTS |
| Supported UI locales / Locale UI | `en`, `id` |
| Machine report schema | `reposentinel.report/v1` |

## Historical gates / Gate historis

The original prerelease process verified source-of-truth documents, core tests, CLI behavior, security boundaries, self-scan, hardening, package staging, CI, and pilot readiness. These checks remain useful evidence, but the active stable-release requirements are defined in [RELEASE_READINESS.md](RELEASE_READINESS.md).

Proses prerelease awal memverifikasi source-of-truth document, core test, perilaku CLI, security boundary, self-scan, hardening, package staging, CI, dan pilot readiness. Check tersebut tetap menjadi bukti historis, tetapi persyaratan stable release aktif didefinisikan di [RELEASE_READINESS.md](RELEASE_READINESS.md).

| Gate / Gate | Historical result / Hasil historis |
|---|---|
| Core correctness / Correctness core | Tests for core, discovery, config, localization, rules, and reporters passed. / Test lulus. |
| CLI behavior / Perilaku CLI | Localized commands and output were verified. / Command dan output multilingual diverifikasi. |
| Security boundary / Security boundary | Network off by default, target scripts not executed, symlinks bounded, evidence redacted. / Network default off, script target tidak dijalankan, symlink dibatasi, evidence disanitasi. |
| Package / Package | `0.1.0-beta.1` artifact passed staging smoke tests. / Artifact lulus staging smoke test. |
| CI / CI | Quality workflow and local equivalents passed. / Quality workflow dan equivalent lokal lulus. |

## Historical procedure / Prosedur historis

The original release gate used Node.js 24, a frozen install, typecheck, tests, build, dogfood, hardening checks, `pnpm pack:release`, tarball inspection, clean staging installation, `reposentinel --version`, `reposentinel rules`, and a JSON self-scan.

Release gate awal menggunakan Node.js 24, frozen install, typecheck, test, build, dogfood, hardening check, `pnpm pack:release`, inspeksi tarball, clean staging installation, `reposentinel --version`, `reposentinel rules`, dan JSON self-scan.

npm publication was a separate owner-approved action. This file is retained as historical release evidence; do not use its prerelease version or channel as the current installation instruction. / Publication npm merupakan tindakan terpisah yang memerlukan approval owner. File ini dipertahankan sebagai bukti release historis; jangan gunakan version atau channel prerelease di sini sebagai instruksi instalasi aktif.

## Historical rollback / Rollback historis

If a prerelease issue appeared, the release was to be marked withdrawn, the pilot stopped, and a correction note published. Published package history must not be rewritten. The permanent process is now defined in [RELEASE_READINESS.md](RELEASE_READINESS.md).

Jika masalah muncul pada prerelease, release harus ditandai withdrawn, pilot dihentikan, dan correction note diterbitkan. Riwayat package yang sudah dipublish tidak boleh ditulis ulang. Proses permanen sekarang didefinisikan di [RELEASE_READINESS.md](RELEASE_READINESS.md).
