# RepoSentinel Stable Release Readiness / Kesiapan Stable Release RepoSentinel

## English

This document defines the production gate for a stable RepoSentinel release. Stable means that the CLI contract, deterministic rule engine, machine-readable reports, local-first security boundary, npm package, GitHub Action, documentation, and rollback process are mutually consistent and verified.

A stable release must not be promoted only because the unit tests are green. It must also pass clean-install, compatibility, security-boundary, documentation, pilot, and post-publication checks.

### Release contract freeze

Before a release candidate is created, freeze and document the behavior of public commands, options, profiles, finding schema, exit codes, report formats, configuration keys, network policy, and versioning. Any breaking change requires an explicit migration note and appropriate semantic versioning.

| Contract | Stable requirement |
|---|---|
| CLI commands and options | Every documented command and option exists, has tested behavior, and has accurate help text. |
| Finding schema | `ruleId`, severity, message, path, line, evidence, remediation, fingerprint, and metadata behave consistently. |
| Exit codes | Success, threshold failure, invalid input/configuration, and internal/filesystem failure are deterministic. |
| Profiles and locale | Profile selection is stable; locale changes human text only, not machine identifiers or exit behavior. |
| Network policy | Default scans make no network requests; network checks require explicit opt-in and bounded behavior. |
| Versioning | `package.json`, CLI version, Git tag, artifact, npm registry, and release notes agree. |

### Automated quality gate

The following commands must pass from a clean checkout:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm dogfood
node scripts/hardening-checks.mjs
pnpm pack:release
node scripts/release-gate.mjs
pnpm benchmark
```

The release gate must test the generated executable, not only TypeScript source. A clean temporary installation must successfully run `reposentinel --version`, `reposentinel --help`, a local check, and each supported report format.

### Rule and fixture coverage

Every enabled rule must have positive, negative, and regression coverage. Security rules must include tracked `.env`, safe example files, private-key signatures, public certificates, high-confidence credentials, placeholders, redaction, and non-disclosure assertions. Profile tests must prove that a rule does not create findings outside its intended context.

Custom rule registries must be tested for valid JSON, duplicate IDs, invalid globs, boundary traversal, and repository-root containment. Baseline, changed-files, watch, safe autofix, dashboard, HTML, and network opt-in behavior require integration tests in addition to unit tests.

### Determinism and compatibility

Run the same scan twice and compare normalized JSON. Findings must be sorted independently of filesystem order or asynchronous completion. Repeat the test on supported operating systems, Node.js versions, locale `en` and `id`, TTY and CI, colored and `--no-color` output, Git and non-Git directories, shallow clones, detached HEAD, symlink boundaries, read-only directories, empty repositories, and generated-heavy repositories.

The supported matrix must be written down. Unsupported environments should fail with a clear compatibility message rather than an internal exception.

### Security boundary gate

The scanner must never execute target package scripts, build hooks, arbitrary executables, or untrusted shell commands. Default scans must not access the network, print secrets, follow symlinks outside the root, upload reports, or write files unless an explicitly selected safe autofix is allowlisted and confirmed.

Security testing must include malicious package scripts, lifecycle hooks, path traversal, symlink escape, private keys, `.env` files, archive files, malformed configuration, unsafe output paths, invalid Git refs, and custom-rule boundary attacks. No secret value may appear in terminal output, JSON, Markdown, SARIF, HTML, snapshots, CI logs, or artifacts.

### Reporter and Action gate

Terminal, Markdown, JSON, SARIF, and HTML reporters must have fixture or snapshot coverage. JSON must preserve `reposentinel.report/v1`; SARIF must remain valid SARIF 2.1.0. HTML must remain self-contained and offline. Output escaping, path safety, deterministic order, severity mapping, and empty-report behavior must be verified.

The GitHub Action must match local CLI findings for the same commit, use least-privilege permissions, keep network disabled by default, preserve `--no-color` CI output, and pass clean, warning, error, critical, invalid-config, and no-Git scenarios.

### Package and registry gate

The package artifact must contain only intended runtime files and dependencies. Verify the tarball manifest, license, bin entrypoint, package metadata, exports, supported Node.js range, and absence of unpublished workspace dependencies. Install the package from the intended registry in an empty temporary directory and run the CLI through npm global, `npx`, and direct binary paths.

Do not overwrite a published version. Stable publication must use a new immutable version, a stable Git tag, a changelog entry, a source commit reference, and a verified `latest` dist-tag. Earlier prerelease history may remain in changelog history, but the active README, package metadata, default install instructions, and issue templates must describe only the current stable release.

### Documentation and governance gate

The root README, [Governance Hub](../GOVERNANCE.md), [CONTRIBUTING.md](../CONTRIBUTING.md), [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md), [SECURITY.md](../SECURITY.md), license policy, GitHub governance, CI reference, issue templates, Pull Request template, changelog, and release notes must be bilingual where designated and must describe the implementation accurately.

The README must link directly to the governance hub and templates. The issue-template configuration must expose private security reporting, governance, contribution, security, and conduct links. No public template may request secrets or unredacted proprietary material.

### Pilot and usability gate

Independent users should complete `install → check → understand finding → fix → check again → share report` without maintainer guidance. Record installation time, scan success, finding relevance, false positives, remediation clarity, locale behavior, exit-code understanding, network-default understanding, and report readability.

Recommended stable thresholds are at least 80% first-scan success, at least 85% finding relevance, no open P0/P1 issues, no critical usability blocker, and clear user understanding that a readiness score is not a security certification.

### Rollback and incident gate

Before publication, test the rollback procedure. Never rewrite a published package version. If a stable issue appears, move the `latest` tag to a verified safe version when appropriate, preserve the faulty artifact for investigation, publish a corrected patch, and add a regression test.

For secret exposure, arbitrary code execution, path escape, accidental network access, schema corruption, or data loss, stop promotion, contain the release, rotate credentials when applicable, preserve sanitized evidence, and publish a coordinated correction or advisory.

### Definition of Done

```text
[ ] Public contract is frozen and documentation matches implementation
[ ] Every rule has positive, negative, and regression coverage
[ ] Determinism and compatibility checks pass
[ ] Security-boundary tests pass with zero secret leakage
[ ] CLI passes clean-install, npm, npx, and direct execution tests
[ ] All report formats and schemas are validated
[ ] GitHub Action passes clean and failing repository scenarios
[ ] Performance has no unexplained regression
[ ] Independent pilot metrics meet the agreed threshold
[ ] README and governance links are direct and bilingual
[x] Stable artifact, Git tag, changelog, checksum, and source commit are recorded
[ ] Rollback and incident runbooks are tested
[x] Maintainer gives explicit stable-release approval
[x] Repository visibility review completed; repository is public by explicit maintainer approval
```

## Bahasa Indonesia

Dokumen ini mendefinisikan production gate untuk stable release RepoSentinel. Stable berarti kontrak CLI, deterministic rule engine, machine-readable report, security boundary local-first, npm package, GitHub Action, dokumentasi, dan proses rollback sudah konsisten serta diverifikasi.

Stable release tidak boleh dipromosikan hanya karena unit test hijau. Release juga wajib lulus clean-install, compatibility, security-boundary, dokumentasi, pilot, dan post-publication check.

Kriteria di atas adalah kontrak utama yang harus dicentang sebelum stable. Seluruh istilah teknis sengaja dipertahankan dalam English agar command, schema, rule ID, config key, dan workflow tetap dapat disalin tanpa ambiguitas.
