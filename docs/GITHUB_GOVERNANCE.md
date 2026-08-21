# GitHub Governance Policy / Kebijakan Governance GitHub

## English

### Repository visibility and release policy

RepoSentinel is public after the maintainer explicitly approved the visibility transition following review of the final readiness report, security policy, license, contribution paths, and release artifacts. Future visibility changes must not be performed as part of an automated release.

After the repository becomes public, the project must continue to preserve the same local-first and security boundaries. Making the repository public does not mean that source code, reports, or user data are uploaded by the scanner during local execution.

### CODEOWNERS

RepoSentinel uses `.github/CODEOWNERS` with `@KittodGG` as the primary maintainer for the repository and high-risk areas. The file explicitly covers `core`, `rules`, `cli`, `reporters`, `dashboard`, `vscode`, `.github`, `SECURITY.md`, and `LICENSE` so reviewers can see which changes require maintainer attention.

Adding another reviewer or maintainer requires an owner decision. The person must have the appropriate repository access and agree to the [Code of Conduct](../CODE_OF_CONDUCT.md) and [Contributing Guide](../CONTRIBUTING.md). Do not add an account to CODEOWNERS based only on an email address or display name.

### Recommended branch protection for `main`

When the repository plan permits branch protection, configure `main` with the following settings:

| Setting | Recommended value | Reason |
|---|---|---|
| Pull Request before merge | Required | Prevents direct unreviewed changes to `main`. |
| Required approving reviews | 1 | Uses the primary maintainer/CODEOWNERS review path. |
| Dismiss stale approvals | Enabled | Requires review after new commits change the reviewed diff. |
| Require review from Code Owners | Enabled | Makes CODEOWNERS operational for protected areas. |
| Required status check | `Typecheck, test, build, and smoke scan` | Requires the verified Quality workflow before merge. |
| Require conversation resolution | Enabled | Keeps review discussions resolved before merge. |
| Require branches up to date | Enabled when practical | Reduces merge-time surprises. |
| Force pushes and branch deletion | Disabled | Preserves auditability and the default branch. |
| Include administrators | Maintainer decision | Enable after recovery and emergency-change procedures are confirmed. |

### Current limitation

GitHub returned HTTP 403 for branch-protection operations because the repository is private on a plan that does not enable this feature. GitHub reported that the repository must use GitHub Pro or be public to enable branch protection.

This is a GitHub account/plan limitation, not a RepoSentinel code or CI failure. Until the feature is available, the project relies on the Pull Request template, CODEOWNERS review requests, the successful Quality workflow, the release gate, and maintainer discipline.

### Public-visibility maintenance checklist

After the visibility change, the maintainer must continue to review that no secret, private key, proprietary source, private URL, personal data, local path, temporary artifact, or unredacted report is added to Git history or the current tree. The maintainer should also periodically review GitHub Actions secrets, issue templates, Discussions, releases, package metadata, README links, license files, and security reporting links.

The completed visibility change was followed by external-view verification: the public repository, README, governance links, issue templates, stable package, and release links were checked for the intended stable version.

### Emergency changes

If an urgent security fix requires bypassing ordinary review, the maintainer must document why the bypass was necessary, run the full validation gate, preserve a reviewable commit, and open a follow-up issue or release note explaining the change. Security disclosures must continue to use [SECURITY.md](../SECURITY.md), not a public Issue.

## Bahasa Indonesia

### Kebijakan visibility dan release

RepoSentinel sudah public setelah maintainer memberikan persetujuan eksplisit untuk transisi visibility setelah meninjau final readiness report, security policy, license, jalur kontribusi, dan release artifact. Perubahan visibility berikutnya tidak boleh dilakukan sebagai bagian dari automated release.

Setelah repository menjadi public, project tetap wajib mempertahankan boundary local-first dan keamanan yang sama. Repository public tidak berarti scanner meng-upload source code, report, atau data pengguna saat local execution.

### CODEOWNERS

RepoSentinel menggunakan `.github/CODEOWNERS` dengan `@KittodGG` sebagai primary maintainer untuk seluruh repository dan area berisiko tinggi. File tersebut secara eksplisit mencakup `core`, `rules`, `cli`, `reporters`, `dashboard`, `vscode`, `.github`, `SECURITY.md`, dan `LICENSE` agar reviewer dapat melihat perubahan yang membutuhkan perhatian maintainer.

Menambahkan reviewer atau maintainer lain memerlukan keputusan owner. Orang tersebut harus memiliki akses repository yang sesuai dan menyetujui [Code of Conduct](../CODE_OF_CONDUCT.md) serta [Contributing Guide](../CONTRIBUTING.md). Jangan menambahkan account ke CODEOWNERS hanya berdasarkan email atau display name.

### Recommended branch protection untuk `main`

Saat plan repository mengizinkan branch protection, gunakan pengaturan berikut pada `main`:

| Setting | Nilai yang direkomendasikan | Alasan |
|---|---|---|
| Pull Request sebelum merge | Required | Mencegah perubahan langsung tanpa review ke `main`. |
| Required approving reviews | 1 | Menggunakan jalur review primary maintainer/CODEOWNERS. |
| Dismiss stale approvals | Enabled | Meminta review ulang setelah commit baru mengubah diff. |
| Require review from Code Owners | Enabled | Membuat CODEOWNERS berlaku secara operasional. |
| Required status check | `Typecheck, test, build, and smoke scan` | Memastikan Quality workflow lulus sebelum merge. |
| Require conversation resolution | Enabled | Menjaga diskusi review terselesaikan sebelum merge. |
| Require branches up to date | Enabled jika praktis | Mengurangi kejutan saat merge. |
| Force push dan branch deletion | Disabled | Menjaga auditability dan default branch. |
| Include administrators | Keputusan maintainer | Aktifkan setelah recovery dan emergency procedure dikonfirmasi. |

### Limitasi saat ini

GitHub mengembalikan HTTP 403 untuk operasi branch protection karena repository private pada plan yang tidak menyediakan fitur tersebut. GitHub menyatakan repository harus menggunakan GitHub Pro atau menjadi public untuk mengaktifkan branch protection.

Ini adalah limitasi account/plan GitHub, bukan kegagalan code atau CI RepoSentinel. Sampai fitur tersedia, project mengandalkan Pull Request template, review request dari CODEOWNERS, Quality workflow yang lulus, release gate, dan disiplin maintainer.

### Checklist pemeliharaan setelah visibility public

Setelah perubahan visibility, maintainer harus terus memastikan tidak ada secret, private key, proprietary source, private URL, personal data, local path, temporary artifact, atau report yang belum disanitasi ditambahkan ke Git history maupun current tree. Maintainer juga perlu meninjau secara berkala GitHub Actions secrets, issue template, Discussions, releases, package metadata, link README, license file, dan security reporting link.

Perubahan visibility telah diikuti external-view verification: repository public, README, governance link, issue template, package stable, dan release link telah diperiksa dan menunjuk ke version stable yang benar.

### Emergency change

Jika security fix mendesak membutuhkan bypass terhadap review normal, maintainer wajib mendokumentasikan alasan bypass, menjalankan full validation gate, mempertahankan commit yang dapat direview, dan membuka follow-up issue atau release note yang menjelaskan perubahan. Security disclosure tetap harus menggunakan [SECURITY.md](../SECURITY.md), bukan Issue publik.
