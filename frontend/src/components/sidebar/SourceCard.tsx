import type { RagChunk } from "../../types/index.js";

interface Props {
  chunk: RagChunk;
}

export function SourceCard({ chunk }: Props) {
  const scorePercent = (chunk.score * 100).toFixed(0);
  const fileName = chunk.source.replace(".docx", "");

  return (
    <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-blue-400 truncate">{fileName}</span>
        <span className="text-xs text-gray-500">{scorePercent}%</span>
      </div>
      <p className="text-xs text-gray-400 line-clamp-3">{chunk.text}</p>
    </div>
  );
}
