import { useEffect, useRef } from "react";
import { ChatInput } from "./ChatInput.js";
import { MessageBubble } from "./MessageBubble.js";
import type { ChatMessage } from "../../types/index.js";

interface Props {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSend: (message: string) => void;
}

export function ChatPanel({ messages, isStreaming, onSend }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Welcome to GatesAI</h2>
              <p className="text-sm">Ask me about our AI and software development services.</p>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreaming={isStreaming && msg.role === "assistant" && i === messages.length - 1}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <ChatInput onSend={onSend} disabled={isStreaming} />
    </div>
  );
}
