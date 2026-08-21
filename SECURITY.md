# RepoSentinel Security Policy

## Scope

RepoSentinel is a local-first repository readiness tool. During a default local scan, source files are read as data; package scripts, build hooks, arbitrary executables, and network calls are not executed. Findings must redact credentials and private-key material. RepoSentinel is not a SAST replacement, dependency vulnerability scanner, secret-management platform, or formal security audit.

## Reporting a vulnerability

**Do not open a public Issue or Pull Request for an unpatched security vulnerability.** Use [GitHub Private Vulnerability Reporting/Security Advisories](https://github.com/KittodGG/RepoSentinel/security/advisories/new) when available. If that private channel is unavailable, contact the repository maintainer through a private method listed in the repository settings.

Include only the minimum safe information needed to triage the issue: affected version or commit, impact, reproducible steps using synthetic data, attack preconditions, and a suggested mitigation. Do not attach real credentials, private keys, `.env` contents, proprietary source code, private URLs, or unredacted logs. Replace sensitive values with placeholders and explain what was redacted.

Please do not publicly disclose the vulnerability before a fix or coordinated disclosure decision is available. Maintainers may ask for additional details through the private channel and will determine the appropriate remediation and disclosure timing based on impact and affected users.

## Supported release and response boundary

The beta candidate may contain defects and is not a security certification. A report about a third-party dependency should identify the dependency and version and may be redirected to its upstream security process. General bugs, feature requests, and UX feedback should use the public Issue templates instead.

## Hardening requirements

The project must keep network disabled by default, preserve symlink boundaries, bound file reads, keep machine-readable schemas deterministic, redact evidence, validate configuration strictly, reject unsafe output paths, and avoid running target repository code. Any change that weakens one of these boundaries requires explicit security review and regression tests.

## Limitations

A successful readiness score must never be interpreted as proof that a repository is secure or free from vulnerabilities. RepoSentinel does not replace professional security review, SAST, dependency scanning, incident response, or credential rotation.
