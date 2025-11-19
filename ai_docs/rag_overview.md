# Retrieval-Augmented Generation (RAG) Layer

## What We Shipped
- **Retriever:** `web/src/lib/rag/simpleRetriever.ts` chunks each document’s raw text (default 1,200 chars, 200 overlap), builds a TF-IDF index, and returns the top-k chunks by cosine similarity to the query.
- **API Integration:** `web/src/app/api/chat/stream/route.ts` now calls `retrieveRelevantChunks`, formats the best matches, and passes them into the system prompt via the new `retrievalContext` hook in `promptBuilder`.
- **Prompting:** `buildSystemPrompt` appends a `RETRIEVED EXCERPTS` section so the model can cite specific matches alongside the document/section context.

## Default Configuration
| Setting | Default | Description |
| --- | --- | --- |
| `chunkSize` | 1200 chars | Max length of each text slice before scoring. |
| `chunkOverlap` | 200 chars | How much context each chunk shares with the previous chunk to avoid boundary issues. |
| `topK` | 4 | Number of highest-scoring chunks injected per query. |
| `minScore` | 0.05 | Cutoff to drop low-signal chunks. |

These knobs can be overridden through the `RetrieveOptions` parameter if we build advanced UI or experiment scripts later.

## Operational Notes
1. **Caching:** Chunked documents are cached in-memory (per server process) with their chunk params; change `chunkSize`/`chunkOverlap` to invalidate.
2. **Doc Scope:** Passing `docIds` limits retrieval to the currently open document; omit it to search the full tree.
3. **Fallbacks:** If no query tokens or documents are available, the retriever returns an empty array and the chat route simply omits the `RETRIEVED EXCERPTS` block.

## Future Ideas
1. Swap TF-IDF for embeddings (e.g., local MiniLM + cosine sim) once we add a vector store.
2. Persist chunk cache on disk or warm it during boot for faster first queries.
3. Surface retrieval debug info in the UI (e.g., show which chunks were injected) to build user trust.
4. Tune chunk sizes per file type (Markdown sections vs. prose vs. tables).
