# Desktop Native LSP first

Lane2's first editor integration targets VS Code Desktop by launching a native
LSP server executable from the VS Code extension.

The LSP server runs as the native `lane lsp` command. It may use host services
such as stdio, JSON-RPC transport, document URIs, workspace document storage,
and filesystem access.

The compiler remains in the Compiler Project as `lanec`. It exposes
target-independent compiler-analysis APIs that operate on in-memory source
inputs and return diagnostics and semantic artifacts. It must not depend on
LSP transport, VS Code APIs, process management, or host file IO.

The VS Code extension lives in `lane_vscode`. It locates, starts, configures,
and restarts the native LSP server. It is not the compiler and does not own
Lane2 language semantics.

This excludes VS Code Web and WASM language-server deployment from v1. Those
targets can be added later by introducing another transport and host-service
adapter around the same compiler-analysis APIs.
