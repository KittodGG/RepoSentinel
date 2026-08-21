## Context

## Problem

## Proposed solution

## Acceptance criteria

## Scope and compatibility

- [ ] This Pull Request solves one focused problem.
- [ ] Public CLI commands, rule IDs, configuration keys, exit codes, fingerprints, or report schemas are unchanged, or the compatibility impact is explained here.
- [ ] The change does not silently enable network access or execute code from a target repository.

## Testing

- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] Relevant fixture/integration tests
- [ ] `pnpm dogfood` or equivalent self-scan when applicable
- [ ] `node scripts/hardening-checks.mjs` when security boundaries are affected
- [ ] `pnpm pack:beta && node scripts/release-gate.mjs` when packaging is affected
- [ ] Snapshot tests updated intentionally, if output changed

## Terminal and report evidence

Complete when relevant:

- [ ] Colored TTY output reviewed
- [ ] `--no-color` or plain output reviewed
- [ ] CI/piped output reviewed
- [ ] JSON/SARIF/Markdown/HTML output reviewed
- [ ] Screenshot or normalized transcript attached for terminal UX changes
- [ ] Escaping, deterministic ordering, and output path safety reviewed

## Security and privacy impact

Explain changes to secrets, redaction, file boundaries, symlinks, network, subprocesses, permissions, or target-repository execution. Confirm that no secret, private key, `.env` content, proprietary source, or unredacted personal path is included in this Pull Request.

## Risks and rollback

## Documentation and release notes

- [ ] README/docs updated
- [ ] Status labels are accurate: `implemented`, `verified`, `planned`, `proposed`, or `backlog`
- [ ] Changelog/release notes updated when user-visible behavior changes
- [ ] English and Bahasa Indonesia documentation remain consistent when applicable

## Rule-specific checklist

Complete when adding or changing a rule:

- [ ] Stable rule ID, category, default severity, evidence, and remediation are defined
- [ ] Positive and negative fixtures are included
- [ ] False-positive behavior is explained
- [ ] Rule configuration and profile behavior are tested
- [ ] Autofix is not added unless it is explicitly allowlisted and safe

## Contributor declaration

- [ ] I created this contribution or have permission to submit it under the repository license.
- [ ] I did not knowingly include incompatible third-party code or undisclosed license obligations.
- [ ] I followed the [Code of Conduct](https://github.com/KittodGG/RepoSentinel/blob/main/CODE_OF_CONDUCT.md).
- [ ] I understand that maintainers may request changes, split the Pull Request, or decline work outside the documented project scope.
