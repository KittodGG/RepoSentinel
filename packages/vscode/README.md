# RepoSentinel VS Code Diagnostics

This optional extension package maps RepoSentinel JSON findings into VS Code diagnostics. Run **RepoSentinel: Scan Workspace** from the Command Palette, or edit a workspace file to trigger a debounced local rescan.

The extension invokes the `reposentinel` executable with `--format json --no-color`, accepts exit codes `0` and `1` as valid scan results, and treats other exit codes as execution errors. Set `REPOSENTINEL_BIN` when the executable is not on the extension host PATH.

The adapter does not upload source code, does not enable network scanning, and does not execute package scripts from the target repository. It is intentionally optional and is not part of the published CLI package.
