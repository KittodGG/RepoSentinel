# Pull Request / Pull Request

> Please complete the English fields or provide equivalent Bahasa Indonesia explanations. / Lengkapi bagian English atau berikan penjelasan setara dalam Bahasa Indonesia.

## Context / Konteks

## Problem / Masalah

## Proposed solution / Solusi yang diusulkan

## Acceptance criteria / Kriteria penerimaan

## Scope and compatibility / Scope dan kompatibilitas

- [ ] This Pull Request solves one focused problem. / Pull Request ini menyelesaikan satu masalah yang fokus.
- [ ] Public CLI commands, rule IDs, configuration keys, exit codes, fingerprints, or report schemas are unchanged, or the compatibility impact is explained here. / Command CLI publik, rule ID, configuration key, exit code, fingerprint, atau report schema tidak berubah, atau dampak kompatibilitas dijelaskan di sini.
- [ ] The change does not silently enable network access or execute code from a target repository. / Perubahan tidak secara diam-diam mengaktifkan network atau menjalankan code dari target repository.
- [ ] Any user-visible behavior change has a migration note or release-note entry. / Perubahan perilaku yang terlihat pengguna memiliki migration note atau release-note entry.

## Testing / Pengujian

- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] Relevant fixture and integration tests. / Fixture dan integration test yang relevan.
- [ ] `pnpm dogfood` or equivalent self-scan when applicable. / `pnpm dogfood` atau self-scan setara jika relevan.
- [ ] `node scripts/hardening-checks.mjs` when security boundaries are affected. / Jalankan saat security boundary terdampak.
- [ ] `pnpm pack:release && node scripts/release-gate.mjs` when packaging is affected. / Jalankan saat packaging terdampak.
- [ ] Snapshot tests were updated intentionally if output changed. / Snapshot test diperbarui secara sengaja jika output berubah.
- [ ] The clean-install path was tested when package or dependency behavior changed. / Clean-install diuji jika package atau dependency berubah.

**Commands and results / Command dan hasil:**

```text
<!-- Paste concise, sanitized evidence here. / Tempel evidence ringkas yang sudah disanitasi. -->
```

## Terminal and report evidence / Evidence terminal dan report

Complete when relevant / Lengkapi jika relevan:

- [ ] Colored TTY output reviewed. / Colored TTY sudah direview.
- [ ] `--no-color` or plain output reviewed. / `--no-color` atau plain output sudah direview.
- [ ] CI/piped output reviewed. / Output CI/pipe sudah direview.
- [ ] JSON/SARIF/Markdown/HTML output reviewed. / Output JSON/SARIF/Markdown/HTML sudah direview.
- [ ] Screenshot or normalized transcript attached for terminal UX changes. / Screenshot atau transcript normalized dilampirkan untuk perubahan terminal UX.
- [ ] Escaping, deterministic ordering, and output-path safety reviewed. / Escaping, deterministic ordering, dan output-path safety sudah direview.

## Security and privacy impact / Dampak security dan privacy

Explain changes to secrets, redaction, file boundaries, symlinks, network, subprocesses, permissions, or target-repository execution. / Jelaskan perubahan pada secret, redaction, file boundary, symlink, network, subprocess, permission, atau target-repository execution.

- [ ] No secret, private key, `.env` content, proprietary source, private URL, unredacted log, or unredacted personal path is included. / Tidak ada secret, private key, isi `.env`, proprietary source, private URL, log yang belum disanitasi, atau personal path yang belum disanitasi.
- [ ] Security regression tests were added or updated when applicable. / Security regression test ditambahkan atau diperbarui jika relevan.
- [ ] Network remains opt-in and target code remains unexecuted by default. / Network tetap opt-in dan target code tetap tidak dijalankan secara default.

## Risks and rollback / Risiko dan rollback

Describe the main risks, affected users, and how the change can be reverted or contained. / Jelaskan risiko utama, pengguna terdampak, dan cara perubahan di-revert atau di-contain.

## Documentation and release notes / Dokumentasi dan release notes

- [ ] README/docs updated. / README/docs diperbarui.
- [ ] Status labels are accurate: `implemented`, `verified`, `planned`, `proposed`, or `backlog`. / Status label akurat.
- [ ] Changelog/release notes updated when user-visible behavior changes. / Changelog/release notes diperbarui untuk perubahan yang terlihat pengguna.
- [ ] English and Bahasa Indonesia documentation remain consistent when applicable. / Dokumentasi English dan Bahasa Indonesia tetap konsisten jika relevan.
- [ ] Governance, security, and contribution links remain reachable from the root README. / Link governance, security, dan kontribusi tetap dapat ditemukan dari root README.

## Rule-specific checklist / Checklist khusus rule

Complete when adding or changing a rule / Lengkapi saat menambah atau mengubah rule:

- [ ] Stable rule ID, category, default severity, evidence, and remediation are defined. / Stable rule ID, kategori, default severity, evidence, dan remediation sudah ditentukan.
- [ ] Positive and negative fixtures are included. / Fixture positif dan negatif tersedia.
- [ ] False-positive behavior is explained. / Perilaku false positive dijelaskan.
- [ ] Rule configuration and profile behavior are tested. / Configuration rule dan behavior profile diuji.
- [ ] Autofix is not added unless explicitly allowlisted and safe. / Autofix tidak ditambahkan kecuali allowlisted dan aman secara eksplisit.

## Contributor declaration / Deklarasi contributor

- [ ] I created this contribution or have permission to submit it under the repository license. / Saya membuat kontribusi ini atau memiliki izin untuk mengirimkannya berdasarkan license repository.
- [ ] I did not knowingly include incompatible third-party code or undisclosed license obligations. / Saya tidak dengan sengaja memasukkan third-party code yang inkompatibel atau kewajiban lisensi yang tidak diungkapkan.
- [ ] I followed the [Code of Conduct](../CODE_OF_CONDUCT.md). / Saya mengikuti [Code of Conduct](../CODE_OF_CONDUCT.md).
- [ ] I read the [Contributing Guide](../CONTRIBUTING.md). / Saya membaca [Panduan Kontribusi](../CONTRIBUTING.md).
- [ ] I understand that maintainers may request changes, split the Pull Request, or decline work outside the documented project scope. / Saya memahami maintainer dapat meminta perubahan, memecah Pull Request, atau menolak pekerjaan di luar scope project.
