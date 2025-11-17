### Project Overview

**SynapseGPT** is a local-first, AI-powered documentation assistant built with Next.js and React. Its primary purpose is to allow users to browse, read, and interact with local documentation files through a chat interface powered by a local AI model running via Ollama.

The application features a three-pane layout:
1.  **Left Pane:** A file browser to navigate the local documentation directory.
2.  **Center Pane:** Displays an AI-generated summary at the top and the full content of the selected document at the bottom.
3.  **Right Pane:** A chat interface for asking questions about the selected document.

### Core Technologies

*   **Frontend:** Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS 4. It leverages the experimental React Compiler for potential performance optimizations.
*   **Backend:** Next.js API Routes are used to serve documentation content and stream responses from the AI model.
*   **AI Model:** The application is designed to connect to a local Ollama instance, specifically using the `gpt-oss:20b` model by default.
*   **UI/UX:** The chat interface supports full Markdown rendering, syntax highlighting for code blocks, and real-time streaming of AI responses.

### Key Architectural Components

1.  **Document Provider (`/web/src/lib/docProvider.ts`):**
    *   Scans a specified root directory (defaults to a `docs` folder at the project root) for supported file types (`.md`, `.pdf`, `.txt`, etc.).
    *   Builds a hierarchical tree of files and folders to be displayed in the document browser.

2.  **Document Parser (`/web/src/lib/docParser.ts`):**
    *   When a document is selected, this module reads the file and converts it into a unified `DocumentContent` format.
    *   It extracts the raw text and, for Markdown files, derives a list of sections based on headings. For other file types, it currently treats the entire file as a single section.

3.  **Chat API (`/web/src/app/api/chat/stream/route.ts`):**
    *   This is the central AI endpoint. It receives the user's message, the content of the selected document (or a specific section), and the conversation history.
    *   It constructs a prompt for the Ollama model and streams the response back to the client.
    *   Conversation history is maintained in memory on the server for the duration of the session.

4.  **Main UI (`/web/src/app/page.tsx`):**
    *   This is the main client component that manages the application's state.
    *   It fetches the document list, loads document content, and handles the chat interaction, including sending requests and rendering the streamed responses.
    *   It includes advanced UI features like auto-scrolling, the ability to stop a response mid-stream, and localStorage persistence for chat history.

### Project Status and Functionality

Based on the implementation plan (`ai_docs/unit_wise_implementation_plan.md`), the project is substantially complete.

*   **Completed Features:**
    *   The core 3-pane layout and Next.js application structure.
    *   Filesystem-backed document browsing and content viewing.
    *   Full integration with Ollama for streaming chat responses.
    *   A polished chat UI with Markdown rendering, code highlighting, and conversation management features.

*   **Features Planned but Not Yet Implemented:**
    *   Advanced parsing for binary formats like PDF and DOCX is planned but not yet in place (they are currently read as raw text).

In summary, SynapseGPT is a powerful and well-architected local documentation tool that is close to being feature-complete. It provides a modern and responsive interface for leveraging local AI models to understand and interact with a corpus of documents.