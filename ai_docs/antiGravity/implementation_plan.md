# Implementation Plan - SynapseGPT Local Vector DB Migration

## Overview
This document outlines the comprehensive plan for migrating SynapseGPT from an in-memory retrieval system to a robust, local Vector Database (ChromaDB) solution. It details the completed phases and the roadmap for upcoming features.

## Pre-Migration Features (Completed)
- **Add Citations to LLM Responses**:
    - **Goal**: Enable the LLM to cite the source document when providing answers based on retrieved chunks.
    - **Implementation**:
        - Updated `src/lib/chat/promptBuilder.ts` to instruct the model to use `[Source: Document Name]` format.
        - Updated `src/app/api/chat/stream/route.ts` to inject document names into the retrieval context passed to the LLM.

## Phase 1: Infrastructure Setup (Completed)
- **Goal**: Establish the foundation for local vector storage and embedding generation.
- **Implementation**:
    - Installed `chromadb`, `langchain`, `@langchain/community`, `@langchain/ollama`.
    - Pulled `nomic-embed-text` model via Ollama.
    - Created a test script to verify ChromaDB connectivity and embedding generation.
    - Downgraded Python to 3.11 to ensure compatibility with ChromaDB.
    - Created `migration_tutorial.md` to document the setup process.

## Phase 2: Ingestion Pipeline (Completed)
- **Goal**: Create a reliable pipeline to ingest documents into the vector database.
- **Implementation**:
    - Developed `scripts/ingest.ts` for batch ingestion.
    - Implemented document loading from `docs/` directory.
    - Configured `RecursiveCharacterTextSplitter` (chunk size: 1000, overlap: 200).
    - Integrated Ollama embeddings for vector generation.
    - Successfully indexed initial documents into the `synapse-gpt` collection.

## Phase 3: Retrieval Integration (Completed)
- **Goal**: Connect the Chat API to the new vector database.
- **Implementation**:
    - Created `src/lib/rag/vectorRetriever.ts` adapter to interface with ChromaDB.
    - Updated `src/app/api/chat/stream/route.ts` to use `vectorRetriever` instead of the legacy `simpleRetriever`.
    - Verified that chat responses are generated using context retrieved from ChromaDB.

## Phase 4: Cleanup (Completed)
- **Goal**: Remove obsolete code and finalize documentation.
- **Implementation**:
    - Deleted `src/lib/rag/simpleRetriever.ts`.
    - Updated `README.md` with new architecture details and setup instructions.

## Phase 5: Auto-Ingestion & Uploads (Completed)
- **Goal**: Enable users to upload documents directly from the UI and have them automatically ingested.
- **Implementation**:
    - **Backend**:
        - Refactored ingestion logic into a reusable library: `src/lib/rag/ingestor.ts`.
        - Created `POST /api/upload` endpoint to handle file uploads.
        - Implemented logic to save files to `docs/` (preserving directory structure) and trigger immediate ingestion.
        - Secured the upload path to prevent directory traversal.
    - **Frontend**:
        - Created `UploadModal.tsx` with drag-and-drop support.
        - Implemented multi-file and folder uploads (using `webkitdirectory`).
        - Added a "Target Directory" feature with server-side suggestions (fetched from `/api/docs`).
        - Replaced native dropdown with a custom styled component to match the app theme.
        - Integrated the modal into `DocumentTree.tsx` and ensured the file list auto-refreshes after upload.

## Phase 6: Robust Document Support with Docling (Completed)
- **Goal**: Implement a production-grade document conversion pipeline using **Docling** to handle PDF, Word, PowerPoint, Excel, HTML, and image files with high fidelity (tables, layouts, equations).
- **Architecture**: Hybrid Node.js + Python. The Node.js backend delegates complex file conversion to a specialized Python script using the `docling` library.

- **Implementation**:
    1.  **Python Environment Setup**:
        - Installed `docling` in the existing Python 3.11 virtual environment.
        - All dependencies (PyTorch, transformers, etc.) are managed automatically.
    2.  **Conversion Script**:
        - Created `scripts/convert_doc.py`.
        - Accepts file path as input, outputs Markdown to stdout.
        - Uses Docling's `DocumentConverter` to process files and export to Markdown.
    3.  **Node.js Integration**:
        - Created `src/lib/pythonBridge.ts` to spawn the Python process from the venv.
        - Handles stdout/stderr and error codes for robust error handling.
    4.  **API Update**:
        - Modified `/api/upload/route.ts`:
            - Detects file types using `isSupportedByDocling()`.
            - Calls `pythonBridge` to convert non-Markdown files.
            - Saves converted Markdown to `docs/`.
            - Deletes original file after successful conversion to avoid duplicates.
            - Triggers ingestion on the converted Markdown file.
    5.  **UI Update**:
        - Updated `UploadModal.tsx` to accept all Docling-supported formats:
            - PDF (`.pdf`)
            - Word (`.docx`, `.doc`)
            - PowerPoint (`.pptx`)
            - Excel (`.xlsx`)
            - HTML (`.html`, `.htm`)
            - Images (`.png`, `.jpg`, `.jpeg`)
            - AsciiDoc (`.asciidoc`, `.adoc`)
            - Markdown (`.md`, `.txt`)
        - Updated validation logic and UI text to reflect expanded format support.

**Supported Formats**: PDF, DOCX, PPTX, XLSX, HTML, PNG, JPG, JPEG, AsciiDoc, Markdown, TXT

## Phase 7: Intelligent Document Editor with AI Autocomplete (Completed)
- **Goal**: Transform the document editing experience with inline editing, AI-powered autocomplete, and advanced view modes.
- **Implementation**:
    1.  **Inline Editor Refactor**:
        - Replaced modal-based editing with inline `DocumentEditor.tsx` component.
        - Integrated **CodeMirror 6** for rich text editing with Markdown syntax highlighting.
        - Added keyboard shortcut (Cmd/Ctrl + S) for quick saves.
        - Implemented sticky Save/Cancel buttons for easy access while scrolling.
    2.  **AI Autocomplete (Ghost Text)**:
        - Created `GhostTextExtension.ts` for CodeMirror to provide inline AI suggestions.
        - Implemented debounced API calls to `/api/completion` endpoint.
        - Added keyboard controls: **Tab** to accept, **Esc** to reject suggestions.
        - Implemented type-through behavior and persistent suggestions across cursor movements.
        - Pulled `qwen2.5-coder:1.5b` model for fast, specialized code/text completion.
    3.  **Autocomplete Configuration**:
        - Added comprehensive settings in `SettingsModal.tsx` under new "Editor" tab.
        - Configurable parameters:
            - Enable/Disable toggle
            - Model selection (default: `qwen2.5-coder:1.5b`)
            - Temperature (0.0 - 1.0)
            - Top P (0.0 - 1.0)
            - Max Tokens (10 - 500)
            - Repeat Penalty (1.0 - 2.0)
            - Debounce Delay (100ms - 2000ms)
        - Added quick toggle button (⚡/🚫) in editor toolbar for instant enable/disable.
        - All settings persist in localStorage.
    4.  **Rich Formatting Toolbar**:
        - Implemented comprehensive toolbar with formatting options:
            - Text formatting: Bold, Italic, Strikethrough
            - Lists: Ordered, Unordered, Task Lists
            - Structural: Headings (H1-H3), Blockquotes, Code Blocks
            - Media: Links, Images, Tables
    5.  **Advanced View Modes**:
        - **Edit Mode**: Full CodeMirror editor with syntax highlighting.
        - **Preview Mode**: Rendered Markdown using `MarkdownRenderer.tsx`.
        - **Split View**: Side-by-side edit and preview.
        - **Zen Mode**: Full-screen distraction-free writing.
    6.  **Backend Enhancements**:
        - Updated `ollamaClient.ts` to support model configuration in `streamOllamaCompletion`.
        - Modified `/api/completion/route.ts` to accept and use model parameters from settings.
        - Added support for parallel Ollama requests via `OLLAMA_NUM_PARALLEL` environment variable.
    7.  **Documentation**:
        - Updated `README.md` with editor features and Ollama parallel configuration.
        - Added troubleshooting section for autocomplete blocking issues.
        - Updated `AboutModal.tsx` to reflect all RAG and editor features.

**Key Features**: Inline editing, AI autocomplete with configurable parameters, multiple view modes, rich formatting toolbar, sticky action buttons, keyboard shortcuts.

