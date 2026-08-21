# RepoSentinel License Policy

> **Catatan penting:** Saya bukan lawyer. Dokumen ini adalah working analysis untuk keputusan repository, bukan formal legal advice. Mintalah qualified attorney meninjau sebelum mengandalkan atau mengubah licensing policy, terutama bila ada employer, contributor, third-party code, atau distribusi komersial.

## Status saat ini

RepoSentinel saat ini menggunakan **MIT License**. Root `LICENSE`, `packages/cli/LICENSE`, dan `packages/cli/package.json` menyatakan MIT secara konsisten. Ini adalah open-source licensing setup yang valid; sebuah project open source tidak diwajibkan memakai Apache-2.0.

MIT memberi izin yang sangat luas untuk menggunakan, menyalin, memodifikasi, menerbitkan, mendistribusikan, mensublisensikan, dan menjual software, dengan kewajiban utama mempertahankan copyright notice dan license notice. MIT juga memiliki warranty disclaimer yang luas. [1]

## MIT versus Apache-2.0

| Pertimbangan | MIT | Apache-2.0 |
|---|---|---|
| Kategori | Permissive open-source license | Permissive open-source license |
| Kewajiban distribusi | Umumnya mempertahankan copyright dan license notice | Mempertahankan license, notices, dan memenuhi ketentuan attribution/NOTICE bila berlaku |
| Patent language | Tidak menyediakan patent grant eksplisit seperti Apache-2.0 | Menyediakan patent license dan defensive patent-termination clause |
| Kompleksitas | Lebih pendek dan sederhana | Lebih panjang dan lebih preskriptif |
| Kemudahan adopsi | Sangat rendah friksi untuk pengguna dan package consumer | Juga luas, tetapi downstream organization perlu membaca notice/patent terms |
| Cocok untuk | Utility, library kecil, CLI dengan tujuan adopsi sederhana | Tool yang ingin memberi kejelasan patent kepada corporate users atau ecosystem contributors |
| Implikasi GPL | Permissive, tetapi compatibility harus dinilai terhadap kombinasi project | Apache-2.0 compatible dengan GPLv3 tetapi tidak dengan GPLv2 menurut FAQ Apache karena ketentuan tambahan tertentu |

Apache Software Foundation menyatakan bahwa pihak lain boleh melisensikan software miliknya di bawah Apache License 2.0 dan menyarankan menyertakan `LICENSE`, serta mempertimbangkan `NOTICE` dan source headers. [2] GitHub menjelaskan bahwa detectable license membantu pengguna mengetahui hak untuk menggunakan, mengubah, dan mendistribusikan repository. [3]

## Rekomendasi untuk RepoSentinel

Tidak ada jawaban universal bahwa project open source **harus** memakai Apache-2.0. Untuk RepoSentinel, MIT tetap masuk akal bila prioritasnya adalah frictionless adoption, package installation sederhana, dan license text minimal.

Apache-2.0 menjadi pilihan yang lebih kuat bila maintainer ingin memberi patent grant yang lebih eksplisit, mengantisipasi adopsi perusahaan, atau membangun contributor ecosystem yang memerlukan ketentuan patent dan notice yang lebih jelas. Itu adalah alasan strategis, bukan kewajiban open-source.

Saya **belum mengubah MIT menjadi Apache-2.0 secara otomatis**. Pergantian license dapat mengubah hak yang diterima downstream users dan memerlukan kepastian bahwa pemilik repository mempunyai hak untuk merelicense semua kontribusi yang sudah ada. Riwayat saat ini memiliki lebih dari satu commit identity, sehingga owner perlu mengonfirmasi hak contributor atau memperoleh permission yang diperlukan. Mengganti file license saja tidak boleh dianggap otomatis mengubah license atas kontribusi yang haknya tidak dimiliki oleh maintainer.

## Keputusan yang dibutuhkan dari owner

Jika keputusan akhirnya tetap MIT, tidak ada perubahan license yang diperlukan; cukup pertahankan file dan metadata yang konsisten serta gunakan copyright attribution yang benar.

Jika ingin migrasi, owner perlu memberi konfirmasi eksplisit dengan kalimat seperti **“migrasikan RepoSentinel ke Apache-2.0”** setelah memastikan contributor rights. Migration checklist-nya adalah mengganti root `LICENSE`, package license file, package manifest metadata, README badges/links bila ada, third-party notice policy bila diperlukan, source headers bila dipilih, dan seluruh documentation/template yang menyebut MIT. Setelah itu perlu dilakukan full regression dan review release artifact.

## References

[1]: https://spdx.org/licenses/MIT "SPDX: MIT License"
[2]: https://www.apache.org/foundation/license-faq.html "Apache Software Foundation: Licensing and Distribution FAQ"
[3]: https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-a-license-to-a-repository "GitHub Docs: Adding a license to a repository"
