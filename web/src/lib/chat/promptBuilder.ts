
export interface SystemPromptInput {
  docId: string | null;
  sectionId: string | null;
  documentContext: string;
  retrievalContext?: string;
  allowOutsideDocumentAnswers?: boolean;
}

export function buildSystemPrompt(input: SystemPromptInput): string {
  const parts: string[] = [];

  if (input.allowOutsideDocumentAnswers) {
    parts.push(
      "You are SynapseGPT, a local-first documentation assistant. Prioritize answering using the provided document content, but if it lacks the necessary information you may answer using your broader knowledge. Clearly note when the answer goes beyond the document.",
    );
  } else {
    parts.push(
      "You are SynapseGPT, a local-first documentation assistant. Answer using only the information from the provided document content",
    );
  }

  if (input.documentContext) {
    parts.push(
      `\n\nDOCUMENT CONTENT:\n${input.documentContext}\n\nAnswer questions based strictly on the above content.`,
    );
  }

  if (input.retrievalContext) {
    parts.push(
      `\n\nRETRIEVED EXCERPTS:\n${input.retrievalContext}\n\nIncorporate the above excerpts when forming your answer.`,
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
