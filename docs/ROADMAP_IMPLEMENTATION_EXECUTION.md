# RepoSentinel — Implementation Execution Map

## Scope

Dokumen ini adalah execution contract untuk menyelesaikan opsi A–G dan backlog P1–P3 secara berurutan. Ia melengkapi product roadmap dengan dependency map dan acceptance criteria yang dapat diverifikasi melalui typecheck, unit test, integration test, CLI smoke test, package smoke test, dan GitHub Actions.

Implementasi harus mempertahankan prinsip berikut: scanner local-first, network off by default, tidak mengirim source code ke server, tidak menjalankan kode dari repository target, tidak mengikuti symlink keluar dari root, tidak menulis keluar dari root tanpa explicit user action, findings deterministic, machine output schema-stable, dan evidence sensitif selalu direda​ct.

## Baseline saat sinkronisasi

| Item | Status |
|---|---|
| GitHub branch | `main` tersinkron ke `820e6f5` |
| User change | `docs/assets/reposentinel-banner.svg` sudah di-pull dengan fast-forward |
| Banner audit | Browser-rendered dan visual layout terverifikasi |
| Runtime target | Node.js 24 LTS |
| Workspace | pnpm workspace, TypeScript strict, ESM |
| Existing report formats | terminal, Markdown, JSON, SARIF |
| Existing baseline | Repository-local fingerprint suppression |
| Existing profiles | `public`, `portfolio`, `npm-package` |
| Existing CI | GitHub Actions quality workflow |

## Dependency map

| Workstream | Depends on | Produces |
|---|---|---|
| Rule completeness | Core finding contract, tracked-file discovery, fixtures | Five deterministic built-in rules and regression tests |
| Changed-files baseline | Git discovery, fingerprint contract, CLI scan pipeline | Base-ref comparison, changed-file scope, baseline metadata |
| HTML report | Normalized report contract, output path safety | Self-contained offline HTML artifact |
| Npm publication | Clean package artifact, CLI smoke tests, release metadata | Registry-ready package and publication gate |
| Safe autofix | Stable rule IDs, remediation model, file boundary checks | Allowlisted dry-run/diff/apply workflow |
| Watch mode | Safe scan lifecycle, discovery ignore policy, terminal renderer | Debounced local rerun loop with CI fallback |
| VS Code diagnostics | Stable JSON schema, line/column mapping | Local extension or diagnostics bridge |
| Custom rule API | Stable context contract, security model, versioning | Explicitly installed rule interface and registry metadata |
| Network link checker | Link rule model, network policy, timeout/cache policy | Opt-in external URL validation |
| Dashboard | Stable JSON schema, repository identity, retention model | Report-file aggregation and portfolio view |
| Benchmark/snapshots | Stable output and fixtures | Performance budget and output regression gates |

## P1 acceptance criteria

### Rule completeness

The rule registry contains `community.contributing-guide`, `community.code-of-conduct`, `git.large-file`, `git.generated-tracked`, and `git.default-branch` or an explicitly documented equivalent naming scheme. Each rule has stable ID, category, profile applicability, severity, evidence, remediation, fixtures, and regression tests. False-positive behavior is documented.

### Baseline changed-files mode

The CLI can compare the target branch against an explicit Git base ref without network access. Added, modified, renamed, and deleted files have deterministic handling. Existing baseline suppression remains supported. JSON, SARIF, Markdown, and terminal output identify the selected mode and base ref. Shallow or missing refs fail safely with a clear exit code rather than silently claiming a complete comparison.

### HTML report

`--format html` produces a self-contained file with no CDN, external font, remote image, or runtime network dependency. All user-controlled strings are HTML-escaped. It contains score, status, severity counts, repository/profile metadata, findings, evidence, remediation, and a clear safety disclaimer. The output is schema-derived and covered by a fixture or snapshot test.

### Npm publication

The package can be packed, installed into a clean temporary prefix, and executed without workspace-only runtime dependencies. The publication workflow validates version, package contents, Node.js engine, CLI version, smoke scan, and release notes before publication. Publishing remains an explicit release action and is not performed automatically as part of ordinary development commits.

## P2 acceptance criteria

### Safe autofix

Only allowlisted rules can propose a patch. Default mode is dry-run. The CLI shows a unified diff before applying, refuses paths outside the repository, supports non-interactive explicit confirmation, and leaves unchanged files untouched. Secret-related rules are diagnostic-only unless a separate security review approves otherwise.

### Watch mode

`check --watch` performs an initial scan and reruns after relevant file changes with debounce. It ignores generated report output, avoids overlapping scans, handles rename/delete events, exits cleanly on SIGINT, and falls back to one-shot behavior when `CI=true` or stdout is not an interactive terminal.

### VS Code diagnostics

The integration consumes JSON report output rather than duplicating rule logic. It maps normalized relative paths, one-based lines, optional columns, and RepoSentinel severities into editor diagnostics. It runs locally, does not upload source, and degrades gracefully when the CLI is unavailable.

### Custom rule API and registry

A rule package must be explicitly installed or referenced by configuration; the scanner never auto-executes arbitrary code discovered inside the target repository. The API version, compatibility range, metadata, provenance, and failure behavior are documented. Registry access is not required for an offline scan of built-in rules.

## P3 acceptance criteria

### Network link checker

Network checks are opt-in and visibly marked in reports. The implementation has scheme allowlisting, timeout, redirect limit, concurrency limit, safe headers, credential redaction, and bounded output. It distinguishes syntax failure, timeout, DNS/TLS error, authentication-required, redirect, server error, and success. Default local scan behavior remains unchanged.

### Multi-repository dashboard

The first version reads normalized report files or explicitly supplied artifacts. It does not require a hosted backend. It identifies repository, commit/ref, profile, tool version, scan time, score, status, and findings without assuming that sensitive evidence can be centrally stored. Aggregation is deterministic and malformed reports are isolated with actionable errors.

### Performance benchmark and snapshot tests

Benchmarks cover small, medium, and large fixtures. Output snapshots normalize timestamps, absolute paths, and environment-specific values. JSON/SARIF continue to receive schema assertions in addition to snapshots. Benchmark thresholds are designed to detect meaningful regression without making CI dependent on tiny runner timing differences.

## Phase completion gate

A phase is complete only when its implementation, tests, documentation, and security boundary are present. The phase gate is:

```text
implementation → focused tests → full workspace validation → package/smoke validation → documentation → commit → GitHub Actions
```

If a feature cannot satisfy its security or determinism requirement, it must remain behind an explicit opt-in boundary rather than being silently weakened.

## Progress status

Current status: **Phases 1–15/15 are complete**. Rule completeness, changed-files mode, HTML reporting, npm artifact release gate, safe autofix, watch mode, VS Code diagnostics, custom rule registry, opt-in network checker, local multi-repository dashboard, performance benchmark, snapshot tests, documentation, final regression, packaging, commit/push, and GitHub quality CI are implemented and validated. The only external release blocker is npm authentication and explicit publication approval; the manual workflow is prepared but has not been executed without an npm publisher identity.
