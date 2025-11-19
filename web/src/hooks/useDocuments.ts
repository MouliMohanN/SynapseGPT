import { useEffect, useState } from 'react';
import type { DocNode, DocumentContent } from '@/lib/types';

const findFirstFile = (nodes: DocNode[]): DocNode | null => {
  for (const node of nodes) {
    if (node.type === 'file') return node;
    if (node.type === 'folder' && node.children) {
      const found = findFirstFile(node.children);
      if (found) return found;
    }
  }
  return null;
};

export const useDocuments = () => {
  const [docs, setDocs] = useState<DocNode[]>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<DocumentContent | null>(null);
  const [isDocLoading, setIsDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [docFilter, setDocFilter] = useState("");
  const [contentSearch, setContentSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{docId: string, matches: number}[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Initial docs load
  useEffect(() => {
    const loadDocs = async () => {
      try {
        setIsDocsLoading(true);
        setDocsError(null);
        const res = await fetch("/api/docs");
        if (!res.ok) {
          throw new Error(`Failed to load docs: ${res.status}`);
        }
        const data = (await res.json()) as { docs: DocNode[] };
        setDocs(data.docs);
        // Auto-select the first file if available
        const firstFile = findFirstFile(data.docs);
        if (firstFile) {
          setSelectedDocId(firstFile.id);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setDocsError(message);
      } finally {
        setIsDocsLoading(false);
      }
    };

    void loadDocs();
  }, []);

  // Load document content when selection changes
  useEffect(() => {
    if (!selectedDocId) {
      setDocContent(null);
      return;
    }

    const loadDoc = async () => {
      try {
        setIsDocLoading(true);
        setDocError(null);
        const encodedId = encodeURIComponent(selectedDocId);
        const res = await fetch(`/api/docs/${encodedId}`);
        if (!res.ok) {
          throw new Error(`Failed to load document: ${res.status}`);
        }
        const data = (await res.json()) as DocumentContent;
        setDocContent(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setDocError(message);
      } finally {
        setIsDocLoading(false);
      }
    };

    void loadDoc();
  }, [selectedDocId]);

  const sortDocs = (nodes: DocNode[]): DocNode[] => {
    return nodes
      .map(node => {
        if (node.type === "folder" && node.children) {
          return {
            ...node,
            children: sortDocs(node.children)
          };
        }
        return node;
      })
      .sort((a, b) => {
        // Folders first, then files
        if (a.type === "folder" && b.type === "file") return -1;
        if (a.type === "file" && b.type === "folder") return 1;
        // Alphabetically by name
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      });
  };

  const filterDocs = (nodes: DocNode[], query: string): DocNode[] => {
    if (!query.trim()) return nodes;
    const lowerQuery = query.toLowerCase();

    const matches = (node: DocNode): boolean => {
      const fullPath = node.path || node.name;
      return (
        node.name.toLowerCase().includes(lowerQuery) ||
        fullPath.toLowerCase().includes(lowerQuery)
      );
    };

    const recurse = (node: DocNode): DocNode | null => {
      if (node.type === "file") {
        return matches(node) ? node : null;
      }

      const filteredChildren = (node.children || [])
        .map(recurse)
        .filter((child): child is DocNode => child !== null);

      if (filteredChildren.length > 0 || matches(node)) {
        return {
          ...node,
          children: filteredChildren,
        };
      }

      return null;
    };

    return nodes
      .map(recurse)
      .filter((node): node is DocNode => node !== null);
  };

  const visibleDocs = sortDocs(filterDocs(docs, docFilter));
  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Full-text search across all documents
  const handleContentSearch = async () => {
    if (!contentSearch.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const results: {docId: string, matches: number}[] = [];
    const searchLower = contentSearch.toLowerCase();

    // Search through all loaded documents
    for (const doc of docs) {
      if (doc.type === "file") {
        try {
          const encodedId = encodeURIComponent(doc.id);
          const res = await fetch(`/api/docs/${encodedId}`);
          if (res.ok) {
            const data = (await res.json()) as DocumentContent;
            const matches = (data.rawText.toLowerCase().match(new RegExp(searchLower, 'g')) || []).length;
            if (matches > 0) {
              results.push({ docId: doc.id, matches });
            }
          }
        } catch {
          // Skip errors for individual documents
        }
      }
    }

    setSearchResults(results.sort((a, b) => b.matches - a.matches));
    setIsSearching(false);
  };

  return {
    // State
    docs,
    isDocsLoading,
    docsError,
    selectedDocId,
    docContent,
    isDocLoading,
    docError,
    expandedFolders,
    docFilter,
    contentSearch,
    searchResults,
    isSearching,
    visibleDocs,
    
    // Actions
    setSelectedDocId,
    setDocFilter,
    setContentSearch,
    toggleFolder,
    handleContentSearch,
  };
};
