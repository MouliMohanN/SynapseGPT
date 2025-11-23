# SynapseGPT Project Summary

## 1. Executive Summary
**SynapseGPT** is a local-first, privacy-focused AI chat and document editing application. It leverages **Retrieval-Augmented Generation (RAG)** to allow users to chat with their personal documents without data leaving their machine. It features a rich markdown editor with AI-powered autocomplete ("Ghost Text") and a robust document history system.

**Key Value Props:**
- **100% Local**: Runs on Ollama and local ChromaDB.
- **Smart Editor**: Notion-style markdown editor with AI completion.
- **RAG Integration**: Chat answers are grounded in your documents with citations.
- **Multi-Format**: Supports PDF, Word, Excel, etc., via Docling conversion.

## 2. Architecture Overview

The application is built as a **Next.js 14** full-stack app. It interfaces with local AI services (Ollama) and a vector database (ChromaDB).

```mermaid
graph TD
    User[User] -->|Web UI| NextJS[Next.js App (Frontend + API)]
    
    subgraph "Local Machine"
        NextJS -->|Chat Stream| Ollama[Ollama (LLM)]
        NextJS -->|Store/Retrieve| Chroma[ChromaDB (Vector Store)]
        NextJS -->|Read/Write| FS[File System (Docs)]
        
        subgraph "Ingestion Pipeline"
            FS -->|Raw Files| Docling[Docling Converter]
            Docling -->|Markdown| Splitter[Text Splitter]
            Splitter -->|Chunks| Embed[Ollama Embeddings]
            Embed -->|Vectors| Chroma
        end
    end
```

## 3. Core Components Analysis

### 3.1 Frontend Layer (`web/src/app`, `web/src/components`)
- **Framework**: Next.js 14 (App Router), React 19.
- **Styling**: Tailwind CSS v4.
- **State Management**: React Context (`AppContext`) for global state, local state for components.
- **Editor**: Built on **CodeMirror 6** (`@uiw/react-codemirror`).
    - **Ghost Text**: Custom CodeMirror extension (`GhostTextExtension.ts`) that fetches AI completions and overlays them as "ghost" text (greyed out) which can be accepted with Tab.
    - **Markdown Rendering**: `react-markdown` with GFM support for preview mode.
- **History UI**: Sidebar listing versions, with a `DiffViewer` and `PatchViewer` to visualize changes using `diff` library.

### 3.2 Backend API Layer (`web/src/app/api`)
- **Chat Streaming** (`/api/chat/stream`):
    - Orchestrates the chat flow.
    - Fetches conversation history.
    - Performs RAG retrieval (if enabled).
    - Builds a system prompt with context.
    - Streams response from Ollama to the client.
- **Document Management**:
    - CRUD operations for documents.
    - History endpoints (`/api/docs/[id]/history`) to fetch past versions.
    - Upload endpoint handles file ingestion.

### 3.3 AI & RAG Engine (`web/src/lib`)
- **LLM Client**: `ollamaClient.ts` manages streaming connections to the local Ollama instance.
- **Vector Store**: `vectorRetriever.ts` and `ingestor.ts` handle interaction with ChromaDB using LangChain.js.
    - **Embeddings**: `nomic-embed-text` model via Ollama.
    - **Retrieval**: Similarity search with score thresholding.
- **Ingestion**:
    - Files are converted to Markdown using a Python script (`scripts/convert_doc.py`) invoking **Docling**.
    - Content is split into chunks (default 1000 chars, 200 overlap).
    - Chunks are embedded and stored in ChromaDB.

### 3.4 Data Storage
- **Documents**: Stored as flat files (Markdown) in the `docs/` directory.
- **Vector Data**: Stored in `chroma_db/` (SQLite + Parquet).
- **History**: Likely stored as reverse deltas or patches alongside documents (based on `history.ts` logic, though specific storage implementation details were in `lib/history.ts` which handles the logic).

## 4. Key Features Deep Dive

### 👻 Ghost Text Autocomplete
- **Trigger**: Typing in the editor triggers a debounced request to Ollama.
- **Context**: Sends the preceding text (cursor context) to the model.
- **UI**: Uses CodeMirror's `StateField` and `Decoration` to render the suggestion inline without modifying the actual document text until accepted.

### 🕰️ Document History
- **Versioning**: Every save creates a "version".
- **Storage**: Efficiently stores changes using patches (diffs) rather than full copies (implied by `PatchViewer` and `DiffViewer`).
- **Visualization**:
    - **Diff View**: Side-by-side comparison of old vs new.
    - **Patch View**: Raw unified diff output.
    - **Filtering**: Can filter changes by "importance" (High/Low priority).

### 🔍 RAG Pipeline
1.  **Query**: User asks a question.
2.  **Retrieval**: System embeds the query and searches ChromaDB for top 4 relevant chunks.
3.  **Augmentation**: Retrieved chunks are formatted as `Source: ... Content: ...` and appended to the system prompt.
4.  **Generation**: LLM generates answer citing the sources.

## 5. Project Structure Map

| Directory | Purpose |
| :--- | :--- |
| `web/` | Main Next.js Application |
| `├── src/app/` | App Router Pages & API Routes |
| `├── src/components/` | React UI Components (Editor, Chat, History) |
| `├── src/lib/` | Core Logic (RAG, Chat, Parsers) |
| `│   ├── chat/` | Ollama client, prompt builders |
| `│   ├── rag/` | Vector store & ingestion logic |
| `docs/` | User's personal documents (Knowledge Base) |
| `chroma_db/` | Local Vector Database storage |
| `ai_docs/` | Project documentation & AI plans |
| `scripts/` | Python scripts (Docling conversion) |

## 6. Getting Started Prerequisites
- **Node.js** v18+
- **Python 3.11** (for ChromaDB)
- **Ollama** running with `OLLAMA_NUM_PARALLEL=4` (for concurrent chat + autocomplete).
