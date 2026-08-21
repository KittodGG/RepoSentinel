# Pilot Validation Results / Hasil Pilot Validation

**Status / Status:** completed for the internal target and two representative public repositories / selesai untuk target internal dan dua repository public representatif.

**Purpose / Tujuan:** verify that RepoSentinel can scan real repository layouts as data, preserve deterministic machine output, respect profile behavior, and avoid executing target-repository code.

> Target repositories were scanned read-only. No target `npm install`, `pnpm install`, lifecycle hook, build script, package script, or compiled target executable was invoked. / Repository target dibaca secara read-only. Tidak ada `npm install`, `pnpm install`, lifecycle hook, build script, package script, atau executable target yang dijalankan.

## Pilot matrix / Matriks pilot

| Target | Profile | Exit code | Score | Status | Findings | Interpretation / Interpretasi |
|---|---:|---:|---:|---|---:|---|
| Internal RepoSentinel | `public` | `0` | `100` | `ready` | 0 | Self-scan passed with the current governance, documentation, security, and release hardening surface. |
| `expressjs/express` shallow clone | `public` | `0` | `86` | `almost-ready` | 6 | Scanner handled a mature JavaScript repository and returned warnings/info without threshold failure. |
| `sindresorhus/p-map` shallow clone | `npm-package` | `0` | `78` | `almost-ready` | 6 | npm-package profile handled a compact package repository and returned non-blocking findings. |

The scores are readiness signals within each scan, not cross-project rankings and not proof of security. / Score adalah readiness signal di dalam setiap scan, bukan ranking antarproject dan bukan bukti bahwa repository aman.

## Acceptance results / Hasil acceptance

| Criterion / Kriteria | Result / Hasil |
|---|---|
| Read-only target handling | Passed. Only the RepoSentinel CLI process was executed. |
| No target package-manager execution | Passed. Pilot runner did not invoke target package managers or scripts. |
| Machine-readable JSON schema | Passed for all three targets: `reposentinel.report/v1`. |
| Deterministic locale | Passed with `en` for all scans. |
| Exit behavior | Passed: public pilot targets returned `0`; no operational error returned `2`. |
| Profile coverage | Passed for `public` and `npm-package`. |
| Secret-redaction boundary | Covered by the stable fixture matrix and hardening checks; no sensitive values are included in this result document. |
| Network default | Passed by configuration: pilot scans ran without `--network`. |
| Documentation and governance self-scan | Passed with score `100/100` and zero findings for the internal target. |

## Evidence / Bukti

The raw pilot JSON reports are generated outside the repository at `/home/ubuntu/reposentinel-pilot-evidence/` to avoid importing third-party repository content into the project. The runner itself is `/home/ubuntu/reposentinel-pilot-evidence/run-pilot.mjs`; it records only sanitized summaries in `pilot-summary.json` and does not execute target code.

Raw JSON report dihasilkan di luar repository pada `/home/ubuntu/reposentinel-pilot-evidence/` agar content repository pihak ketiga tidak diimpor ke project. Runner berada di `/home/ubuntu/reposentinel-pilot-evidence/run-pilot.mjs`; runner hanya mencatat summary yang sudah disanitasi pada `pilot-summary.json` dan tidak menjalankan kode target.

## Remaining release condition / Kondisi release yang tersisa

This technical pilot is complete, but it is not a substitute for maintainer or user feedback. Before stable publication, the maintainer must review the measured results, confirm that the warning findings on representative repositories are understandable, and approve the stable version and public-visibility transition separately. / Technical pilot ini selesai, tetapi bukan pengganti feedback maintainer atau pengguna. Sebelum stable publication, maintainer harus meninjau hasil terukur, memastikan warning pada repository representatif mudah dipahami, dan menyetujui stable version serta transisi public visibility secara terpisah.
