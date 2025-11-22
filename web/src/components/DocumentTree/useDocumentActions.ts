import { useState } from 'react';
import type { DocNode } from '@/lib/types';

// Helper to find node by ID
const findNodeById = (nodes: DocNode[], id: string): DocNode | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

interface UseDocumentActionsOptions {
  docs: DocNode[];
  onRefresh: () => void;
}

export function useDocumentActions({ docs, onRefresh }: UseDocumentActionsOptions) {
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const handleDelete = (docId: string) => {
    setDeletingDocId(docId);
  };

  const confirmDelete = async () => {
    if (!deletingDocId) return;

    try {
      const encodedId = encodeURIComponent(deletingDocId);
      const res = await fetch(`/api/docs/${encodedId}`, { method: "DELETE" });

      if (res.ok) {
        onRefresh();
      } else {
        console.error("Failed to delete document");
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeletingDocId(null);
    }
  };

  const cancelDelete = () => {
    setDeletingDocId(null);
  };

  const handleRename = (docId: string) => {
    const node = findNodeById(docs, docId);
    if (node) {
      setRenamingDocId(docId);
      setNewName(node.name);
    }
  };

  const confirmRename = async () => {
    if (!renamingDocId || !newName.trim()) return;

    try {
      const encodedId = encodeURIComponent(renamingDocId);
      const res = await fetch(`/api/docs/${encodedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName: newName.trim() }),
      });

      if (res.ok) {
        onRefresh();
      } else {
        console.error("Failed to rename document");
      }
    } catch (err) {
      console.error("Rename error:", err);
    } finally {
      setRenamingDocId(null);
      setNewName("");
    }
  };

  const cancelRename = () => {
    setRenamingDocId(null);
    setNewName("");
  };

  const deletingDocName = deletingDocId ? findNodeById(docs, deletingDocId)?.name ?? null : null;

  return {
    // Delete state
    deletingDocId,
    deletingDocName,
    handleDelete,
    confirmDelete,
    cancelDelete,
    // Rename state
    renamingDocId,
    newName,
    setNewName,
    handleRename,
    confirmRename,
    cancelRename,
  };
}
