# Lane IDE Tooling

This context names editor integration, language-server boundaries, and the
compiler-analysis APIs used by tools.

## Language

**IDE Tooling**:
Developer-facing editor and language-server integration built around Lane.
_Avoid_: compiler front end, build system

**Lane LSP Server**:
The native language-server executable implemented under `lane_lsp`
for VS Code Desktop and other LSP clients.
_Avoid_: compiler daemon, VS Code backend

**Lane VS Code Extension**:
The VS Code Desktop extension implemented under `lane_vscode` that starts,
configures, and communicates with the Lane LSP Server.
_Avoid_: compiler plugin, web extension

**LSP Executable Path**:
The VS Code setting that points the Lane VS Code Extension at a native Lane LSP
Server executable during v1 development.
_Avoid_: compiler path, project root

**VS Code Language Client**:
The TypeScript client layer in the Lane VS Code Extension, built with
`vscode-languageclient`, that manages VS Code's LSP client lifecycle and
document synchronization.
_Avoid_: custom JSON-RPC client, compiler API

**Compiler Analysis API**:
A target-independent `lanec` API that accepts in-memory source inputs and
returns parse, resolution, type checking, diagnostics, and semantic artifacts
without performing file or process IO.
_Avoid_: LSP handler, filesystem service

**Single-File Analysis**:
The v1 compiler-analysis mode that checks one Lane source text together with
the standard prelude, without project discovery, module graphs, or cross-file
dependency analysis.
_Avoid_: project compilation, workspace analysis

**Document Snapshot**:
The text and version of one editor document as seen by the Lane LSP Server.
_Avoid_: source file on disk, parser cache

**Full Document Sync**:
The v1 LSP synchronization mode where every relevant document change replaces
the whole Document Snapshot text.
_Avoid_: incremental text edit, range patching

**Workspace Document Store**:
The Lane LSP Server state that maps open document URIs to Document Snapshots.
_Avoid_: compiler symbol table, project module graph

**Editor Diagnostic**:
A source-location diagnostic reported through LSP after converting compiler
diagnostics into editor ranges and severities.
_Avoid_: Buslane verifier error, runtime error report

**Structured Compiler Diagnostic**:
A target-independent `lanec` diagnostic carrying at least a message, optional
source span, and severity before any CLI or LSP rendering.
_Avoid_: formatted error string, LSP diagnostic

**Diagnostics-First LSP**:
The v1 LSP feature scope: initialize the language server, track open document
snapshots, rerun full-file compiler analysis after document changes, and publish
editor diagnostics.
_Avoid_: complete IDE, symbol index

**LSP Protocol Layer**:
The Lane LSP Server layer that owns JSON-RPC framing, request and response
message conversion, and the minimal LSP wire types needed by v1.
_Avoid_: compiler analysis, editor feature handler

**JSON-RPC Framing Library**:
The third-party `gmlewis/jsonrpc2` package used by the LSP Protocol Layer for
JSON-RPC 2.0 messages and LSP-style `Content-Length` framing.
_Avoid_: LSP server framework, method dispatch

**Editor Intelligence**:
Post-v1 editor features such as completion, hover, go-to-definition,
find-references, and document symbols.
_Avoid_: diagnostics, compiler checking

**Desktop Native LSP**:
The v1 deployment model where the Lane VS Code Extension runs on VS Code
Desktop and launches a native Lane LSP Server executable.
_Avoid_: VS Code Web extension, WASM language server

## Relationships

- **IDE Tooling** is part of the Tools Project, not the Compiler Project.
- The **Lane LSP Server** may use host IO, JSON-RPC, stdio, document URIs, and
  workspace state.
- The **Compiler Analysis API** must remain target-independent and must not own
  host file IO, process management, or LSP transport.
- The **Lane VS Code Extension** is responsible for locating, launching, and
  restarting the **Lane LSP Server**.
- During v1 development, the **Lane VS Code Extension** primarily uses the
  configured **LSP Executable Path** and may fall back to repository-local
  development locations.
- The **Lane VS Code Extension** uses a **VS Code Language Client** rather than
  a custom JSON-RPC client.
- The first supported deployment target is **Desktop Native LSP**.
- The first supported feature scope is **Diagnostics-First LSP**.
- v1 **Compiler Analysis API** uses **Single-File Analysis**.
- The **LSP Protocol Layer** uses the **JSON-RPC Framing Library** for wire
  framing and keeps Lane-specific method dispatch in the Lane LSP Server.
- **Editor Intelligence** is a later feature layer built on compiler-analysis
  artifacts and stable editor document state.
- **Document Snapshots** are passed to `lanec` as in-memory source text.
- v1 **Document Snapshots** are maintained through **Full Document Sync**.
- **Editor Diagnostics** are derived from **Structured Compiler Diagnostics**;
  they do not define separate language semantics.
- CLI output and LSP output render the same **Structured Compiler Diagnostics**
  through different presentation layers.

## Example dialogue

> **Dev:** "Should `lanec` read files for LSP diagnostics?"
> **Domain expert:** "No. The **Lane LSP Server** owns files and document
> snapshots; `lanec` exposes a **Compiler Analysis API** over in-memory input."

> **Dev:** "Does v1 need to support VS Code Web?"
> **Domain expert:** "No. v1 uses **Desktop Native LSP**."

> **Dev:** "Should completion and hover be in the first LSP milestone?"
> **Domain expert:** "No. v1 is **Diagnostics-First LSP**; completion and hover
> belong to **Editor Intelligence** after the diagnostic loop is stable."

> **Dev:** "Should the first LSP implementation discover projects?"
> **Domain expert:** "No. v1 uses **Single-File Analysis** with prelude loading."

> **Dev:** "Should the LSP parse compiler diagnostic strings to recover ranges?"
> **Domain expert:** "No. `lanec` produces **Structured Compiler Diagnostics**."

> **Dev:** "Does the JSON-RPC dependency define Lane LSP behavior?"
> **Domain expert:** "No. The **JSON-RPC Framing Library** handles wire
> framing; Lane method handling belongs to the **Lane LSP Server**."

> **Dev:** "Should the VS Code extension implement its own JSON-RPC client?"
> **Domain expert:** "No. It uses the **VS Code Language Client**."

> **Dev:** "Does v1 need incremental text-document edits?"
> **Domain expert:** "No. v1 uses **Full Document Sync**."
