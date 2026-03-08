# GatesAI Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI sales agent with RAG capability that discusses GatesAI services with prospects, demonstrates RAG chatbot product quality, and captures leads.

**Architecture:** Express backend orchestrates an agentic loop — retrieves relevant document chunks via cloud proxy vectors, calls Claude (Anthropic) with tool definitions via raw passthrough, executes tools, and streams events to a React dashboard frontend via SSE. Frontend has a portable chat panel and a RAG sidebar showing retrieved sources and live tool activity.

**Tech Stack:** React 19, Vite, TypeScript, Tailwind CSS, Express, `@calculator-5329/cloud-proxy`, Claude (Anthropic API)

---

## Task 1: Scaffold Frontend (Vite + React)

**Files:**
- Create: `frontend/` (via `npm create vite@latest`)
- Modify: `frontend/package.json`
- Modify: `frontend/tailwind.config.js` (if needed)

**Step 1: Create Vite project**

Run from `C:\Users\et2bo\OneDrive\Desktop\Projects\gates-ai-agent`:
```bash
npm create vite@latest frontend -- --template react-ts
```

**Step 2: Install dependencies**

```bash
cd frontend && npm install && npm install -D tailwindcss @tailwindcss/vite
```

**Step 3: Configure Tailwind**

In `frontend/vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3002",
    },
  },
});
```

Replace `frontend/src/index.css` with:
```css
@import "tailwindcss";
```

**Step 4: Clean up boilerplate**

Remove default Vite content from `App.tsx`, `App.css`. Replace `App.tsx` with:
```tsx
function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <h1 className="text-2xl p-4">GatesAI Agent</h1>
    </div>
  );
}
export default App;
```

**Step 5: Verify frontend runs**

```bash
cd frontend && npm run dev
```
Expected: Dev server on http://localhost:5173 showing "GatesAI Agent"

**Step 6: Commit**

```bash
git add frontend/
git commit -m "feat: scaffold frontend with Vite, React, TypeScript, Tailwind"
```

---

## Task 2: Scaffold Backend (Express + TypeScript)

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/src/index.ts`

**Step 1: Initialize backend**

```bash
mkdir -p backend/src
cd backend
npm init -y
npm install express cors
npm install -D typescript tsx @types/express @types/cors @types/node
```

**Step 2: Create tsconfig.json**

`backend/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

Set `"type": "module"` in `backend/package.json` and add scripts:
```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

**Step 3: Create Express server**

`backend/src/index.ts`:
```ts
import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT ?? 3002;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**Step 4: Verify backend runs**

```bash
cd backend && npm run dev
```
Then: `curl http://localhost:3002/api/health`
Expected: `{"status":"ok","timestamp":"..."}`

**Step 5: Commit**

```bash
git add backend/
git commit -m "feat: scaffold backend with Express, TypeScript, tsx"
```

---

## Task 3: Root Package + Cloud Proxy Setup

**Files:**
- Create: `package.json` (root)
- Create: `backend/.env`
- Create: `backend/src/proxy-client.ts`

**Step 1: Create root package.json**

`package.json` (project root):
```json
{
  "name": "gates-ai-agent",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev",
    "ingest": "cd backend && tsx src/rag/ingest.ts"
  },
  "devDependencies": {
    "concurrently": "^9.0.0"
  }
}
```

```bash
npm install
```

**Step 2: Install cloud proxy in backend**

```bash
cd backend && npm install "file:C:/Users/et2bo/OneDrive/Desktop/Projects/crs-package"
```

**Step 3: Create .env file**

`backend/.env`:
```env
PORT=3002
PROXY_URL=https://your-cloud-run-service.run.app
PROXY_TOKEN=your-proxy-token
```

Install dotenv:
```bash
cd backend && npm install dotenv
```

**Step 4: Create proxy client module**

`backend/src/proxy-client.ts`:
```ts
import "dotenv/config";
import { createClient } from "@calculator-5329/cloud-proxy";

if (!process.env.PROXY_URL || !process.env.PROXY_TOKEN) {
  throw new Error("Missing PROXY_URL or PROXY_TOKEN environment variables");
}

export const proxy = createClient({
  baseUrl: process.env.PROXY_URL,
  token: process.env.PROXY_TOKEN,
  timeout: 60_000,
});
```

**Step 5: Add health check for proxy**

Update `backend/src/index.ts` health endpoint:
```ts
import { proxy } from "./proxy-client.js";

app.get("/api/health", async (_req, res) => {
  try {
    const proxyHealth = await proxy.health();
    res.json({ status: "ok", proxy: proxyHealth.status, timestamp: new Date().toISOString() });
  } catch {
    res.json({ status: "ok", proxy: "unreachable", timestamp: new Date().toISOString() });
  }
});
```

**Step 6: Add .env to .gitignore**

Create `backend/.gitignore`:
```
node_modules/
dist/
.env
```

**Step 7: Commit**

```bash
git add package.json backend/src/proxy-client.ts backend/.gitignore backend/package.json
git commit -m "feat: add root scripts, cloud proxy SDK, environment config"
```

---

## Task 4: Document Ingestion — Parsing & Chunking

**Files:**
- Create: `backend/src/rag/ingest.ts`
- Create: `backend/src/rag/chunker.ts`
- Create: `backend/docs/` (copy .docx files here)

**Step 1: Copy source documents**

```bash
mkdir -p backend/docs
cp "C:/Users/et2bo/OneDrive/Desktop/Projects/GatesAI-Services.docx" backend/docs/
cp "C:/Users/et2bo/OneDrive/Desktop/Projects/Ethan-Gates-Comprehensive-Profile.docx" backend/docs/
```

**Step 2: Install docx parsing dependency**

```bash
cd backend && npm install mammoth
npm install -D @types/mammoth
```

Note: `mammoth` converts .docx to clean text/HTML — no binary ZIP parsing needed.

**Step 3: Create chunker module**

`backend/src/rag/chunker.ts`:
```ts
export interface Chunk {
  text: string;
  source: string;
  chunkIndex: number;
}

export function chunkText(
  text: string,
  source: string,
  maxTokens: number = 400,
  overlapTokens: number = 50
): Chunk[] {
  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  const chunks: Chunk[] = [];
  let current: string[] = [];
  let currentLen = 0;
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);

    if (currentLen + sentenceTokens > maxTokens && current.length > 0) {
      chunks.push({ text: current.join(" "), source, chunkIndex: chunkIndex++ });

      // Keep overlap
      const overlapSentences: string[] = [];
      let overlapLen = 0;
      for (let i = current.length - 1; i >= 0; i--) {
        const len = estimateTokens(current[i]);
        if (overlapLen + len > overlapTokens) break;
        overlapSentences.unshift(current[i]);
        overlapLen += len;
      }
      current = overlapSentences;
      currentLen = overlapLen;
    }

    current.push(sentence);
    currentLen += sentenceTokens;
  }

  if (current.length > 0) {
    chunks.push({ text: current.join(" "), source, chunkIndex: chunkIndex++ });
  }

  return chunks;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}
```

**Step 4: Create ingestion script**

`backend/src/rag/ingest.ts`:
```ts
import "dotenv/config";
import path from "path";
import { readdir } from "fs/promises";
import mammoth from "mammoth";
import { chunkText, type Chunk } from "./chunker.js";
import { proxy } from "../proxy-client.js";

const DOCS_DIR = path.resolve(import.meta.dirname, "../../docs");
const COLLECTION = "gates-ai-knowledge";

async function parseDocx(filePath: string): Promise<string> {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

async function ingest() {
  console.log("Starting document ingestion...");

  const files = (await readdir(DOCS_DIR)).filter((f) => f.endsWith(".docx"));
  console.log(`Found ${files.length} documents: ${files.join(", ")}`);

  const allChunks: Chunk[] = [];

  for (const file of files) {
    const filePath = path.join(DOCS_DIR, file);
    console.log(`Parsing: ${file}`);
    const text = await parseDocx(filePath);
    const chunks = chunkText(text, file);
    console.log(`  → ${chunks.length} chunks`);
    allChunks.push(...chunks);
  }

  console.log(`\nTotal chunks: ${allChunks.length}`);
  console.log("Embedding and storing via cloud proxy vectors...");

  const batchItems = allChunks.map((chunk) => ({
    text: chunk.text,
    data: {
      source: chunk.source,
      chunkIndex: chunk.chunkIndex,
    },
  }));

  const result = await proxy.vectors.embedBatch(COLLECTION, batchItems);
  console.log(`Stored ${result.count} chunks with IDs: ${result.ids.slice(0, 3).join(", ")}...`);
  console.log("Ingestion complete.");
}

ingest().catch(console.error);
```

**Step 5: Test ingestion locally**

```bash
npm run ingest
```
Expected: Parses both .docx files, chunks them, embeds and stores via cloud proxy.

**Step 6: Commit**

```bash
git add backend/src/rag/ backend/docs/
git commit -m "feat: document ingestion pipeline — docx parsing, chunking, embedding"
```

---

## Task 5: Retrieval Module

**Files:**
- Create: `backend/src/rag/retrieve.ts`

**Step 1: Create retrieval wrapper**

`backend/src/rag/retrieve.ts`:
```ts
import { proxy } from "../proxy-client.js";

const COLLECTION = "gates-ai-knowledge";

export interface RetrievedChunk {
  id: string;
  text: string;
  source: string;
  chunkIndex: number;
  score: number;
}

export async function retrieveContext(
  query: string,
  topK: number = 5
): Promise<RetrievedChunk[]> {
  const result = await proxy.vectors.semanticSearch(COLLECTION, query, { topK });

  return result.results.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    text: (r.text as string) ?? "",
    source: (r.source as string) ?? "unknown",
    chunkIndex: (r.chunkIndex as number) ?? 0,
    score: r.distance != null ? 1 - (r.distance as number) : 0,
  }));
}
```

**Step 2: Commit**

```bash
git add backend/src/rag/retrieve.ts
git commit -m "feat: semantic search retrieval module"
```

---

## Task 6: Tool Definitions

**Files:**
- Create: `backend/src/agent/tools.ts`

**Step 1: Define tool interfaces and handlers**

`backend/src/agent/tools.ts`:
```ts
import { retrieveContext } from "../rag/retrieve.js";

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export const tools: ToolDefinition[] = [
  {
    name: "search_services",
    description:
      "Search GatesAI's service offerings to find services that match a client's stated needs. " +
      "Returns relevant service descriptions with details. Use this when a prospect describes a problem or need.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The client need or problem to search for (e.g., 'chatbot for customer support', 'website redesign')",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_project_examples",
    description:
      "Find specific projects from Ethan's portfolio that demonstrate a particular capability or technology. " +
      "Returns project names, tech stacks, and descriptions. Use this to provide concrete evidence of experience.",
    input_schema: {
      type: "object",
      properties: {
        capability: {
          type: "string",
          description: "The capability or technology to find examples for (e.g., 'RAG chatbot', 'React dashboard', 'financial tools')",
        },
      },
      required: ["capability"],
    },
  },
  {
    name: "capture_lead",
    description:
      "Capture a prospective client's contact information and interest area. " +
      "Use this when a prospect has expressed interest and shared their details. Do NOT ask for all fields at once — collect naturally during conversation.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Prospect's name" },
        email: { type: "string", description: "Prospect's email address" },
        interest: { type: "string", description: "Summary of what they're interested in" },
        notes: { type: "string", description: "Any additional context from the conversation" },
      },
      required: ["interest"],
    },
  },
  {
    name: "get_pricing_info",
    description:
      "Get information about GatesAI's engagement models and pricing. " +
      "Use when a prospect asks about cost, pricing, or how engagements work.",
    input_schema: {
      type: "object",
      properties: {
        service_type: {
          type: "string",
          description: "The type of service to get pricing for (e.g., 'retainer', 'fixed-scope', 'consulting')",
        },
      },
      required: [],
    },
  },
];

export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "search_services": {
      const chunks = await retrieveContext(input.query as string, 5);
      const serviceChunks = chunks.filter((c) => c.source.includes("Services"));
      if (serviceChunks.length === 0) return "No matching services found for this query.";
      return serviceChunks
        .map((c) => `[Source: ${c.source} | Relevance: ${(c.score * 100).toFixed(0)}%]\n${c.text}`)
        .join("\n\n---\n\n");
    }

    case "get_project_examples": {
      const chunks = await retrieveContext(input.capability as string, 5);
      const projectChunks = chunks.filter((c) => c.source.includes("Profile") || c.source.includes("Comprehensive"));
      if (projectChunks.length === 0) return "No matching project examples found.";
      return projectChunks
        .map((c) => `[Source: ${c.source} | Relevance: ${(c.score * 100).toFixed(0)}%]\n${c.text}`)
        .join("\n\n---\n\n");
    }

    case "capture_lead": {
      const lead = {
        name: input.name ?? "Not provided",
        email: input.email ?? "Not provided",
        interest: input.interest,
        notes: input.notes ?? "",
        capturedAt: new Date().toISOString(),
      };
      console.log("\n=== LEAD CAPTURED ===");
      console.log(JSON.stringify(lead, null, 2));
      console.log("====================\n");
      return `Lead captured successfully. Details recorded for follow-up.`;
    }

    case "get_pricing_info": {
      return `GatesAI Engagement Models:

1. Monthly Retainer — Starting at $500/month
   Ongoing support, updates, and improvements. Best for businesses wanting a long-term AI or software partner.

2. Fixed-Scope Project — Priced per project
   A defined deliverable with a set price. Ideal for one-time builds (website, database migration, AI tool). Priced after a discovery call.

3. Consulting Session — 1-2 hours
   Assessment of your current setup to identify where AI or software improvements would have the most impact. Good starting point if unsure what you need.

Note: Ethan is a full-time Software Engineer at Dovaxis and a Master's student. Contracting availability should be discussed during a consultation.`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}
```

**Step 2: Commit**

```bash
git add backend/src/agent/tools.ts
git commit -m "feat: agent tool definitions — search_services, get_project_examples, capture_lead, get_pricing_info"
```

---

## Task 7: System Prompt

**Files:**
- Create: `backend/src/agent/system-prompt.ts`

**Step 1: Create system prompt**

`backend/src/agent/system-prompt.ts`:
```ts
export const SYSTEM_PROMPT = `You are the GatesAI consulting assistant — a knowledgeable, friendly, and professional AI that helps prospective clients understand what GatesAI can build for them.

## Who You Represent

GatesAI is run by Ethan Gates, a Software Engineer at Dovaxis and AI/ML Master's student at WGU. He has built 90+ software projects spanning full-stack web development, AI/ML, FinTech, game development, and data visualization. His portfolio is at calculator5329.github.io.

## Your Role

You are the first point of contact for potential clients. Your job is to:
1. Understand what the prospect needs or what problem they're trying to solve
2. Match their needs to specific GatesAI service offerings using your tools
3. Provide concrete evidence of capability by citing specific projects
4. Answer questions honestly and accurately
5. Guide interested prospects toward next steps (consultation call)
6. Capture lead information naturally when they show interest

## How to Behave

- Be conversational and warm, not salesy or pushy
- Ask clarifying questions to understand their real needs before recommending services
- ALWAYS use your tools to look up specific services and projects — never guess or fabricate details
- When citing projects, mention specific tech stacks and outcomes (e.g., "83% latency reduction", "45K book embeddings")
- Be honest about depth levels: Expert in React/TS frontend, Advanced in Python/FastAPI and AI, Intermediate in game dev
- If asked about something outside GatesAI's capabilities, say so honestly
- Note that Ethan works full-time at Dovaxis, so contracting availability needs discussion

## Conversation Flow

1. Greet and ask what brings them here
2. Listen and ask follow-up questions to understand their situation
3. Use search_services to find matching offerings
4. Use get_project_examples to show relevant portfolio evidence
5. Discuss scope, timeline, and engagement options
6. If they're interested, naturally collect their name and email via capture_lead
7. Suggest booking a consultation call as the next step

## Important Rules

- Never invent project names, statistics, or capabilities not in your knowledge base
- Always use tools to retrieve information rather than relying on memory
- Keep responses concise — 2-4 paragraphs max unless they ask for detail
- If a question is outside your knowledge, say "I'd recommend discussing that directly with Ethan during a consultation call"
- Format responses with markdown when helpful (bold for emphasis, lists for multiple points)`;
```

**Step 2: Commit**

```bash
git add backend/src/agent/system-prompt.ts
git commit -m "feat: agent system prompt — persona, behavior rules, conversation flow"
```

---

## Task 8: Agent Orchestrator

**Files:**
- Create: `backend/src/agent/orchestrator.ts`
- Create: `backend/src/agent/types.ts`

**Step 1: Define shared types**

`backend/src/agent/types.ts`:
```ts
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
```

**Step 2: Create the orchestrator**

`backend/src/agent/orchestrator.ts`:
```ts
import { proxy } from "../proxy-client.js";
import { retrieveContext } from "../rag/retrieve.js";
import { tools, executeTool } from "./tools.js";
import { SYSTEM_PROMPT } from "./system-prompt.js";
import type { AgentEvent, RagChunk } from "./types.js";

const MAX_ITERATIONS = 10;
const MODEL = "claude-sonnet-4-20250514";

export async function runAgent(
  userMessage: string,
  conversationMessages: Record<string, unknown>[],
  onEvent: (event: AgentEvent) => void
): Promise<void> {
  let leadCaptured = false;

  // 1. RAG retrieval
  const retrieved = await retrieveContext(userMessage, 5);
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
      max_tokens: 4096,
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
```

**Step 3: Commit**

```bash
git add backend/src/agent/
git commit -m "feat: agent orchestrator — RAG retrieval, Claude tool loop, chunked text streaming"
```

---

## Task 9: Sessions + SSE Endpoint

**Files:**
- Create: `backend/src/sessions.ts`
- Modify: `backend/src/index.ts`

**Step 1: Create session store**

`backend/src/sessions.ts`:
```ts
import { randomUUID } from "crypto";
import type { Session } from "./agent/types.js";

class SessionStore {
  private sessions = new Map<string, Session>();

  create(): Session {
    const session: Session = {
      id: randomUUID(),
      messages: [],
      createdAt: new Date(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  getOrCreate(id?: string): Session {
    if (id) {
      const existing = this.sessions.get(id);
      if (existing) return existing;
    }
    return this.create();
  }
}

export const sessionStore = new SessionStore();
```

**Step 2: Add SSE chat endpoint**

Update `backend/src/index.ts`:
```ts
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
```

**Step 3: Verify endpoint with curl**

```bash
curl -N -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What services do you offer?"}'
```
Expected: SSE stream with session, rag, text, and done events.

**Step 4: Commit**

```bash
git add backend/src/sessions.ts backend/src/index.ts
git commit -m "feat: session store and SSE chat endpoint"
```

---

## Task 10: Frontend Types + useChat Hook

**Files:**
- Create: `frontend/src/types/index.ts`
- Create: `frontend/src/hooks/useChat.ts`
- Create: `frontend/src/hooks/useSession.ts`

**Step 1: Define frontend types**

`frontend/src/types/index.ts`:
```ts
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
```

**Step 2: Create useSession hook**

`frontend/src/hooks/useSession.ts`:
```ts
import { useState, useCallback } from "react";

export function useSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  const updateSessionId = useCallback((id: string) => {
    setSessionId(id);
  }, []);

  return { sessionId, updateSessionId };
}
```

**Step 3: Create useChat hook**

`frontend/src/hooks/useChat.ts`:
```ts
import { useState, useCallback, useRef } from "react";
import type { ChatMessage, RagChunk, ToolCall, TurnState } from "../types/index.js";

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
        const response = await fetch("/api/chat", {
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
    [sessionId, onSessionId]
  );

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

  return { messages, turnState, sendMessage };
}
```

**Step 4: Commit**

```bash
git add frontend/src/types/ frontend/src/hooks/
git commit -m "feat: frontend types, useSession, and useChat SSE hook"
```

---

## Task 11: Chat Components

**Files:**
- Create: `frontend/src/components/chat/ChatInput.tsx`
- Create: `frontend/src/components/chat/MessageBubble.tsx`
- Create: `frontend/src/components/chat/ChatPanel.tsx`

**Step 1: Create ChatInput**

`frontend/src/components/chat/ChatInput.tsx`:
```tsx
import { useState, type FormEvent } from "react";

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t border-gray-800">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        disabled={disabled}
        className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Send
      </button>
    </form>
  );
}
```

**Step 2: Create MessageBubble**

`frontend/src/components/chat/MessageBubble.tsx`:
```tsx
import type { ChatMessage } from "../../types/index.js";

interface Props {
  message: ChatMessage;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
          isUser
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-gray-800 text-gray-100 rounded-bl-sm"
        }`}
      >
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
          {isStreaming && !message.content && (
            <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
          )}
          {isStreaming && message.content && (
            <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-0.5" />
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Create ChatPanel**

`frontend/src/components/chat/ChatPanel.tsx`:
```tsx
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
```

**Step 4: Commit**

```bash
git add frontend/src/components/chat/
git commit -m "feat: chat components — ChatInput, MessageBubble, ChatPanel"
```

---

## Task 12: Sidebar Components

**Files:**
- Create: `frontend/src/components/sidebar/SourceCard.tsx`
- Create: `frontend/src/components/sidebar/ToolActivity.tsx`
- Create: `frontend/src/components/sidebar/RagSidebar.tsx`

**Step 1: Create SourceCard**

`frontend/src/components/sidebar/SourceCard.tsx`:
```tsx
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
```

**Step 2: Create ToolActivity**

`frontend/src/components/sidebar/ToolActivity.tsx`:
```tsx
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
```

**Step 3: Create RagSidebar**

`frontend/src/components/sidebar/RagSidebar.tsx`:
```tsx
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
```

**Step 4: Commit**

```bash
git add frontend/src/components/sidebar/
git commit -m "feat: sidebar components — SourceCard, ToolActivity, RagSidebar"
```

---

## Task 13: App Layout — Two-Panel Dashboard

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: Wire everything together**

`frontend/src/App.tsx`:
```tsx
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
```

**Step 2: Clean up unused files**

Delete `frontend/src/App.css` if it exists. Remove any leftover Vite boilerplate imports.

**Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: two-panel dashboard layout — chat panel + RAG sidebar"
```

---

## Task 14: End-to-End Verification

**Step 1: Run document ingestion**

```bash
npm run ingest
```
Expected: Documents parsed, chunked, embedded, and stored in Firestore via cloud proxy.

**Step 2: Start both servers**

```bash
npm run dev
```
Expected: Backend on :3002, frontend on :5173.

**Step 3: Test in browser**

Open http://localhost:5173

1. Verify two-panel layout renders (chat left, sidebar right)
2. Type "What services do you offer?" and send
3. Verify:
   - SSE connection establishes
   - RAG sidebar shows retrieved document chunks with scores
   - Tool activity shows `search_services` executing
   - Chat response streams in with relevant service information
   - Status indicator shows "Thinking..." during processing, "Ready" after

**Step 4: Test tool calls**

Type "Do you have experience building chatbots?" and verify:
- `get_project_examples` tool fires
- Agent cites specific projects (agent-v2, arxiv dashboard, etc.)
- Sources sidebar updates

**Step 5: Test lead capture**

Type "My name is John, email john@example.com, I'm interested in a RAG chatbot" and verify:
- `capture_lead` tool fires
- Backend console shows captured lead JSON
- Agent confirms the lead was captured

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: complete GatesAI agent MVP — full-stack RAG chatbot with tool-use"
```
