import { useState, useCallback, useRef } from "react";
import type { ChatMessage, RagChunk, ToolCall, TurnState } from "../types/index.ts";

export function useChat(sessionId: string | null, onSessionId: (id: string) => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [turnState, setTurnState] = useState<TurnState>({
    ragChunks: [],
    toolCalls: [],
    isStreaming: false,
  });
  const streamingTextRef = useRef("");
  const messageIdRef = useRef(0);

  const nextId = () => String(++messageIdRef.current);

  const handleEvent = useCallback(
    (type: string, data: Record<string, unknown>, assistantId: string, onSession: (id: string) => void) => {
      switch (type) {
        case "session":
          onSession(data.sessionId as string);
          break;

        case "rag":
          setTurnState((prev) => ({ ...prev, ragChunks: data.chunks as RagChunk[] }));
          break;

        case "tool_call":
          setTurnState((prev) => ({
            ...prev,
            toolCalls: [
              ...prev.toolCalls,
              { tool: data.tool as string, status: "started", args: data.args as Record<string, unknown> },
            ],
          }));
          break;

        case "tool_result":
          setTurnState((prev) => ({
            ...prev,
            toolCalls: prev.toolCalls.map((tc) =>
              tc.tool === data.tool && tc.status === "started"
                ? { ...tc, status: "complete" as const, result: data.result as string }
                : tc
            ),
          }));
          break;

        case "text":
          streamingTextRef.current += data.content as string;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: streamingTextRef.current } : m))
          );
          break;

        case "done":
          setTurnState((prev) => ({ ...prev, isStreaming: false }));
          break;
      }
    },
    []
  );

  const sendMessage = useCallback(
    async (text: string) => {
      // Add user message
      const userMsg: ChatMessage = { id: nextId(), role: "user", content: text, timestamp: new Date() };
      setMessages((prev) => [...prev, userMsg]);

      // Reset turn state
      streamingTextRef.current = "";
      setTurnState({ ragChunks: [], toolCalls: [], isStreaming: true });

      // Create assistant placeholder
      const assistantId = nextId();
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", timestamp: new Date() }]);

      try {
        const apiBase = import.meta.env.VITE_API_URL || "";
        const response = await fetch(`${apiBase}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, sessionId }),
        });

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7);
            } else if (line.startsWith("data: ") && eventType) {
              const data = JSON.parse(line.slice(6));
              handleEvent(eventType, data, assistantId, onSessionId);
              eventType = "";
            }
          }
        }
      } catch (err) {
        console.error("Chat error:", err);
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: "Sorry, something went wrong." } : m))
        );
        setTurnState((prev) => ({ ...prev, isStreaming: false }));
      }
    },
    [sessionId, onSessionId, handleEvent]
  );

  return { messages, turnState, sendMessage };
}
