# Changelog

All notable changes to RepoSentinel are documented here. Version `1.0.0` is the current stable release; the `Unreleased` section contains verified work prepared after publication.

## Unreleased — post-1.0.0 hardening

### Precision and safety

- Added a pinned external-repository corpus gate with reproducible commits, bounded scan time, report-size limits, finding-volume limits, and a blocking-security policy that keeps test fixtures visible without treating them as production credentials.
- Added connection-string placeholder filtering, plausible-JWT validation, test-certificate severity handling, Markdown code-fence masking, CommonMark angle-bracket destination parsing, root-route link handling, dual-license filename support, and actual-path reporting.
- Added safe unknown Git-ref errors that do not disclose absolute paths or raw command details.
- Fixed custom glob semantics so `**/` matches zero or more directories and `?` matches exactly one non-separator character.

### Scoring and reporting

- Added a per-rule score penalty cap so one noisy detector cannot dominate a scan.
- Added per-rule and total finding-volume caps with explicit `scan.findings-truncated` summary findings.
- Propagated truncation state through terminal, Markdown, JSON, SARIF, and HTML reports, including the machine-readable JSON schema.

### Documentation and release engineering

- Added the external corpus workflow for scheduled and manual verification; the networked corpus gate remains intentionally separate from the fast local release gate.
- Added rule limitation notes to the public rule catalog so every detector states what it does not attempt to detect.
- Documented that rule IDs, severities, fingerprints, configuration keys, and report schemas are stable across locales, while finding prose remains an English-language compatibility surface until the planned message-key localization architecture is implemented.

## 1.0.0 — 21 August 2026

### Verified

- Completed the bilingual governance overhaul, audit correction response, security hardening, deterministic fixture matrix, internal/public pilot validation, dependency audit, packaging gate, and GitHub Quality CI.
- Added truthful network-state metadata across terminal, Markdown, JSON, SARIF, and HTML reports.
- Added internal/private-address blocking for opt-in network checks, match-only secret evidence, full generic redaction, Markdown escaping, critical-baseline refusal, safe Git-ref validation, repository `.gitignore` integration, aggregate scan budgets, recommended configuration semantics, unknown-rule validation, deduplicated SARIF rules, explicit positive custom-rule matching, portable release scripts, and pinned workflow actions.

### Publication status

- Published `reposentinel@1.0.0` to npm under the `latest` dist-tag.
- Verified `npm install reposentinel@latest` in a clean temporary prefix and confirmed `reposentinel --version` returns `1.0.0`.
- Published the GitHub `v1.0.0` release from the verified source commit; the repository is public after explicit maintainer approval.

## Pre-1.0.0 foundation

- Added multilingual CLI UI for English and Bahasa Indonesia.
- Added local-first repository discovery with ignore patterns, bounded text reads, binary detection, and symlink safety.
- Added deterministic normalized findings, severity scoring, threshold-based exit codes, and redacted evidence.
- Added the initial rule pack covering documentation, links, images, badges, security, package hygiene, Git hygiene, community readiness, CI permissions, and portfolio demo visibility.
- Added terminal, Markdown, and JSON reporters with stable `reposentinel.report/v1` machine output.
- Added `check`, `report`, `lang`, `init`, `rules`, and `explain` CLI commands.
- Added the Node.js 24 LTS target, pnpm workspace, strict TypeScript, Vitest tests, reproducible package staging, quality workflow, and reusable GitHub Action.
- Added dogfooding and hardening scripts for self-scan, JSON schema, invalid input, redaction, and safe failure checks.

> RepoSentinel is a repository-readiness assistant. It is not a SAST engine, dependency vulnerability scanner, secret-management platform, or formal security audit. A clean result does not prove that a repository contains no vulnerabilities or sensitive material.

## References

- [Repository README](https://github.com/KittodGG/RepoSentinel)
- [Rule catalog](https://github.com/KittodGG/RepoSentinel/blob/main/docs/RULES.md)
- [Release readiness guide](https://github.com/KittodGG/RepoSentinel/blob/main/docs/RELEASE_READINESS.md)
