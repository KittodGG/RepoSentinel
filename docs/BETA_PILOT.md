# RepoSentinel — Dogfooding and Closed Beta Pilot

**Current stage:** phase 11 of 12  
**Purpose:** validate RepoSentinel against itself and a small set of real repositories before beta production.

## Dogfooding target

The first dogfooding target is the RepoSentinel repository itself. The scan must run in local mode with network disabled, English or Indonesian locale, the `public` profile, and the `error` CI threshold. The result is stored outside Git history under `.reposentinel/reports/` when a local report is needed.

A green dogfood result means that typecheck, test, build, JSON schema validation, rule-pack count, alpha packaging, and a self-scan all pass. It does not mean that every repository is ready or secure.

## Closed-beta cohort

The initial pilot should contain a deliberately varied cohort rather than only polished repositories:

| Cohort | Repository shape | What it validates |
|---|---|---|
| A | Public TypeScript library | Package metadata, lockfile, license, README, and CI rules. |
| B | Portfolio web project | Demo visibility, images, links, screenshots, and bilingual README. |
| C | Small Python or Go utility | Language-neutral discovery, docs, Git hygiene, and profile defaults. |
| D | Intentionally incomplete repository | Finding quality, remediation clarity, warning grouping, and score behavior. |
| E | Repository with sensitive-looking fixtures | False-positive control, redaction, and safe handling of test examples. |

No participant should submit secrets, private keys, proprietary source, or credentials as beta feedback. The tool should be evaluated on local clones or synthetic fixtures.

## Pilot protocol

Each pilot repository is scanned with the same command matrix:

```bash
reposentinel check . --profile public --lang en --format json
reposentinel check . --profile public --lang id --format markdown --output report-id.md
reposentinel rules
reposentinel explain documentation.quickstart
```

The evaluator records runtime, file count, finding count by severity, false positives, missed findings, remediation clarity, and whether the exit code matches the configured threshold. The evaluator also verifies that no network call is made and that no secret value appears in terminal, Markdown, or JSON output.

## Feedback classification

| Class | Meaning | Beta response |
|---|---|---|
| P0 | Secret disclosure, arbitrary code execution, path escape, or destructive behavior | Stop pilot; patch before any further scans. |
| P1 | Incorrect critical/error finding, broken report schema, or exit-code regression | Patch before expanding the cohort. |
| P2 | Incorrect warning/info, confusing remediation, or performance regression | Schedule for beta release or document a known limitation. |
| P3 | Wording, visual polish, translation gap, or enhancement | Collect for post-beta prioritization. |

## Beta exit gate

Beta production may begin only when all P0/P1 issues are closed or explicitly accepted by the project owner, the self-scan is green, the alpha package smoke test passes from a clean staging directory, CI passes on Node.js 24, the action YAML is valid, and the report schema has a documented compatibility policy.

The final beta release must include a changelog, known limitations, supported Node.js range, profile behavior, locale behavior, security boundary, rollback procedure, and an explicit statement that RepoSentinel is not a security audit.
