#!/usr/bin/env python3
"""
Document Converter using Docling
Converts various document formats (PDF, DOCX, PPTX, XLSX, HTML, images) to Markdown.
"""

import sys
import argparse
from pathlib import Path
from docling.document_converter import DocumentConverter

def convert_to_markdown(input_path: str) -> str:
    """
    Convert a document to Markdown using Docling.
    
    Args:
        input_path: Path to the input document
        
    Returns:
        Markdown content as string
        
    Raises:
        Exception: If conversion fails
    """
    try:
        # Initialize the converter
        converter = DocumentConverter()
        
        # Convert the document
        result = converter.convert(input_path)
        
        # Export to Markdown
        markdown_content = result.document.export_to_markdown()
        
        return markdown_content
        
    except Exception as e:
        raise Exception(f"Failed to convert document: {str(e)}")

def main():
    parser = argparse.ArgumentParser(description="Convert documents to Markdown using Docling")
    parser.add_argument("input_file", help="Path to the input document")
    parser.add_argument("--output", "-o", help="Output file path (optional, prints to stdout if not provided)")
    
    args = parser.parse_args()
    
    try:
        # Convert the document
        markdown = convert_to_markdown(args.input_file)
        
        # Output the result
        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(markdown)
            print(f"Successfully converted to {args.output}", file=sys.stderr)
        else:
            # Print to stdout for Node.js to capture
            print(markdown)
            
        sys.exit(0)
        
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
