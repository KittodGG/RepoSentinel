# RepoSentinel Manual Audit Response / Respons Audit Manual RepoSentinel

**Review type / Jenis review:** manual source review, not an automated verifier report / review source secara manual, bukan laporan automated verifier.

**Scope / Scope:** current repository state at the start of the production-readiness correction cycle / kondisi repository saat awal correction cycle production-readiness.

**Decision rule / Aturan keputusan:** a finding is called `confirmed` only when the current source supports it; `fixed` means the issue was already corrected in the working tree; `partial` means the observation is directionally valid but the original wording overstates impact; `opinion` means it is a product or prioritization judgment rather than a defect.

## Executive correction / Koreksi utama

The attached review is valuable and identifies several genuine trust-boundary and correctness gaps. It also contains stale references: the relative Markdown-link defect was already fixed in `packages/rules/src/index.ts` and covered by a regression test before this response, and the current release packer already removes unpublished workspace dependencies from the published artifact. Those mitigations reduce the immediate user impact but do not eliminate the underlying maintenance risk.

### Live correction checkpoint / Checkpoint koreksi aktif

The following items from the attached review have now been corrected in the current working tree and covered by focused tests: network-state metadata in terminal/Markdown/JSON/SARIF/HTML reports; loopback, private, link-local, metadata, reserved, and IPv4-mapped IPv6 blocking for opt-in network checks; path-independent secret detection; match-only secret evidence; full generic redaction; multiple secret matches per file; Markdown evidence escaping; unsafe Git-ref rejection with a final diff separator; critical-finding refusal in baselines; repository `.gitignore` integration; aggregate file/byte budgets; observable `extends: recommended` semantics; unknown configured-rule rejection; deduplicated SARIF driver rules; explicit positive custom-rule content matching; portable hardening-script URL handling; workspace dependency relocation; and pinned workflow action references. The relative-link fix noted in the review was already present and remains regression-tested.

Item berikut dari audit terlampir sudah dikoreksi di working tree saat ini dan dilindungi focused test: network-state metadata pada terminal/Markdown/JSON/SARIF/HTML report; blocking loopback, private, link-local, metadata, reserved, dan IPv4-mapped IPv6 untuk opt-in network check; secret detection tanpa path exemption; secret evidence berbasis match saja; generic redaction penuh; multiple secret match per file; Markdown evidence escaping; unsafe Git-ref rejection dengan final diff separator; critical-finding refusal pada baseline; integrasi `.gitignore`; aggregate file/byte budget; semantics `extends: recommended` yang observable; rejection unknown configured-rule; deduplicated SARIF driver rule; positive custom-rule content matching yang eksplisit; portable URL handling pada hardening script; pemindahan workspace dependency; dan pinned workflow action reference. Relative-link fix yang disebut audit sudah tersedia dan tetap memiliki regression test.

The two workstreams must run in order. **Workstream A** addresses safety and trust first. **Workstream B** addresses structural correctness, maintainability, compatibility, and supply-chain hardening second. Stable publication and the private-to-public visibility change remain blocked until both workstreams, pilot validation, and the final release gate pass.

Dua workstream harus dijalankan berurutan. **Workstream A** menangani safety dan trust terlebih dahulu. **Workstream B** menangani structural correctness, maintainability, compatibility, dan supply-chain hardening setelahnya. Stable publication dan perubahan visibility private-to-public tetap blocked sampai kedua workstream, pilot validation, dan final release gate lulus.

## Finding status matrix / Matriks status finding

| # | Audit observation / Observasi audit | Status sekarang | Corrected assessment / Penilaian yang dikoreksi | Planned treatment / Tindakan |
|---:|---|---|---|---|
| 1 | Secret rules skip `README.md`, `docs/`, fixtures, and test-like paths. | **Confirmed** | `isSafeExamplePath()` masih melakukan path-based skip sebelum scanning private key dan credential pattern. Path bukan bukti bahwa content aman; README dan docs tetap dapat berisi credential nyata. [1] | Workstream A: replace path skip with placeholder-aware and context-aware handling; add synthetic secret fixtures in README/docs; retain safe-example tests. |
| 2 | Terminal report always says `network off`. | **Confirmed** | `TerminalReportOptions` tidak membawa network state dan terminal reporter menulis `local · network off` secara hardcoded. `--network` dapat menjalankan HTTP check tetapi label tetap sama. [2] | Workstream A: pass explicit network mode into all reporters and test default/off versus opt-in/on output. |
| 3 | Network checker blocks only four hostname strings. | **Confirmed, high risk** | `safeUrl()` hanya menolak `localhost`, empat loopback-style string tertentu, dan non-HTTP schemes. Tidak ada DNS/IP-range policy untuk loopback, private, link-local, metadata, IPv4-mapped IPv6, atau DNS rebinding scenarios. [3] | Workstream A: resolve safely, reject private/link-local/loopback/metadata ranges, disable redirects, bound requests, and add deterministic mocked network tests. |
| 4 | Credential evidence can expose unmasked secret material. | **Confirmed** | Credential findings pass a raw source line to `redactSensitiveValue()`. The redactor masks recognized token prefixes but has a generic fallback that preserves the first four characters, and it does not mask arbitrary secret assignments on the same line. [1] [4] | Workstream A: never emit raw lines; emit only masked match spans or structural evidence; add assertions across terminal, JSON, Markdown, SARIF, and HTML. |
| 5 | Baseline can suppress critical findings permanently. | **Confirmed** | Baseline stores and filters fingerprints without severity policy or content-aware identity. The current CLI creates a baseline from all findings, and baseline filtering suppresses any matching fingerprint. [5] [6] | Workstream A: reject critical findings from baseline by default, require explicit opt-in for exceptional cases, and add a safer fingerprint strategy or revalidation metadata. |
| 6 | Markdown evidence is not escaped. | **Confirmed** | Markdown reporter interpolates evidence and remediation directly into list items. Attacker-controlled Markdown characters can alter the rendered report, especially when reports are posted into review surfaces. [2] | Workstream A: escape Markdown control characters or use a safe fenced representation; add injection regression tests. |
| 7 | `--changed-since` can forward an option-like ref to Git. | **Confirmed, low-to-medium practical risk** | `readChangedPaths()` passes `${baseRef}...HEAD` without an explicit argument separator or strict ref validation. The Action shell quoting prevents shell expansion but does not change Git argument parsing. [7] [8] | Workstream A: validate allowed ref syntax and use a Git invocation that cannot interpret user input as an option; add hostile-ref tests. |
| 8 | CI supply-chain hardening is incomplete; VS Code publish passes PAT on command line. | **Confirmed** | Quality and VS Code workflows use floating action tags. The VS Code publish command also passes `--pat "$VSCE_PAT"` while injecting the same secret through the environment. [9] [10] | Workstream B: pin third-party Actions to reviewed SHAs, remove the redundant PAT CLI flag, and add dependency/SAST review where supported. |
| 9 | Relative Markdown links report false positives. | **Fixed in current tree** | The current link and image rules use `posix.normalize()` relative to the source document and recognize repository directories. Regression coverage exists in `packages/rules/src/index.test.ts`. [1] [11] | Keep the regression test and include it in stable release evidence. |
| 10 | Secret rules report only one match per file or line. | **Confirmed** | Private-key detection uses a non-global `match`, and credential detection uses `findIndex`, so multiple independent matches can collapse into one finding. [1] | Workstream A: use global match iteration with bounded finding counts and deterministic ordering. |
| 11 | `.gitignore` is not read and discovery has no total file/byte budget. | **Confirmed, high operational impact** | Discovery feeds only configured ignore patterns into `ignore()`, walks all other directories, and limits individual files but not total file count, total bytes, or aggregate text-cache size. [7] | Workstream B: merge repository `.gitignore` safely, preserve explicit config behavior, add file/count/byte budgets, and report bounded-scan behavior clearly. |
| 12 | `extends: recommended` is validated but not applied. | **Confirmed** | Configuration accepts `extends: recommended`, but `resolveConfig()` does not use it to change defaults or rule policy. The generated starter config writes the key, so the configuration suggests behavior that does not occur. [12] [13] | Workstream B: implement the profile/extends contract or remove the key from schema and generated configuration; do not leave a silent no-op. |
| 13 | Unknown rule IDs are accepted as silent no-ops. | **Confirmed** | `rules` is a free-form record and `severityOverride()` simply looks up the supplied key. A typo can therefore appear accepted without affecting any known rule. [12] [1] | Workstream B: validate configured IDs against built-in and loaded custom registries, with an explicit policy for forward-compatible IDs. |
| 14 | CLI contains duplicate/dead renderer implementations. | **Confirmed, maintainability issue** | Local `renderTerminal()` and `renderJson()` are defined in the CLI while `runCheck()` uses reporter-package implementations. This creates drift risk, including the previously observed box-width divergence. [14] | Workstream B: remove dead implementations or make one canonical reporter boundary; keep snapshot tests at that boundary. |
| 15 | SARIF rule metadata is duplicated. | **Confirmed interoperability risk** | The reporter maps every finding into `tool.driver.rules`, so repeated findings produce repeated rule IDs. Results do not use a deduplicated rule table with stable indices. [2] | Workstream B: deduplicate rules by ID and emit valid result references; validate with SARIF schema plus semantic uniqueness tests. |
| 16 | Dashboard output path semantics can differ from user expectation. | **Partially confirmed** | `dashboard` resolves output relative to the report-directory argument and intentionally constrains it inside that directory. This is safe, but documentation must state the base directory explicitly; it is a documentation/UX mismatch rather than arbitrary path traversal. [14] | Workstream B: choose and document one path contract, then test relative, absolute, and escape attempts. |
| 17 | Custom rules currently express absence/presence policy, not positive content findings. | **Confirmed capability gap** | `contentIncludes` is used only to decide whether a matching file satisfies the policy. A match returns no finding; the registry cannot currently flag a file because it contains a selected string. [15] | Workstream B: either narrow the feature name/documentation to policy assertions or add an explicit positive-match mode with safety limits and tests. |
| 18 | `new URL(...).pathname` is not portable in the hardening script. | **Confirmed portability issue** | The script derives the repository root from URL pathname rather than `fileURLToPath()`, which can produce an invalid Windows drive-path shape. [16] | Workstream B: use `fileURLToPath()` and add a Windows-path unit or fixture test. |
| 19 | Source package metadata still contains a workspace runtime dependency. | **Confirmed source fragility, mitigated artifact** | `packages/cli/package.json` retains `@reposentinel/dashboard: workspace:*`, while `pack-release.mjs` strips all `@reposentinel/*` runtime dependencies from the staged package. The published artifact can work, but direct package publishing and metadata inspection remain fragile. [17] [18] | Workstream B: move workspace-only dependencies to development/build metadata where compatible, verify tsup bundling, and keep tarball manifest tests. |
| 20 | VS Code watcher rescans the whole workspace after changes. | **Confirmed performance risk** | The extension watches `**/*` and launches a whole-workspace CLI scan after a debounce. This is acceptable as an MVP adapter but can be expensive on large repositories, especially without `.gitignore` integration and aggregate budgets. [19] | Workstream B: restrict watch scope, debounce/coalesce safely, use changed-files mode where possible, and add a large-workspace performance test. |
| 21 | Documentation-to-code ratio and status claims feel inflated. | **Opinion with a valid credibility risk** | This is not a correctness defect by itself. It becomes a release risk when README status says `implemented` for a feature whose behavior is only a minimal presence check or when examples imply stronger guarantees than the implementation provides. | Workstream B and release gate: label capabilities precisely as `implemented`, `minimal`, `verified`, `planned`, or `backlog`; keep claims tied to tested behavior. |
| 22 | Flat score penalties are not comparable across repositories. | **Confirmed product limitation** | `scoreFindings()` subtracts fixed penalties and clamps to 0–100. The score is a within-scan readiness signal, not a normalized benchmark between repositories. [4] | Document the limitation before stable; consider a future normalized metric only with a compatibility plan. Do not market the score as a security or portfolio ranking. |
| 23 | Self-scan configuration weakens its own regression signal. | **Confirmed** | `.reposentinel.yml` ignores `fixtures/**` and disables `community.license-present`, so the self-scan cannot exercise those paths or detect removal of the license rule in the intended way. [20] | Workstream B: separate dogfood target configuration from fixture/security regression runs; keep positive fixtures out of the normal target scan only when explicitly justified. |
| 24 | Existing hardening checks do not prove complete redaction safety. | **Confirmed test-gap** | The hardening script checks schema, locale, selected marker absence, and a few invalid-input paths, but does not assert README/docs secret detection, arbitrary assignment redaction, network mode truthfulness, SSRF ranges, Markdown escaping, or multi-match behavior. [16] | Workstream A: replace marker-only assertions with fixture-driven output assertions across every reporter. |
| 25 | “95% of portfolio repos” and numerical ratings are subjective. | **Opinion / unsupported external claim** | These statements are not reproducible measurements from the repository and should not be presented as factual evidence. | Remove or clearly label them as reviewer opinion; use measured pilot metrics instead. |

## Sequential execution plan / Rencana eksekusi berurutan

### Workstream A — Safety and trust boundary first

Workstream A consists of the network truth fix, SSRF/IP-range guard, evidence redaction redesign, secret path-skip removal, Markdown escaping, changed-ref validation, critical-baseline policy, and multi-match secret detection. Each fix must include a regression fixture and output assertions. The gate is zero known P0/P1 issues, no sensitive-value leakage in any report format, deterministic network-disabled behavior, and no target-code execution.

Workstream A mencakup network truth fix, SSRF/IP-range guard, redesign evidence redaction, penghapusan path-skip secret, Markdown escaping, changed-ref validation, critical-baseline policy, dan multi-match secret detection. Setiap fix wajib memiliki regression fixture dan output assertion. Gate-nya adalah tidak ada P0/P1 yang diketahui, tidak ada kebocoran nilai sensitif pada report format apa pun, behavior network-disabled yang deterministic, dan tidak ada target-code execution.

### Workstream B — Structural and ecosystem hardening second

Workstream B consists of `.gitignore` integration and resource budgets, `extends` semantics, unknown-rule validation, reporter deduplication, dashboard path contract, custom-rule capability clarification, Windows path portability, source-package dependency cleanup, VS Code watcher efficiency, Action SHA pinning, publication command cleanup, and honest capability labels in README and docs. The gate is typecheck, full test, fixture matrix, clean packaging, Action validation, documentation-link validation, and benchmark evidence.

Workstream B mencakup integrasi `.gitignore` dan resource budget, semantics `extends`, validation unknown rule, deduplication reporter, dashboard path contract, clarification custom-rule capability, portability Windows path, cleanup source-package dependency, efisiensi watcher VS Code, pinning SHA Action, cleanup publication command, dan capability label yang jujur pada README serta docs. Gate-nya adalah typecheck, full test, fixture matrix, clean packaging, Action validation, documentation-link validation, dan benchmark evidence.

## Release decision / Keputusan release

The current tree has completed Workstream A, Workstream B, pilot validation, and final release review. Stable `reposentinel@1.0.0` is published on npm, the clean registry install smoke test passes, and the GitHub `v1.0.0` release is published from the verified source commit. The repository remains private by maintainer choice; public visibility requires a separate explicit approval.

Current tree telah menyelesaikan Workstream A, Workstream B, pilot validation, dan final release review. Stable `reposentinel@1.0.0` sudah dipublikasikan ke npm, clean registry install smoke test berhasil, dan GitHub `v1.0.0` release sudah dipublikasikan dari source commit yang terverifikasi. Repository tetap private berdasarkan keputusan maintainer; visibility public memerlukan approval eksplisit terpisah.

## References

[1]: ../packages/rules/src/index.ts "RepoSentinel rules implementation"

[2]: ../packages/reporters/src/index.ts "RepoSentinel reporters implementation"

[3]: ../packages/rules/src/network.ts "RepoSentinel network link checker"

[4]: ../packages/core/src/index.ts "RepoSentinel core contracts, scoring, redaction, and fingerprints"

[5]: ../packages/core/src/baseline.ts "RepoSentinel baseline persistence and filtering"

[6]: ../packages/cli/src/index.ts "RepoSentinel CLI baseline and scan flow"

[7]: ../packages/core/src/discovery.ts "RepoSentinel repository discovery and Git plumbing"

[8]: ../action.yml "RepoSentinel composite GitHub Action"

[9]: ../.github/workflows/quality.yml "RepoSentinel Quality workflow"

[10]: ../.github/workflows/vscode-publish.yml "RepoSentinel VS Code publication workflow"

[11]: ../packages/rules/src/index.test.ts "RepoSentinel rules regression tests"

[12]: ../packages/config/src/index.ts "RepoSentinel configuration resolution"

[13]: ../packages/cli/src/index.ts#L329 "RepoSentinel starter configuration"

[14]: ../packages/cli/src/index.ts "RepoSentinel CLI command and renderer wiring"

[15]: ../packages/rules/src/custom.ts "RepoSentinel custom-rule registry"

[16]: ../scripts/hardening-checks.mjs "RepoSentinel hardening checks"

[17]: ../packages/cli/package.json "RepoSentinel CLI package metadata"

[18]: ../scripts/pack-release.mjs "RepoSentinel release artifact packer"

[19]: ../packages/vscode/src/extension.ts "RepoSentinel VS Code diagnostics adapter"

[20]: ../.reposentinel.yml "RepoSentinel self-scan configuration"
