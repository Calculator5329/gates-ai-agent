import type { ToolCall } from "../../types/index.js";

interface Props {
  toolCalls: ToolCall[];
}

export function ToolActivity({ toolCalls }: Props) {
  if (toolCalls.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
        Agent Actions
      </h3>
      <div className="space-y-2">
        {toolCalls.map((tc, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            {tc.status === "started" ? (
              <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-green-400">&#10003;</span>
            )}
            <span className="text-gray-300 font-mono text-xs">{tc.tool}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
