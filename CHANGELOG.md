# Changelog

## Unreleased — post-1.0.0 hardening

- Fixed repository `.gitignore` handling so ignored files remain metadata-visible and security detectors can inspect isolated text without exposing it to general rules.
- Fixed multiline private-key detection, expanded IPv6 and IPv4-mapped SSRF blocking, transparent blocked-target reporting, deterministic custom-rule fingerprints, root-absolute Markdown link resolution, and default recommended ignores.
- Fixed `--no-color` for both argument positions, `NO_COLOR`, non-TTY output, and report files; added scan-budget metadata to reports.
- Added Windows CI coverage, portable script paths, Dependabot configuration, the public rule catalog, and a sanitized security-hardening summary.

## 1.0.0 — 21 August 2026

### Verified

- Completed the bilingual governance overhaul, audit correction response, security hardening, deterministic fixture matrix, internal/public pilot validation, dependency audit, packaging gate, and GitHub Quality CI.
- Added truthful network-state metadata across terminal, Markdown, JSON, SARIF, and HTML reports.
- Added internal/private-address blocking for opt-in network checks, match-only secret evidence, full generic redaction, Markdown escaping, critical-baseline refusal, safe Git-ref validation, repository `.gitignore` integration, aggregate scan budgets, recommended configuration semantics, unknown-rule validation, deduplicated SARIF rules, explicit positive custom-rule matching, portable release scripts, and pinned workflow actions.

### Publication status

- Published `reposentinel@1.0.0` to npm under the `latest` dist-tag.
- Verified `npm install reposentinel@latest` in a clean temporary prefix and confirmed `reposentinel --version` returns `1.0.0`.
- Published the GitHub `v1.0.0` release from the verified source commit; the repository is public after explicit maintainer approval.

## 0.1.0-beta.2 — 21 August 2026

### Fixed

- Fixed the bundled CLI direct-invocation guard so the npm-installed `reposentinel` binary executes correctly through npm’s symlinked bin path.

### Released

- Published `reposentinel@0.1.0-beta.2` to npm with the `beta` dist-tag.
- Verified a clean registry install and confirmed `reposentinel --version` returns `0.1.0-beta.2`.

## 0.1.0-beta.1 — 20 August 2026

### Added

- Multilingual CLI UI for English and Bahasa Indonesia.
- Local-first repository discovery with ignore patterns, bounded text reads, binary detection, and symlink safety.
- Deterministic normalized findings, severity scoring, threshold-based exit codes, and redacted evidence.
- Initial rule pack covering documentation, links, images, badges, security, package hygiene, Git hygiene, community readiness, CI permissions, and portfolio demo visibility.
- Terminal, Markdown, and JSON reporters with stable `reposentinel.report/v1` machine output.
- `check`, `report`, `lang`, `init`, `rules`, and `explain` CLI commands.
- Node.js 24 LTS target, pnpm workspace, strict TypeScript, Vitest tests, reproducible package staging, quality workflow, and reusable GitHub Action.
- Dogfooding and hardening scripts for self-scan, JSON schema, invalid input, redaction, and safe failure checks.

### Beta limitations

This beta is a repository-readiness assistant, not a SAST engine, dependency vulnerability scanner, secret-management platform, or formal security audit. The GitHub Action builds from the checked-out repository rather than installing a registry-published version. Third-party Action references are still tag-based and must be pinned to reviewed commit SHAs before a hardened production release.
