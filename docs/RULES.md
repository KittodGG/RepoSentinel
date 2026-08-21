# RepoSentinel Rules

This document is the stable reference for the built-in RepoSentinel rule catalog. Rule IDs are machine-stable across locales and report formats. A finding is a repository-readiness signal, not proof of a vulnerability or a security certification.

## Documentation

<a id="documentation.readme-exists"></a>
### `documentation.readme-exists`

- **Severity:** warning
- **Detects:** Missing root `README.md`.
- **Does not detect:** Whether an existing README is accurate, complete, or maintained.
- **Why it matters:** Readers and contributors need a clear entry point.
- **Remediation:** Add a README with project context and a runnable Quick Start.

<a id="documentation.quickstart"></a>
### `documentation.quickstart`

- **Severity:** warning
- **Detects:** A README without a recognizable setup heading and copy-paste command.
- **Does not detect:** Whether the documented command actually succeeds or whether prerequisites are correct.
- **Why it matters:** A project should be runnable without maintainer guidance.
- **Remediation:** Document prerequisites, installation, and one run command.

<a id="documentation.description"></a>
### `documentation.description`

- **Severity:** info
- **Detects:** No meaningful project description near the top of the README.
- **Does not detect:** Product-market fit, technical quality, or whether the description matches the implementation.
- **Why it matters:** Visitors need to understand the project before reading implementation details.
- **Remediation:** State the problem, capability, and intended user in one or two sentences.

## Git hygiene

<a id="gitignore.exists"></a>
### `gitignore.exists`

- **Severity:** info
- **Detects:** Missing root `.gitignore`.
- **Does not detect:** Whether ignore patterns cover every generated file or secret used by a specific toolchain.
- **Why it matters:** Local configuration and generated files are easier to keep out of Git.
- **Remediation:** Add conservative patterns for dependencies, generated output, reports, and local secrets.

<a id="git.large-file"></a>
### `git.large-file`

- **Severity:** warning
- **Detects:** A tracked file larger than 5 MiB.
- **Does not detect:** Repository history size, Git LFS configuration quality, or whether the file is intentionally versioned.
- **Why it matters:** Large tracked artifacts slow clones and often belong in Git LFS or release storage.
- **Remediation:** Move the artifact to Git LFS/release storage or document why it is intentionally tracked.

<a id="git.generated-tracked"></a>
### `git.generated-tracked`

- **Severity:** warning
- **Detects:** Tracked files in generated-looking paths such as `dist/`, `build/`, `coverage/`, or source maps.
- **Does not detect:** Generated artifacts stored under custom names or whether a tracked artifact is intentionally released.
- **Why it matters:** Accidental generated output creates noisy diffs and release drift.
- **Remediation:** Confirm intentional versioning or ignore and untrack the generated output.

<a id="branch.default"></a>
### `branch.default`

- **Severity:** info
- **Detects:** A detached Git HEAD where local default-branch context cannot be inferred.
- **Does not detect:** Whether the current branch is protected, up to date, or suitable for release.
- **Why it matters:** Changed-files and contribution workflows are easier to understand with branch context.
- **Remediation:** Check out the intended branch or provide branch context explicitly in CI.

## Security hygiene

<a id="security.env-file"></a>
### `security.env-file`

- **Severity:** error when tracked, warning when untracked
- **Detects:** Sensitive environment filenames such as `.env` and `.env.local`, excluding example/sample/template names.
- **Does not detect:** Secrets stored under unrelated filenames or credentials embedded in binary files.
- **Why it matters:** Environment files commonly contain credentials and should not be committed.
- **Remediation:** Remove tracked files, rotate exposed credentials, and keep local files ignored. Gitignored files are still surfaced to this security rule.

<a id="security.private-key"></a>
### `security.private-key`

- **Severity:** critical
- **Detects:** PEM/OpenSSH-style private-key blocks and armored `-----BEGIN PGP PRIVATE KEY BLOCK-----` material, including realistic multiline key bodies.
- **Does not detect:** Encrypted key validity, keys in unsupported encodings, or whether a detected key has already been revoked.
- **Why it matters:** Private keys can enable unauthorized access and must not be stored in a repository.
- **Remediation:** Remove the key from the working tree and Git history, rotate related credentials, and verify the ignore policy.

<a id="security.credential-pattern"></a>
### `security.credential-pattern`

- **Severity:** error
- **Detects:** High-confidence token prefixes for GitHub (`ghp_`, `github_pat_`), Slack (`xoxb-`, `xoxp-`), AWS (`AKIA`, `ASIA`), Stripe (`sk_live_`, `rk_live_`), Google API (`AIza`), OpenAI (`sk-proj-`, `sk-`), npm (`npm_`), and JWT-like three-segment values beginning with `eyJ`. It also detects Slack webhook URLs and common PostgreSQL, MongoDB, MySQL, MariaDB, and Redis connection-string schemes. Short lookalikes below the minimum body length are ignored and evidence is redacted.
- **Does not detect:** Every provider, arbitrary high-entropy secret, binary-encoded secret, or credential whose format does not match the documented patterns.
- **Why it matters:** Recognized credentials should be revoked and rotated immediately.
- **Remediation:** Revoke and rotate the credential, remove it from the repository, and review Git history. This detector is intentionally not a complete secret scanner; it does not replace dedicated secret-management or enterprise scanning tools and does not cover every provider, webhook, connection-string variant, or high-entropy value.

## Package hygiene

<a id="package.manifest-exports"></a>
### `package.manifest-exports`

- **Severity:** warning
- **Detects:** A publishable `package.json` without an `exports` map or executable `main`/`bin` entrypoint.
- **Does not detect:** Whether an existing entrypoint is executable, compatible, documented, or correctly typed.
- **Why it matters:** Consumers and registries need a stable entrypoint instead of relying on implicit source layout.
- **Remediation:** Add an explicit exports map or documented `main`/`bin` entrypoint.

<a id="package.manifest-files"></a>
### `package.manifest-files`

- **Severity:** warning
- **Detects:** A publishable package whose public `exports`, `main`, or `bin` entrypoint references `dist` while the `files` allowlist does not include `dist`.
- **Does not detect:** The final packed tarball contents or entrypoints that are generated dynamically by a build or publish hook.
- **Why it matters:** Explicit artifact boundaries reduce accidental source, test, and local-file publication without imposing a dist layout on direct-publish libraries.
- **Remediation:** Include `dist` in the package files allowlist, or change the public entrypoint to the actual published build output, then review the packed artifact.

<a id="package.manifest-engines"></a>
### `package.manifest-engines`

- **Severity:** warning
- **Detects:** A publishable workspace package whose `engines.node` range differs from the workspace root.
- **Does not detect:** Runtime compatibility beyond the declared Node.js range or engines for non-Node runtimes.
- **Why it matters:** Consistent runtime requirements prevent platform-specific installation and execution surprises.
- **Remediation:** Align `engines.node` with the workspace root or document the intentional exception.

<a id="package.lockfile-sync"></a>
### `package.lockfile-sync`

- **Severity:** warning
- **Detects:** An application or workspace with a declared package manager but no matching lockfile, or a pnpm workspace package missing from lockfile importers. Intentional lockfile-free direct-publish libraries are not flagged solely for lacking a lockfile.
- **Does not detect:** Dependency version vulnerabilities, registry availability, or lockfile correctness beyond the checked manifest/importer relationship.
- **Why it matters:** Frozen CI installs depend on manifests and lockfile importers describing the same workspace.
- **Remediation:** Regenerate the lockfile with the declared package manager and commit it with the manifest changes when the package is an application or workspace.

<a id="package.lockfile-single"></a>
### `package.lockfile-single`

- **Severity:** warning
- **Detects:** More than one package-manager lockfile.
- **Does not detect:** Whether the selected lockfile is current, reproducible, or safe from vulnerable dependencies.
- **Why it matters:** Conflicting lockfiles create ambiguous installation behavior.
- **Remediation:** Keep the lockfile used by the selected package manager and remove stale alternatives.

<a id="package.manifest-name"></a>
### `package.manifest-name`

- **Severity:** warning
- **Detects:** A missing, malformed, or invalid npm package name under the `npm-package` profile.
- **Does not detect:** Name availability, ownership, registry policy, or package quality.
- **Why it matters:** Registry publication depends on valid package metadata.
- **Remediation:** Fix `package.json` and verify the intended package scope.

## Community readiness

<a id="community.license-present"></a>
### `community.license-present`

- **Severity:** warning
- **Detects:** No recognizable root license file.
- **Does not detect:** Whether the license text is legally correct, compatible with dependencies, or approved by all rights holders.
- **Why it matters:** Contributors need to understand how the work may be used.
- **Remediation:** Choose an appropriate license and add it after maintainer review.

<a id="community.contributing-guide"></a>
### `community.contributing-guide`

- **Severity:** info
- **Detects:** Missing contributor guide.
- **Does not detect:** Whether contribution instructions are accurate, welcoming, or enforced.
- **Why it matters:** Setup and review expectations reduce contribution friction.
- **Remediation:** Add `CONTRIBUTING.md` or an equivalent documented guide.

<a id="community.code-of-conduct"></a>
### `community.code-of-conduct`

- **Severity:** info
- **Detects:** Missing code-of-conduct document.
- **Does not detect:** Whether community behavior follows the policy or whether reports are handled effectively.
- **Why it matters:** Community expectations and reporting paths should be explicit.
- **Remediation:** Add a Code of Conduct with a private reporting path.

<a id="community.issue-template"></a>
### `community.issue-template`

- **Severity:** info
- **Detects:** Missing public issue template.
- **Does not detect:** Whether issue forms collect sufficient information or whether maintainers triage issues promptly.
- **Why it matters:** Structured reports improve triage quality.
- **Remediation:** Add issue templates when accepting public bug reports or feature requests.

## Links and assets

<a id="links.valid"></a>
### `links.valid`

- **Severity:** warning
- **Detects:** Invalid absolute URLs or missing repository-relative Markdown targets.
- **Does not detect:** Whether a reachable page contains the intended content unless network mode is explicitly enabled.
- **Why it matters:** Broken links undermine documentation trust.
- **Remediation:** Create the referenced target or update the link.

<a id="images.resolve"></a>
### `images.resolve`

- **Severity:** warning
- **Detects:** Missing local Markdown image assets.
- **Does not detect:** Whether an image is readable, relevant, accessible, or reachable when hosted remotely.
- **Why it matters:** Screenshots and diagrams should render for readers.
- **Remediation:** Add the asset or update the image reference.

<a id="badges.resolve"></a>
### `badges.resolve`

- **Severity:** info, escalated to warning for a relative badge URL
- **Detects:** Badge-like images that do not use absolute HTTP(S) URLs.
- **Does not detect:** Whether an absolute badge endpoint is available, accurate, or trustworthy.
- **Why it matters:** Relative badges frequently break when README content is reused.
- **Remediation:** Use a valid absolute badge endpoint or remove the badge.

## Portfolio

<a id="portfolio.demo-visible"></a>
### `portfolio.demo-visible`

- **Severity:** warning
- **Detects:** No visible Demo, Preview, live URL, or demo-like path under the `portfolio` profile.
- **Does not detect:** Whether the demo works, is accessible, or represents the current source revision.
- **Why it matters:** A portfolio project should make its outcome easy to inspect.
- **Remediation:** Add a Demo or Preview section near the top of the README.

## CI

<a id="ci.action-sha-pinned"></a>
### `ci.action-sha-pinned`

- **Severity:** warning
- **Detects:** Third-party GitHub Actions referenced by mutable tags or branches instead of full commit SHAs.
- **Does not detect:** Whether a pinned commit is trustworthy, whether first-party actions are secure, or whether action inputs are safe.
- **Why it matters:** Immutable references reduce supply-chain drift and make workflow changes auditable.
- **Remediation:** Pin each third-party action to a verified 40-character commit SHA and retain the release in a comment.

<a id="ci.pull-request-target-safety"></a>
### `ci.pull-request-target-safety`

- **Severity:** critical
- **Detects:** A `pull_request_target` workflow that checks out pull-request code in a privileged context. Trigger detection normalizes YAML mapping (`on:\n  pull_request_target:`), scalar (`on: pull_request_target`), and sequence (`on: [pull_request_target]`) forms.
- **Does not detect:** Other workflow privilege escalations, unsafe third-party actions, or secrets exposed through unrelated steps.
- **Why it matters:** Untrusted pull-request code must not run with the target repository's elevated token or secrets.
- **Remediation:** Use `pull_request`, or separate trusted metadata handling from untrusted code execution.

<a id="ci.workflow-permissions"></a>
### `ci.workflow-permissions`

- **Severity:** warning
- **Detects:** GitHub workflow files without an explicit `permissions` block.
- **Does not detect:** Permissions granted by organization policy, job-specific privilege drift, or unsafe use of an explicitly granted permission.
- **Why it matters:** Explicit least privilege limits CI token exposure.
- **Remediation:** Add a minimal workflow- or job-level permissions block.

## Network opt-in

<a id="links.network-reachable"></a>
### `links.network-reachable`

- **Severity:** warning for failed/error responses; info when skipped by SSRF policy
- **Detects:** Bounded HTTP(S) checks only when `--network` is explicitly enabled.
- **Does not detect:** Application-level correctness, authenticated content, or links that require interaction; blocked SSRF targets are intentionally not fetched.
- **Why it matters:** Broken external links can be diagnosed, but network access expands the trust boundary.
- **Remediation:** Update/remove broken links or keep network checks disabled for offline-only scans. Loopback, private, link-local, metadata, multicast, documentation, and IPv4-mapped internal addresses are skipped and never fetched.

## Custom rules

Custom rules use IDs such as `custom.policy`, are loaded from a repository-local JSON registry, and may use `match: "contains"` for explicit positive matching. Custom findings receive deterministic fingerprints so they can participate in a baseline.

- **Does not detect:** Semantic correctness of arbitrary custom expressions, policy completeness, or unsafe intent hidden behind a matching string.

## Detection limits

RepoSentinel is not a full secret scanner, SAST engine, dependency vulnerability scanner, or formal security audit. The built-in credential detector covers only the documented high-confidence token prefixes, provider schemes, webhook pattern, connection-string schemes, and PEM/PGP private-key signatures; a clean result does not prove that a repository contains no secrets or vulnerabilities. Use dedicated security tooling and review procedures for those guarantees.

## Language and report stability

The CLI interface labels and rule titles are localized for `en` and `id`. Finding `message`, `evidence`, and `remediation` prose currently remains English so existing machine and human workflows do not change unexpectedly; message-key localization is planned as a separate compatibility-preserving workstream. Rule IDs, severity names, fingerprints, configuration keys, and report schemas remain stable across both locales.
