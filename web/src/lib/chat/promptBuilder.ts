
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
      "You are SynapseGPT, a local-first documentation assistant. Prioritize answering using the provided document content and retrieved excerpts. If they lack the necessary information, you may answer using your broader knowledge. Clearly note when the answer goes beyond the provided sources.",
    );
  } else {
    parts.push(
      "You are SynapseGPT, a local-first documentation assistant. Answer using only the information from the provided document content and retrieved excerpts from the knowledge base.",
    );
  }

  if (input.documentContext) {
    parts.push(
      `\n\nCURRENT DOCUMENT:\n${input.documentContext}`,
    );
  }

  if (input.retrievalContext) {
    parts.push(
      `\n\nRETRIEVED KNOWLEDGE BASE EXCERPTS:\n${input.retrievalContext}\n\nIMPORTANT INSTRUCTIONS:\n1. If the current document contains the answer, use it as the primary source.\n2. If the current document does NOT contain the answer but the retrieved excerpts do, use the retrieved excerpts to answer the question.\n3. You MUST cite the source document for every piece of information. Use the format [Source: Document Name] at the end of relevant sentences.\n4. If neither the current document nor retrieved excerpts contain the answer, clearly state that the information is not available in the knowledge base.`,
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
