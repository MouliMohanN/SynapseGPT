import React, { useEffect, useState } from 'react';
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

interface DocTreeNodeProps {
  node: DocNode;
  depth: number;
  expanded: Record<string, boolean>;
  onToggleFolder: (id: string) => void;
  selectedDocId: string | null;
  onSelectDoc: (id: string) => void;
  filterQuery?: string;
  searchResults?: {docId: string, matches: number}[];
}

function DocTreeNode({
  node,
  depth,
  expanded,
  onToggleFolder,
  selectedDocId,
  onSelectDoc,
  filterQuery,
  searchResults,
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
      <div>
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
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelectDoc(node.id)}
      className={`w-full flex flex-col px-3 py-1.5 rounded-lg transition-all group ${
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
  );
}

interface DocumentTreeProps {
  selectedDocId: string | null;
  onSelectDoc: (id: string) => void;
  onSettingsClick: () => void;
}

export function DocumentTree({
  selectedDocId,
  onSelectDoc,
  onSettingsClick,
}: DocumentTreeProps) {
  const [docs, setDocs] = useState<DocNode[]>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [docFilter, setDocFilter] = useState("");
  // Content search feature is commented out in UI
  // const [contentSearch, setContentSearch] = useState("");
  const [searchResults] = useState<{docId: string, matches: number}[]>([]);
  // const [isSearching, setIsSearching] = useState(false);

  // Load documents on mount
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
          onSelectDoc(firstFile.id);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setDocsError(message);
      } finally {
        setIsDocsLoading(false);
      }
    };

    void loadDocs();
  }, [onSelectDoc]);

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

  // Content search feature is commented out in UI
  // const handleContentSearch = async () => {
  //   if (!contentSearch.trim()) {
  //     setSearchResults([]);
  //     return;
  //   }
  //   setIsSearching(true);
  //   const results: {docId: string, matches: number}[] = [];
  //   const searchLower = contentSearch.toLowerCase();
  //   for (const doc of docs) {
  //     if (doc.type === "file") {
  //       try {
  //         const encodedId = encodeURIComponent(doc.id);
  //         const res = await fetch(`/api/docs/${encodedId}`);
  //         if (res.ok) {
  //           const data = await res.json();
  //           const matches = (data.rawText.toLowerCase().match(new RegExp(searchLower, 'g')) || []).length;
  //           if (matches > 0) {
  //             results.push({ docId: doc.id, matches });
  //           }
  //         }
  //       } catch {
  //         // Skip errors for individual documents
  //       }
  //     }
  //   }
  //   setSearchResults(results.sort((a, b) => b.matches - a.matches));
  //   setIsSearching(false);
  // };
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
        <input
          type="text"
          value={docFilter}
          onChange={(e) => setDocFilter(e.target.value)}
          placeholder="Filter by name or path…"
          className="w-full rounded-lg bg-white border border-slate-300 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent mb-2 shadow-sm"
        />
        {/* <div className="flex gap-2"> 
          <div className="flex-1 relative">
            <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={contentSearch}
              onChange={(e) => setContentSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleContentSearch()}
              placeholder="Search content…"
              className="w-full rounded-lg bg-white border border-slate-300 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
            />
          </div>
          <button
            onClick={handleContentSearch}
            disabled={isSearching || !contentSearch.trim()}
            className="px-3 py-2 text-xs bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg shadow-sm transition-colors font-medium"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div> */}
        {searchResults.length > 0 && (
          <div className="mt-2 px-2 py-1 text-xs text-purple-700 bg-purple-50 rounded-md border border-purple-200">
            <span className="font-medium">{searchResults.length}</span> result{searchResults.length !== 1 ? 's' : ''} found
          </div>
        )}
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
                searchResults={searchResults}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
