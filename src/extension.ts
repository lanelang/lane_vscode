import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as util from "node:util";
import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

const execFile = util.promisify(childProcess.execFile);

let client: LanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  context.subscriptions.push(
    vscode.commands.registerCommand("lane.restartLsp", async () => {
      await restartLaneLsp();
    }),
    vscode.languages.registerDocumentFormattingEditProvider("lane", {
      provideDocumentFormattingEdits: formatLaneDocument,
    }),
  );

  await startLaneLsp();
}

export async function deactivate(): Promise<void> {
  await stopLaneLsp();
}

async function restartLaneLsp(): Promise<void> {
  await stopLaneLsp();
  await startLaneLsp();
}

async function stopLaneLsp(): Promise<void> {
  if (client) {
    await client.stop();
    client = undefined;
  }
}

async function startLaneLsp(): Promise<void> {
  const executable = findLaneExecutable();
  if (!executable.ok) {
    await showLanePathError(executable.message);
    return;
  }
  const serverOptions: ServerOptions = {
    command: executable.path,
    args: ["lsp"],
    transport: TransportKind.stdio,
  };
  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ language: "lane", scheme: "file" }],
    synchronize: {},
  };

  client = new LanguageClient(
    "lane_lsp",
    "Lane Language Server",
    serverOptions,
    clientOptions,
  );
  try {
    await client.start();
  } catch (error) {
    client = undefined;
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(
      `Failed to start Lane LSP: ${message}`,
    );
  }
}

async function formatLaneDocument(
  document: vscode.TextDocument,
): Promise<vscode.TextEdit[]> {
  const executable = findLaneExecutable();
  if (!executable.ok) {
    await showLanePathError(executable.message);
    return [];
  }

  const source = document.getText();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "lane-fmt-"));
  const tempFile = path.join(tempDir, "format.lane");
  try {
    fs.writeFileSync(tempFile, source, "utf8");
    await execFile(executable.path, ["fmt", tempFile], {
      maxBuffer: 10 * 1024 * 1024,
    });
    const formatted = fs.readFileSync(tempFile, "utf8");
    if (formatted === source) {
      return [];
    }
    return [
      vscode.TextEdit.replace(
        new vscode.Range(document.positionAt(0), document.positionAt(source.length)),
        formatted,
      ),
    ];
  } catch (error) {
    void vscode.window.showErrorMessage(
      `Lane format failed: ${formatProcessError(error)}`,
    );
    return [];
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

type ExecutableResult =
  | { ok: true; path: string }
  | { ok: false; message: string };

function findLaneExecutable(): ExecutableResult {
  const configured = vscode.workspace
    .getConfiguration("lane")
    .get<string>("path", "");
  if (configured) {
    return validateExecutablePath(configured, "Configured Lane path");
  }

  let firstCandidateError: string | undefined;
  for (const candidate of developmentCandidates()) {
    const result = validateExecutablePath(candidate, "Lane candidate");
    if (result.ok) {
      return result;
    }
    if (!firstCandidateError && fs.existsSync(candidate)) {
      firstCandidateError = result.message;
    }
  }

  return {
    ok: false,
    message:
      firstCandidateError ??
      "Lane executable not found. Set lane.path to a native lane executable.",
  };
}

function developmentCandidates(): string[] {
  return [
    path.join(__dirname, "..", "..", "bins", "lane"),
    path.join(__dirname, "..", "..", "bins", "lane.exe"),
    path.join(os.homedir(), ".moon", "bin", "lane"),
    path.join(os.homedir(), ".moon", "bin", "lane.exe"),
  ];
}

function validateExecutablePath(
  file: string,
  label: string,
): ExecutableResult {
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile()) {
      return { ok: false, message: `${label} is not a file: ${file}` };
    }
    if (process.platform !== "win32") {
      fs.accessSync(file, fs.constants.X_OK);
    }
    return { ok: true, path: file };
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return { ok: false, message: `${label} does not exist: ${file}` };
    }
    if (isNodeError(error) && error.code === "EACCES") {
      return {
        ok: false,
        message: `${label} is not executable: ${file}. Run chmod +x on the file or update lane.path.`,
      };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `${label} is invalid: ${message}` };
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function formatProcessError(error: unknown): string {
  if (error instanceof Error) {
    const output = processOutput(error);
    return output || error.message;
  }
  return String(error);
}

function processOutput(error: Error): string {
  const withOutput = error as Error & {
    stdout?: string | Buffer;
    stderr?: string | Buffer;
  };
  const stderr = outputText(withOutput.stderr);
  if (stderr) {
    return stderr;
  }
  return outputText(withOutput.stdout);
}

function outputText(output: string | Buffer | undefined): string {
  if (!output) {
    return "";
  }
  return output.toString().trim();
}

async function showLanePathError(message: string): Promise<void> {
  const openSettings = "Open Settings";
  const action = await vscode.window.showErrorMessage(message, openSettings);
  if (action === openSettings) {
    await vscode.commands.executeCommand(
      "workbench.action.openSettings",
      "lane.path",
    );
  }
}
