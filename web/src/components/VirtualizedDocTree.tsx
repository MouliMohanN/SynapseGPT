"use client";

import React from "react";
import { FixedSizeList as List } from "react-window";
import type { DocNode } from "@/lib/types";

interface VirtualizedDocTreeProps {
  docs: DocNode[];
  expanded: Record<string, boolean>;
  onToggleFolder: (id: string) => void;
  selectedDocId: string | null;
  onSelectDoc: (id: string) => void;
  filterQuery?: string;
  searchResults?: { docId: string; matches: number }[];
  containerHeight: number;
}

interface FlatNode extends DocNode {
  depth: number;
}

function flattenNodes(
  nodes: DocNode[],
  expanded: Record<string, boolean>,
  depth = 0
): FlatNode[] {
  const result: FlatNode[] = [];
  
  for (const node of nodes) {
    result.push({ ...node, depth });
    
    if (node.type === "folder" && expanded[node.id] && node.children) {
      result.push(...flattenNodes(node.children, expanded, depth + 1));
    }
  }
  
  return result;
}

export function VirtualizedDocTree({
  docs,
  expanded,
  onToggleFolder,
  selectedDocId,
  onSelectDoc,
  filterQuery,
  searchResults,
  containerHeight,
}: VirtualizedDocTreeProps) {
  const flatNodes = React.useMemo(
    () => flattenNodes(docs, expanded),
    [docs, expanded]
  );

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const node = flatNodes[index];
    const isActive = node.id === selectedDocId;
    const lowerQuery = filterQuery?.trim().toLowerCase() ?? "";
    const isMatch = lowerQuery
      ? (node.name.toLowerCase().includes(lowerQuery) ||
          (node.path || "").toLowerCase().includes(lowerQuery))
      : false;
    const searchMatch = searchResults?.find(r => r.docId === node.id);
    const paddingLeft = 4 + node.depth * 10;

    if (node.type === "folder") {
      const isExpanded = expanded[node.id];
      
      return (
        <div style={style}>
          <button
            type="button"
            onClick={() => onToggleFolder(node.id)}
            className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-slate-900/70 ${
              isMatch ? "bg-amber-900/40" : ""
            }`}
            style={{ paddingLeft }}
          >
            <span className="text-[10px] text-slate-400">
              {isExpanded ? "▾" : "▸"}
            </span>
            <span className="text-[11px] text-amber-300">📁</span>
            <span className="truncate font-medium text-slate-100">{node.name}</span>
          </button>
        </div>
      );
    }

    return (
      <div style={style}>
        <button
          type="button"
          onClick={() => onSelectDoc(node.id)}
          className={`w-full flex flex-col px-2 py-1 rounded-md transition-colors ${
            isActive
              ? "bg-sky-700/80 text-white"
              : isMatch || searchMatch
                ? "bg-sky-900/60 text-sky-100"
                : "hover:bg-slate-900/70"
          }`}
          style={{ paddingLeft }}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-sky-300">📄</span>
            <span className="block truncate text-[12px]">{node.name}</span>
            {searchMatch && (
              <span className="ml-auto text-[9px] bg-amber-600 px-1.5 py-0.5 rounded-full">
                {searchMatch.matches}
              </span>
            )}
          </div>
          <span className="block text-[10px] text-slate-500 truncate ml-4">
            {node.path}
          </span>
        </button>
      </div>
    );
  };

  return (
    <List
      height={containerHeight}
      itemCount={flatNodes.length}
      itemSize={40}
      width="100%"
      className="text-xs text-slate-200"
    >
      {Row}
    </List>
  );
}
