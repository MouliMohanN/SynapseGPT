# SynapseGPT 🧠

SynapseGPT is a **local-first**, privacy-focused AI chat application designed to interact with your personal documents using **Retrieval-Augmented Generation (RAG)**. It runs entirely on your machine, ensuring that your data never leaves your device.

---

## 🚀 Key Features

- **🔒 100% Local**: Powered by [Ollama](https://ollama.com/), running open-source models like Llama 3 or Mistral locally.
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

### 3. Ingest Documents
Process your files from the `docs/` folder into the vector database:
```bash
cd web
npx tsx scripts/ingest.ts
```
*You should see "Ingestion complete!" and a count of chunks indexed.*

### 4. Run the App
In a new terminal, start the web interface:
```bash
cd web
npm install  # Install dependencies if first time
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to start chatting!

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

## ⚙️ Configuration

Environment variables are managed in `web/.env.local`.

| Variable | Default | Description |
| :--- | :--- | :--- |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | URL of your local Ollama instance |
| `CHROMA_DB_URL` | `http://localhost:8000` | URL of the ChromaDB server |
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
