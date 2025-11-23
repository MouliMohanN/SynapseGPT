# Diff-based RAG over `.history` Patches (Diff RAG)

## 1. Background & Context

The documentation system stores current documents under `DOCS_ROOT` and maintains their edit history as unified diff patches (`.patch` files) under a dedicated `.history` directory (see `web/src/lib/history.ts`). Each patch captures the change between two versions of a document.

The existing RAG pipeline (`web/src/lib/rag/ingestor.ts` + Chroma) ingests **only the latest snapshot** of supported text documents (e.g. `.md`, `.txt`, `.mdx`) and ignores `.patch` files. Users can ask questions about the current docs, but they cannot easily query or reason about **how** the docs evolved over time.

This doc explores "Diff RAG" – ingesting document history (diffs) into RAG – and documents the PRD, design options, pros/cons (with emphasis on ingesting `.history` patches), and an implementation plan.

---

## 2. Problem Statement

Users want the AI to answer questions that depend on **temporal evolution** of the docs, not just their latest state, for example:

- "What changed in the onboarding guide last week?"
- "How has the RAG ingestion strategy evolved over time?"
- "When did we decide to hide `.history` from the UI but still process it in RAG?"
- "Why was this configuration removed from the PRD?"

Today, the system only indexes the latest version of each document; historical context is effectively invisible to RAG.

We need a way to:

- Represent **changes** in a retrieval-friendly format.
- Make those changes queryable and interpretable by the model.
- Avoid degrading normal, non-temporal QA over the current docs.

---

## 3. Scope

### 3.1 In Scope

- **Designing** a Diff RAG capability atop the existing:
  - History mechanism: `.history/**.patch` under `DOCS_ROOT`.
  - RAG ingestor and Chroma-based vector store.
- Evaluating **Option 2**: ingesting `.history` patch files into RAG (directly or via preprocessing).
- Deciding how Diff RAG relates to the **primary** RAG index that serves current-doc QA.
- Providing a stepwise **implementation plan** that can be adopted incrementally.

### 3.2 Out of Scope

- Replacing Git or becoming a full VCS.
- Full, guaranteed reconstruction of every historical snapshot for arbitrary time travel (this can be supported partially but is not the primary goal).
- UI design in detail (only high-level requirements).
- Non-text assets (images, binaries) and their diffs.

---

## 4. Goals & Non-Goals

### 4.1 Goals

- **G1 – Temporal QA:** Enable the AI to answer questions about how docs changed over time.
- **G2 – Change-centric retrieval:** Support queries that focus on changes themselves ("show me edits to X"), not just current content.
- **G3 – Safety & isolation:** Keep historical data logically separated from current-doc QA to avoid confusing answers when the user does not care about history.
- **G4 – Operationally feasible:** Keep ingestion cost, storage, and maintenance manageable given potentially large numbers of patches.

### 4.2 Non-Goals

- **NG1:** Do not degrade the quality of current-doc QA by flooding the primary index with patch noise.
- **NG2:** Do not expose historical secrets/PII that were intentionally removed, without explicit safeguards.
- **NG3:** Do not require users to understand diff syntax; the system should translate changes into natural language where possible.

---

## 5. User Stories

- **U1 – What changed in X:**
  - *As an engineer*, I want to ask "What changed in `docs/rag/ingestor.md` in the last 7 days?" and get a concise list of natural-language change summaries.

- **U2 – Why was this removed:**
  - *As a reviewer*, I want to select a paragraph in a doc and ask "When and why was this removed or changed?" and see relevant historical patches and context.

- **U3 – Change audit:**
  - *As a tech lead*, I want a high-level summary of all changes to RAG-related docs in a given time range.

- **U4 – Temporal clarification in chat:**
  - *As a user*, if I ask a question whose answer depends on an older version of a doc, I want the model to cite that the behavior changed over time and show me when.

---

## 6. Design Options (High Level)

We consider three main options:

- **Option 0 – Baseline:** Ignore `.history` entirely in RAG (status quo: only latest snapshots are indexed).
- **Option 1 – On-demand reconstruction:** Do not ingest history; when a history-related question arrives, reconstruct relevant past versions from `.patch` files on the fly and feed them as context (no separate history index).
- **Option 2 – Diff RAG (focus of this doc):** Ingest `.history` patches into a dedicated RAG index, in some processed form, to support retrieval over changes.

This document focuses on **Option 2** and how to implement it safely and effectively.

---

## 7. Option 2: Ingest `.history` Patch Files into RAG

### 7.1 Variants of Option 2

"Ingest patches" can mean several things:

- **2A – Raw patch ingestion:**
  - Treat each `.patch` as just another text document and embed it directly.

- **2B – Patch-to-change-event transformation (recommended):**
  - Parse each patch into **structured change events**, then generate natural-language descriptions and embed those instead.

- **2C – Snapshot reconstruction with metadata:**
  - Use patches to reconstruct past snapshots for key points (e.g., daily/weekly) and ingest those snapshots with additional metadata; patches themselves may or may not be stored.

Below we focus on **2B** as the primary recommended approach within Option 2.

---

## 8. Pros and Cons of Option 2 (Diff RAG)

### 8.1 Pros

- **P1 – Fine-grained change awareness**
  - Captures edits that are not obvious in final text (e.g., a line flip, a small wording tweak, removal of a constraint).
  - Enables answering "how exactly did this text change" questions.

- **P2 – Temporal context for decisions**
  - The AI can surface *when* a policy/constraint/assumption was added, modified, or removed.
  - Historical rationale is often encoded in nearby changes and commit-style descriptions.

- **P3 – Storage-efficient vs full snapshots**
  - Storing diffs (or derived change-events) is usually smaller than storing entire snapshots for every version.
  - Index growth is more proportional to actual change rather than doc size.

- **P4 – Better change analytics**
  - Change-events are a natural unit for analytics: aggregation by file, folder, author (if available), or time window.
  - Enables features like "top N docs by churn" or "hotspots of change" to guide attention.

- **P5 – Clear separation from current-doc QA (if separate collection)**
  - Keeping a dedicated **history index/collection** avoids polluting normal QA and allows specialized ranking / prompting.

### 8.2 Cons / Risks

- **C1 – Diff syntax is not natural language**
  - Raw unified diffs (`+`, `-`, `@@`) are not semantically friendly for embedding models.
  - Without preprocessing, embeddings may capture noise (line numbers, context markers) rather than true semantic changes.
  - This pushes us towards variant **2B** (structured change-events), which increases implementation complexity.

- **C2 – Index bloat and cost**
  - Every save can generate a `.patch` file, leading to potentially thousands of tiny change documents.
  - Embedding + storage costs grow with churn, not just with doc count.
  - Need pruning/compaction strategies (e.g., keep only last N days/weeks for high-churn docs).

- **C3 – Retrieval ambiguity and duplication**
  - Many patches repeat similar context lines; multiple change-events may reference nearly identical text.
  - If not carefully ranked and deduplicated, queries may retrieve redundant or conflicting history items.
  - The model may over-focus on noisy micro-edits instead of the overall current state.

- **C4 – Security and data-governance risk**
  - Patches may contain secrets/PII that were removed from the current docs.
  - Ingesting history means those values can still be surfaced by the model unless explicitly scrubbed.
  - Requires a redaction pass over diffs or a policy to exclude certain paths or token patterns from history ingestion.

- **C5 – Extra ingestion and infra complexity**
  - Requires a second ingestion pipeline (and vector collection) with its own lifecycle.
  - Need additional configuration, observability, and failure-handling for history ingestion.

- **C6 – Evaluation complexity**
  - Harder to define "correct" answers for history questions.
  - Must evaluate:
    - Relevance of surfaced history items.
    - Correctness of temporal reasoning.
    - Absence of hallucinated changes.

- **C7 – Coupling to history format**
  - Implementation depends on `.patch` file format from `history.ts`.
  - Any changes to history encoding must keep the Diff RAG pipeline in sync.

---

## 9. Recommended High-Level Approach

- **Primary index (current RAG):**
  - Continue indexing **only current snapshots** of supported docs for standard QA.
  - `.history` remains **excluded** from the primary vector store to avoid noise.

- **Secondary index (Diff RAG):**
  - Introduce an **optional**, separately-configurable Diff RAG pipeline that:
    - Traverses `.history`.
    - Transforms patches into structured **change-events**.
    - Embeds these change-events into a **separate Chroma collection**, e.g. `synapse-gpt-history`.

- **Routing and UX:**
  - Normal chat remains backed by the primary index.
  - A dedicated "History" or "Changes" mode (or explicit query flag) routes to the history index and uses prompts that emphasize temporal reasoning.

---

## 10. Data Model for Change-Events (Variant 2B)

A **change-event** is the atomic unit ingested into the history index.

Suggested fields:

- `id`: stable identifier (e.g. hash of `file_path + timestamp + hunk_index`).
- `file_path`: relative path within `DOCS_ROOT` (same scale as current-doc IDs).
- `timestamp`: derived from history filename or metadata.
- `patch_path`: path to the underlying `.patch` file.
- `hunk_range`: line range(s) affected (if available).
- `change_type`: e.g. `added`, `removed`, `modified`, `renamed`, `mixed`.
- `summary`: **natural-language summary** of the change.
- `raw_diff_snippet`: raw or lightly cleaned diff fragment for traceability.
- `tags` (optional): labels like `docs/rag`, `config`, `ai_docs`, etc.

The **embedding text** would primarily be:

> `${summary}\n\nFile: ${file_path}\nTime: ${timestamp}\n\nDiff:\n${raw_diff_snippet}`

---

## 11. Implementation Plan

### 11.1 Phase 0 – Baseline Confirmation (current state)

- Ensure the current RAG ingestor:
  - **Does not** ingest `.history` (primary collection only sees latest snapshots).
  - Continues to ingest supported extensions from the main docs tree.
- Document this behavior clearly (this doc + inline comments in `ingestor.ts`).

### 11.2 Phase 1 – Configurable Diff RAG Skeleton

1. **Configuration**
   - Add env flags (names illustrative):
     - `ENABLE_DIFF_RAG` (default: `false`).
     - `HISTORY_COLLECTION_NAME` (default: `synapse-gpt-history`).
   - Keep these separate from the existing `COLLECTION_NAME` for current docs.

2. **History traversal utility**
   - Add a helper in a new module (e.g. `web/src/lib/rag/diffIngestor.ts`) or extend `ingestor.ts` with a history-specific path that:
     - Locates the `.history` root under `DOCS_ROOT`.
     - Recursively enumerates `.patch` files.

3. **Data structures**
   - Define a TypeScript interface for `ChangeEvent` matching the fields described above.

4. **Chroma integration**
   - Instantiate a dedicated Chroma collection for history when `ENABLE_DIFF_RAG` is true.

### 11.3 Phase 2 – Patch Parsing and Change-Event Generation

1. **Patch parser**
   - Implement a lightweight unified diff parser that can:
     - Split a patch into hunks.
     - Identify added vs removed lines.
     - Capture surrounding context lines.

2. **Change-event extraction**
   - For each hunk, derive a `ChangeEvent`:
     - Infer `change_type` from the mix of `+` and `-` lines.
     - Capture a small `raw_diff_snippet` (truncated for long hunks).

3. **Natural-language summarization**
   - Start with **heuristic summaries**, e.g.:
     - `"Updated RAG ingestion config: added explanation of .history handling"`
   - Optionally, for higher quality, call the existing LLM backend to generate summaries of each hunk (batched to control cost).

4. **Embedding and upsert**
   - Convert each `ChangeEvent` to an embedding text.
   - Upsert it into the history collection with metadata (`file_path`, `timestamp`, etc.).

### 11.4 Phase 3 – Query Routing & UX

1. **API layer**
   - Add a history-aware query endpoint (e.g. `/api/history/chat` or a query param on the existing chat endpoint) that:
     - Retrieves from the history collection.
     - Formats retrieved change-events into a system prompt that emphasizes temporal reasoning.

2. **Frontend / UI**
   - Add a "History" or "Changes" mode in the chat panel:
     - When active, queries go to the history endpoint.
     - Display surfaced change-events in a structured way (list of changes with timestamps and files).

3. **Context fusion (optional, later)**
   - For advanced usage, combine:
     - Top-k current-doc chunks from the primary index.
     - Top-k history change-events from the history index.
   - Let the model reconcile them (e.g. "This used to say X, but now says Y as of date D").

### 11.5 Phase 4 – Governance, Pruning, and Quality

1. **Redaction pipeline**
   - Reuse or extend any existing PII/secret filters to run over change-events before ingestion.
   - Optionally mask sensitive tokens in `raw_diff_snippet`.

2. **Retention and pruning**
   - Define a retention policy:
     - e.g. keep last N days of history for all files, longer-term history for specific critical paths.
   - Implement a periodic job to delete old change-events from the history collection.

3. **Evaluation**
   - Define test questions (U1–U4) and golden answers.
   - Measure:
     - Recall of relevant change-events.
     - Accuracy of temporal explanations.
     - User trust: is the AI clearly communicating when it references outdated behavior?

---

## 12. Summary / Recommendation

- The **primary RAG index should remain focused on the latest document snapshots** for clarity and performance.
- Diff RAG (Option 2) is best implemented as a **separate, opt-in history index** built from `.history` patches, using structured change-events and natural-language summaries.
- The proposed phased implementation allows gradually adding capabilities while controlling risk:
  - Phase 0: confirm current behavior (no `.history` ingestion in the main index).
  - Phase 1–2: build ingestion and representation for change-events.
  - Phase 3: surface history via a dedicated chat mode.
  - Phase 4: add governance, pruning, and evaluation.

This keeps the current system simple and robust while opening a clear path to rich temporal reasoning over document histories when and if Diff RAG is enabled.
