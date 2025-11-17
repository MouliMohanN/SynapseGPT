Here’s a concise unit‑by‑unit status summary based on the current code.

Unit 1 – Next.js app scaffold + 3‑pane layout

Done
Created web Next.js App Router app with TypeScript, Tailwind, ESLint.
Implemented initial 3‑pane layout in page.tsx:
Left: “Documents” pane.
Center: “AI Summary” (top 25%) + “Document Viewer” (bottom 75%).
Right: “Chat” panel.
In progress: None.
Pending: Visual refinements only (if desired).
Unit 2 – Shared types + API skeletons

Done
types.ts:
DocNode, DocumentContent, DocumentSection.
Chat types: ChatMode, ChatMessage, ChatRequestBody.
route.ts:
Initially returned dummy DocNode[] list (now replaced by filesystem in Unit 4).
route.ts:
Initially returned dummy DocumentContent map (now removed in favor of filesystem route).
route.ts:
Dummy streaming endpoint returning artificial chunked text.
In progress: None (these are superseded where needed by Unit 4).
Pending
Replace dummy chat streaming with real Ollama integration (future unit).
Unit 3 – Wire frontend to docs + chat APIs

Done
page.tsx is now a client component with full state management:
Loads docs list from /api/docs on mount and stores in docs.
Flattens tree via flattenDocs and auto-selects first file as selectedDocId.
When selectedDocId changes, fetches document content and stores in docContent.
Shows loading/error/empty states for docs and doc content.
Document viewer:
Renders docContent.rawText in a monospace <pre>.
Shows path, file type, and character count from docContent.meta.
Chat:
Maintains chatMessages, chatInput, isStreaming.
On submit:
Adds user message.
Adds placeholder assistant message.
Streams chunks from /api/chat/stream and appends to assistant’s content.
Shows errors inside an assistant bubble if the call fails.
In progress: None (UI is fully wired to current dummy backend).
Pending
Use real LLM via Ollama in /api/chat/stream.
Hook AI Summary panel to a summary endpoint (currently just static text).
Unit 4 – Filesystem-backed docs + route fixes

Done
Filesystem doc provider – docProvider.ts:
DOCS_ROOT resolved from DOCS_ROOT env or ../docs.
Recursively builds DocNode[] using actual repo docs:
Includes files with extensions .md, .pdf, .doc, .docx, .txt, .html, .htm.
Skips unsupported files and empty folders.
Filesystem doc parser – docParser.ts:
getDocumentContentById(id):
Reads file under DOCS_ROOT as UTF‑8.
Produces DocumentContent with rawText, sections, and meta.
deriveSections:
For .md, derives sections from headings (simple #/## detection).
For other types, creates a single “whole-document” section.
Docs listing API – route.ts:
Now calls getDocsTree() and returns { docs } from filesystem.
Document content API – route.ts:
Catch‑all route for any document path: /api/docs/<relative-path>.
Uses getDocumentContentById and returns 404 if missing.
Previous nested /content routes under [id] and [...id] have been deleted to satisfy Turbopack’s catch‑all rule.
Frontend wiring – page.tsx:
For selected doc:
This now hits the catch‑all [...id] route.
Lint is passing (npm run lint), and the route structure complies with Next.js rules.
In progress: None for this unit; the filesystem integration and routing are complete.
Pending
Richer per‑format parsing (PDF/Word/HTML) instead of raw UTF‑8 text for those formats.
Scroll sync logic using sections (currently sections are computed but not yet used in the UI).
Planned future units (not yet implemented)

Unit 5 – Ollama integration and in‑memory conversation history

Implement LLMClient around Ollama gpt-oss-20b.
Update /api/chat/stream to:
Build prompts from DocumentContent (or section).
Maintain in‑memory history keyed by conversationId.
Stream real model output instead of dummy text.
Unit 6 – AI Summary panel

Add endpoint (or reuse chat with mode: "summary") to get summaries.
Trigger summary on document/section selection and render in the top 25% center panel.
Unit 7 – Scroll sync + section UI

Use sections offsets to:
Highlight active section as user scrolls the viewer.
Allow clicking sections to scroll to that part of the document.
Unit 8 – Polish & NFRs

Model status indicator (Ollama online/offline).
Minimal config/README for DOCS_ROOT, OLLAMA_MODEL, etc.
Optional: keyboard shortcuts, better styling, and additional safety around binary formats.