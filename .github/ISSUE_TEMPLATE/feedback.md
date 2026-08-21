---
name: Product feedback / Feedback produk
about: Report RepoSentinel behavior, usability, documentation, or release feedback without sharing sensitive data. Laporkan behavior, usability, dokumentasi, atau release feedback tanpa membagikan data sensitif.
title: "[Feedback] "
labels: feedback
assignees: ""
---

## English

### Repository shape and use case / Bentuk repository dan use case

Describe the repository type and selected profile (`public`, `portfolio`, `npm-package`, `academic`, `private-team`, or `mobile-app`). Do not include private repository names, source code, credentials, or private URLs. / Jelaskan tipe repository dan profile yang dipilih. Jangan menyertakan nama repository privat, source code, credential, atau private URL.

### Command matrix / Command yang digunakan

```bash
reposentinel check . --profile public --lang en --format json
reposentinel check . --profile public --lang id --format markdown
```

### Expected behavior / Perilaku yang diharapkan

### Actual behavior / Perilaku yang terjadi

Include rule IDs, severity counts, exit code, runtime, and report format where relevant. Paste only redacted output. / Sertakan rule ID, jumlah severity, exit code, runtime, dan report format jika relevan. Tempel hanya output yang sudah disanitasi.

```text

```

### Classification / Klasifikasi

- [ ] P0 — security, data exposure, destructive behavior / security, data exposure, perilaku destruktif
- [ ] P1 — incorrect critical/error, schema, or exit code / critical/error, schema, atau exit code yang salah
- [ ] P2 — warning/info quality, remediation, or performance / kualitas warning/info, remediation, atau performa
- [ ] P3 — wording, translation, accessibility, or visual polish / wording, terjemahan, aksesibilitas, atau visual polish

### Reproduction or suggestion / Reproduksi atau usulan

Provide safe synthetic steps, a fixture description, or a concrete improvement suggestion. Do not attach `.env`, private keys, access tokens, proprietary source, or unredacted logs. / Berikan langkah sintetis yang aman, deskripsi fixture, atau usulan perbaikan konkret. Jangan melampirkan `.env`, private key, access token, proprietary source, atau log yang belum disanitasi.

For an unpatched security vulnerability, stop and use [SECURITY.md](../../SECURITY.md) instead. / Untuk vulnerability yang belum ditambal, hentikan dan gunakan [SECURITY.md](../../SECURITY.md).
