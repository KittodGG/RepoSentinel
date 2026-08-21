# RepoSentinel Custom Rules / Custom Rule RepoSentinel

## English

Custom rules extend the built-in catalog without executing JavaScript from the target repository. The registry is declarative JSON and is loaded only from a path inside the repository. Unknown configured rule IDs are rejected at scan startup, and custom findings receive deterministic fingerprints for baseline suppression.

Create a file such as `.reposentinel/rules.json`:

```json
[
  {
    "id": "custom.security-policy",
    "severity": "error",
    "title": "Security policy has private disclosure guidance",
    "profiles": ["public", "private-team"],
    "path": "docs/SECURITY.md",
    "message": "The security policy must mention a private reporting path.",
    "remediation": "Document a private vulnerability-reporting channel.",
    "contentIncludes": "private",
    "match": "absent",
    "docsUrl": "https://github.com/KittodGG/RepoSentinel/blob/main/docs/SECURITY.md"
  },
  {
    "id": "custom.release-marker",
    "severity": "warning",
    "path": "CHANGELOG.md",
    "message": "The changelog still contains an unreleased marker.",
    "remediation": "Resolve or remove the marker before release.",
    "contentIncludes": "TODO",
    "match": "contains"
  }
]
```

The default `absent` mode reports a finding when the selected path exists but does not contain `contentIncludes`. The explicit `contains` mode reports a finding when the selected path does contain the configured text. Use `contains` only for intentional positive checks; leaving `match` out is safer for policy-presence checks.

Run the registry locally:

```bash
reposentinel check . --rules-file .reposentinel/rules.json --format terminal --no-color
reposentinel check . --rules-file .reposentinel/rules.json --format json --no-color
```

Custom rules are not a replacement for a built-in security rule. Do not place secret values in the registry, message, remediation, or test fixtures. Profile names must be one of `public`, `portfolio`, `npm-package`, `academic`, `private-team`, or `mobile-app`; duplicate IDs, unknown profiles, unsupported severities, invalid match modes, and `contains` without `contentIncludes` are rejected before scanning. Matching is literal and path patterns are repository-relative. A custom rule does not execute a command, fetch a URL, install a package, or inspect files outside the repository root.

## Bahasa Indonesia

Custom rule memperluas catalog bawaan tanpa menjalankan JavaScript dari target repository. Registry berbentuk declarative JSON dan hanya dimuat dari path yang berada di dalam repository. Unknown configured rule ID ditolak saat scan dimulai, dan custom finding memperoleh deterministic fingerprint untuk baseline suppression.

Buat file seperti `.reposentinel/rules.json` menggunakan contoh di atas. Mode default `absent` menghasilkan finding ketika path yang dipilih ada tetapi tidak mengandung `contentIncludes`. Mode eksplisit `contains` menghasilkan finding ketika path tersebut memang mengandung teks yang dikonfigurasi. Gunakan `contains` hanya untuk positive check yang disengaja; untuk policy-presence check, tidak mengisi `match` lebih aman.

Jalankan registry secara lokal:

```bash
reposentinel check . --rules-file .reposentinel/rules.json --format terminal --no-color
reposentinel check . --rules-file .reposentinel/rules.json --format json --no-color
```

Custom rule bukan pengganti security rule bawaan. Jangan menaruh nilai secret di registry, message, remediation, atau test fixture. Nama profile harus salah satu dari `public`, `portfolio`, `npm-package`, `academic`, `private-team`, atau `mobile-app`; duplicate ID, profile tidak dikenal, severity tidak didukung, mode match invalid, dan `contains` tanpa `contentIncludes` ditolak sebelum scan. Matching bersifat literal dan path pattern relatif terhadap repository. Custom rule tidak menjalankan command, melakukan fetch URL, meng-install package, atau memeriksa file di luar repository root.

## Schema contract

| Field | Required | Meaning |
|---|---:|---|
| `id` | Yes | Stable ID with the `custom.<name>` prefix. |
| `title` | No | Human-readable rule title; defaults to the rule ID. |
| `severity` | Yes | `critical`, `error`, `warning`, or `info`. |
| `profiles` | No | Any supported profile list; defaults to `public`, `portfolio`, and `npm-package`. |
| `path` | Yes | Repository-relative path glob. `*` matches within one path segment and `**` crosses directories. |
| `message` | Yes | Finding message without secret material. |
| `remediation` | Yes | Actionable correction guidance. |
| `docsUrl` | No | HTTPS or repository-local documentation link shown in machine-readable findings. |
| `contentIncludes` | For content checks | Literal text to test. |
| `match` | No | `absent` by default; `contains` for explicit positive matching. |
