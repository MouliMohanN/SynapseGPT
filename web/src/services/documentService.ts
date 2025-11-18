import type { DocNode, DocumentContent } from "@/lib/types";

/**
 * Fetch all documents from the API
 */
export const fetchDocuments = async (): Promise<DocNode[]> => {
  const response = await fetch("/api/docs");
  
  if (!response.ok) {
    throw new Error(`Failed to load docs: ${response.status}`);
  }
  
  const data = (await response.json()) as { docs: DocNode[] };
  return data.docs;
};

/**
 * Fetch document content by ID
 */
export const fetchDocumentById = async (docId: string): Promise<DocumentContent> => {
  const encodedId = encodeURIComponent(docId);
  const response = await fetch(`/api/docs/${encodedId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to load document: ${response.status}`);
  }
  
  return await response.json() as DocumentContent;
};

/**
 * Search for text content across all documents
 */
export const searchDocuments = async (
  docs: DocNode[],
  searchQuery: string
): Promise<{ docId: string; matches: number }[]> => {
  const results: { docId: string; matches: number }[] = [];
  const searchLower = searchQuery.toLowerCase();

  const searchDoc = async (doc: DocNode): Promise<void> => {
    if (doc.type === "file") {
      try {
        const data = await fetchDocumentById(doc.id);
        const matches = (data.rawText.toLowerCase().match(new RegExp(searchLower, "g")) || []).length;
        
        if (matches > 0) {
          results.push({ docId: doc.id, matches });
        }
      } catch {
        // Skip errors for individual documents
      }
    } else if (doc.children) {
      await Promise.all(doc.children.map(searchDoc));
    }
  };

  await Promise.all(docs.map(searchDoc));
  
  return results.sort((a, b) => b.matches - a.matches);
};
