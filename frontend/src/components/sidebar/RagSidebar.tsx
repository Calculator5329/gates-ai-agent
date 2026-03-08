import { SourceCard } from "./SourceCard.js";
import { ToolActivity } from "./ToolActivity.js";
import type { TurnState } from "../../types/index.js";

interface Props {
  turnState: TurnState;
}

export function RagSidebar({ turnState }: Props) {
  const { ragChunks, toolCalls, isStreaming } = turnState;

  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
        Sources & Activity
      </h2>

      {ragChunks.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Retrieved Documents
          </h3>
          <div className="space-y-2">
            {ragChunks.map((chunk, i) => (
              <SourceCard key={i} chunk={chunk} />
            ))}
          </div>
        </div>
      )}

      <ToolActivity toolCalls={toolCalls} />

      {isStreaming && ragChunks.length === 0 && toolCalls.length === 0 && (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <span className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
          Processing...
        </div>
      )}

      {!isStreaming && ragChunks.length === 0 && toolCalls.length === 0 && (
        <p className="text-gray-600 text-sm">
          Start a conversation to see retrieved documents and agent activity here.
        </p>
      )}
    </div>
  );
}
