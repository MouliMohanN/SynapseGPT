import { NextResponse } from "next/server";
import type { DocNode } from "@/lib/types";

// NOTE: This is a placeholder implementation.
// In a later unit, this will read from the real filesystem under the docs root.

const dummyDocs: DocNode[] = [
  {
    id: "getting-started-md",
    name: "GettingStarted.md",
    path: "docs/GettingStarted.md",
    type: "file",
    size: 1234,
    lastModified: new Date().toISOString(),
  },
  {
    id: "architecture-folder",
    name: "architecture",
    path: "docs/architecture",
    type: "folder",
    children: [
      {
        id: "high-level-md",
        name: "HighLevel.md",
        path: "docs/architecture/HighLevel.md",
        type: "file",
      },
    ],
  },
];

export async function GET() {
  return NextResponse.json({ docs: dummyDocs });
}
