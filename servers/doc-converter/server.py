from mcp.server.fastmcp import FastMCP
from docling.document_converter import DocumentConverter
import sys
import traceback

# Initialize FastMCP server
mcp = FastMCP("doc-converter")

@mcp.tool()
def convert_document(path: str) -> str:
    """
    Convert a document to Markdown using Docling.
    
    Args:
        path: Absolute path to the input document (PDF, DOCX, etc.)
        
    Returns:
        The converted Markdown content.
    """
    try:
        # Initialize the converter
        # Note: In a production server, we might want to cache this or reuse it
        # if initialization is expensive, but for now we instantiate per request
        # to ensure clean state.
        converter = DocumentConverter()
        
        # Convert the document
        result = converter.convert(path)
        
        # Export to Markdown
        markdown_content = result.document.export_to_markdown()
        
        return markdown_content
        
    except Exception as e:
        # Log the full error to stderr (which MCP client can capture/log)
        print(f"Error converting document {path}: {str(e)}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        
        # Re-raise or return error message. 
        # For MCP tools, raising an exception usually results in a tool error.
        raise RuntimeError(f"Failed to convert document: {str(e)}")

if __name__ == "__main__":
    # Run the server using stdio transport
    mcp.run(transport='stdio')
