# SynapseGPT Scripts

This directory contains utility scripts for managing and debugging the SynapseGPT RAG system.

## 📋 Script Organization

Scripts are organized with clear prefixes:
- **`rag:`** - RAG ingestion and rebuild operations
- **`db:`** - Database inspection and management
- **`test:`** - Testing and validation scripts

---

## 🔄 RAG Operations

### `npm run rag:ingest`
Ingests documents from the configured docs directory into ChromaDB.
- **File**: `scripts/ingest.ts`
- **Purpose**: Index `.md`, `.txt`, and `.mdx` files for RAG retrieval
- **Environment**: Uses `DOCS_ROOT` from `.env.local` or defaults to `../docs`
- **Behavior**: Adds/updates documents in existing collection

### `npm run rag:rebuild-docs`
Clears and rebuilds the documents collection.
- **File**: `scripts/rebuild-docs-db.ts`
- **Purpose**: Reset and re-ingest all documents from scratch
- **Steps**:
  1. Deletes the `synapse-gpt` collection
  2. Re-ingests all documents from `DOCS_ROOT`
- **Usage**: Run when you need a fresh start or after changing chunking logic

### `npm run rag:rebuild-history`
Clears and rebuilds the history patches collection.
- **File**: `scripts/rebuild-history-db.ts`
- **Purpose**: Reset and re-ingest all history patches with updated summarization
- **Steps**:
  1. Deletes the `history_patches` collection
  2. Re-ingests all `.history` files with new summaries
- **Usage**: Run after changing history summarization logic

---

## 🗄️ Database Management

### `npm run db:inspect`
Inspects all ChromaDB collections and their contents.
- **File**: `scripts/inspect-chroma-db.ts`
- **Purpose**: View collection statistics and sample documents
- **Output**: Shows collection names, document counts, and sample metadata
- **Usage**: Run to debug what's in your database

### `npm run db:clear`
Clears all ChromaDB collections.
- **File**: `scripts/clear-chroma-db.ts`
- **Purpose**: Delete all collections for a complete reset
- **Warning**: This removes ALL data from ChromaDB
- **Usage**: Run before a complete rebuild or when troubleshooting

---

## 🧪 Testing & Validation

### `npm run test:ollama`
Tests the Ollama connection and embedding generation.
- **File**: `scripts/test-ollama-connection.ts`
- **Purpose**: Verify Ollama is running and can generate embeddings
- **Output**: Lists available models and tests `nomic-embed-text` embeddings
- **Usage**: Run when debugging connection issues or before ingestion

### `npm run test:rag-docs`
Tests the document retrieval system.
- **File**: `scripts/test-retrieval.ts`
- **Purpose**: Verify that RAG retrieval is working correctly
- **Usage**: Run after ingesting documents to test search functionality

### `npm run test:rag-history`
Tests the comprehensive history RAG system.
- **File**: `scripts/test-comprehensive-history.ts`
- **Purpose**: Verify that history patch retrieval is working correctly
- **Usage**: Run after creating document history to test history search

---

## 🛠️ Common Workflows

### Initial Setup
```bash
# 1. Test Ollama connection
npm run test:ollama

# 2. Inspect database (should be empty)
npm run db:inspect

# 3. Ingest documents
npm run rag:ingest

# 4. Test retrieval
npm run test:rag-docs
```

### Complete Reset
```bash
# 1. Clear all collections
npm run db:clear

# 2. Rebuild documents
npm run rag:rebuild-docs

# 3. Rebuild history (if applicable)
npm run rag:rebuild-history

# 4. Verify with inspection
npm run db:inspect
```

### Debugging ChromaDB Issues

If you encounter ChromaDB errors:

1. **Check if ChromaDB is running**:
   ```bash
   ps aux | grep chroma
   ```

2. **Restart ChromaDB** (from project root):
   ```bash
   # Kill existing process
   pkill -f "chroma run"
   
   # Start fresh
   ./venv/bin/chroma run --path ./chroma_db
   ```

3. **Inspect the database**:
   ```bash
   npm run db:inspect
   ```

4. **If database is corrupted, reset**:
   ```bash
   # Stop ChromaDB first
   pkill -f "chroma run"
   
   # Delete database directory
   rm -rf ../chroma_db/
   
   # Restart ChromaDB
   ./venv/bin/chroma run --path ./chroma_db
   
   # Rebuild collections
   npm run rag:rebuild-docs
   npm run rag:rebuild-history
   ```

---

## 📝 Environment Variables

All scripts use the following environment variables from `.env.local`:

- `CHROMA_DB_URL`: ChromaDB server URL (default: `http://localhost:8000`)
- `OLLAMA_BASE_URL`: Ollama server URL (default: `http://localhost:11434`)
- `DOCS_ROOT`: Path to documents directory (default: `../docs`)

---

## 🚨 Troubleshooting

### "500: Internal Server Error" from ChromaDB
- ChromaDB is running but the database directory doesn't exist
- **Solution**: Restart ChromaDB to recreate the directory

### "ENOENT: no such file or directory"
- The `DOCS_ROOT` path is incorrect
- **Solution**: Check `.env.local` or create the docs directory

### "Connection refused" errors
- ChromaDB or Ollama is not running
- **Solution**: Start the required service

### Embedding dimension mismatch
- Collection was created with a different embedding model
- **Solution**: Run `npm run db:clear` and rebuild collections

---

## 📚 Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run rag:ingest` | Add/update documents in ChromaDB |
| `npm run rag:rebuild-docs` | Clear & rebuild document collection |
| `npm run rag:rebuild-history` | Clear & rebuild history collection |
| `npm run db:inspect` | View all collections & their contents |
| `npm run db:clear` | Delete all collections |
| `npm run test:ollama` | Test Ollama connection |
| `npm run test:rag-docs` | Test document retrieval |
| `npm run test:rag-history` | Test history retrieval |

