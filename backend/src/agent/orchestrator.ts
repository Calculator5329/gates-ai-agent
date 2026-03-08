import { proxy } from "../proxy-client.js";
import { retrieveContext } from "../rag/retrieve.js";
import { tools, executeTool } from "./tools.js";
import { SYSTEM_PROMPT } from "./system-prompt.js";
import type { AgentEvent, RagChunk } from "./types.js";

const MAX_ITERATIONS = 10;
const MODEL = "claude-haiku-4-5-20251001";

export async function runAgent(
  userMessage: string,
  conversationMessages: Record<string, unknown>[],
  onEvent: (event: AgentEvent) => void
): Promise<void> {
  let leadCaptured = false;

  // 1. RAG retrieval (limit to 3 chunks for speed + conciseness)
  const retrieved = await retrieveContext(userMessage, 3);
  const ragChunks: RagChunk[] = retrieved.map((r) => ({
    source: r.source,
    text: r.text,
    score: r.score,
  }));

  onEvent({ type: "rag", chunks: ragChunks });

  // 2. Build context-enriched user message
  const contextBlock = retrieved.length > 0
    ? `\n\n<retrieved_context>\n${retrieved.map((r) => `[${r.source}] ${r.text}`).join("\n\n")}\n</retrieved_context>`
    : "";

  const enrichedMessage = userMessage + contextBlock;

  // Add user message to conversation
  conversationMessages.push({ role: "user", content: enrichedMessage });

  // 3. Agentic loop
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await proxy.ai.anthropic("/v1/messages", {
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools,
      messages: conversationMessages,
    }) as Record<string, unknown>;

    const content = response.content as Record<string, unknown>[];
    const stopReason = response.stop_reason as string;

    // Add assistant response to conversation
    conversationMessages.push({ role: "assistant", content });

    if (stopReason === "tool_use") {
      // Extract and execute tool calls
      const toolUseBlocks = content.filter((b) => b.type === "tool_use");
      const toolResults: Record<string, unknown>[] = [];

      for (const block of toolUseBlocks) {
        const toolName = block.name as string;
        const toolInput = block.input as Record<string, unknown>;
        const toolId = block.id as string;

        onEvent({ type: "tool_call", tool: toolName, status: "started", args: toolInput });

        const result = await executeTool(toolName, toolInput);

        if (toolName === "capture_lead") {
          leadCaptured = true;
        }

        onEvent({ type: "tool_result", tool: toolName, status: "complete", result });

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolId,
          content: result,
        });
      }

      // Add tool results as user message and continue loop
      conversationMessages.push({ role: "user", content: toolResults });
      continue;
    }

    // Extract text from response
    const textBlocks = content.filter((b) => b.type === "text");
    const fullText = textBlocks.map((b) => b.text as string).join("");

    // Stream text in chunks for a streaming effect
    const words = fullText.split(" ");
    const chunkSize = 3;
    for (let j = 0; j < words.length; j += chunkSize) {
      const chunk = words.slice(j, j + chunkSize).join(" ");
      const suffix = j + chunkSize < words.length ? " " : "";
      onEvent({ type: "text", content: chunk + suffix });
      await new Promise((r) => setTimeout(r, 20));
    }

    onEvent({ type: "done", leadCaptured });
    return;
  }

  // Safety: max iterations reached
  onEvent({ type: "text", content: "I apologize, but I'm having trouble processing that request. Could you try rephrasing?" });
  onEvent({ type: "done", leadCaptured });
}
