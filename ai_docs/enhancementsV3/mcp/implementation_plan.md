# Document Conversion MCP Server Implementation Plan

# Goal Description
Replace the current fragile "Python Bridge" (which uses `child_process.spawn` to run a script) with a robust **Model Context Protocol (MCP) Server**. This will decouple the Node.js backend from the Python environment, improve error handling, and allow the document conversion logic to run as a persistent, sandboxed service.

## User Review Required
> [!IMPORTANT]
> **Architecture Change**: We will introduce a new top-level directory `servers/` to house MCP servers. This keeps them separate from the `web/` frontend/backend code.

## Proposed Changes

### 1. New Python MCP Server
Location: `servers/doc-converter/`

#### [NEW] [server.py](file:///Users/moulimohann/projects/llms/SynapseGPT/servers/doc-converter/server.py)
- **Dependencies**: `mcp`, `docling`.
- **Functionality**:
    - Expose a tool `convert_document(path: str) -> str`.
    - Handle the `docling` conversion logic (migrated from [scripts/convert_doc.py](file:///Users/moulimohann/projects/llms/SynapseGPT/scripts/convert_doc.py)).
    - Implement proper error handling and logging.

#### [NEW] [pyproject.toml](file:///Users/moulimohann/projects/llms/SynapseGPT/servers/doc-converter/pyproject.toml)
- Define dependencies and project metadata.

### 2. Next.js MCP Client Integration
Location: `web/src/lib/mcp/`

#### [NEW] [McpClient.ts](file:///Users/moulimohann/projects/llms/SynapseGPT/web/src/lib/mcp/McpClient.ts)
- **Dependencies**: `@modelcontextprotocol/sdk`.
- **Functionality**:
    - Manage the connection to the Python MCP server (stdio transport).
    - Provide a generic `callTool` method.
    - Handle server lifecycle (start/stop).

#### [MODIFY] [package.json](file:///Users/moulimohann/projects/llms/SynapseGPT/web/package.json)
- Add `@modelcontextprotocol/sdk` dependency.

### 3. Refactor Existing Bridge
Location: `web/src/lib/`

#### [MODIFY] [pythonBridge.ts](file:///Users/moulimohann/projects/llms/SynapseGPT/web/src/lib/pythonBridge.ts)
- **Change**: Remove `child_process.spawn` logic.
- **New Logic**: Instantiate `McpClient` and call the `convert_document` tool.
- **Fallback**: (Optional) Keep the old logic as a fallback or remove it entirely? **Decision: Remove it to enforce the new architecture.**

## Verification Plan

### Automated Tests
1.  **Unit Test**: Create a test script `web/scripts/test-mcp-conversion.ts` that:
    - Instantiates the `McpClient`.
    - Connects to the local `doc-converter` server.
    - Sends a sample PDF/Markdown file path.
    - Asserts that Markdown content is returned.

### Manual Verification
1.  **End-to-End**:
    - Start the Next.js dev server.
    - Upload a document via the SynapseGPT UI.
    - Verify that the ingestion process completes successfully using the new MCP path.
