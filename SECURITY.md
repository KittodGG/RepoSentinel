# RepoSentinel Security Policy

## Scope

RepoSentinel is a local-first repository readiness tool. During a default local scan, source files are read as data; package scripts, build hooks, and network calls are not executed. Findings must redact credentials and private-key material.

## Reporting a vulnerability

Please do not open a public issue for an unpatched security vulnerability. Use a private security advisory in GitHub or contact the repository maintainers through the private channel configured for the project. Include a minimal reproduction, affected commit or version, impact, and a safe remediation suggestion. Do not attach real credentials, private keys, or proprietary source code.

## Hardening requirements before beta production

The project must keep network disabled by default, preserve symlink boundaries, bound file reads, keep machine-readable schemas deterministic, redact evidence, validate configuration strictly, and avoid running target repository code. Any change that weakens one of these boundaries requires an explicit security review and regression tests.

## Limitations

RepoSentinel is not a complete SAST engine, dependency vulnerability scanner, secret-management platform, or formal security audit. A readiness score must never be interpreted as proof that a repository is secure.
