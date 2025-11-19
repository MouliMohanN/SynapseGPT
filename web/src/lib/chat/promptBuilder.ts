
export interface SystemPromptInput {
  docId: string | null;
  sectionId: string | null;
  documentContext: string;
}

export function buildSystemPrompt(input: SystemPromptInput): string {
  const parts: string[] = [];

  parts.push(
    "You are SynapseGPT, a local-first documentation assistant. Answer using only the information from the provided document content",
  );

  if (input.documentContext) {
    parts.push(
      `\n\nDOCUMENT CONTENT:\n${input.documentContext}\n\nAnswer questions based strictly on the above content.`,
    );
  }

  if (input.docId) {
    parts.push(`Document: ${input.docId}.`);
  }
  if (input.sectionId) {
    parts.push(`Section: ${input.sectionId}.`);
  }

  return parts.join(" ");
}
