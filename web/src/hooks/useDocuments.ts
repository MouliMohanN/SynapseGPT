import { useCallback, useEffect, useState } from "react";
import type { DocNode, DocumentContent } from "@/lib/types";
import { fetchDocuments, fetchDocumentById, searchDocuments } from "@/services/documentService";

interface SearchResult {
  docId: string;
  matches: number;
}

export const useDocuments = () => {
  const [docs, setDocs] = useState<DocNode[]>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<DocumentContent | null>(null);
  const [isDocLoading, setIsDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const findFirstFile = useCallback((nodes: DocNode[]): DocNode | null => {
    for (const node of nodes) {
      if (node.type === "file") {
        return node;
      }
      if (node.children) {
        const found = findFirstFile(node.children);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const loadDocs = useCallback(async () => {
    try {
      setIsDocsLoading(true);
      setDocsError(null);
      const loadedDocs = await fetchDocuments();
      setDocs(loadedDocs);
      const firstFile = findFirstFile(loadedDocs);
      if (firstFile) {
        setSelectedDocId((prev) => prev ?? firstFile.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setDocsError(message);
    } finally {
      setIsDocsLoading(false);
    }
  }, [findFirstFile]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  const loadDocument = useCallback(async (docId: string) => {
    try {
      setIsDocLoading(true);
      setDocError(null);
      const data = await fetchDocumentById(docId);
      setDocContent(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setDocError(message);
    } finally {
      setIsDocLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedDocId) {
      setDocContent(null);
      return;
    }
    void loadDocument(selectedDocId);
  }, [selectedDocId, loadDocument]);

  const runContentSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      return [];
    }

    setIsSearching(true);
    try {
      const results = await searchDocuments(docs, trimmed);
      setSearchResults(results);
      return results;
    } finally {
      setIsSearching(false);
    }
  }, [docs]);

  return {
    docs,
    isDocsLoading,
    docsError,
    selectedDocId,
    setSelectedDocId,
    docContent,
    isDocLoading,
    docError,
    searchResults,
    isSearching,
    runContentSearch,
    refreshDocs: loadDocs,
  };
};
