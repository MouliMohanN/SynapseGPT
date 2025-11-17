import { NextResponse } from "next/server";
import { getDocsTree } from "@/lib/docProvider";

export async function GET() {
  const docs = await getDocsTree();
  return NextResponse.json({ docs });
}

