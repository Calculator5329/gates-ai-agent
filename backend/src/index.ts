import express from "express";
import cors from "cors";
import { proxy } from "./proxy-client.js";
import { sessionStore } from "./sessions.js";
import { runAgent } from "./agent/orchestrator.js";
import type { AgentEvent } from "./agent/types.js";

const app = express();
const PORT = process.env.PORT ?? 3002;

app.use(cors());
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try {
    const proxyHealth = await proxy.health();
    res.json({ status: "ok", proxy: proxyHealth.status, timestamp: new Date().toISOString() });
  } catch {
    res.json({ status: "ok", proxy: "unreachable", timestamp: new Date().toISOString() });
  }
});

app.post("/api/chat", async (req, res) => {
  const { message, sessionId } = req.body as { message?: string; sessionId?: string };

  if (!message?.trim()) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const session = sessionStore.getOrCreate(sessionId);

  // Send session ID first
  res.write(`event: session\ndata: ${JSON.stringify({ sessionId: session.id })}\n\n`);

  const sendEvent = (event: AgentEvent) => {
    res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
  };

  try {
    await runAgent(message.trim(), session.messages, sendEvent);
  } catch (err) {
    console.error("Agent error:", err);
    sendEvent({ type: "error", message: "An error occurred processing your request." });
    sendEvent({ type: "done", leadCaptured: false });
  } finally {
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`GatesAI Agent server running on port ${PORT}`);
});
