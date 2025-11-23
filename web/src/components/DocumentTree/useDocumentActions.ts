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
  onNotify?: (message: string, type: "success" | "error") => void;
}

export function useDocumentActions({ docs, onRefresh, onNotify }: UseDocumentActionsOptions) {
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const handleDelete = (docId: string) => {
    setDeletingDocId(docId);
  };

  const confirmDelete = async () => {
    if (!deletingDocId) return;

    try {
      const node = findNodeById(docs, deletingDocId);
      const name = node?.name ?? deletingDocId;
      const encodedId = encodeURIComponent(deletingDocId);
      const res = await fetch(`/api/docs/${encodedId}`, { method: "DELETE" });

      if (res.ok) {
        onRefresh();
        onNotify?.(`Deleted "${name}"`, "success");
      } else {
        console.error("Failed to delete document");
        onNotify?.("Failed to delete document", "error");
      }
    } catch (err) {
      console.error("Delete error:", err);
      onNotify?.("Failed to delete document", "error");
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
      const node = findNodeById(docs, renamingDocId);
      const oldName = node?.name ?? renamingDocId;
      const encodedId = encodeURIComponent(renamingDocId);
      const res = await fetch(`/api/docs/${encodedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName: newName.trim() }),
      });

      if (res.ok) {
        onRefresh();
        onNotify?.(`Renamed "${oldName}" to "${newName.trim()}"`, "success");
      } else {
        console.error("Failed to rename document");
        onNotify?.("Failed to rename document", "error");
      }
    } catch (err) {
      console.error("Rename error:", err);
      onNotify?.("Failed to rename document", "error");
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
