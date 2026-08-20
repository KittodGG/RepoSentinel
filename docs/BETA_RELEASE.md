# RepoSentinel — Beta Production Release

## Release candidate

**Version:** `0.1.0-beta.1`  
**Release channel:** beta  
**Runtime:** Node.js 24 LTS  
**Supported UI locales:** `en`, `id`  
**Machine report schema:** `reposentinel.report/v1`

## Release gates

| Gate | Verification | Status |
|---|---|---|
| Repository source of truth | README, roadmap, tech-stack decision, CLI UX specification, security policy, and beta pilot docs are present. | Ready |
| Core correctness | Core, discovery, config, localization, rules, and reporter tests pass. | Ready |
| CLI behavior | `check`, `report`, `lang`, `init`, `rules`, and `explain` are available with localized output. | Ready |
| Security boundary | Network remains disabled by default; target scripts are not executed; symlinks are not followed; evidence is redacted. | Ready |
| Self-scan | Dogfood score is 100/100 with zero critical, error, warning, or info findings under project config. | Ready |
| Hardening | Invalid locale, missing path, unknown rule, JSON schema, and redaction checks pass. | Ready |
| Package | `reposentinel-0.1.0-beta.1.tgz` is staged without unpublished internal runtime dependencies and passes clean-install smoke testing. | Ready |
| CI | Quality workflow and composite action YAML validate; local equivalent passes. | Ready |
| Pilot readiness | Closed-beta cohort, severity classification, feedback template, and stop conditions are documented. | Ready |

## Release procedure

First run the full release gate on Node.js 24 with `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm dogfood`, and `node scripts/hardening-checks.mjs`. Then run `pnpm pack:beta`, inspect the tarball manifest, install it into an empty staging directory with production dependencies only, and run `reposentinel --version`, `reposentinel rules`, and a JSON self-scan.

Create the Git tag `v0.1.0-beta.1` only after the clean staging smoke test passes. Publish the GitHub release notes from `CHANGELOG.md`. npm publication is intentionally a separate owner-approved action; the artifact can be evaluated privately before registry publication.

## Rollback

If a P0/P1 issue appears, mark the beta release as withdrawn, stop the pilot, and publish a correction note. Revert the release tag or publish a higher patch beta version; do not rewrite published package history. Preserve the failing fixture and redacted report so the regression becomes a permanent test.

## Post-release evaluation

During the first pilot window, review false-positive rate, missed high-severity findings, average scan duration, report readability, translation completeness, exit-code correctness, and package installation success. A beta production follow-up should address P0/P1 issues immediately, consolidate P2 findings into the next milestone, and record P3 polish requests without weakening the safety boundary.
