import { spawn } from "child_process";
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
 * Convert a document to Markdown using the Python Docling script.
 * 
 * @param inputPath - Absolute path to the input document
 * @returns Promise with conversion result
 */
export async function convertDocumentToMarkdown(
  inputPath: string
): Promise<ConversionResult> {
  return new Promise((resolve) => {
    const scriptPath = path.resolve(process.cwd(), "..", "scripts", "convert_doc.py");
    // Use venv's Python interpreter
    const pythonPath = path.resolve(process.cwd(), "..", "venv", "bin", "python3");
    
    // Spawn Python process
    const pythonProcess = spawn(pythonPath, [scriptPath, inputPath]);
    
    let stdout = "";
    let stderr = "";
    
    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    
    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    
    pythonProcess.on("close", (code) => {
      if (code === 0) {
        resolve({
          success: true,
          markdown: stdout,
        });
      } else {
        resolve({
          success: false,
          error: stderr || `Python process exited with code ${code}`,
        });
      }
    });
    
    pythonProcess.on("error", (error) => {
      resolve({
        success: false,
        error: `Failed to spawn Python process: ${error.message}`,
      });
    });
  });
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
