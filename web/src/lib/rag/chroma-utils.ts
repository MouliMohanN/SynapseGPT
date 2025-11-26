
import { ChromaClient } from "chromadb";

export function createChromaClient(chromaUrl: string) {
  const url = new URL(chromaUrl);
  return new ChromaClient({
    host: url.hostname,
    port: url.port ? parseInt(url.port) : undefined,
    ssl: url.protocol === "https:",
  });
}
