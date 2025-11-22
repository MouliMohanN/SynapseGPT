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

## Phase 6: Robust Document Support with Docling (Upcoming)
- **Goal**: Implement a production-grade document conversion pipeline using **Docling** to handle PDF and Word documents with high fidelity (tables, layouts, equations).
- **Architecture**: Hybrid Node.js + Python. The Node.js backend will delegate complex file conversion to a specialized Python script using the `docling` library.

- **Proposed Changes**:
    1.  **Python Environment Setup**:
        - Install `docling` in the existing Python environment.
        - Ensure `torch` and other dependencies are compatible.
    2.  **Conversion Script**:
        - Create `scripts/convert_doc.py`.
        - Input: Path to source file (PDF/DOCX).
        - Output: Converted Markdown content (stdout or file).
        - Logic: Use `DocumentConverter` to process the file and export to Markdown.
    3.  **Node.js Integration**:
        - Create `src/lib/pythonBridge.ts` to spawn the Python process.
        - Handle stdout/stderr and error codes.
    4.  **API Update**:
        - Modify `/api/upload/route.ts`:
            - Detect `.pdf`, `.doc`, `.docx`.
            - Call `pythonBridge` to convert the file.
            - Save the generated Markdown to `docs/`.
            - Trigger ingestion on the *converted* Markdown file.
    5.  **UI Update**:
        - Update `UploadModal.tsx` to accept `.pdf`, `.doc`, `.docx`.
        - Add loading state feedback (conversion might take a few seconds).
