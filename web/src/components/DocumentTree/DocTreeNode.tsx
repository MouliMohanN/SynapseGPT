import React from 'react';
import type { DocNode } from '@/lib/types';

interface DocTreeNodeProps {
  node: DocNode;
  depth: number;
  expanded: Record<string, boolean>;
  onToggleFolder: (id: string) => void;
  selectedDocId: string | null;
  onSelectDoc: (id: string) => void;
  filterQuery?: string;
  searchResults?: {docId: string, matches: number}[];
  onDelete?: (docId: string) => void;
  onRename?: (docId: string) => void;
}

export function DocTreeNode({
  node,
  depth,
  expanded,
  onToggleFolder,
  selectedDocId,
  onSelectDoc,
  filterQuery,
  searchResults,
  onDelete,
  onRename,
}: DocTreeNodeProps) {
  const isFolder = node.type === "folder";
  const isExpanded = filterQuery?.trim()
    ? true
    : !!expanded[node.id];
  const isActive = node.id === selectedDocId;
  const lowerQuery = filterQuery?.trim().toLowerCase() ?? "";
  const isMatch = lowerQuery
    ? (node.name.toLowerCase().includes(lowerQuery) ||
        (node.path || "").toLowerCase().includes(lowerQuery))
    : false;
  const searchMatch = searchResults?.find(r => r.docId === node.id);

  const paddingLeft = 8 + depth * 16;

  if (isFolder) {
    return (
      <div className="group/folder">
        <div className="relative">
          <button
            type="button"
            onClick={() => onToggleFolder(node.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all group ${
              isMatch ? "bg-amber-50 border border-amber-300" : ""
            }`}
            style={{ paddingLeft }}
          >
            <svg 
              className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${
                isExpanded ? 'rotate-90 text-slate-500' : 'text-slate-400'
              }`} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <svg 
              className="w-4 h-4 flex-shrink-0" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              {isExpanded ? (
                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" className="text-amber-500" />
              ) : (
                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm2-1a1 1 0 00-1 1v6a1 1 0 001 1h12a1 1 0 001-1V8a1 1 0 00-1-1h-4.586l-1.707-1.707A1 1 0 009.414 5H4z" clipRule="evenodd" className="text-amber-600" />
              )}
            </svg>
            <span className="truncate text-xs font-medium text-slate-900 group-hover:text-slate-950">{node.name}</span>
          </button>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/folder:opacity-100 transition-opacity flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); onRename?.(node.id); }}
              className="p-1 bg-white hover:bg-purple-50 text-purple-600 rounded border border-purple-200 shadow-sm"
              title="Rename"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete?.(node.id); }}
              className="p-1 bg-white hover:bg-red-50 text-red-600 rounded border border-red-200 shadow-sm"
              title="Delete"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
        {isExpanded && node.children && (
          <div className="mt-0.5 space-y-0.5">
            {node.children.map((child) => (
              <DocTreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                onToggleFolder={onToggleFolder}
                selectedDocId={selectedDocId}
                onSelectDoc={onSelectDoc}
                filterQuery={filterQuery}
                searchResults={searchResults}
                onDelete={onDelete}
                onRename={onRename}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative group/file">
      <button
        type="button"
        onClick={() => onSelectDoc(node.id)}
        className={`w-full flex flex-col px-3 py-1.5 rounded-lg transition-all ${
          isActive
            ? "bg-purple-600 text-white shadow-sm"
            : isMatch || searchMatch
              ? "bg-purple-50 text-purple-900 border border-purple-300"
              : "hover:bg-slate-100 text-slate-700"
        }`}
        style={{ paddingLeft }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-3.5 flex-shrink-0" />
          <svg 
            className={`w-4 h-4 flex-shrink-0 ${
              isActive ? "text-purple-200" : "text-purple-500"
            }`} 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
          <span className="block truncate text-xs font-medium">{node.name}</span>
          {searchMatch && (
            <span className="ml-auto text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-semibold">
              {searchMatch.matches}
            </span>
          )}
        </div>
        <span className={`block text-[10px] truncate ml-[30px] ${
          isActive ? "text-purple-200" : "text-slate-500"
        }`}>
          {node.path}
        </span>
      </button>
      
      {/* Action buttons - visible on hover */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/file:opacity-100 transition-opacity flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onRename?.(node.id); }}
          className="p-1 bg-white hover:bg-purple-50 text-purple-600 rounded border border-purple-200 shadow-sm"
          title="Rename"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete?.(node.id); }}
          className="p-1 bg-white hover:bg-red-50 text-red-600 rounded border border-red-200 shadow-sm"
          title="Delete"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}
