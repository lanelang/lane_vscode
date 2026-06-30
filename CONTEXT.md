# Lane VS Code Extension

The Lane VS Code extension repository owns the editor client that starts and
configures the Lane LSP server.

## Language

**Lane VS Code Extension**:
The VS Code Desktop extension that registers Lane files and connects VS Code to
the Lane LSP server.
_Avoid_: language server, compiler

**Lane Executable Path**:
The user setting that points the extension at an installed `lane` executable.
The extension starts the language server with the `lane lsp` subcommand.
_Avoid_: compiler path, workspace root, lane_lsp executable

**Workspace Root URI**:
The root URI sent by VS Code's language client during LSP initialization so the
Lane LSP server can analyze workspace library sources.
_Avoid_: standard library path, compiler global

## Relationships

- `lane_vscode` owns VS Code packaging and client configuration.
- The Lane LSP server owns the server process and protocol handling.
- `lanec` owns language semantics.
- Hover and go-to-definition are provided by server-advertised LSP
  capabilities; the extension only needs to start the standard language client
  for `.lane` documents.
- Type, parameter-name, and implicit-argument inlay hints are provided by the
  Lane LSP server through `textDocument/inlayHint`; the extension only enables
  editor inlay hints for Lane files.
- Lane syntax coloring is provided by the TextMate grammar, not LSP semantic
  tokens.
