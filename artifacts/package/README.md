# RepoSentinel CLI

RepoSentinel is a local-first, multilingual repository readiness scanner. It checks documentation, links, security hygiene, package metadata, Git hygiene, community readiness, CI hints, and portfolio discoverability without executing the target repository.

## Install

```bash
npm install --global reposentinel
```

## Use

```bash
reposentinel check . --lang en
reposentinel check . --lang id --profile portfolio
reposentinel report . --format markdown --output report.md
reposentinel rules --category security
reposentinel explain security.private-key
```

The alpha package is experimental. It is intended for local evaluation and fixture-driven feedback; it is not a security audit or a guarantee that a repository is safe.
