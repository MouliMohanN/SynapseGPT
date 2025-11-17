import fs from "node:fs/promises";
import path from "node:path";
import type { DocNode } from "@/lib/types";

// Root directory where documentation lives. This can be overridden via
// an environment variable so the app remains flexible for different projects.
const DOCS_ROOT_ENV = process.env.DOCS_ROOT;

// From the Next.js app inside /web, the repo-level docs/ folder lives one
// level above. We resolve it here to avoid duplicating this logic elsewhere.
export const DOCS_ROOT = DOCS_ROOT_ENV
  ? path.resolve(DOCS_ROOT_ENV)
  : path.resolve(process.cwd(), "..", "docs");

// Supported document extensions for the initial implementation.
const SUPPORTED_EXTENSIONS = new Set([
  ".md",
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
  ".html",
  ".htm",
]);

export async function getDocsTree(): Promise<DocNode[]> {
  try {
    const stats = await fs.stat(DOCS_ROOT);
    if (!stats.isDirectory()) {
      return [];
    }
  } catch {
    // If the docs root does not exist yet, we simply expose an empty tree.
    return [];
  }

  const entries = await fs.readdir(DOCS_ROOT, { withFileTypes: true });
  const nodes = await Promise.all(
    entries.map((entry) => buildNode(entry.name, DOCS_ROOT, "")),
  );

  // Filter out nulls (e.g., unsupported files) and undefined children.
  return nodes.filter((n): n is DocNode => Boolean(n));
}

async function buildNode(
  name: string,
  absoluteParent: string,
  relativeParent: string,
): Promise<DocNode | null> {
  const absolutePath = path.join(absoluteParent, name);
  const relativePath = relativeParent ? path.join(relativeParent, name) : name;

  const stats = await fs.stat(absolutePath);

  if (stats.isDirectory()) {
    const childrenEntries = await fs.readdir(absolutePath, {
      withFileTypes: true,
    });
    const children = (
      await Promise.all(
        childrenEntries.map((entry) =>
          buildNode(entry.name, absolutePath, relativePath),
        ),
      )
    ).filter((n): n is DocNode => Boolean(n));

    if (children.length === 0) {
      // Skip completely empty folders so the tree stays compact.
      return null;
    }

    return {
      id: relativePath,
      name,
      path: relativePath,
      type: "folder",
      children,
    };
  }

  const ext = path.extname(name).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    return null;
  }

  return {
    id: relativePath,
    name,
    path: relativePath,
    type: "file",
    size: stats.size,
    lastModified: stats.mtime.toISOString(),
  };
}
