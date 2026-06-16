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
  const executable = findLaneLspExecutable(context);
  if (!executable) {
    void vscode.window.showErrorMessage(
      "Lane LSP executable not found. Set lane.lsp.path to a native lane_lsp executable.",
    );
    return;
  }

  const serverOptions: ServerOptions = {
    command: executable,
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
  context.subscriptions.push(client);
  await client.start();
}

export async function deactivate(): Promise<void> {
  if (client) {
    await client.stop();
    client = undefined;
  }
}

function findLaneLspExecutable(
  context: vscode.ExtensionContext,
): string | undefined {
  const configured = vscode.workspace
    .getConfiguration("lane")
    .get<string>("lsp.path", "");
  if (configured && isExecutableCandidate(configured)) {
    return configured;
  }

  for (const candidate of developmentCandidates(context)) {
    if (isExecutableCandidate(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function developmentCandidates(context: vscode.ExtensionContext): string[] {
  return [
    path.join(os.homedir(), ".moon", "bin", "lane_lsp"),
    path.join(os.homedir(), ".moon", "bin", "lane_lsp.exe"),
  ];
}

function isExecutableCandidate(file: string): boolean {
  try {
    const stat = fs.statSync(file);
    return stat.isFile();
  } catch {
    return false;
  }
}
