# RepoSentinel License Policy / Kebijakan Lisensi RepoSentinel

> **Important / Catatan penting:** This document is a repository decision record, not formal legal advice. / Dokumen ini adalah catatan keputusan repository, bukan nasihat hukum formal. Consult a qualified attorney before relying on or changing licensing policy, especially when employers, contributors, third-party code, or commercial distribution are involved. / Konsultasikan dengan qualified attorney sebelum mengandalkan atau mengubah kebijakan lisensi, terutama jika melibatkan employer, contributor, third-party code, atau distribusi komersial.

## Current status / Status saat ini

RepoSentinel currently uses the **MIT License**. The root `LICENSE`, `packages/cli/LICENSE`, and `packages/cli/package.json` state MIT consistently. This is a valid open-source licensing setup; an open-source project is not required to use Apache-2.0.

RepoSentinel saat ini menggunakan **MIT License**. `LICENSE` root, `packages/cli/LICENSE`, dan `packages/cli/package.json` menyatakan MIT secara konsisten. Ini adalah setup lisensi open source yang valid; project open source tidak diwajibkan menggunakan Apache-2.0.

MIT permits broad use, copying, modification, publication, distribution, sublicensing, and sale of the software, subject primarily to preserving copyright and license notices. It also includes a broad warranty disclaimer. [1]

MIT memberikan izin luas untuk menggunakan, menyalin, memodifikasi, menerbitkan, mendistribusikan, mensublisensikan, dan menjual software, dengan kewajiban utama mempertahankan copyright notice dan license notice. MIT juga memiliki warranty disclaimer yang luas. [1]

## MIT versus Apache-2.0

| Consideration / Pertimbangan | MIT | Apache-2.0 |
|---|---|---|
| Category / Kategori | Permissive open-source license | Permissive open-source license |
| Distribution obligations / Kewajiban distribusi | Generally preserve copyright and license notices. / Umumnya mempertahankan copyright dan license notice. | Preserve license and notices; `NOTICE` and attribution requirements may apply. / Mempertahankan license dan notice; `NOTICE` dan attribution dapat berlaku. |
| Patent language / Bahasa patent | No explicit patent grant like Apache-2.0. / Tidak memiliki patent grant eksplisit seperti Apache-2.0. | Provides a patent license and defensive patent-termination clause. / Menyediakan patent license dan defensive patent-termination clause. |
| Complexity / Kompleksitas | Short and simple. / Pendek dan sederhana. | Longer and more prescriptive. / Lebih panjang dan preskriptif. |
| Adoption / Adopsi | Very low friction for CLI and package consumers. / Friksi rendah untuk pengguna CLI dan package. | Broad adoption, but downstream organizations should review notice and patent terms. / Adopsi luas, tetapi organisasi downstream perlu meninjau notice dan ketentuan patent. |
| Best fit / Cocok untuk | Utilities, libraries, and CLI tools prioritizing simple adoption. / Utility, library, dan CLI yang memprioritaskan adopsi sederhana. | Projects wanting an explicit patent grant for corporate or ecosystem use. / Project yang menginginkan patent grant eksplisit untuk corporate atau ecosystem use. |

Apache Software Foundation explains Apache-2.0 licensing and the relevance of `LICENSE`, `NOTICE`, and source headers. GitHub explains that a detectable license helps users understand rights to use, modify, and distribute a repository. [2] [3]

Apache Software Foundation menjelaskan licensing Apache-2.0 dan relevansi `LICENSE`, `NOTICE`, serta source header. GitHub menjelaskan bahwa license yang dapat dideteksi membantu pengguna memahami hak untuk menggunakan, mengubah, dan mendistribusikan repository. [2] [3]

## Recommendation / Rekomendasi

There is no universal rule that an open-source project must use Apache-2.0. MIT remains appropriate for RepoSentinel when the priority is frictionless adoption, simple npm distribution, and a short license text.

Tidak ada aturan universal bahwa project open source harus menggunakan Apache-2.0. MIT tetap sesuai untuk RepoSentinel jika prioritasnya adalah adopsi tanpa friksi, distribusi npm yang sederhana, dan license text yang ringkas.

Apache-2.0 may be strategically stronger if the maintainer wants an explicit patent grant, anticipates substantial corporate adoption, or expects a contributor ecosystem where patent and notice terms matter. That is a strategic choice, not an open-source obligation.

Apache-2.0 dapat menjadi pilihan strategis yang lebih kuat jika maintainer menginginkan patent grant eksplisit, mengantisipasi adopsi corporate yang besar, atau membangun contributor ecosystem yang membutuhkan ketentuan patent dan notice yang lebih jelas. Itu adalah pilihan strategis, bukan kewajiban open source.

## Current decision / Keputusan saat ini

RepoSentinel remains MIT. We will not change the license automatically during the stable-release or private-to-public transition. A license change could alter rights for downstream users and requires confidence that the repository owner has the right to relicense all existing contributions.

RepoSentinel tetap menggunakan MIT. Lisensi tidak akan diubah secara otomatis selama stable release atau transisi private-to-public. Pergantian lisensi dapat mengubah hak downstream user dan memerlukan kepastian bahwa owner repository memiliki hak untuk me-relicense semua kontribusi yang sudah ada.

If the owner later chooses migration, the explicit decision should be stated as: **“Migrate RepoSentinel to Apache-2.0.”** The migration checklist includes the root `LICENSE`, package license files, manifest metadata, README links, third-party notice policy, optional source headers, all documentation/templates that mention MIT, full regression, and release-artifact review.

Jika owner kelak memilih migrasi, keputusan eksplisit harus dinyatakan sebagai: **“Migrate RepoSentinel to Apache-2.0.”** Migration checklist mencakup `LICENSE` root, package license file, manifest metadata, README link, third-party notice policy, source header opsional, seluruh dokumentasi/template yang menyebut MIT, full regression, dan review release artifact.

## Production/public-release checklist / Checklist production/public release

| Check / Pemeriksaan | Requirement / Persyaratan |
|---|---|
| Root license | `LICENSE` is present, complete, and linked from README. / `LICENSE` tersedia, lengkap, dan ditautkan dari README. |
| Package metadata | Published package metadata consistently says MIT. / Metadata package published menyatakan MIT secara konsisten. |
| Contributor rights | CONTRIBUTING explains that contributors submit work they own or may license. / CONTRIBUTING menjelaskan contributor hanya mengirim karya yang mereka miliki atau boleh lisensikan. |
| Third-party notices | Dependencies and bundled materials are reviewed for incompatible obligations. / Dependency dan bundled material direview untuk kewajiban yang inkompatibel. |
| Public visibility | The maintainer explicitly approves the visibility change after reviewing history and artifacts. / Maintainer menyetujui perubahan visibility secara eksplisit setelah meninjau history dan artifact. |

## References

[1]: https://spdx.org/licenses/MIT "SPDX: MIT License"

[2]: https://www.apache.org/foundation/license-faq.html "Apache Software Foundation: Licensing and Distribution FAQ"

[3]: https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-a-license-to-a-repository "GitHub Docs: Adding a license to a repository"
