import { useState, useEffect, useCallback } from 'react';
import type { DocNode } from '@/lib/types';

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

interface UseDocumentTreeOptions {
  selectedDocId: string | null;
  onSelectDoc: (id: string) => void;
  refreshTrigger?: number;
}

export function useDocumentTree({
  selectedDocId,
  onSelectDoc,
  refreshTrigger = 0,
}: UseDocumentTreeOptions) {
  const [docs, setDocs] = useState<DocNode[]>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [docFilter, setDocFilter] = useState("");

  // Load documents function (extracted for reuse)
  const loadDocs = useCallback(async () => {
    try {
      setIsDocsLoading(true);
      setDocsError(null);
      const res = await fetch("/api/docs");
      if (!res.ok) {
        throw new Error(`Failed to load docs: ${res.status}`);
      }
      const data = (await res.json()) as { docs: DocNode[] };
      setDocs(data.docs);

      const hasSelectedDoc = !!selectedDocId;
      let hasDocInUrl = false;
      if (typeof window !== "undefined") {
        try {
          const params = new URLSearchParams(window.location.search);
          hasDocInUrl = !!params.get("doc");
        } catch {
          hasDocInUrl = false;
        }
      }

      if (!hasSelectedDoc && !hasDocInUrl) {
        const firstFile = findFirstFile(data.docs);
        if (firstFile) {
          onSelectDoc(firstFile.id);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setDocsError(message);
    } finally {
      setIsDocsLoading(false);
    }
  }, [selectedDocId, onSelectDoc]);

  // Load documents on mount or when refreshTrigger changes
  useEffect(() => {
    void loadDocs();
  }, [refreshTrigger, loadDocs]);

  const visibleDocs = sortDocs(filterDocs(docs, docFilter));

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return {
    docs,
    visibleDocs,
    isDocsLoading,
    docsError,
    expandedFolders,
    docFilter,
    setDocFilter,
    toggleFolder,
    loadDocs,
  };
}
