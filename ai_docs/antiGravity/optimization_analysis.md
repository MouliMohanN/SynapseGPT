# Retriever Optimization Analysis

## Current Status: Not Optimized
The current implementation in `simpleRetriever.ts` is designed for small-scale, local usage (e.g., < 50 documents). It is **NOT** suitable for thousands of documents.

### Bottlenecks
1.  **On-the-Fly Indexing**: The TF-IDF index is rebuilt from scratch for *every single query*.
    - **Impact**: CPU usage spikes and latency increases linearly with the number of documents.
2.  **In-Memory Storage**: All document content and chunks are loaded into RAM.
    - **Impact**: For thousands of documents, this will likely cause the application to crash (OOM) or become unresponsive.
3.  **Linear Search**: Ranking involves calculating cosine similarity against every chunk in the corpus.
    - **Impact**: Search time grows linearly (O(N)) with the total number of chunks.

## Proposed Solution: Vector Database

To scale to thousands of documents, we must move to a **Vector Database** (RAG) architecture.

### Architecture Changes
1.  **Ingestion Pipeline**:
    - Create a separate process to chunk documents and generate **Embeddings** (vector representations) using a local model (e.g., `nomic-embed-text` via Ollama).
    - Store these embeddings in a persistent Vector DB (e.g., **ChromaDB**, **LanceDB**, or **pgvector**).
2.  **Retrieval**:
    - Query the Vector DB directly. This uses Approximate Nearest Neighbor (ANN) search, which is extremely fast (sub-millisecond) even for millions of vectors.
3.  **Persistence**:
    - The index is saved to disk, so it doesn't need to be rebuilt on restart or per request.

### Recommended Stack
- **Embeddings**: `nomic-embed-text` (via Ollama) - High quality, local, fast.
- **Vector DB**: `ChromaDB` (runs locally, easy to integrate with Python/JS) or `LanceDB` (serverless, file-based).
- **Orchestration**: `LangChain` or `LlamaIndex` (optional, but simplifies integration).

## Next Steps
1.  Select a Vector DB (ChromaDB is recommended for local setups).
2.  Implement an ingestion script to process existing documents.
3.  Replace `simpleRetriever.ts` with a client that queries the Vector DB.
