import React from 'react';
import type { DocNode } from '@/lib/types';
import { DocTreeNode } from './DocumentTree/DocTreeNode';
import { DeleteConfirmDialog } from './DocumentTree/DeleteConfirmDialog';
import { RenameDialog } from './DocumentTree/RenameDialog';
import { useDocumentTree } from './DocumentTree/useDocumentTree';
import { useDocumentActions } from './DocumentTree/useDocumentActions';
import { CreateFolderModal } from './CreateFolderModal';
import { CreateFileModal } from './CreateFileModal';
import { Toast } from './Toast';

interface DocumentTreeProps {
  selectedDocId: string | null;
  onSelectDoc: (id: string) => void;
  onSettingsClick: () => void;
  onUploadClick: () => void;
  refreshTrigger?: number;
}

export function DocumentTree({
  selectedDocId,
  onSelectDoc,
  onSettingsClick,
  onUploadClick,
  refreshTrigger = 0,
}: DocumentTreeProps) {
  const [toast, setToast] = React.useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimeoutRef = React.useRef<number | null>(null);

  const showToast = React.useCallback((message: string, type: "success" | "error" = "success") => {
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, type });
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimeoutRef.current = null;
    }, 3000);
  }, []);

  // Use custom hook for tree state and loading
  const {
    docs,
    visibleDocs,
    isDocsLoading,
    docsError,
    expandedFolders,
    docFilter,
    setDocFilter,
    toggleFolder,
    loadDocs,
  } = useDocumentTree({ selectedDocId, onSelectDoc, refreshTrigger });

  // Use custom hook for actions (delete/rename)
  const {
    deletingDocId,
    deletingDocName,
    handleDelete,
    confirmDelete,
    cancelDelete,
    renamingDocId,
    newName,
    setNewName,
    handleRename,
    confirmRename,
    cancelRename,
  } = useDocumentActions({ docs, onRefresh: loadDocs, onNotify: showToast });

  const [isCreateFolderOpen, setIsCreateFolderOpen] = React.useState(false);
  const [createFolderParentPath, setCreateFolderParentPath] = React.useState("");
  const [isCreateFileOpen, setIsCreateFileOpen] = React.useState(false);
  const [createFileParentPath, setCreateFileParentPath] = React.useState("");

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

  const getParentPathForNewFolder = (): string => {
    if (!selectedDocId) return "";
    const node = findNodeById(docs, selectedDocId);
    if (!node) return "";
    if (node.type === "folder") {
      return node.path;
    }
    const parts = (node.path || "").split("/").filter(Boolean);
    if (parts.length <= 1) return "";
    parts.pop();
    return parts.join("/");
  };

  const handleCreateFolder = () => {
    const parent = getParentPathForNewFolder();
    setCreateFolderParentPath(parent);
    setIsCreateFolderOpen(true);
  };

  const handleCreateFile = () => {
    const parent = getParentPathForNewFolder();
    setCreateFileParentPath(parent);
    setIsCreateFileOpen(true);
  };

  return (
    <section className="border-r border-slate-300 flex flex-col bg-white overflow-hidden" style={{ width: `${20}%` }}>
      <div className="border-b border-slate-300 px-4 py-3 shrink-0 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-sm font-semibold text-slate-900">Documentation</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onUploadClick}
              className="p-1.5 bg-white hover:bg-purple-50 text-purple-600 rounded-md border border-purple-200 hover:border-purple-300 transition-all"
              title="Upload Document"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </button>
            <button
              onClick={handleCreateFolder}
              className="p-1.5 bg-white hover:bg-purple-50 text-purple-600 rounded-md border border-purple-200 hover:border-purple-300 transition-all"
              title="New Folder"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v4m-2-2h4" />
              </svg>
            </button>
            <button
              onClick={handleCreateFile}
              className="p-1.5 bg-white hover:bg-purple-50 text-purple-600 rounded-md border border-purple-200 hover:border-purple-300 transition-all"
              title="New File"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-7v10" />
              </svg>
            </button>
            <button
              onClick={onSettingsClick}
              className="p-1.5 bg-white hover:bg-purple-50 text-purple-600 rounded-md border border-purple-200 hover:border-purple-300 transition-all"
              title="Settings"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
        <input
          type="text"
          value={docFilter}
          onChange={(e) => setDocFilter(e.target.value)}
          placeholder="Filter by name or path…"
          className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-2 shadow-sm"
        />
      </div>
      <div className="flex-1 text-xs text-slate-700 overflow-auto p-4 bg-white">
        {isDocsLoading && <div>Loading documents...</div>}
        {docsError && (
          <p className="text-red-400">Failed to load docs: {docsError}</p>
        )}
        {!isDocsLoading && !docsError && visibleDocs.length === 0 && (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-500 text-sm">No documents found</p>
            <p className="text-slate-400 text-xs mt-1">Try adjusting your filters</p>
          </div>
        )}
        {!isDocsLoading && !docsError && visibleDocs.length > 0 && (
          <div className="space-y-1">
            {visibleDocs.map((node) => (
              <DocTreeNode
                key={node.id}
                node={node}
                depth={0}
                expanded={expandedFolders}
                onToggleFolder={toggleFolder}
                selectedDocId={selectedDocId}
                onSelectDoc={onSelectDoc}
                filterQuery={docFilter}
                onDelete={handleDelete}
                onRename={handleRename}
              />
            ))}
          </div>
        )}
      </div>
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={!!deletingDocId}
        itemName={deletingDocName}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      {/* Rename Dialog */}
      <RenameDialog
        isOpen={!!renamingDocId}
        currentName={newName}
        onChange={setNewName}
        onConfirm={confirmRename}
        onCancel={cancelRename}
      />
      {isCreateFolderOpen && (
        <CreateFolderModal
          isOpen={true}
          initialParentPath={createFolderParentPath}
          onClose={() => setIsCreateFolderOpen(false)}
          onCreated={() => {
            setIsCreateFolderOpen(false);
            loadDocs();
            showToast("Folder created", "success");
          }}
        />
      )}
      {isCreateFileOpen && (
        <CreateFileModal
          isOpen={true}
          initialParentPath={createFileParentPath}
          onClose={() => setIsCreateFileOpen(false)}
          onCreated={() => {
            setIsCreateFileOpen(false);
            loadDocs();
            showToast("File created", "success");
          }}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </section>
  );
}
