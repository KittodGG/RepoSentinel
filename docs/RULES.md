# RepoSentinel Rules

This document is the stable reference for the built-in RepoSentinel rule catalog. Rule IDs are machine-stable across locales and report formats. A finding is a repository-readiness signal, not proof of a vulnerability or a security certification.

## Documentation

<a id="documentation.readme-exists"></a>
### `documentation.readme-exists`

- **Severity:** warning
- **Detects:** Missing root `README.md`.
- **Why it matters:** Readers and contributors need a clear entry point.
- **Remediation:** Add a README with project context and a runnable Quick Start.

<a id="documentation.quickstart"></a>
### `documentation.quickstart`

- **Severity:** warning
- **Detects:** A README without a recognizable setup heading and copy-paste command.
- **Why it matters:** A project should be runnable without maintainer guidance.
- **Remediation:** Document prerequisites, installation, and one run command.

<a id="documentation.description"></a>
### `documentation.description`

- **Severity:** info
- **Detects:** No meaningful project description near the top of the README.
- **Why it matters:** Visitors need to understand the project before reading implementation details.
- **Remediation:** State the problem, capability, and intended user in one or two sentences.

## Git hygiene

<a id="gitignore.exists"></a>
### `gitignore.exists`

- **Severity:** info
- **Detects:** Missing root `.gitignore`.
- **Why it matters:** Local configuration and generated files are easier to keep out of Git.
- **Remediation:** Add conservative patterns for dependencies, generated output, reports, and local secrets.

<a id="git.large-file"></a>
### `git.large-file`

- **Severity:** warning
- **Detects:** A tracked file larger than 5 MiB.
- **Why it matters:** Large tracked artifacts slow clones and often belong in Git LFS or release storage.
- **Remediation:** Move the artifact to Git LFS/release storage or document why it is intentionally tracked.

<a id="git.generated-tracked"></a>
### `git.generated-tracked`

- **Severity:** warning
- **Detects:** Tracked files in generated-looking paths such as `dist/`, `build/`, `coverage/`, or source maps.
- **Why it matters:** Accidental generated output creates noisy diffs and release drift.
- **Remediation:** Confirm intentional versioning or ignore and untrack the generated output.

<a id="branch.default"></a>
### `branch.default`

- **Severity:** info
- **Detects:** A detached Git HEAD where local default-branch context cannot be inferred.
- **Why it matters:** Changed-files and contribution workflows are easier to understand with branch context.
- **Remediation:** Check out the intended branch or provide branch context explicitly in CI.

## Security hygiene

<a id="security.env-file"></a>
### `security.env-file`

- **Severity:** error when tracked, warning when untracked
- **Detects:** Sensitive environment filenames such as `.env` and `.env.local`, excluding example/sample/template names.
- **Why it matters:** Environment files commonly contain credentials and should not be committed.
- **Remediation:** Remove tracked files, rotate exposed credentials, and keep local files ignored. Gitignored files are still surfaced to this security rule.

<a id="security.private-key"></a>
### `security.private-key`

- **Severity:** critical
- **Detects:** PEM/OpenSSH-style private-key blocks, including realistic multiline key bodies.
- **Why it matters:** Private keys can enable unauthorized access and must not be stored in a repository.
- **Remediation:** Remove the key from the working tree and Git history, rotate related credentials, and verify the ignore policy.

<a id="security.credential-pattern"></a>
### `security.credential-pattern`

- **Severity:** error
- **Detects:** High-confidence token prefixes for GitHub (`ghp_`, `github_pat_`), Slack (`xoxb-`, `xoxp-`), AWS (`AKIA`, `ASIA`), Stripe (`sk_live_`, `rk_live_`), Google API (`AIza`), OpenAI (`sk-proj-`, `sk-`), npm (`npm_`), and JWT-like three-segment values beginning with `eyJ`. Short lookalikes below the minimum body length are ignored.
- **Why it matters:** Recognized credentials should be revoked and rotated immediately.
- **Remediation:** Revoke and rotate the credential, remove it from the repository, and review Git history. This detector is intentionally not a complete secret scanner; it does not replace dedicated secret-management or enterprise scanning tools.

## Package hygiene

<a id="package.lockfile-single"></a>
### `package.lockfile-single`

- **Severity:** warning
- **Detects:** More than one package-manager lockfile.
- **Why it matters:** Conflicting lockfiles create ambiguous installation behavior.
- **Remediation:** Keep the lockfile used by the selected package manager and remove stale alternatives.

<a id="package.manifest-name"></a>
### `package.manifest-name`

- **Severity:** warning
- **Detects:** A missing, malformed, or invalid npm package name under the `npm-package` profile.
- **Why it matters:** Registry publication depends on valid package metadata.
- **Remediation:** Fix `package.json` and verify the intended package scope.

## Community readiness

<a id="community.license-present"></a>
### `community.license-present`

- **Severity:** warning
- **Detects:** No recognizable root license file.
- **Why it matters:** Contributors need to understand how the work may be used.
- **Remediation:** Choose an appropriate license and add it after maintainer review.

<a id="community.contributing-guide"></a>
### `community.contributing-guide`

- **Severity:** info
- **Detects:** Missing contributor guide.
- **Why it matters:** Setup and review expectations reduce contribution friction.
- **Remediation:** Add `CONTRIBUTING.md` or an equivalent documented guide.

<a id="community.code-of-conduct"></a>
### `community.code-of-conduct`

- **Severity:** info
- **Detects:** Missing code-of-conduct document.
- **Why it matters:** Community expectations and reporting paths should be explicit.
- **Remediation:** Add a Code of Conduct with a private reporting path.

<a id="community.issue-template"></a>
### `community.issue-template`

- **Severity:** info
- **Detects:** Missing public issue template.
- **Why it matters:** Structured reports improve triage quality.
- **Remediation:** Add issue templates when accepting public bug reports or feature requests.

## Links and assets

<a id="links.valid"></a>
### `links.valid`

- **Severity:** warning
- **Detects:** Invalid absolute URLs or missing repository-relative Markdown targets.
- **Why it matters:** Broken links undermine documentation trust.
- **Remediation:** Create the referenced target or update the link.

<a id="images.resolve"></a>
### `images.resolve`

- **Severity:** warning
- **Detects:** Missing local Markdown image assets.
- **Why it matters:** Screenshots and diagrams should render for readers.
- **Remediation:** Add the asset or update the image reference.

<a id="badges.resolve"></a>
### `badges.resolve`

- **Severity:** info, escalated to warning for a relative badge URL
- **Detects:** Badge-like images that do not use absolute HTTP(S) URLs.
- **Why it matters:** Relative badges frequently break when README content is reused.
- **Remediation:** Use a valid absolute badge endpoint or remove the badge.

## Portfolio

<a id="portfolio.demo-visible"></a>
### `portfolio.demo-visible`

- **Severity:** warning
- **Detects:** No visible Demo, Preview, live URL, or demo-like path under the `portfolio` profile.
- **Why it matters:** A portfolio project should make its outcome easy to inspect.
- **Remediation:** Add a Demo or Preview section near the top of the README.

## CI

<a id="ci.workflow-permissions"></a>
### `ci.workflow-permissions`

- **Severity:** warning
- **Detects:** GitHub workflow files without an explicit `permissions` block.
- **Why it matters:** Explicit least privilege limits CI token exposure.
- **Remediation:** Add a minimal workflow- or job-level permissions block.

## Network opt-in

<a id="links.network-reachable"></a>
### `links.network-reachable`

- **Severity:** warning for failed/error responses; info when skipped by SSRF policy
- **Detects:** Bounded HTTP(S) checks only when `--network` is explicitly enabled.
- **Why it matters:** Broken external links can be diagnosed, but network access expands the trust boundary.
- **Remediation:** Update/remove broken links or keep network checks disabled for offline-only scans. Loopback, private, link-local, metadata, multicast, documentation, and IPv4-mapped internal addresses are skipped and never fetched.

## Custom rules

Custom rules use IDs such as `custom.policy`, are loaded from a repository-local JSON registry, and may use `match: "contains"` for explicit positive matching. Custom findings receive deterministic fingerprints so they can participate in a baseline.

## Detection limits

RepoSentinel is not a full secret scanner, SAST engine, dependency vulnerability scanner, or formal security audit. The built-in credential detector covers only the documented high-confidence prefixes, and a clean result does not prove that a repository contains no secrets or vulnerabilities. Use dedicated security tooling and review procedures for those guarantees.

## Language and report stability

Human-readable titles and messages may be localized. Rule IDs, severity names, fingerprints, configuration keys, and report schemas remain stable across `en` and `id` output.
