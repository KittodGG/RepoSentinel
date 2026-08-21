# GitHub Governance Policy

## CODEOWNERS

RepoSentinel uses `.github/CODEOWNERS` with `@KittodGG` as the verified primary maintainer for the repository and high-risk areas. The file is intentionally explicit for `core`, `rules`, `cli`, `reporters`, `dashboard`, `vscode`, `.github`, `SECURITY.md`, and `LICENSE` so reviewers can see which changes require maintainer attention.

Adding another reviewer or maintainer requires an owner decision and should be done only after that person has the appropriate repository access and agrees to the Code of Conduct and contribution policy. Do not add a personal account to CODEOWNERS based only on an email address or display name.

## Recommended branch protection for `main`

When the repository plan permits branch protection, configure `main` with the following settings:

| Setting | Recommended value | Reason |
|---|---|---|
| Pull request before merge | Required | Prevents direct unreviewed changes to `main`. |
| Required approving reviews | 1 | Uses the primary maintainer/CODEOWNERS review path without requiring a second maintainer. |
| Dismiss stale approvals | Enabled | Requires review after new commits change the reviewed diff. |
| Require review from Code Owners | Enabled | Makes `.github/CODEOWNERS` operational for protected areas. |
| Required status check | `Typecheck, test, build, and smoke scan` | Requires the verified Quality workflow before merge. |
| Require conversation resolution | Enabled | Keeps review discussions resolved before merge. |
| Require branches up to date | Enabled when practical | Reduces merge-time surprises; can be relaxed for urgent maintenance. |
| Force pushes and branch deletion | Disabled | Preserves auditability and the default branch. |
| Include administrators | Maintainer decision | Enable after confirming recovery and emergency-change procedures. |

## Current limitation

At the time this policy was prepared, GitHub returned HTTP 403 for branch-protection operations because the repository is private on a plan that does not enable this feature. The GitHub API reported that the repository must use GitHub Pro or be public to enable branch protection.

This is a GitHub account/plan limitation, not a RepoSentinel code or CI failure. The maintainer can apply the table above after upgrading the repository plan or changing repository visibility. Until then, the project should rely on the Pull Request template, CODEOWNERS review requests, successful Quality workflow, and maintainer discipline.

## Emergency changes

If an urgent security fix requires bypassing ordinary review, the maintainer should document why the bypass was necessary, run the full validation gate, and open a follow-up issue or release note explaining the change. Security disclosures must continue to use [SECURITY.md](../SECURITY.md), not a public Issue.
