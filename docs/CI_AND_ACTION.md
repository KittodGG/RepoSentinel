# RepoSentinel — CI and GitHub Action

**Status / Status:** production-readiness reference

**Runtime target / Target runtime:** Node.js 24 LTS

**Default locale / Locale default:** `en`

**Default threshold / Threshold default:** `error`

## Quality workflow / Quality workflow

`.github/workflows/quality.yml` runs on pushes and Pull Requests targeting `main`. It installs dependencies with `pnpm install --frozen-lockfile`, runs typecheck and tests, builds every workspace package, and executes a local JSON smoke scan. The smoke report must use `reposentinel.report/v1` and the English locale.

`.github/workflows/quality.yml` berjalan pada push dan Pull Request ke `main`. Workflow meng-install dependency dengan `pnpm install --frozen-lockfile`, menjalankan typecheck dan test, membangun seluruh workspace package, lalu menjalankan local JSON smoke scan. Smoke report wajib menggunakan `reposentinel.report/v1` dan locale English.

The workflow declares `permissions: contents: read`, uses a concurrency group to cancel superseded Pull Request runs, and has a bounded timeout. It does not send repository source to an external service. Third-party Actions are pinned to full commit SHAs, and the repository's rule pack flags mutable references for review.

Workflow mendeklarasikan `permissions: contents: read`, menggunakan concurrency group untuk membatalkan Pull Request run yang sudah tidak relevan, dan memiliki timeout terbatas. Workflow tidak mengirim source repository ke external service. Third-party Action dipin ke full commit SHA, dan rule pack akan menandai reference yang mutable untuk direview.

## Composite Action / Composite Action

The root `action.yml` exposes RepoSentinel as a reusable local GitHub Action. It accepts a repository profile, locale, fail threshold, output format, and report path.

Root `action.yml` menyediakan RepoSentinel sebagai reusable local GitHub Action. Input yang tersedia meliputi repository profile, locale, fail threshold, output format, dan report path.

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

For machine-readable CI output / Untuk output CI machine-readable:

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

For Code Scanning-compatible output / Untuk output yang kompatibel dengan Code Scanning:

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

For a self-contained offline HTML report limited to Pull Request changes / Untuk HTML report offline yang hanya mencakup perubahan Pull Request:

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

The Action installs the checked-out repository workspace with the lockfile, builds the publishable CLI package, and executes its generated bundle. Consumers should pin the Action to a reviewed stable tag or commit once stable publication is complete; `main` is suitable for development validation, not long-term reproducibility.

Action meng-install workspace repository yang di-checkout dengan lockfile, membangun CLI package yang dapat dipublish, lalu menjalankan generated bundle. Setelah stable publish selesai, consumer sebaiknya pin Action ke stable tag atau reviewed commit; `main` cocok untuk development validation, bukan reproducibility jangka panjang.

## CI-safe behavior / Perilaku aman untuk CI

The Action runs with network disabled by RepoSentinel configuration, does not execute the target repository’s package scripts, and uses `--no-color` so logs remain readable in GitHub Actions. JSON and Markdown reports do not contain terminal escape sequences. The Action may fail at the configured severity threshold while preserving lower-severity findings in the report.

Action berjalan dengan network disabled melalui configuration RepoSentinel, tidak menjalankan package script target repository, dan menggunakan `--no-color` agar log mudah dibaca di GitHub Actions. Report JSON dan Markdown tidak berisi terminal escape sequence. Action dapat gagal pada severity threshold yang dikonfigurasi sambil tetap menyimpan finding severity yang lebih rendah di report.

## Stable release gate / Stable release gate

A production or stable change is not ready to merge until the following conditions hold:

| Gate / Gate | Requirement / Persyaratan |
|---|---|
| Type safety / Type safety | `pnpm typecheck` passes on the supported Node.js version. / Lulus pada Node.js yang didukung. |
| Regression suite / Regression suite | `pnpm test` passes, including core, discovery, localization, config, rules, and reporters. / Semua test core, discovery, localization, config, rules, dan reporters lulus. |
| Build / Build | `pnpm build` produces the CLI bundle and declarations. / Menghasilkan CLI bundle dan declaration. |
| Smoke report / Smoke report | JSON emits `reposentinel.report/v1`; SARIF emits version `2.1.0`. / JSON dan SARIF memiliki schema yang benar. |
| Action syntax / Syntax Action | `action.yml` has valid inputs, composite steps, and no secret-dependent behavior. / Input dan composite step valid tanpa ketergantungan secret. |
| Permissions / Permission | Quality workflow uses least privilege, with read-only contents by default. / Workflow menggunakan least privilege. |
| Action pinning / Pinning Action | Third-party Actions use verified full commit SHAs; privileged `pull_request_target` workflows must not check out PR code. / Action dipin dan workflow privileged tidak checkout code PR. |
| Lockfile consistency / Konsistensi lockfile | Declared package manager, lockfile, and workspace importers agree. / Package manager, lockfile, dan workspace importer konsisten. |
| Packaging / Packaging | Clean artifact contains only intended runtime files and dependencies, with exports, `files`, and Node.js engine metadata verified. / Artifact bersih memiliki exports, `files`, dan runtime Node.js yang benar. |
| Registry smoke / Registry smoke | Fresh install from the intended registry resolves and executes the published stable version. / Fresh install dari registry berhasil menjalankan stable version. |
| Documentation / Dokumentasi | README, Security, Contributing, Code of Conduct, and templates match the implementation. / Dokumentasi governance sesuai implementasi. |

## Supported release policy / Kebijakan release yang didukung

Stable releases must have a Git tag, changelog entry, version-pinned artifact, source commit reference, and registry install verification. Prerelease versions may remain visible in historical changelog entries, but the active README, package metadata, default installation instructions, and public issue templates must not describe the product as beta after stable publication.

Stable release wajib memiliki Git tag, changelog entry, artifact dengan version yang jelas, source commit reference, dan registry install verification. Version prerelease boleh tetap tercatat dalam changelog historis, tetapi README aktif, package metadata, instruksi instalasi default, dan public issue template tidak boleh lagi menggambarkan produk sebagai beta setelah stable publication.

## Manual publication workflows / Manual publication workflow

`.github/workflows/release.yml` publishes the npm CLI only when the workflow input is exactly `publish`, after the release gate succeeds, and with the required `NPM_TOKEN` repository secret. `.github/workflows/vscode-publish.yml` builds and packages the `reposentinel-diagnostics` VSIX, then publishes only when the workflow input is exactly `publish` and the required `VSCE_PAT` secret is available for the `kittodgg` publisher identity.

`.github/workflows/release.yml` hanya mempublish npm CLI saat workflow input tepat `publish`, release gate lulus, dan repository secret `NPM_TOKEN` tersedia. `.github/workflows/vscode-publish.yml` membangun dan mem-package VSIX `reposentinel-diagnostics`, lalu hanya mempublish saat input tepat `publish` dan secret `VSCE_PAT` tersedia untuk publisher identity `kittodgg`.

Neither workflow runs on an ordinary push. Publication requires owner approval, authenticated registry or publisher identity, and a version/release review. Never place npm or Marketplace tokens in repository files, Issue comments, Pull Requests, or chat messages.

Tidak ada workflow publication yang berjalan pada push biasa. Publication memerlukan owner approval, registry atau publisher identity yang authenticated, dan version/release review. Jangan pernah menaruh npm atau Marketplace token di repository file, Issue comment, Pull Request, atau chat.

## Governance / Governance

See the [Governance Hub](../GOVERNANCE.md), [CONTRIBUTING.md](../CONTRIBUTING.md), [SECURITY.md](../SECURITY.md), [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md), and [GitHub Governance](GITHUB_GOVERNANCE.md) for contribution requirements, private disclosure, CODEOWNERS, branch protection, and the private-to-public visibility policy.

Lihat [Governance Hub](../GOVERNANCE.md), [CONTRIBUTING.md](../CONTRIBUTING.md), [SECURITY.md](../SECURITY.md), [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md), dan [GitHub Governance](GITHUB_GOVERNANCE.md) untuk persyaratan kontribusi, private disclosure, CODEOWNERS, branch protection, serta kebijakan visibility private-to-public.
