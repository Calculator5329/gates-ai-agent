import { proxy } from "../proxy-client.js";

const COLLECTION = "gates-ai-knowledge";

export interface RetrievedChunk {
  id: string;
  text: string;
  source: string;
  chunkIndex: number;
  score: number;
}

export async function retrieveContext(
  query: string,
  topK: number = 5
): Promise<RetrievedChunk[]> {
  try {
    const result = await proxy.vectors.semanticSearch(COLLECTION, query, { topK });

    return result.results.map((r: Record<string, unknown>) => ({
      id: r.id as string,
      text: (r.text as string) ?? "",
      source: (r.source as string) ?? "unknown",
      chunkIndex: (r.chunkIndex as number) ?? 0,
      score: r.distance != null ? 1 - (r.distance as number) : 0,
    }));
  } catch (err) {
    console.warn("RAG retrieval failed (vector index may not be ready):", (err as Error).message);
    return [];
  }
}
