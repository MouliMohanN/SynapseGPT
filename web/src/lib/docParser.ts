import fs from "node:fs/promises";
import path from "node:path";
import type { DocumentContent, DocumentSection } from "@/lib/types";
import { DOCS_ROOT } from "@/lib/docProvider";

// Lightweight text extraction and sectioning for the initial unified
// document contract. This will be extended with format-aware parsing
// (pdf/docx/html) in later units.

export async function getDocumentContentById(
  id: string,
): Promise<DocumentContent | null> {
  const absolutePath = path.join(DOCS_ROOT, id);

  try {
    const stats = await fs.stat(absolutePath);
    if (!stats.isFile()) {
      return null;
    }

    const buffer = await fs.readFile(absolutePath);
    const rawText = buffer.toString("utf8");

    const sections = deriveSections(id, rawText);

    const doc: DocumentContent = {
      id,
      name: path.basename(id),
      path: id,
      rawText,
      sections,
      meta: {
        fileType: path.extname(id).slice(1).toLowerCase(),
        size: rawText.length,
        lastModified: stats.mtime.toISOString(),
      },
    };

    return doc;
  } catch {
    return null;
  }
}

function deriveSections(id: string, rawText: string): DocumentSection[] {
  const ext = path.extname(id).toLowerCase();

  if (ext === ".md") {
    return deriveMarkdownSections(rawText);
  }

  return [
    {
      id: "whole-document",
      title: "Document",
      startOffset: 0,
      endOffset: rawText.length,
      level: 1,
    },
  ];
}

function deriveMarkdownSections(rawText: string): DocumentSection[] {
  const sections: DocumentSection[] = [];

  const lines = rawText.split(/\n/);
  let offset = 0;

  interface PendingSection {
    id: string;
    title: string;
    startOffset: number;
    level: number;
  }

  let current: PendingSection | null = null;

  const flushCurrent = (endOffset: number) => {
    if (!current) return;
    sections.push({
      id: current.id,
      title: current.title,
      startOffset: current.startOffset,
      endOffset,
      level: current.level,
    });
    current = null;
  };

  lines.forEach((line, index) => {
    const headingMatch = /^(#+)\s+(.*)/.exec(line);
    const lineLengthWithNewline = line.length + 1;

    if (headingMatch) {
      flushCurrent(offset);

      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      current = {
        id: `s-${index}`,
        title,
        startOffset: offset,
        level,
      };
    }

    offset += lineLengthWithNewline;
  });

  flushCurrent(rawText.length);

  if (sections.length === 0) {
    return [
      {
        id: "whole-document",
        title: "Document",
        startOffset: 0,
        endOffset: rawText.length,
        level: 1,
      },
    ];
  }

  return sections;
}
