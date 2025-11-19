import { getDocsTree } from "@/lib/docProvider";
import { getDocumentContentById } from "@/lib/docParser";
import type { DocNode, DocumentContent } from "@/lib/types";

const DEFAULT_CHUNK_SIZE = 1200; // characters
const DEFAULT_CHUNK_OVERLAP = 200;
const DEFAULT_TOP_K = 5;
const DEFAULT_MIN_SCORE = 0.05;

interface DocumentChunk {
  id: string;
  docId: string;
  content: string;
  startOffset: number;
  endOffset: number;
}

interface ChunkCacheEntry {
  chunks: DocumentChunk[];
  chunkSize: number;
  chunkOverlap: number;
}

const chunkCache = new Map<string, ChunkCacheEntry>();

export interface RetrieveOptions {
  topK?: number;
  docIds?: string[];
  minScore?: number;
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface RetrievedChunk {
  docId: string;
  content: string;
  score: number;
  startOffset: number;
  endOffset: number;
}

export async function retrieveRelevantChunks(
  query: string,
  options: RetrieveOptions = {},
): Promise<RetrievedChunk[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return [];
  }

  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

  const documents = await loadDocuments(options.docIds);
  if (!documents.length) {
    return [];
  }

  const allChunks = await collectChunks(documents, chunkSize, chunkOverlap);
  if (!allChunks.length) {
    return [];
  }

  const index = buildTfIdfIndex(allChunks);
  const ranked = rankChunks(cleanQuery, index);

  const topK = options.topK ?? DEFAULT_TOP_K;
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;

  return ranked
    .filter((entry) => entry.score >= minScore)
    .slice(0, topK)
    .map(({ chunk, score }) => ({
      docId: chunk.docId,
      content: chunk.content,
      score,
      startOffset: chunk.startOffset,
      endOffset: chunk.endOffset,
    }));
}

async function loadDocuments(preferredDocIds?: string[]): Promise<DocumentContent[]> {
  if (preferredDocIds?.length) {
    const docs = await Promise.all(
      preferredDocIds.map(async (docId) => {
        const content = await getDocumentContentById(docId);
        return content;
      }),
    );
    return docs.filter((doc): doc is DocumentContent => Boolean(doc));
  }

  const tree = await getDocsTree();
  const fileIds = flattenDocTree(tree);
  const docContents = await Promise.all(
    fileIds.map(async (docId) => {
      const content = await getDocumentContentById(docId);
      return content;
    }),
  );
  return docContents.filter((doc): doc is DocumentContent => Boolean(doc));
}

function flattenDocTree(nodes: DocNode[]): string[] {
  const files: string[] = [];

  for (const node of nodes) {
    if (node.type === "file") {
      files.push(node.id);
    } else if (node.children?.length) {
      files.push(...flattenDocTree(node.children));
    }
  }

  return files;
}

async function collectChunks(
  docs: DocumentContent[],
  chunkSize: number,
  chunkOverlap: number,
): Promise<DocumentChunk[]> {
  const chunkLists = await Promise.all(
    docs.map((doc) => ensureChunksForDoc(doc, chunkSize, chunkOverlap)),
  );
  return chunkLists.flat();
}

async function ensureChunksForDoc(
  doc: DocumentContent,
  chunkSize: number,
  chunkOverlap: number,
): Promise<DocumentChunk[]> {
  const cached = chunkCache.get(doc.id);
  if (cached && cached.chunkSize === chunkSize && cached.chunkOverlap === chunkOverlap) {
    return cached.chunks;
  }

  const chunks = splitIntoChunks(doc, chunkSize, chunkOverlap);
  chunkCache.set(doc.id, { chunks, chunkSize, chunkOverlap });
  return chunks;
}

function splitIntoChunks(
  doc: DocumentContent,
  chunkSize: number,
  chunkOverlap: number,
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const text = doc.rawText;

  if (!text.trim()) {
    return chunks;
  }

  const effectiveChunk = Math.max(chunkSize, 200);
  const effectiveOverlap = Math.min(chunkOverlap, effectiveChunk - 50);

  for (let start = 0; start < text.length; start += effectiveChunk - effectiveOverlap) {
    const end = Math.min(text.length, start + effectiveChunk);
    const slice = text.slice(start, end).trim();
    if (!slice) {
      continue;
    }

    chunks.push({
      id: `${doc.id}:${start}`,
      docId: doc.id,
      content: slice,
      startOffset: start,
      endOffset: end,
    });

    if (end === text.length) {
      break;
    }
  }

  return chunks;
}

interface ChunkVector {
  chunk: DocumentChunk;
  vector: Map<string, number>;
  magnitude: number;
}

interface TfIdfIndex {
  vectors: ChunkVector[];
  idf: Map<string, number>;
}

function buildTfIdfIndex(chunks: DocumentChunk[]): TfIdfIndex {
  const vectors: ChunkVector[] = [];
  const documentFrequency = new Map<string, number>();
  const tokenizedChunks: { chunk: DocumentChunk; tokens: string[]; termFreq: Map<string, number> }[] = [];

  for (const chunk of chunks) {
    const tokens = tokenize(chunk.content);
    if (!tokens.length) {
      continue;
    }

    const termFreq = buildTermFrequency(tokens);
    tokenizedChunks.push({ chunk, tokens, termFreq });

    const uniqueTokens = new Set(termFreq.keys());
    for (const token of uniqueTokens) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }

  const totalChunks = tokenizedChunks.length;
  const idf = new Map<string, number>();

  for (const [token, df] of documentFrequency) {
    const weight = Math.log((totalChunks + 1) / (df + 1)) + 1;
    idf.set(token, weight);
  }

  for (const { chunk, tokens, termFreq } of tokenizedChunks) {
    const vector = new Map<string, number>();
    let magnitudeSquared = 0;

    for (const [token, freq] of termFreq) {
      const idfWeight = idf.get(token);
      if (!idfWeight) {
        continue;
      }
      const tf = freq / tokens.length;
      const weight = tf * idfWeight;
      vector.set(token, weight);
      magnitudeSquared += weight * weight;
    }

    const magnitude = Math.sqrt(magnitudeSquared) || 0.0001;
    vectors.push({ chunk, vector, magnitude });
  }

  return { vectors, idf };
}

function rankChunks(query: string, index: TfIdfIndex): Array<{ chunk: DocumentChunk; score: number }> {
  const tokens = tokenize(query);
  if (!tokens.length) {
    return [];
  }

  const termFreq = buildTermFrequency(tokens);
  const queryVector = new Map<string, number>();
  let queryMagnitudeSquared = 0;

  for (const [token, freq] of termFreq) {
    const idfWeight = index.idf.get(token);
    if (!idfWeight) {
      continue;
    }
    const tf = freq / tokens.length;
    const weight = tf * idfWeight;
    queryVector.set(token, weight);
    queryMagnitudeSquared += weight * weight;
  }

  const queryMagnitude = Math.sqrt(queryMagnitudeSquared) || 0.0001;

  const results: Array<{ chunk: DocumentChunk; score: number }> = [];

  for (const vectorEntry of index.vectors) {
    const score = cosineSimilarity(queryVector, queryMagnitude, vectorEntry.vector, vectorEntry.magnitude);
    if (score > 0) {
      results.push({ chunk: vectorEntry.chunk, score });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

function buildTermFrequency(tokens: string[]): Map<string, number> {
  const termFreq = new Map<string, number>();
  for (const token of tokens) {
    termFreq.set(token, (termFreq.get(token) ?? 0) + 1);
  }
  return termFreq;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.filter(Boolean) ?? [];
}

function cosineSimilarity(
  queryVector: Map<string, number>,
  queryMagnitude: number,
  chunkVector: Map<string, number>,
  chunkMagnitude: number,
): number {
  let dot = 0;
  const smaller = queryVector.size <= chunkVector.size ? queryVector : chunkVector;
  const larger = smaller === queryVector ? chunkVector : queryVector;

  for (const [token, weight] of smaller) {
    const otherWeight = larger.get(token);
    if (otherWeight) {
      dot += weight * otherWeight;
    }
  }

  return dot / (queryMagnitude * chunkMagnitude);
}
