export interface Message {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: string;
  [key: string]: unknown;
}

export interface TextBlock {
  type: "text";
  text: string;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
}

// SSE events sent to frontend
export type AgentEvent =
  | { type: "rag"; chunks: RagChunk[] }
  | { type: "tool_call"; tool: string; status: "started"; args: Record<string, unknown> }
  | { type: "tool_result"; tool: string; status: "complete"; result: string }
  | { type: "text"; content: string }
  | { type: "error"; message: string }
  | { type: "done"; leadCaptured: boolean };

export interface RagChunk {
  source: string;
  text: string;
  score: number;
}

export interface Session {
  id: string;
  messages: Record<string, unknown>[]; // Raw Anthropic API message format
  createdAt: Date;
}
