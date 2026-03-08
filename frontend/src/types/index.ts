export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface RagChunk {
  source: string;
  text: string;
  score: number;
}

export interface ToolCall {
  tool: string;
  status: "started" | "complete";
  args?: Record<string, unknown>;
  result?: string;
}

export interface TurnState {
  ragChunks: RagChunk[];
  toolCalls: ToolCall[];
  isStreaming: boolean;
}
