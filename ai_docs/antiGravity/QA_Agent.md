# Build Agent to Write Test Cases from MD

## Goal Description
The goal is to create an "Agent" feature that reads a Product Requirement Document (PRD) in Markdown format and generates a comprehensive test plan in a *new* Markdown file. This allows the user to review the test cases against the requirements.

## User Review Required
> [!NOTE]
> **File Naming**: The generated file will be named `[original_filename]_test_cases.md` and placed in the same directory as the source file.

## Proposed Changes

### Backend
#### [NEW] [agent.ts](file:///Users/moulimohann/projects/llms/SynapseGPT/web/src/lib/agent/testGenerator.ts)
- Implement a robust `TestGenerationAgent` class:
    1.  **Structured Extraction**: Use JSON mode to extract requirements. Validate output with Zod (or similar) to ensure no requirements are missed.
    2.  **Retry Logic**: Wrap LLM calls in a retry mechanism (exponential backoff) to handle transient failures or malformed JSON.
    3.  **Test Generation**: Generate tests in structured JSON first (Title, Description, Steps, Expected Result), then compile to Markdown. This prevents formatting hallucinations.
    4.  **Self-Correction**: The Agent will critique its own plan. "Does this cover edge case X?" If not, it adds it.
    5.  **Streaming State**: Emit detailed events (`{ type: 'thought', message: '...' }`, `{ type: 'progress', percent: 50 }`) to the frontend.

#### [NEW] [route.ts](file:///Users/moulimohann/projects/llms/SynapseGPT/web/src/app/api/agent/generate-test-plan/route.ts)
- API endpoint to trigger the Agent.
- Handle client disconnects gracefully (abort controller).

### Frontend
#### [MODIFY] [DocumentViewer.tsx](file:///Users/moulimohann/projects/llms/SynapseGPT/web/src/components/DocumentViewer.tsx)
- Add "Generate Test Plan" button.
- **Agent Status UI**: A dedicated panel or toast that shows the "Brain" at work.
    - Show current step (e.g., "Extracting Requirements (3/5 found)...").
    - Show "Thoughts" (e.g., "Requirement 2 is ambiguous, assuming standard login flow...").
- **Review Mode**: Instead of auto-saving, show a **Preview Modal**.
    - User can Accept, Reject, or "Refine" (send back to Agent with comments).
    - *For MVP, we will stick to Auto-Save but with a clear "Agent generated this" notice.*

## Verification Plan

### Manual Verification
1.  Create a file `docs/feature-login.md` with PRD content (e.g., "User must log in with email/password...").
2.  Click "Generate Test Plan".
3.  Verify `docs/feature-login_test_cases.md` is created.
4.  Verify the content includes logical test cases based on the PRD.
