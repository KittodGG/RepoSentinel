import type { Locale } from "./index.js";

/**
 * Indonesian translations for rule finding text, keyed by the English source
 * string the rule emits.
 *
 * Keying on the source string rather than a symbolic id keeps the 27 rule
 * definitions untouched and covers branch-specific variants for free. The
 * trade-off is that editing an English message orphans its translation, so
 * `rule-text.test.ts` runs the whole rule pack over fixtures and fails when any
 * emitted string is missing here. A miss degrades to English rather than
 * showing a raw key.
 *
 * Machine-readable output is deliberately excluded: JSON and SARIF always carry
 * the English source text so report bytes stay identical across locales.
 */
const id: Record<string, string> = {
  // ---- documentation -------------------------------------------------------
  "README.md was not found at the repository root.":
    "README.md tidak ditemukan di root repository.",
  "Add README.md with a project summary and a runnable Quick Start.":
    "Tambahkan README.md berisi ringkasan proyek dan Quick Start yang bisa dijalankan.",
  "README does not contain a runnable Quick Start command.":
    "README tidak memuat perintah Quick Start yang bisa dijalankan.",
  "Add a Quick Start section with prerequisites, installation, and one run command.":
    "Tambahkan bagian Quick Start berisi prasyarat, instalasi, dan satu perintah menjalankan.",
  "README does not have a clear project description near the top.":
    "README tidak memiliki deskripsi proyek yang jelas di bagian atas.",
  "Describe the problem, primary capability, and intended user in one or two sentences.":
    "Jelaskan masalah, kemampuan utama, dan pengguna yang dituju dalam satu atau dua kalimat.",
  "No install/setup heading with a copy-paste command was detected.":
    "Tidak ditemukan heading instalasi/setup dengan perintah yang bisa disalin.",

  // ---- git hygiene ---------------------------------------------------------
  ".gitignore was not found.": ".gitignore tidak ditemukan.",
  "Add relevant ignore patterns before committing generated files or local configuration.":
    "Tambahkan pola ignore yang sesuai sebelum meng-commit file hasil build atau konfigurasi lokal.",
  "A tracked file exceeds the 5 MiB repository hygiene threshold.":
    "Ada file ter-track yang melewati ambang kebersihan repository 5 MiB.",
  "Move large binaries to Git LFS or release storage, or document why the file must remain tracked.":
    "Pindahkan biner besar ke Git LFS atau penyimpanan rilis, atau dokumentasikan alasan file harus tetap ter-track.",
  "A generated-looking file is tracked by Git.":
    "File yang tampak hasil generate ikut ter-track oleh Git.",
  "Confirm the artifact is intentionally versioned; otherwise ignore the generated path and remove it from Git tracking.":
    "Pastikan artefak ini memang sengaja diversikan; kalau tidak, abaikan path-nya dan keluarkan dari tracking Git.",
  "The repository is in a detached HEAD state, so the default branch cannot be inferred locally.":
    "Repository berada dalam kondisi detached HEAD, sehingga branch default tidak dapat disimpulkan secara lokal.",
  "Check out the intended working branch or provide branch context explicitly in CI.":
    "Checkout ke branch kerja yang dimaksud, atau berikan konteks branch secara eksplisit di CI.",

  // ---- security ------------------------------------------------------------
  "Environment file is tracked by Git.":
    "File environment ikut ter-track oleh Git.",
  "Environment file exists in the repository workspace.":
    "File environment ada di dalam workspace repository.",
  "Sensitive environment filename matched. File content is not displayed.":
    "Nama file environment sensitif cocok. Isi file tidak ditampilkan.",
  "Remove the file from Git tracking, rotate exposed credentials, and add the pattern to .gitignore.":
    "Keluarkan file dari tracking Git, rotasi credential yang terekspos, dan tambahkan polanya ke .gitignore.",
  "Review the file and ensure it is ignored before committing.":
    "Periksa file tersebut dan pastikan sudah diabaikan sebelum di-commit.",
  "Private key material detected.": "Terdeteksi material private key.",
  "Private key material detected in a test-certificate fixture.":
    "Terdeteksi material private key pada fixture sertifikat test.",
  "Private-key material detected; key body redacted.":
    "Material private key terdeteksi; isi kunci disamarkan.",
  "Test-certificate private-key material detected; key body redacted.":
    "Material private key sertifikat test terdeteksi; isi kunci disamarkan.",
  "Remove the key from the repository and Git history, rotate related credentials, and verify the ignore rule.":
    "Hapus kunci dari repository dan riwayat Git, rotasi credential terkait, lalu periksa aturan ignore-nya.",
  "Confirm this is a disposable test certificate, keep it non-production, and rotate or remove it if it was ever used outside tests.":
    "Pastikan ini sertifikat test sekali pakai, jaga tetap di luar produksi, dan rotasi atau hapus bila pernah dipakai di luar test.",
  "A high-confidence credential pattern was detected.":
    "Terdeteksi pola credential dengan tingkat keyakinan tinggi.",
  "Revoke and rotate the credential, remove it from the repository, and review Git history.":
    "Cabut dan rotasi credential tersebut, hapus dari repository, lalu periksa riwayat Git.",

  // ---- package -------------------------------------------------------------
  "Multiple package-manager lockfiles were found.":
    "Ditemukan lebih dari satu lockfile package manager.",
  "Keep the lockfile used by the selected package manager and remove stale alternatives.":
    "Pertahankan lockfile milik package manager yang dipakai dan hapus sisa lockfile lain.",
  "package.json could not be parsed.": "package.json tidak dapat diparse.",
  "Fix package.json syntax before publishing the package.":
    "Perbaiki sintaks package.json sebelum menerbitkan package.",
  "package.json has an invalid or missing package name.":
    "package.json memiliki nama package yang tidak valid atau tidak ada.",
  "Use a valid package name and verify the intended publish scope.":
    "Gunakan nama package yang valid dan pastikan scope publikasinya sesuai.",
  "Publishable package.json does not define an exports or executable entrypoint.":
    "package.json yang diterbitkan tidak mendefinisikan exports maupun entrypoint executable.",
  "Add an explicit exports map or a documented main/bin entrypoint before publishing.":
    "Tambahkan exports map eksplisit atau entrypoint main/bin yang terdokumentasi sebelum menerbitkan.",
  "Publishable package.json does not allowlist its dist output.":
    "package.json yang diterbitkan tidak memasukkan output dist ke daftar files.",
  "Add dist to the package files allowlist or change the public entrypoint to the actual published build output.":
    "Tambahkan dist ke daftar files, atau ubah entrypoint publik ke output build yang benar-benar diterbitkan.",
  "Publishable package.json has a Node.js engine range inconsistent with the workspace root.":
    "package.json yang diterbitkan memiliki rentang engine Node.js yang tidak konsisten dengan root workspace.",
  "Workspace package is missing from pnpm-lock.yaml importers.":
    "Package workspace tidak ada pada daftar importers di pnpm-lock.yaml.",
  "Run pnpm install with the intended workspace package manifests and commit the updated lockfile.":
    "Jalankan pnpm install dengan manifest workspace yang dimaksud, lalu commit lockfile hasilnya.",
  "Regenerate and commit the lockfile with the declared package manager before publishing or enabling CI installs.":
    "Buat ulang dan commit lockfile memakai package manager yang dideklarasikan sebelum menerbitkan atau mengaktifkan install di CI.",

  // ---- links and assets ----------------------------------------------------
  "Markdown link has an invalid URL.":
    "Link Markdown memiliki URL yang tidak valid.",
  "Replace the URL with a valid absolute URL or remove the link.":
    "Ganti dengan URL absolut yang valid, atau hapus link tersebut.",
  "Markdown link points to a missing repository path.":
    "Link Markdown menunjuk ke path repository yang tidak ada.",
  "Create the referenced file or update the link to a path that exists.":
    "Buat file yang dirujuk, atau ubah link ke path yang benar-benar ada.",
  "Markdown image points to a missing repository asset.":
    "Gambar Markdown menunjuk ke aset repository yang tidak ada.",
  "Add the asset at the referenced path or update the image reference.":
    "Tambahkan aset pada path yang dirujuk, atau perbarui referensi gambarnya.",
  "Badge image does not use an absolute URL.":
    "Gambar badge tidak memakai URL absolut.",
  "Use a valid HTTPS badge endpoint or remove the badge.":
    "Gunakan endpoint badge HTTPS yang valid, atau hapus badge tersebut.",

  // ---- community and portfolio --------------------------------------------
  "No recognizable repository license file was found at the project root.":
    "Tidak ditemukan file lisensi repository yang dikenali di root proyek.",
  "Decide whether the repository should be open source and add an appropriate license after review.":
    "Putuskan apakah repository ini open source, lalu tambahkan lisensi yang sesuai setelah ditinjau.",
  "No contributor guide was detected.": "Tidak ditemukan panduan kontributor.",
  "Add CONTRIBUTING.md with setup, test, review, and pull request guidance.":
    "Tambahkan CONTRIBUTING.md berisi panduan setup, test, review, dan pull request.",
  "No code of conduct was detected.": "Tidak ditemukan code of conduct.",
  "Add CODE_OF_CONDUCT.md with expected behavior and a private reporting path for community concerns.":
    "Tambahkan CODE_OF_CONDUCT.md berisi perilaku yang diharapkan dan jalur pelaporan privat untuk masalah komunitas.",
  "No issue template was detected.": "Tidak ditemukan template issue.",
  "Add an issue template when accepting public bug reports or feature requests.":
    "Tambahkan template issue bila menerima laporan bug atau permintaan fitur dari publik.",
  "No visible demo, preview, or live URL was detected for the portfolio profile.":
    "Tidak ditemukan demo, preview, atau URL live yang terlihat untuk profile portfolio.",
  "Add a Demo or Preview section near the top of README.md.":
    "Tambahkan bagian Demo atau Preview di dekat bagian atas README.md.",

  // ---- CI ------------------------------------------------------------------
  "Workflow does not declare an explicit permissions block.":
    "Workflow tidak mendeklarasikan blok permissions secara eksplisit.",
  "Add least-privilege permissions at workflow or job scope.":
    "Tambahkan permissions dengan hak paling minim pada scope workflow atau job.",
  "Workflow action is not pinned to a full commit SHA.":
    "Action pada workflow tidak dipin ke commit SHA lengkap.",
  "Pin third-party actions to a verified 40-character commit SHA and keep the version in a comment.":
    "Pin action pihak ketiga ke commit SHA 40 karakter yang terverifikasi, dan simpan versinya sebagai komentar.",
  "pull_request_target checks out pull-request code in a privileged workflow.":
    "pull_request_target melakukan checkout kode pull request di dalam workflow yang punya hak istimewa.",
  "Avoid checking out or executing untrusted pull-request code from pull_request_target; use pull_request or a trusted, reviewable workflow boundary.":
    "Hindari checkout atau menjalankan kode pull request yang tidak tepercaya dari pull_request_target; gunakan pull_request atau batas workflow yang tepercaya dan bisa ditinjau.",

  // ---- scan lifecycle ------------------------------------------------------
  "No scannable files were found, so repository readiness cannot be assessed.":
    "Tidak ditemukan file yang dapat dipindai, sehingga kesiapan repository tidak dapat dinilai.",
  "Point the scan at a repository with tracked files, or relax the configured ignore patterns.":
    "Arahkan scan ke repository yang punya file ter-track, atau longgarkan pola ignore yang dikonfigurasi.",
  "Review the source files or rerun with narrower scope; a truncated report is not a complete finding inventory.":
    "Periksa file sumbernya atau jalankan ulang dengan scope lebih sempit; report yang terpotong bukan inventaris temuan yang lengkap.",
};

const catalogs: Record<Locale, Record<string, string>> = {
  // English is the source language, so its catalog is the identity mapping.
  en: {},
  id,
};

/**
 * Translates rule finding text for display. Unknown strings fall back to the
 * English source so a missing entry degrades to readable output.
 */
export function translateRuleText(locale: Locale, source: string): string {
  return catalogs[locale][source] ?? source;
}

export function ruleTextCatalog(
  locale: Locale,
): Readonly<Record<string, string>> {
  return catalogs[locale];
}
