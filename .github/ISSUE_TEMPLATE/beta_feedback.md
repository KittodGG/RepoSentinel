---
name: Closed beta feedback
about: Report RepoSentinel beta behavior without sharing secrets or proprietary source
labels: beta-feedback
---

## Repository shape

Describe the repository type and selected profile (`public`, `portfolio`, or `npm-package`). Do not include private repository names, source code, credentials, or private URLs.

## Command matrix

List the commands and locale used, for example:

```bash
reposentinel check . --profile public --lang en --format json
reposentinel check . --profile public --lang id --format markdown
```

## Expected behavior

Describe what RepoSentinel should have reported.

## Actual behavior

Describe what it reported, including rule IDs, severity counts, exit code, runtime, and report format. Paste only redacted output.

## Classification

- [ ] P0 — security or destructive behavior
- [ ] P1 — incorrect critical/error, schema, or exit code
- [ ] P2 — warning/info quality, remediation, or performance
- [ ] P3 — wording, translation, or visual polish

## Reproduction

Provide safe synthetic steps or a fixture description. Do not attach `.env`, private keys, access tokens, proprietary source, or unredacted logs.
