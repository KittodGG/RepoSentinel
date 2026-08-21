# RepoSentinel CLI

## English

RepoSentinel is a local-first, multilingual repository-readiness scanner. It checks documentation, links, security hygiene, package metadata, Git hygiene, community readiness, CI hints, and portfolio discoverability without executing code from the target repository.

### Install

```bash
npm install --global reposentinel
```

### Use

```bash
reposentinel check . --lang en
reposentinel check . --lang id --profile portfolio
reposentinel report . --format markdown --output report.md
reposentinel rules --category security
reposentinel explain security.private-key
```

The scanner is a readiness assistant, not a SAST replacement, dependency vulnerability scanner, secret-management platform, or formal security audit. Local scans keep network access disabled by default and redact sensitive evidence.

For governance, contribution, security reporting, and release status, see the [root repository README](../../README.md) and [Governance Hub](../../GOVERNANCE.md).

## Bahasa Indonesia

RepoSentinel adalah repository-readiness scanner yang bersifat local-first dan multilingual. Scanner memeriksa dokumentasi, link, security hygiene, package metadata, Git hygiene, community readiness, CI hints, dan portfolio discoverability tanpa menjalankan code dari target repository.

### Instalasi

```bash
npm install --global reposentinel
```

### Penggunaan

```bash
reposentinel check . --lang en
reposentinel check . --lang id --profile portfolio
reposentinel report . --format markdown --output report.md
reposentinel rules --category security
reposentinel explain security.private-key
```

Scanner adalah readiness assistant, bukan pengganti SAST, dependency vulnerability scanner, secret-management platform, atau formal security audit. Local scan tetap menggunakan network disabled by default dan melakukan redaction terhadap evidence sensitif.

Untuk governance, kontribusi, pelaporan security, dan status release, lihat [root repository README](../../README.md) dan [Governance Hub](../../GOVERNANCE.md).
