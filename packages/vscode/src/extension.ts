import { spawn } from "node:child_process";
import { join } from "node:path";
import { workspace, window, commands, languages, Uri, Diagnostic, DiagnosticSeverity, Range, type ExtensionContext, type FileSystemWatcher } from "vscode";

type ReportFinding = {
  ruleId: string;
  severity: "critical" | "error" | "warning" | "info";
  message: string;
  remediation: string;
  path?: string;
  line?: number;
  column?: number;
};

type JsonReport = {
  findings?: ReportFinding[];
};

function severityOf(value: ReportFinding["severity"]): DiagnosticSeverity {
  switch (value) {
    case "critical":
    case "error":
      return DiagnosticSeverity.Error;
    case "warning":
      return DiagnosticSeverity.Warning;
    case "info":
      return DiagnosticSeverity.Information;
  }
}

function diagnosticFor(finding: ReportFinding): Diagnostic {
  const line = Math.max(0, (finding.line ?? 1) - 1);
  const column = Math.max(0, (finding.column ?? 1) - 1);
  const endColumn = finding.column ? column + 1 : 1000;
  const diagnostic = new Diagnostic(new Range(line, column, line, endColumn), `${finding.message} Fix: ${finding.remediation}`, severityOf(finding.severity));
  diagnostic.code = finding.ruleId;
  diagnostic.source = "RepoSentinel";
  return diagnostic;
}

async function runScan(root: string): Promise<JsonReport> {
  const executable = process.env.REPOSENTINEL_BIN || "reposentinel";
  return await new Promise((resolve, reject) => {
    const child = spawn(executable, ["check", root, "--format", "json", "--no-color"], {
      cwd: root,
      env: { ...process.env, CI: "true" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.once("error", reject);
    child.once("close", (code) => {
      try {
        const report = JSON.parse(stdout) as JsonReport;
        if (code !== 0 && code !== 1) reject(new Error(stderr.trim() || `RepoSentinel exited with code ${code ?? "unknown"}`));
        else resolve(report);
      } catch (error) {
        reject(new Error(stderr.trim() || (error instanceof Error ? error.message : String(error))));
      }
    });
  });
}

async function scanWorkspace(collection: ReturnType<typeof languages.createDiagnosticCollection>): Promise<void> {
  const root = workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!root) {
    void window.showWarningMessage("RepoSentinel requires an open workspace.");
    return;
  }
  try {
    const report = await runScan(root);
    collection.clear();
    const grouped = new Map<string, Diagnostic[]>();
    for (const finding of report.findings ?? []) {
      if (!finding.path) continue;
      const uri = Uri.file(join(root, finding.path));
      const diagnostics = grouped.get(uri.toString()) ?? [];
      diagnostics.push(diagnosticFor(finding));
      grouped.set(uri.toString(), diagnostics);
    }
    for (const [key, diagnostics] of grouped) collection.set(Uri.parse(key), diagnostics);
    void window.setStatusBarMessage(`RepoSentinel: ${report.findings?.length ?? 0} finding(s)`, 4000);
  } catch (error) {
    void window.showErrorMessage(`RepoSentinel scan failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function activate(context: ExtensionContext): void {
  const collection = languages.createDiagnosticCollection("reposentinel");
  context.subscriptions.push(collection);
  context.subscriptions.push(commands.registerCommand("reposentinel.scan", () => scanWorkspace(collection)));

  const watcher: FileSystemWatcher = workspace.createFileSystemWatcher("**/*");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { void scanWorkspace(collection); }, 500);
  };
  watcher.onDidCreate(schedule, undefined, context.subscriptions);
  watcher.onDidChange(schedule, undefined, context.subscriptions);
  watcher.onDidDelete(schedule, undefined, context.subscriptions);
  context.subscriptions.push(watcher);
}

export function deactivate(): void {}
