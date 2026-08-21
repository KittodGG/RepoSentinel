# Contributing to RepoSentinel

Thank you for helping improve RepoSentinel. Please open an issue or feature proposal before substantial changes so the problem, intended behavior, and acceptance criteria are visible to reviewers.

## Local setup

RepoSentinel targets Node.js 24 LTS and uses pnpm.

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

The scanner is local-first and must not execute code from a target repository. New rules should preserve deterministic output, network-off defaults, path-boundary safety, secret redaction, and stable machine-readable schemas.

## Pull requests

A pull request should explain the context, problem, proposed solution, acceptance criteria, testing performed, security/privacy impact, and known risks. Rule changes should include stable IDs, positive and negative fixtures, severity rationale, remediation text, and regression tests. Changes to terminal output should include a screenshot or normalized output evidence.

Please keep commits focused, avoid committing generated artifacts or secrets, and run the relevant checks before requesting review.
