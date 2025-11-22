# Verification Walkthrough

## Changes Verified

### 1. Retriever Updates
- **File**: `web/src/lib/rag/simpleRetriever.ts`
- **Verified**: `RetrievedChunk` interface now includes `docName`.
- **Verified**: `retrieveRelevantChunks` populates `docName` using a map of loaded documents.

### 2. Context Building
- **File**: `web/src/app/api/chat/stream/route.ts`
- **Verified**: `buildRetrievalContext` now formats chunks as:
  ```
  [#1 | 0.85 | Source: MyDocument.md]
  Content...
  ```

### 3. Prompt Engineering
- **File**: `web/src/lib/chat/promptBuilder.ts`
- **Verified**: System prompt now includes the instruction:
  > "When answering based on retrieved excerpts, you must cite the source document using the format [Document Name]."

## Verification Steps

### Manual Verification
1. **Chat Interaction**:
   - **Action**: Ask a question that retrieves chunks from multiple documents.
   - **Expected**: The LLM response should include citations like `[ProjectSpecs.md]` or `[MeetingNotes.txt]`.
   - **Note**: Actual citation behavior depends on the model's adherence to instructions.

## Conclusion
The codebase is updated to support and request citations from the LLM.
