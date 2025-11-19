# Advanced RAG Techniques

This note expands on the basic TF-IDF retriever by outlining more sophisticated approaches we can layer on as SynapseGPT scales.

## 1. Semantic Embedding Retrieval
- **What:** Encode chunks with transformer-based embedding models (e.g., MiniLM, Instructor-xl) and store vectors in a database (Chroma, Pinecone, Weaviate, pgvector).
- **Why:** Embeddings capture semantics beyond keyword overlap, surfacing relevant passages even when vocabulary differs.
- **How:**
  1. Preprocess docs into chunks (same pipeline as today).
  2. Generate embeddings offline or on demand; persist vectors with metadata (docId, offsets, chunk text).
  3. At query time, embed the user prompt and run approximate nearest neighbor (ANN) search for millisecond latency.
- **Considerations:**
  - Requires model selection that fits on-device (for local-first) or a hosted vector service.
  - Keep embeddings in sync with docs—use hashing or timestamps to detect stale vectors.

## 2. Hybrid Retrieval (Sparse + Dense)
- **What:** Combine TF-IDF/BM25 scores with embedding scores.
- **Why:** Sparse methods excel at exact matches (code, acronyms) while dense methods capture paraphrases; combining improves recall.
- **How:**
  - Run both retrievers, normalize scores, then either rank by weighted sum or interleave results.
  - Optional: Use cross-encoders to rerank the merged candidates for the final shortlist.
- **Considerations:**
  - Tune weights per content type (e.g., docs vs. code) via evaluation sets.

## 3. Multi-Hop / Graph Retrieval
- **What:** Build a graph of document relationships (links, references, shared headers) and traverse beyond single chunks.
- **Why:** Some answers span multiple sections/files; graph walks capture supporting evidence automatically.
- **How:**
  - Index metadata (headings, links, repo structure) as nodes/edges.
  - Start from initial retrieved chunks, then expand to neighbors up to N hops, scoring paths.
- **Considerations:**
  - Need guardrails to avoid runaway context; enforce hop/time limits.

## 4. Query Expansion & Reformulation
- **What:** Use an LLM or heuristics to rewrite the user query into multiple targeted sub-queries.
- **Why:** Improves retrieval when the original query is vague or uses user-specific jargon.
- **How:**
  - Prompt a lightweight model: “Generate three search queries that capture …”.
  - Run retriever per sub-query and merge results with diversity filtering.
- **Considerations:**
  - Adds latency; consider caching expansions for identical prompts.

## 5. Answer-Aware Re-ranking
- **What:** After initial retrieval, ask a cross-encoder or mini-LLM to judge how well each chunk answers the question before injecting it.
- **Why:** Filters out false positives from recall-heavy retrievers.
- **How:**
  - Use models like `cross-encoder/ms-marco-MiniLM-L-6-v2` to score (query, chunk) pairs.
  - Keep top scoring chunks even if their original retrieval rank was low.
- **Considerations:**
  - Cross-encoders are slower; batch scoring to stay under latency budgets.

## 6. Context Compression & Summarization
- **What:** Automatically summarize or extract only the salient sentences from retrieved chunks before sending to the LLM.
- **Why:** Reduces prompt size and helps the LLM focus on key facts.
- **How:**
  - Run extractive summarization (e.g., TextRank) or prompt a smaller model to “highlight the sentences that answer X”.
  - Concatenate compressed snippets with citations.
- **Considerations:**
  - Maintain traceability—keep original offsets so users can open the source chunk.

## 7. Tool-Conditioned Retrieval
- **What:** Dynamically choose retrievers based on query intent (code vs. prose, API vs. UI docs).
- **Why:** Specialized retrievers (AST-aware, table-aware) outperform one-size-fits-all pipelines.
- **How:**
  - Train a classifier using log data; route queries to the best retriever or run multiple and fuse.
  - Examples: structural search for code, table vectorizer for release matrices.

## Operational Best Practices
1. **Evaluation Harness:** Build a benchmark of question-answer pairs mapped to citations. Track precision/recall as retrievers change.
2. **Observability:** Log which chunks were injected, their scores, and citations shown to the user to debug odd answers.
3. **Cold Start Strategy:** Warm caches (chunks, vectors) on deploy; fall back to simpler retrieval if the vector index is rebuilding.
4. **Safety:** De-duplicate overlapping chunks and sanitize retrieved text before prompt injection to avoid prompt collisions or sensitive data leaks.

These techniques can be layered incrementally. Start by swapping TF-IDF for dense vectors, then add hybrid scoring and rerankers as accuracy expectations grow.
