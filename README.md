# SynapseGPT 🧠

SynapseGPT is a **local-first**, privacy-focused AI chat application designed to interact with your personal documents using **Retrieval-Augmented Generation (RAG)**. It runs entirely on your machine, ensuring that your data never leaves your device.

---

## 🚀 Key Features

- **🔒 100% Local**: Powered by [Ollama](https://ollama.com/), running open-source models like Qwen 2.5, GPT-OSS, Llama 3, or Mistral locally.
- **🔎 Semantic Search**: Uses **ChromaDB** (Vector Database) to understand the *meaning* of your queries, not just keyword matching.
- **📚 Smart Citations**: Every answer includes precise citations pointing back to the source document.
- **⚡ Real-time Streaming**: Fast, streaming responses for a fluid chat experience.
- **📝 Intelligent Document Editor**:
    - **Ghost Text Autocomplete**: AI-powered inline code/text completion as you type (Tab to accept, Esc to reject).
    - **Rich Formatting**: Toolbar for Bold, Italic, Lists, Tables, Images, and more.
    - **View Modes**: Switch between **Edit**, **Preview**, and **Split View** (Side-by-Side).
    - **Zen Mode**: Full-screen distraction-free writing experience.
- **📄 Multi-Format Support**: Upload and process PDF, Word, PowerPoint, Excel, HTML, images, and Markdown files.
- **🤖 AI-Powered Conversion**: Uses [Docling](https://github.com/docling-project/docling) to convert documents to high-quality Markdown with preserved structure.
- **📤 Drag-and-Drop Upload**: Easy file and folder uploads with automatic conversion and ingestion.
- **📊 AI Summary Panel**: Collapsible, streaming document summaries with configurable behavior (detail level, tone, question generation).
- **🔄 Document History & Version Control**: Full version tracking with diff/patch viewing, side-by-side comparisons, and timeline browsing.
- **🔗 Document Sharing**: Copy internal and external shareable links to specific documents.
- **⚙️ Granular AI Configuration**: Separate behavioral settings for Chat, Summary, Autocomplete, and QA Agent.
- **🤖 Automated QA Agent**: One-click generation of comprehensive test plans from your PRDs, with background processing and real-time status updates.
- **📡 Live Document Activity**: Top-right activity panel streaming upload, conversion, indexing, delete, and history events via Redis + SSE.

---

## 🏗️ Architecture

SynapseGPT uses a modern RAG pipeline:

1.  **Ingestion**: Documents in `docs/` are read, split into chunks, and embedded using `nomic-embed-text`.
2.  **Storage**: Embeddings are stored locally in **ChromaDB**.
3.  **Retrieval**: When you ask a question, the system finds the most relevant chunks from ChromaDB.
4.  **Generation**: The retrieved context is sent to the Local LLM (via Ollama) to generate an answer with citations.

### Tech Stack
- **Frontend**: Next.js 14 (React, TailwindCSS)
- **Vector DB**: ChromaDB (Local Python Server)
- **Orchestration**: LangChain.js
- **AI Engine**: Ollama
 - **Event Bus**: Redis pub/sub + Server-Sent Events (SSE) for document activity

---

## 📂 Project Structure

```
SynapseGPT/
├── docs/                  # 📄 Place your markdown documents here
├── ai_docs/               # 🤖 AI-generated documentation & implementation plans
├── chroma_db/             # 💾 Local Vector Database storage (generated)
├── venv/                  # 🐍 Python virtual environment for ChromaDB
├── web/                   # 🌐 Next.js Web Application
│   ├── src/
│   │   ├── app/           # App Router pages
│   │   ├── lib/
│   │   │   ├── rag/       # Retrieval logic (vectorRetriever.ts)
│   │   │   └── chat/      # Chat logic & prompt building
│   ├── scripts/           # Backend scripts (ingest.ts, test-retrieval.ts)
│   └── public/
└── README.md
```

---

## ⚡ Quick Start Guide

### Prerequisites
- **Node.js** (v18 or higher)
- **Ollama** (Installed and running)
- **Python 3.11** (Crucial for ChromaDB compatibility)
 - **Redis** (for real-time Document Activity events)

> [!IMPORTANT]
> **Enable Parallel Requests in Ollama**
> By default, Ollama processes one request at a time. To use **Autocomplete** while chatting or generating summaries, you must enable parallel requests.
>
> **Mac/Linux**:
> ```bash
> OLLAMA_NUM_PARALLEL=4 ollama serve
> ```
> **Windows (PowerShell)**:
> ```powershell
> $env:OLLAMA_NUM_PARALLEL=4; ollama serve
> ```

### 1. Setup AI Models
Ensure Ollama is running (ideally with parallel requests enabled), then pull the required models:
```bash
ollama pull gpt-oss:20b  # Or your preferred chat model
ollama pull nomic-embed-text
```

### 2. Start Vector Database
ChromaDB runs as a separate local server.
```bash
# 1. Create & activate virtual env (Python 3.11 required)
python3.11 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install chromadb docling

# 3. Start the Server
chroma run --path ./chroma_db
```
*⚠️ Keep this terminal open! The server runs on `localhost:8000`.*
*Note: Docling is required for PDF/Word conversion. First-time installation may take a few minutes.*

### 3. Start Redis (Document Activity events)

Redis is used as a pub/sub bus for document events (uploads, deletes, indexing, history, UI notifications).

```bash
# macOS (Homebrew)
brew install redis        # if not already installed
redis-server
```

Keep this running so the **Document Activity** panel can receive events.

To **stop** Redis:

- If you started it in a terminal with `redis-server`, press `Ctrl+C` in that terminal.
- If you run it as a Homebrew service, use:

  ```bash
  brew services stop redis
  ```

### 4. Ingest Documents
Process your files from the `docs/` folder into the vector database:
```bash
cd web
npx tsx scripts/ingest.ts
```
*You should see "Ingestion complete!" and a count of chunks indexed.*

### 5. Run the App
In a new terminal, start the web interface:
```bash
cd web
npm install  # Install dependencies if first time
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to start chatting!

---

## 📡 Document Activity & Events

SynapseGPT includes a **Document Activity** panel in the top-right corner of the UI. It shows a live stream of recent actions:

- Uploads, conversions, and indexing into ChromaDB
- Deletes and renames
- History / diff operations
- UI notifications (settings saved, editor actions, etc.)

Under the hood:

- Backend routes emit structured `DocEvent`s into **Redis** channels.
- `/api/docs/[docId]/events` exposes a **Server-Sent Events (SSE)** stream.
- The frontend subscribes once per selected document and renders events in the panel.

Behavior:

- The panel auto-clears after ~5 seconds of **no new events**.
- Hovering over or scrolling the panel **pauses** auto-clear.
- You can manually clear all entries with the **Clear** button.

### Common event types

- `upload:start` – File upload has begun.
- `convert:start` / `convert:complete` – Non-markdown file (e.g. PDF) is being converted to Markdown for indexing.
- `ingest:start` / `ingest:complete` / `ingest:error` – Indexing documents into ChromaDB (including embedding failures).
- `delete:start` / `delete:complete` – Document or folder deleted from disk and vector store.
- `rename:start` / `rename:complete` – Document or folder renamed.
- `history:start` / `history:complete` / `history:error` – History or diff computations.
- `ui:info` / `ui:error` / `ui:settings` – Client-side notifications such as editor actions or settings updates.

> **Note**: Background tasks (like indexing a generated test plan) now emit events to both the new file and the source PRD, ensuring you never miss a status update even if you switch documents.

These events are purely local and flow through Redis on your machine, keeping your workflow observable without leaking data off-device.

---

## 📝 Using the Editor

The built-in document editor offers a powerful writing experience:

### Autocomplete (Ghost Text)
- As you type, the AI suggests completions in grey text.
- **Accept**: Press `Tab`.
- **Reject**: Press `Esc` or keep typing.

### View Modes
- **Edit**: Standard code editor with syntax highlighting.
- **Preview**: Rendered Markdown view to see how your document looks.
- **Split**: Side-by-side view to edit and preview simultaneously.

### Zen Mode
- Click the **Full Screen** icon (arrows) in the toolbar to enter a distraction-free writing mode.
- Press `Esc` or click "Exit Full Screen" to return.

---

---

## 📊 AI Summary

SynapseGPT includes an intelligent summary panel that provides quick overviews of your documents:

### Features
- **Collapsible Panel**: Appears above the document viewer, can be expanded/collapsed
- **Streaming Generation**: Watch the summary being generated in real-time
- **Regenerate**: Click to generate a fresh summary anytime
- **Stop Generation**: Cancel summary generation mid-stream if needed

### Behavioral Configuration
Customize how summaries are generated in Settings → AI Summary Settings:

- **Detail Level**:
  - **Overview**: High-level summary
  - **Detailed**: Summary with examples
  - **Comprehensive**: Exhaustive analysis

- **Tone**:
  - **Professional**: Formal language
  - **Casual**: Conversational style
  - **Tutorial**: Educational approach

- **Question Generation**:
  - **None**: No follow-up questions
  - **Auto**: AI decides based on content
  - **Fixed Count**: Generate specific number of questions (e.g., 5)

---

## 🔄 Document History & Version Control

Every document edit is automatically tracked with full version history:

### Accessing History
1. Open any document in the viewer
2. Click the **"History"** button in the toolbar
3. Browse versions in the sidebar

### Features
- **Timeline View**: See all saved versions with timestamps
- **Diff Viewer**: Side-by-side comparison of any version vs current
- **Patch Viewer**: View exact changes as patch files
- **Filtering**: Show all changes, or filter by high/low priority
- **Full-Screen Mode**: Expand diff/patch view for detailed analysis
- **Reverse Deltas**: Efficient storage using incremental patches

### How It Works
- Every save creates a `.patch` file in `.history/`
- Patches are stored as reverse deltas (from new → old)
- Any version can be reconstructed by applying patches in sequence
- History is automatically indexed for RAG search

---

## 📁 Document Management

### Creating Documents
- **New File**: Click the "+" icon in the document tree → "New File"
- **New Folder**: Click the "+" icon → "New Folder"
- **Drag & Drop**: Drop files or folders directly into the browser

### Organizing Documents
- **Rename**: Right-click any document/folder → "Rename"
- **Delete**: Right-click → "Delete" (with confirmation)
- **Move**: Drag and drop to reorganize (coming soon)

### Sharing Documents
Click the **Share** button (🔗) in the document viewer toolbar:
- **Copy full browser URL**: Share with external users (includes domain)
- **Copy in-app URL**: Share with team members (relative path with `?doc=` parameter)

---

## ⚙️ Advanced Configuration

### Behavioral Settings

SynapseGPT allows you to customize AI behavior for different use cases. Access via **Settings** (gear icon):

#### Chat Settings
Configure how the AI responds in the chat panel:
- **Detail Level**: Overview, Detailed, or Comprehensive
- **Tone**: Professional, Casual, or Tutorial
- **Question Generation**: None, Auto, or Fixed count
- **Allow Outside Document Answers**: Enable/disable responses when context isn't in docs

#### AI Summary Settings
Separate configuration for document summaries (same options as Chat)

#### Editor Autocomplete Settings
- **Enable/Disable**: Toggle ghost text suggestions
- **Model**: Recommended `qwen2.5-coder:1.5b`
- **Debounce Delay**: Wait time before fetching suggestions (100-2000ms)
- **Temperature**: Creativity level (0-1)
- **Top P**: Word choice diversity (0-1)
- **Max Tokens**: Maximum suggestion length
- **Repeat Penalty**: Prevent repetitive text (1.0-2.0)

---

## 🤖 QA Agent & Test Generation

SynapseGPT includes a specialized agent for Quality Assurance:

1.  **One-Click Generation**: Open any PRD (Markdown file) and click the **"🤖 Generate Tests"** button in the toolbar.
2.  **Automated Workflow**: The agent analyzes requirements, generates positive/negative/edge cases, reviews its own plan, and saves it as a new file (e.g., `login_test_cases.md`).
3.  **Background Processing**: Heavy tasks like history saving and vector ingestion happen in the background, keeping the UI responsive.
4.  **Real-time Feedback**: Watch the agent's progress (thoughts, steps) in a dedicated, resizable panel. You'll also receive notifications for background indexing tasks even if you switch files.

---

## ⚙️ Configuration

Environment variables are managed in `web/.env.local`.

| Variable | Default | Description |
| :--- | :--- | :--- |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | URL of your local Ollama instance |
| `CHROMA_DB_URL` | `http://localhost:8000` | URL of the ChromaDB server |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL for document activity events |
| `DOCS_ROOT` | `../docs` | Path to your document folder |

---

## 🔧 Troubleshooting

### "Command not found: chroma"
- **Cause**: You might be using Python 3.14 or a very new version where `pip` installed an old, incompatible ChromaDB.
- **Fix**: Ensure you use **Python 3.11**. Recreate your `venv` using `python3.11 -m venv venv`.

### "Connection Refused" (Ingestion or Chat)
- **Cause**: The ChromaDB server is not running.
- **Fix**: Check the terminal where you ran `chroma run`. If it closed, restart it.

### "PydanticImportError"
- **Cause**: Version mismatch between ChromaDB and Pydantic.
- **Fix**: Run `pip install "pydantic<2.0.0"` in your venv.

### Autocomplete is blocking Chat/Summary
- **Cause**: Ollama is running in single-threaded mode (default).
- **Fix**: Restart Ollama with `OLLAMA_NUM_PARALLEL=4 ollama serve`.

---

## 📚 Further Reading
- [Migration Tutorial](ai_docs/antiGravity/migration_tutorial.md): A detailed log of how we built this system.
- [Optimization Analysis](ai_docs/antiGravity/optimization_analysis.md): Architectural decisions and trade-offs.



brew services start redis
brew services stop redis
