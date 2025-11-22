# Implementation Plan - Add Citations to LLM Responses

The goal is to enable the LLM to cite the source document when providing answers based on retrieved chunks. This involves adding the document name to the retrieval context and instructing the model to use it.

## User Review Required

> [!NOTE]
> The LLM will be instructed to add citations in the format `[Document Name]`. The actual adherence to this instruction depends on the model's capability (`gpt-oss:20b`).

## Proposed Changes

### Web

#### [MODIFY] [simpleRetriever.ts](file:///Users/moulimohann/projects/llms/SynapseGPT/web/src/lib/rag/simpleRetriever.ts)
- Update `RetrievedChunk` interface to include `docName: string`.
- Update `retrieveRelevantChunks` to map `docName` from `DocumentContent` to the returned chunks.

#### [MODIFY] [route.ts](file:///Users/moulimohann/projects/llms/SynapseGPT/web/src/app/api/chat/stream/route.ts)
- Update `buildRetrievalContext` to include the document name in the formatted string injected into the prompt.
  - Format: `[Source: ${chunk.docName}] ... content ...`

#### [MODIFY] [promptBuilder.ts](file:///Users/moulimohann/projects/llms/SynapseGPT/web/src/lib/chat/promptBuilder.ts)
- Update `buildSystemPrompt` to add specific instructions for citation.
  - "When answering based on retrieved excerpts, you must cite the source document using the format [Document Name]."

## Verification Plan

### Manual Verification
1.  **Chat with Global Retrieval**:
    - Ask a question that requires information from a specific document (not the currently open one).
    - Verify that the response includes a citation like `[My Document.md]`.
2.  **Verify Logs**:
    - Check if `retrieveRelevantChunks` returns objects with `docName`.
