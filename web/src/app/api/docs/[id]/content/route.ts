import { NextResponse } from "next/server";
import type { DocumentContent, DocumentSection } from "@/lib/types";

// Placeholder document map keyed by id. This will be replaced with
// filesystem-backed content in a later unit.

const dummyDocumentMap: Record<string, DocumentContent> = {
  "getting-started-md": createDummyDoc(
    "getting-started-md",
    "GettingStarted.md",
    "docs/GettingStarted.md",
  ),
  "high-level-md": createDummyDoc(
    "high-level-md",
    "HighLevel.md",
    "docs/architecture/HighLevel.md",
  ),
};

function createDummyDoc(id: string, name: string, path: string): DocumentContent {
  const rawText = `# ${name}\n\nThis is a placeholder document used while wiring up the UI.\n\n## Section One\n\nSome example content for section one.\n\n## Section Two\n\nSome example content for section two.`;

  const sections: DocumentSection[] = [
    {
      id: "s1",
      title: "Section One",
      startOffset: rawText.indexOf("## Section One"),
      endOffset: rawText.indexOf("## Section Two"),
      level: 2,
    },
    {
      id: "s2",
      title: "Section Two",
      startOffset: rawText.indexOf("## Section Two"),
      endOffset: rawText.length,
      level: 2,
    },
  ];

  return {
    id,
    name,
    path,
    rawText,
    sections,
    meta: {
      fileType: "md",
      size: rawText.length,
      lastModified: new Date().toISOString(),
    },
  };
}

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const doc = dummyDocumentMap[id];

  if (!doc) {
    return new NextResponse("Document not found", { status: 404 });
  }

  return NextResponse.json(doc);
}
