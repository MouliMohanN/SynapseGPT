


/**
 * Result of document conversion
 */
export interface ConversionResult {
  success: boolean;
  markdown?: string;
  error?: string;
}

/**
 * Convert a document to Markdown using the Python Docling script.
 * 
 * @param inputPath - Absolute path to the input document
 * @returns Promise with conversion result
 */
import { McpClient } from "./mcp/McpClient";
import * as path from "path";

/**
 * Result of document conversion
 */
export interface ConversionResult {
  success: boolean;
  markdown?: string;
  error?: string;
}

/**
 * Convert a document to Markdown using the Python Docling MCP Server.
 * 
 * @param inputPath - Absolute path to the input document
 * @returns Promise with conversion result
 */
export async function convertDocumentToMarkdown(
  inputPath: string
): Promise<ConversionResult> {
  try {
    // Path to the Python virtual environment and server script
    // We assume the server is located at servers/doc-converter
    const serverDir = path.resolve(process.cwd(), "..", "servers", "doc-converter");
    const venvPython = path.join(serverDir, ".venv", "bin", "python3");
    const serverScript = path.join(serverDir, "server.py");

    // Instantiate MCP Client
    const client = new McpClient(
      "doc-converter",
      "0.1.0",
      venvPython,
      [serverScript]
    );

    // Connect and call the tool
    await client.connect();
    
    const result = await client.callTool("convert_document", {
      path: inputPath,
    });

    // Close the connection (or keep it open if we want to reuse it, 
    // but for now we close it to avoid zombie processes)
    await client.close();

    // The tool returns the markdown string directly as content
    // Note: The SDK response format might need adjustment depending on exact return shape
    // Usually it returns { content: [{ type: "text", text: "..." }] }
    // But let's assume for now we need to parse the result.
    // Actually, the SDK `callTool` returns a CallToolResult.
    
    const content = (result as any).content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response format from MCP server");
    }

    return {
      success: true,
      markdown: content.text,
    };

  } catch (error: any) {
    console.error("MCP Conversion Error:", error);
    return {
      success: false,
      error: error.message || "Unknown error during conversion",
    };
  }
}

/**
 * Check if a file type is supported by Docling
 */
export function isSupportedByDocling(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  const supportedExtensions = [
    ".pdf",
    ".docx",
    ".doc",
    ".pptx",
    ".xlsx",
    ".html",
    ".htm",
    ".png",
    ".jpg",
    ".jpeg",
    ".asciidoc",
    ".adoc",
  ];
  
  return supportedExtensions.includes(ext);
}
