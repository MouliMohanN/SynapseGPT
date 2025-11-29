import { McpClient } from "../src/lib/mcp/McpClient";
import * as path from "path";
import * as fs from "fs";

async function main() {
  try {
    console.log("Starting MCP Conversion Test...");

    const serverDir = path.resolve(process.cwd(), "..", "servers", "doc-converter");
    const venvPython = path.join(serverDir, ".venv", "bin", "python3");
    const serverScript = path.join(serverDir, "server.py");

    console.log(`Server Dir: ${serverDir}`);
    console.log(`Python Path: ${venvPython}`);
    console.log(`Server Script: ${serverScript}`);

    if (!fs.existsSync(venvPython)) {
      throw new Error(`Python interpreter not found at ${venvPython}`);
    }

    const client = new McpClient(
      "doc-converter",
      "0.1.0",
      venvPython,
      [serverScript]
    );

    console.log("Connecting to MCP server...");
    await client.connect();
    console.log("Connected!");

    // Create a dummy file to convert
    const dummyFile = path.resolve(process.cwd(), ".tmp", "test.md");
    if (!fs.existsSync(path.dirname(dummyFile))) {
      fs.mkdirSync(path.dirname(dummyFile), { recursive: true });
    }
    fs.writeFileSync(dummyFile, "# Hello MCP\nThis is a test.");

    console.log(`Converting file: ${dummyFile}`);
    const result = await client.callTool("convert_document", {
      path: dummyFile,
    });

    console.log("Conversion Result:", JSON.stringify(result, null, 2));

    await client.close();
    console.log("Test passed!");

  } catch (error) {
    console.error("Test failed:", error);
    process.exit(1);
  }
}

main();
