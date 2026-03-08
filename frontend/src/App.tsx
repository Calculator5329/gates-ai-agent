import { ChatPanel } from "./components/chat/ChatPanel.js";
import { RagSidebar } from "./components/sidebar/RagSidebar.js";
import { useChat } from "./hooks/useChat.js";
import { useSession } from "./hooks/useSession.js";

function App() {
  const { sessionId, updateSessionId } = useSession();
  const { messages, turnState, sendMessage } = useChat(sessionId, updateSessionId);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">GatesAI Agent</h1>
          <span className="text-xs text-gray-500">AI Sales Assistant + RAG Demo</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              turnState.isStreaming ? "bg-blue-400 animate-pulse" : "bg-green-400"
            }`}
          />
          <span className="text-xs text-gray-500">
            {turnState.isStreaming ? "Thinking..." : "Ready"}
          </span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat panel */}
        <div className="flex-1 border-r border-gray-800">
          <ChatPanel
            messages={messages}
            isStreaming={turnState.isStreaming}
            onSend={sendMessage}
          />
        </div>

        {/* Sidebar — hidden on small screens */}
        <div className="hidden lg:block w-80 bg-gray-900">
          <RagSidebar turnState={turnState} />
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-2 border-t border-gray-800 bg-gray-900">
        <p className="text-xs text-gray-600 text-center">
          Powered by GatesAI &middot; gatesai.site
        </p>
      </footer>
    </div>
  );
}

export default App;
