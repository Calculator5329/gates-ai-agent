export interface Chunk {
  text: string;
  source: string;
  chunkIndex: number;
}

export function chunkText(
  text: string,
  source: string,
  maxTokens: number = 400,
  overlapTokens: number = 50
): Chunk[] {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  const chunks: Chunk[] = [];
  let current: string[] = [];
  let currentLen = 0;
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    if (currentLen + sentenceTokens > maxTokens && current.length > 0) {
      chunks.push({ text: current.join(" "), source, chunkIndex: chunkIndex++ });

      // Keep overlap
      const overlapSentences: string[] = [];
      let overlapLen = 0;
      for (let i = current.length - 1; i >= 0; i--) {
        const len = estimateTokens(current[i]);
        if (overlapLen + len > overlapTokens) break;
        overlapSentences.unshift(current[i]);
        overlapLen += len;
      }
      current = overlapSentences;
      currentLen = overlapLen;
    }

    current.push(sentence);
    currentLen += sentenceTokens;
  }

  if (current.length > 0) {
    chunks.push({ text: current.join(" "), source, chunkIndex: chunkIndex++ });
  }

  return chunks;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}
