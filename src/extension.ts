import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  context.subscriptions.push(
    vscode.commands.registerCommand("lane.restartLsp", async () => {
      await restartLaneLsp();
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
  const executable = findLaneLspExecutable();
  if (!executable.ok) {
    await showLaneLspPathError(executable.message);
    return;
  }
  const serverOptions: ServerOptions = {
    command: executable.path,
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

type ExecutableResult =
  | { ok: true; path: string }
  | { ok: false; message: string };

function findLaneLspExecutable(): ExecutableResult {
  const configured = vscode.workspace
    .getConfiguration("lane")
    .get<string>("lsp.path", "");
  if (configured) {
    return validateExecutablePath(configured, "Configured Lane LSP path");
  }

  let firstCandidateError: string | undefined;
  for (const candidate of developmentCandidates()) {
    const result = validateExecutablePath(candidate, "Lane LSP candidate");
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
      "Lane LSP executable not found. Set lane.lsp.path to a native lane_lsp executable.",
  };
}

function developmentCandidates(): string[] {
  return [
    path.join(os.homedir(), ".moon", "bin", "lane_lsp"),
    path.join(os.homedir(), ".moon", "bin", "lane_lsp.exe"),
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
        message: `${label} is not executable: ${file}. Run chmod +x on the file or update lane.lsp.path.`,
      };
    }
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `${label} is invalid: ${message}` };
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

async function showLaneLspPathError(message: string): Promise<void> {
  const openSettings = "Open Settings";
  const action = await vscode.window.showErrorMessage(message, openSettings);
  if (action === openSettings) {
    await vscode.commands.executeCommand(
      "workbench.action.openSettings",
      "lane.lsp.path",
    );
  }
}
