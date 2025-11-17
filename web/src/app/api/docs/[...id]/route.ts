import { NextResponse } from "next/server";
import { getDocumentContentById } from "@/lib/docParser";

interface Params {
  params: Promise<{ id: string[] }>;
}

export async function GET(_request: Request, { params }: Params) {
  const resolvedParams = await params;
  const idParam = resolvedParams.id;
  const idPath = Array.isArray(idParam) ? idParam.join("/") : idParam;

  const doc = await getDocumentContentById(idPath);

  if (!doc) {
    return new NextResponse("Document not found", { status: 404 });
  }

  return NextResponse.json(doc);
}
