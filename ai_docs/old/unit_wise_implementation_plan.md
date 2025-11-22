# SynapseGPT - Implementation Plan & Status

## Overview
A local-first Next.js documentation explorer with AI assistant powered by Ollama (gpt-oss:20b model) for document-based Q&A with streaming responses.

---

## ✅ Unit 1 – Next.js App Scaffold + 3-Pane Layout

### Completed
- ✅ Created Next.js 16 App Router app with TypeScript, Tailwind CSS 4, ESLint 9
- ✅ Implemented 3-pane layout in `page.tsx`:
  - **Left**: Documents browser pane (file tree)
  - **Center**: AI Summary (top 25%) + Document Viewer (bottom 75%)
  - **Right**: Chat panel with AI assistant
- ✅ Responsive layout with proper spacing and borders

### Pending
- Visual refinements and responsive mobile layout

---

## ✅ Unit 2 – Shared Types + API Skeletons

### Completed
- ✅ `lib/types.ts`:
  - `DocNode`, `DocumentContent`, `DocumentSection`
  - Chat types: `ChatMode`, `ChatMessage`, `ChatRequestBody`
- ✅ API routes created:
  - `GET /api/docs` - document tree listing
  - `GET /api/docs/[...id]` - document content retrieval
  - `POST /api/chat/stream` - streaming chat endpoint

---

## ✅ Unit 3 – Frontend Wiring + Enhanced Chat UI

### Completed
- ✅ `page.tsx` as client component with comprehensive state management
- ✅ Document loading:
  - Loads docs list from `/api/docs` on mount
  - Flattens tree and auto-selects first file
  - Fetches document content when selection changes
  - Shows loading/error/empty states
- ✅ Document viewer:
  - Displays document metadata (path, type, character count)
  - Renders `rawText` in monospace `<pre>` (raw text mode)
  
### ✅ Enhanced Chat Features (10+ improvements)
- ✅ **Markdown rendering**: react-markdown with HTML support (rehype-raw)
- ✅ **Syntax highlighting**: react-syntax-highlighter with vscDarkPlus theme
- ✅ **Copy buttons**: Hover-visible copy buttons on code blocks
- ✅ **Auto-scroll**: Smooth scroll to bottom during streaming with manual override detection
- ✅ **Loading indicator**: Animated thinking dots with real-time character counter
- ✅ **Stop generation**: AbortController for canceling streaming mid-response
- ✅ **Clear conversation**: Button with confirmation to reset chat
- ✅ **Regenerate response**: Re-submit last user message
- ✅ **Multi-line input**: Shift+Enter for new lines, Enter to send
- ✅ **Message timestamps**: HH:MM format for each message
- ✅ **Conversation persistence**: localStorage for chat history across sessions
- ✅ **Typography plugin**: @tailwindcss/typography for proper prose spacing
- ✅ **Custom prose styling**: Extensive spacing customization for headings, lists, code blocks

### Pending
- Document viewer Markdown rendering (currently raw text only)
- AI Summary panel integration (static placeholder text)

---

## ✅ Unit 4 – Filesystem-Backed Docs + Routing

### Completed
- ✅ `lib/docProvider.ts`:
  - `DOCS_ROOT` resolved from env var or `../docs` default
  - Recursive filesystem scanning for document tree
  - Supported formats: `.md`, `.pdf`, `.doc`, `.docx`, `.txt`, `.html`, `.htm`
  - Skips unsupported files and empty folders
- ✅ `lib/docParser.ts`:
  - `getDocumentContentById(id)`: Reads files as UTF-8
  - `deriveSections`: Extracts markdown headings as sections
  - Returns `DocumentContent` with `rawText`, `sections`, and `meta`
- ✅ API routes:
  - `GET /api/docs/route.ts`: Returns filesystem-backed document tree
  - `GET /api/docs/[...id]/route.ts`: Catch-all route for document content
- ✅ Frontend integrated with filesystem APIs
- ✅ Lint passing with compliant Next.js route structure

### Pending
- Richer parsing for PDF/DOCX/HTML (currently UTF-8 decode only)
- Section-based scroll sync UI

---

## ✅ Unit 5 – Ollama Integration + Conversation History

### Completed
- ✅ Ollama integration in `/api/chat/stream/route.ts`:
  - Model: `gpt-oss:20b` (corrected from initial `gpt-oss-20b`)
  - Endpoint: `http://localhost:11434/api/chat` (corrected from OpenAI-style endpoint)
  - Streaming: JSONL parsing with `json.message?.content`
- ✅ Document context injection:
  - Loads full document content via `getDocumentContentById`
  - Injects into system prompt with `buildSystemPrompt`
  - Supports section-specific context if `sectionId` provided
- ✅ In-memory conversation history:
  - `Map<conversationId, ChatMessage[]>` for multi-conversation support
  - Persists for server process lifetime
- ✅ Response formatting:
  - `formatAssistantResponse` adds line breaks before headings, lists, code blocks
  - Improves readability of streamed responses
- ✅ AbortController support for canceling requests

### Debugging Notes
- Fixed 404 errors by discovering correct Ollama model name format (colon instead of hyphen)
- Fixed endpoint path from `/v1/chat/completions` to `/api/chat`
- Verified with curl testing of Ollama API

---

## ⏳ Unit 6 – AI Summary Panel (NOT STARTED)

### Planned Features
- Add summary generation endpoint or reuse `/api/chat/stream` with `mode: "summary"`
- Auto-trigger summary when document selected
- Display streamed summary in top 25% of center pane
- Loading state and error handling
- Option to regenerate summary

### Current State
- Static placeholder text: "AI Summary will appear here."

---

## ⏳ Unit 7 – Scroll Sync + Section Navigation (NOT STARTED)

### Planned Features
- Parse `DocumentSection` offsets to create table of contents
- Highlight active section as user scrolls document viewer
- Click section in TOC to jump to that part of document
- Use Intersection Observer or scroll event handlers
- Visual indication of current section

### Current State
- Sections computed in backend but not utilized in UI

---

## 🎯 Additional Improvements Identified

### High Priority
1. **Document Viewer Markdown Rendering**
   - Use ReactMarkdown in viewer pane for proper formatting
   - Currently shows raw text in `<pre>` tag

2. **Search Within Document Content**
   - Currently only searches document filenames
   - Add full-text search across all documents

3. **Toast Notifications**
   - Better error feedback than console logs
   - Success confirmations for actions

### Medium Priority
4. **Multiple Conversation Threads**
   - Tab or sidebar for switching between conversations
   - Currently limited to single conversation

5. **Message Editing**
   - Edit and re-send user messages
   - Delete individual messages from history

6. **Export Conversations**
   - Export chat history as Markdown or JSON
   - Import previous conversations

### Low Priority
7. **Performance Optimizations**
   - Virtual scrolling for large document trees
   - Debounced search input
   - Lazy-load document content

8. **Settings Panel**
   - Configure Ollama model and temperature
   - UI preferences (font size, theme)
   - Custom DOCS_ROOT path

9. **Suggested Questions**
   - Generate contextual questions based on document content
   - Quick-start prompts for new users

---

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router, React 19)
- **Styling**: Tailwind CSS 4, @tailwindcss/typography
- **Markdown**: react-markdown, rehype-raw
- **Syntax Highlighting**: react-syntax-highlighter (vscDarkPlus theme)
- **TypeScript**: Strict mode enabled

### Backend
- **API**: Next.js App Router API routes
- **LLM**: Ollama (gpt-oss:20b model, localhost:11434)
- **Storage**: Filesystem-backed documents, localStorage for chat persistence
- **Parsing**: Custom UTF-8 parser with section extraction

### Development
- **Linting**: ESLint 9 with TypeScript support
- **Package Manager**: npm
- **Git**: develop branch (main as default)

---

## Current Status Summary

**Overall Progress**: ~70% complete

- ✅ Core infrastructure (Units 1-5): **COMPLETE**
- ✅ Enhanced chat UI with 10+ features: **COMPLETE**
- ⏳ AI Summary panel (Unit 6): **NOT STARTED**
- ⏳ Scroll sync + sections (Unit 7): **NOT STARTED**

**Next Recommended Steps**:
1. Implement Unit 6 (AI Summary Panel)
2. Add Markdown rendering to document viewer
3. Implement Unit 7 (Scroll Sync + Section Navigation)
4. Additional improvements as needed (toast notifications, settings panel, etc.)
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