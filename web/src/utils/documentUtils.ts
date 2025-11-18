import type { DocNode } from "@/lib/types";

/**
 * Recursively sorts document nodes: folders first, then alphabetically
 */
export const sortDocs = (nodes: DocNode[]): DocNode[] => {
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

/**
 * Filters document tree by query string
 */
export const filterDocs = (nodes: DocNode[], query: string): DocNode[] => {
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

/**
 * Finds the first file node in the document tree
 */
export const findFirstFile = (nodes: DocNode[]): DocNode | null => {
  for (const node of nodes) {
    if (node.type === "file") {
      return node;
    }
    if (node.type === "folder" && node.children) {
      const found = findFirstFile(node.children);
      if (found) return found;
    }
  }
  return null;
};
