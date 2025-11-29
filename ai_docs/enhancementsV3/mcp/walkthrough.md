# Document Conversion MCP Server Walkthrough

I have successfully replaced the fragile `child_process` Python bridge with a robust **MCP Server**.

## Changes Implemented

### 1. New Python MCP Server (`servers/doc-converter`)
- Created a standalone Python project using `mcp` and `docling`.
- Exposes a `convert_document` tool that handles file conversion.
- Runs in its own virtual environment, decoupled from the main app.

### 2. MCP Client for Next.js (`web/src/lib/mcp`)
- Implemented `McpClient` class using `@modelcontextprotocol/sdk`.
- Manages connection lifecycle and tool execution.

### 3. Refactored Bridge (`web/src/lib/pythonBridge.ts`)
- Removed `child_process.spawn` logic.
- Now uses `McpClient` to communicate with the Python server.

## Verification

I created a test script to verify the integration.

### Run the Test
```bash
cd web
npx ts-node --compiler-options '{"module":"commonjs"}' -r tsconfig-paths/register scripts/test-mcp-conversion.ts
```

### Expected Output
```json
Conversion Result: {
  "content": [
    {
      "type": "text",
      "text": "# Hello MCP\n\nThis is a test."
    }
  ],
  "isError": false
}
Test passed!
```

## Next Steps
- You can now safely remove the old `scripts/convert_doc.py` if desired, as the logic is now in `servers/doc-converter/server.py`.
- The `McpClient` can be extended to support other MCP servers (like the Filesystem server we discussed).
