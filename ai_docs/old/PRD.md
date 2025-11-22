High‑Level Architecture

Frontend (Next.js/React)

Layout
Left: document browser (tree/list under docs or configurable root).
Center:
Top 25%: AI “live summary” card for current document/section.
Bottom 75%: raw document viewer (plain text/monospace with light formatting).
Scroll sync between viewer and section list/answers is mandatory.
Right/bottom: chat panel with streaming responses and conversation history per conversationId.
State
Global store (e.g., Zustand/Context) for: selected doc, sections, scroll position, active conversation, model status.
Backend (Next.js API routes or Node service)

Document APIs:
GET /api/docs → directory tree / flat list.
GET /api/docs/:id/content → unified document contract (see below).
Chat APIs:
POST /api/chat/stream → SSE/streaming endpoint to Ollama.
GET /api/chat/:conversationId → returns in‑memory conversation history.
LLM (Ollama)

Uses gpt-oss-20b via http://localhost:11434.
Model name, host configurable via env (OLLAMA_MODEL, OLLAMA_HOST).
Backend LLMClient module wraps Ollama chat/stream API.
Functional Plan

1. Document Browsing

Features
Recursively scan root directory (default: docs or repo root).
Filter by supported formats: .md, .pdf, .doc, .docx, .txt, .html, .htm (configurable list).
Return a uniform tree structure:
[{ id, name, path, type: "file" | "folder", children? }]
Implementation
Node fs + path for scan.
Cache tree in memory; provide ?forceRefresh=true query to rescan.
Optional: indicate approximate size/lastModified in metadata.
2. Document Viewing (Unified Contract, Text-Only Extraction)

Backend responsibilities
For all file formats, backend extracts best-effort raw text and a section outline.
File-type specific parsing is internal to backend; UI always receives the same shape:
id
name
path
rawText: full text (UTF‑8 string).
sections: array of { id, title, startOffset, endOffset, level }.
meta: { size, lastModified, fileType }.
Parsing strategies:
.md / .txt / .html: read file; HTML is tag-stripped and normalized to plain text; Markdown headings → sections.
.pdf: use PDF parser to extract text (page breaks → section boundaries).
.doc / .docx: use converter (e.g., Mammoth or similar) to plain text + inferred headings.
Future formats: just add a new parser implementing parse(filePath): ParsedDoc.
UI responsibilities
Always treat documents as plain text with sections:
Viewer: monospace or document-style viewer with minimal syntax highlighting (e.g., Markdown headings bolded via simple regex on the fly).
Section sidebar (or inline): clickable sections; clicking scrolls viewer to the corresponding range (using startOffset/endOffset mapping).
Scroll sync (mandatory):
Map scroll position in text viewer to nearest section based on offsets.
Highlight active section in sidebar and optionally show it in the summary card.
When user clicks a section, scroll viewer to that section start and update AI summary context.
3. AI Summary Panel (Center Top 25%)

Behavior
On document open (or section change), optionally trigger:
mode = "summary" for entire doc or selected section.
Show:
Title (e.g., “Summary of <Section/Document Name>”).
Short bullet summary and maybe 3–5 key points.
Support manual “Refresh Summary” button to avoid too many auto calls.
Implementation
Reuse chat endpoint with mode="summary" and a dedicated conversationId per doc/section (or ephemeral, no history).
Use streaming: show summary as it generates; store last result in memory to avoid repeated calls.
4. AI Querying & Chat Panel (Right/Bottom)

Features
Modes: "question", "summary", "key_points", "faqs" selectable via UI chips.
Inputs sent to POST /api/chat/stream with:
conversationId
docId
sectionId (optional)
mode
message
Backend:
Loads document text and optionally restricts to section range.
Builds prompt with:
System instructions: be grounded in doc; state when answer is not found.
Mode-specific instructions (summary vs key_points vs faqs).
Short conversation history from in-memory store keyed by conversationId.
Streams tokens from Ollama to client.
UI
Chat bubbles for user/assistant.
Streaming display (append tokens as they arrive).
Tag per assistant message showing the mode (e.g., “Summary”, “Q&A”, “Key Points”).
Link answers to sections if possible (via headings in the prompt / simple parsing).
5. AI Response Experience (Streaming + In-Memory History)

Streaming
Implement with SSE or streaming fetch. Example:
POST /api/chat/stream → Content-Type: text/event-stream.
Frontend:
Open EventSource or streaming reader.
Accumulate tokens into current message.
Handle done event to finalize message.
Conversation History (Backend)
In-memory map keyed by conversationId:
Map<string, { docId, messages: ChatMessage[], createdAt, updatedAt }>
For each streaming call:
Append user message, then assistant message once streaming completes.
Basic limitations:
Cap messages per conversation (e.g., last 10–20 exchanges).
Periodically prune stale conversations (e.g., older than N hours).
No persistence required for hackathon; restarted server resets history.
Non‑Functional Requirements (Updated, Observability Ignored)

Performance
Cached document tree and parsed text; lazy parse on first access.
Summaries and chat are incremental and streaming to reduce perceived latency.
Scroll sync implemented with efficient calculations (line/offset mapping).
Scalability (hackathon scope)
Support typical documentation trees (100s–low 1000s of files).
In-memory history and parsed docs; simple LRU or size-based eviction if needed.
Reliability
Graceful handling of:
Unparseable files (show error in UI + fallback to “download/open externally”).
Ollama not running (clear status indicator + actionable message).
Timeouts for parsing and LLM calls.
Usability & UX
Clear 3-pane layout:
Left: file tree with search.
Center top: attractive summary card (document title, chips for actions).
Center bottom: readable document viewer with scroll sync and visible sections.
Right: chat with streaming and conversation chips.
Keyboard shortcuts (optional): focus search, focus chat, jump between panes.
Security & Privacy
Local-only by default (no remote APIs).
Sanitization of any HTML that might be rendered (if we later enhance beyond text).
No sensitive content in logs by default.
Maintainability & Extensibility
Clear modules:
documentProvider (tree/index).
documentParser (per extension; returns unified contract).
llmClient (Ollama wrapper).
chatService (history + prompt building).
Easy to add:
New formats: implement DocumentParser.
New modes: update prompt builder and UI chips.
Portability & Setup
README with:
brew install ollama (or manual install).
ollama pull gpt-oss-20b.
npm install + npm run dev.
Env configuration for root docs path, model, ports.
UI Design Notes (to “think of different file structures and create solid UI”)

Handle:
Deep nested folders: collapsible tree with icons and search filter.
Documents with many headings: sticky section list with scrollable area, active section highlight, and click-to-scroll.
Very long documents: lazy rendering in viewer (e.g., virtualized list) if needed.
Summary card:
Show document path, last updated time.
Display chips like “Summarize doc”, “Key points”, “Generate FAQs”, each triggering a preconfigured request.
Chat panel:
Tabs or dropdown to switch between conversations per document, or a single ongoing thread per document for simplicity.
If this plan matches what you have in mind, next I can draft a concrete project skeleton for this repo (folder structure, key Next.js API routes, contracts/interfaces, and a minimal UI layout) so you can start implementing or I can generate initial code.