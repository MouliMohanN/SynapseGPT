# Purpose of the Retrieval-Augmented Generation Layer

## Why We Added It
1. **Prevent hallucinations:** The LLM previously relied solely on doc-level context, which encouraged broad answers and occasional inaccuracies. RAG keeps responses grounded in real repository content.
2. **Handle long documents:** Many Markdown guides exceed safe prompt sizes. Chunking lets us send just the relevant slices instead of the entire file.
3. **Unlock cross-document answers:** Even when a doc isn’t explicitly selected, the retriever can surface snippets from any file. This prepares SynapseGPT for knowledge-wide Q&A.
4. **Improve streaming quality:** More focused context means fewer truncations and better coherence at higher temperatures/maxTokens.

## What Was Built
- A reusable retriever (`web/src/lib/rag/simpleRetriever.ts`) that:
  - Splits docs into overlapping chunks.
  - Builds TF-IDF vectors and scores them via cosine similarity.
  - Caches chunks per document so repeated queries stay fast.
- Chat API integration (`web/src/app/api/chat/stream/route.ts`) that:
  - Calls the retriever on every query.
  - Formats the top chunks into a `RETRIEVED EXCERPTS` block for the model.
- Prompt plumbing (`web/src/lib/chat/promptBuilder.ts`) to accept `retrievalContext` so the system prompt can quote the retrieved text alongside the selected doc/section.

## How It Works (End-to-End)
1. **User prompts** through ChatPanel with the current doc selection.
2. **API loads documentContext** (existing doc/section extraction).
3. **Retriever runs**:
   - Loads requested doc(s) or the entire docs tree via `getDocsTree` + `getDocumentContentById`.
   - Splits into 1,200-char chunks with 200-char overlap.
   - Builds TF-IDF vectors, caches them, and ranks against the user query.
4. **Top chunks injected** into the system prompt in priority order, showing score and doc origin.
5. **LLM streams response** with higher fidelity because it now sees the doc snippet plus retrieved excerpts.
6. **History updated** as before; no UI changes required.

## Additional Information
- **Configurability:** `RetrieveOptions` allows tweaking chunk size, overlap, topK, minScore, and doc scopes. Future UI toggles can surface these.
- **Performance:** Chunk caches live in-memory per server instance. Changing chunk parameters invalidates the cache automatically. For large corpora we can add disk persistence or warm-up tasks.
- **Limitations:** TF-IDF works best on textual docs; PDFs/HTML will improve once we add richer parsing. For semantic search over code, upgrading to embeddings (e.g., MiniLM) is recommended.
- **Next Steps:**
  1. Expose retrieval diagnostics in the UI (e.g., show which chunks were used).
  2. Allow cross-document search even when no doc is selected by default.
  3. Evaluate vector-store backends to replace or complement TF-IDF as docs scale.

This document complements `ai_docs/rag_overview.md` by focusing on the rationale behind the implementation and the architectural flow connecting the retriever to the chat experience.
