# SynapseGPT Vector DB Migration Tutorial

This document tracks the migration of SynapseGPT's retrieval system from a simple in-memory solution to a scalable Vector Database architecture.

## Phase 1: Infrastructure Setup

### **1. What we did**
We set up the foundational tools required for vector search: a database to store vectors and an AI model to create them.

### **2. Why we did it**
- **Scalability**: The old system loaded all text into RAM and re-calculated indices on every request. This crashes with thousands of documents.
- **Semantic Search**: Vector databases allow searching by *meaning* (e.g., "dog" matches "puppy"), whereas the old system only matched exact keywords.
- **Persistence**: Data is saved to disk, so we don't need to re-process documents every time the server restarts.

### **3. How we did it**

#### Step 1: Install Dependencies
We installed the necessary libraries for our Next.js app.
```bash
npm install chromadb langchain @langchain/community @langchain/ollama
```
*Note: We used `--legacy-peer-deps` to resolve some version conflicts with LangChain.*

- **`chromadb`**: The client for our local vector database.
- **`langchain`**: A framework that simplifies working with LLMs and vector stores.
- **`@langchain/ollama`**: The specific adapter to talk to our local Ollama instance.

#### Step 2: Pull Embedding Model
We downloaded the AI model responsible for converting text into numbers (vectors).
```bash
ollama pull nomic-embed-text
```
- **`nomic-embed-text`**: A high-quality, open-source embedding model that runs fast on local hardware.

#### Step 3: Start ChromaDB Server (Manual)
Since we are using the JavaScript client, we need to run the ChromaDB backend separately.

**Important:** ChromaDB requires a stable Python version. If you are on Python 3.14, you must use Python 3.11.

1.  **Install Python 3.11** (via Homebrew):
    ```bash
    brew install python@3.11
    ```

2.  **Create Virtual Environment**:
    ```bash
    # Create new venv with Python 3.11
    python3.11 -m venv venv
    source venv/bin/activate
    ```

3.  **Install ChromaDB**:
    ```bash
    pip install chromadb
    ```

4.  **Start the Server**:
    ```bash
    chroma run --path ./chroma_db
    ```
    *Keep this terminal open. The server runs on localhost:8000.*

---

## Phase 2: Ingestion Pipeline

### **1. What we did**
We built a script (`scripts/ingest.ts`) that:
1.  **Scans** your `docs/` folder for markdown files.
2.  **Chunks** them into smaller pieces (1000 characters).
3.  **Embeds** them using the `nomic-embed-text` model via Ollama.
4.  **Indexes** them into your local ChromaDB server.

### **2. Why we did it**
- **Chunking**: LLMs have a context limit. We can't feed them entire books. Breaking text into chunks allows us to retrieve only the relevant parts.
- **Embedding**: Converting text to vectors allows us to find "semantically similar" content later.
- **Indexing**: Storing these vectors in ChromaDB makes searching them instant.

### **3. How we did it**
We ran the script using `tsx` (a TypeScript executor):
```bash
npx tsx scripts/ingest.ts
```
*Result: Successfully indexed 26 documents into 138 chunks.*

---

## Challenges Encountered & Troubleshooting
During the setup of Phase 2, we encountered several environment hurdles. Here is how we solved them:

### 1. Python Version Incompatibility
- **Issue**: The user was running **Python 3.14** (bleeding edge).
- **Impact**: ChromaDB does not yet support Python 3.14. `pip` fell back to an ancient version (0.3.23) which lacked the `chroma` CLI command.
- **Solution**: We installed **Python 3.11** via Homebrew (`brew install python@3.11`) to use a stable, supported environment.

### 2. Pydantic Version Conflict
- **Issue**: The older ChromaDB version (0.3.23) required Pydantic v1, but the system had Pydantic v2 installed.
- **Impact**: The server crashed with `PydanticImportError`.
- **Solution**: By switching to Python 3.11 and reinstalling `chromadb` fresh, we got the latest compatible version which works with modern Pydantic.

### 3. Gitignore Confusion
- **Issue**: Generated files (`venv/`, `chroma_db/`) were showing up in git.
- **Cause**: The project had a `.gitignore` inside `web/`, but these files were in the **root**.
- **Solution**: Created a new `.gitignore` in the project root to explicitly exclude `venv/` and `chroma_db/`.

---

## Phase 3: Retrieval Integration (Coming Next)
We will update the chat API (`route.ts`) to query ChromaDB instead of the old in-memory index. This will connect the "brain" (LLM) to our new "long-term memory" (Vector DB).
