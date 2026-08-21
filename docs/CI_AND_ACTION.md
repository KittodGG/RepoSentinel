# RepoSentinel — CI and GitHub Action

**Status:** phase 10 implementation  
**Runtime target:** Node.js 24 LTS  
**Default locale:** `en`  
**Default threshold:** `error`

## Quality workflow

`.github/workflows/quality.yml` runs on pushes and pull requests targeting `main`. It installs dependencies with `pnpm install --frozen-lockfile`, runs typecheck and tests, builds every workspace package, then executes a local JSON smoke scan. The smoke report must use `reposentinel.report/v1` and the English locale.

The workflow declares `permissions: contents: read`, uses a concurrency group to cancel superseded pull-request runs, and has a bounded timeout. It does not send repository source to an external service.

## Composite action

The root `action.yml` exposes RepoSentinel as a reusable local GitHub Action. It accepts a repository profile, locale, fail threshold, output format, and report path.

```yaml
- name: Check repository readiness
  uses: KittodGG/RepoSentinel@main
  with:
    profile: portfolio
    lang: id
    fail-on: error
    format: markdown
    output: artifacts/reposentinel-report.md
```

For a machine-readable CI artifact:

```yaml
- name: Export readiness JSON
  uses: KittodGG/RepoSentinel@main
  with:
    profile: public
    lang: en
    fail-on: warning
    format: json
    output: artifacts/reposentinel-report.json
```

For GitHub Code Scanning-compatible output:

```yaml
- name: Export SARIF findings
  uses: KittodGG/RepoSentinel@main
  with:
    profile: public
    lang: en
    fail-on: error
    format: sarif
    output: artifacts/reposentinel-report.sarif
```

For a self-contained browser report limited to pull-request changes:

```yaml
- name: Export changed-files HTML report
  uses: KittodGG/RepoSentinel@main
  with:
    profile: public
    lang: en
    fail-on: error
    format: html
    changed-since: origin/main
    output: artifacts/reposentinel-report.html
```

The action installs the action repository workspace with the pinned lockfile, builds the publishable `packages/cli` package, and executes its generated bundle. It is designed for source-checkout usage before the npm package is published.

## CI-safe behavior

The action runs with network disabled by RepoSentinel configuration, does not execute the target repository’s package scripts, and uses `--no-color` so logs remain readable in GitHub Actions. JSON and Markdown reports do not contain terminal escape sequences. The action may fail based on the configured severity threshold, while still preserving lower-severity findings in the report.

## Release gate

A phase-10 change is not ready to merge until the following conditions hold:

| Gate | Requirement |
|---|---|
| Type safety | `pnpm typecheck` passes on Node.js 24. |
| Regression suite | `pnpm test` passes, including core, discovery, localization, config, rules, and reporters. |
| Build | `pnpm build` produces CLI and package declarations. |
| Smoke report | `reposentinel check . --format json --lang en` emits `reposentinel.report/v1`; SARIF emits version `2.1.0`. |
| Action syntax | `action.yml` has valid inputs, composite steps, and no secret-dependent behavior. |
| Permissions | Quality workflow declares read-only repository contents permission. |
| Packaging | `pnpm pack:alpha` produces a clean artifact without unpublished `@reposentinel/*` runtime dependencies. |

## Known pre-beta limitations

The action currently builds the CLI from the checked-out action repository rather than a registry-published version. It supports terminal, Markdown, JSON, SARIF, and HTML output; baseline suppression is available when a repository-local `.reposentinel/baseline.json` is present, and changed-files mode is available through the `changed-since` input. Third-party action references use version tags during the initial phase; pinning them to reviewed commit SHAs is a hardening task before beta production. The action does not yet upload a report artifact automatically; the caller can add `actions/upload-artifact` after the scan step.
