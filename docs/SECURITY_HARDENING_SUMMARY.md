# RepoSentinel Security and Reliability Summary

## English

RepoSentinel 1.0.0 is a local-first repository-readiness scanner. The stable release was validated with deterministic fixtures, package and registry smoke tests, dependency audit, GitHub Quality CI, internal validation, and public-repository pilot validation.

The scanner does not execute target-repository code, package scripts, build hooks, or arbitrary commands. Network checks are disabled by default and require explicit opt-in. When enabled, the network policy blocks loopback, private, link-local, metadata, multicast, documentation, and IPv4-mapped internal addresses. Redirects are not followed automatically, URLs are redacted in findings, and network state is represented truthfully in every report format.

Security findings never include secret values. Private-key evidence is structural and redacted, credential evidence is match-only, and the detector covers only documented high-confidence credential families. A clean scan is not a guarantee that a repository contains no secrets or vulnerabilities.

Repository `.gitignore` patterns are honored for general scanning. Files ignored only by the repository’s own `.gitignore` remain visible as metadata and may be inspected by security detectors so local `.env`, key, and credential exposure is not silently missed. Aggregate scan limits are enforced as bounded behavior and reported in the resulting reports.

## Bahasa Indonesia

RepoSentinel 1.0.0 adalah repository-readiness scanner yang local-first. Stable release ini divalidasi dengan deterministic fixture, package dan registry smoke test, dependency audit, GitHub Quality CI, internal validation, serta public-repository pilot validation.

Scanner tidak menjalankan code dari target repository, package script, build hook, atau arbitrary command. Network check nonaktif secara default dan hanya berjalan jika diaktifkan secara eksplisit. Saat aktif, network policy memblokir alamat loopback, private, link-local, metadata, multicast, documentation, serta alamat internal IPv4-mapped. Redirect tidak diikuti otomatis, URL pada finding disanitasi, dan network state ditampilkan secara truthful pada semua report format.

Security finding tidak pernah menyertakan nilai secret. Evidence private key bersifat struktural dan di-redact, evidence credential hanya menampilkan match yang sudah dimasking, dan detector hanya mencakup credential family high-confidence yang didokumentasikan. Scan yang bersih bukan jaminan bahwa repository bebas secret atau vulnerability.

Pattern `.gitignore` repository dihormati untuk general scan. File yang hanya di-ignore oleh `.gitignore` repository tetap terlihat sebagai metadata dan boleh diperiksa oleh security detector agar exposure `.env`, key, dan credential lokal tidak terlewat secara diam-diam. Aggregate scan limit diperlakukan sebagai bounded behavior dan dilaporkan pada report yang dihasilkan.

## Scope boundary

This summary is a public security posture statement, not a formal security audit, SAST report, or complete secret-scanning guarantee. For private vulnerability disclosure, use [SECURITY.md](../SECURITY.md). For the complete detector catalog, see [RULES.md](RULES.md).
