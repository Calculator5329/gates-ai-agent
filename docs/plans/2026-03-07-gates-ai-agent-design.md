# GatesAI Agent — Design Document

**Date**: 2026-03-07
**Status**: Approved

## Overview

AI sales agent for GatesAI that doubles as a live demo of the RAG chatbot product. Discusses services with prospective customers, matches their needs to GatesAI offerings, and captures leads. Built as a standalone app, designed for later integration into gatesai.site.

## Architecture

```
Frontend (React + Vite + Tailwind)
    ↕ SSE (streaming) + REST
Backend (Express — agent orchestrator + tools)
    ↕ @calculator-5329/cloud-proxy
Cloud Run Service (Claude API, Firestore, Vectors)
```

- **Frontend**: React 19 dashboard with portable chat panel + RAG sidebar
- **Backend**: Express middleware running the agentic loop, tool execution, and session management
- **Cloud Proxy**: Handles Claude API calls (streaming), Firestore (future lead storage), and vector embeddings/search
- **LLM**: Anthropic Claude via cloud proxy
- **Vectors**: Cloud proxy vectors module (Gemini embeddings + Firestore vector search)

## Backend

### Document Ingestion (one-time setup script)

1. Parse .docx files (GatesAI-Services.docx, Ethan-Gates-Comprehensive-Profile.docx, etc.)
2. Chunk into ~300-500 token segments with overlap
3. Call `proxy.vectors.embedBatch("knowledge", chunks)` to store in Firestore with embeddings
4. Re-run when source docs change

### Agent Orchestrator (`POST /api/chat` → SSE)

1. Receive user message + session ID
2. Retrieve conversation history from in-memory session store
3. Call `proxy.vectors.semanticSearch("knowledge", userMessage, { topK: 5 })` for relevant chunks
4. Build prompt: system prompt + retrieved chunks + conversation history
5. Call `proxy.ai.chatStream({ provider: "anthropic", ... messages, tools })`
6. Parse stream — execute tool calls, feed results back to Claude, continue
7. Stream text + RAG metadata + tool activity to frontend via SSE

### Tools

| Tool | Purpose | Implementation |
|------|---------|---------------|
| `search_services` | Match client needs to GatesAI offerings | Semantic search over services doc chunks |
| `get_project_examples` | Find portfolio projects demonstrating a capability | Semantic search over profile/project chunks |
| `capture_lead` | Collect prospect name, email, interest | Console.log for now, Firestore later |
| `get_pricing_info` | Return engagement models and pricing | Structured data from services doc |

### System Prompt

Instructs Claude to:
- Act as a GatesAI sales consultant (friendly, knowledgeable, not pushy)
- Use tools to pull specific evidence rather than guessing
- Guide conversations: understand needs → match services → show examples → offer next steps
- Capture lead info when prospect shows interest
- Be honest about depth levels per profile doc instructions

### Session Management

In-memory map: session ID → conversation history. No auth for standalone version.

## Frontend

### Layout: Two-panel dashboard

**Chat Panel** (left — portable component):
- Message bubbles with markdown rendering
- Streaming text with cursor/typing animation
- Lead capture form (inline when agent triggers it)
- Auto-scroll, message timestamps

**RAG Sidebar** (right — dashboard demo layer):
- Retrieved document chunks with source name, snippet, similarity score
- Live tool activity feed (pending/complete status)
- Highlights which chunks are being used
- Collapsible on mobile (chat-only = portable widget)

### Portability

Chat panel is self-contained with its own hooks (useChat, useSession). When porting to gatesai.site, drop in the chat component and point at the backend URL. Sidebar is a separate wrapper consuming the same SSE stream.

## SSE Streaming Protocol

```
event: rag
data: { "chunks": [{ "source": "...", "text": "...", "score": 0.94 }] }

event: tool_call
data: { "tool": "search_services", "status": "started", "args": { ... } }

event: tool_result
data: { "tool": "search_services", "status": "complete", "result": { ... } }

event: text
data: { "content": "partial token text" }

event: done
data: { "leadCaptured": false }
```

## Project Structure

```
gates-ai-agent/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express server + SSE endpoints
│   │   ├── agent/
│   │   │   ├── orchestrator.ts   # Agentic loop
│   │   │   ├── system-prompt.ts  # Agent persona & instructions
│   │   │   └── tools.ts          # Tool definitions + handlers
│   │   ├── rag/
│   │   │   ├── ingest.ts         # .docx parsing, chunking, embedding
│   │   │   └── retrieve.ts       # Semantic search wrapper
│   │   ├── sessions.ts           # In-memory session store
│   │   └── proxy-client.ts       # Shared cloud proxy instance
│   ├── docs/                     # Source .docx files
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   │   ├── ChatPanel.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   ├── StreamingText.tsx
│   │   │   │   ├── ChatInput.tsx
│   │   │   │   └── LeadCaptureForm.tsx
│   │   │   └── sidebar/
│   │   │       ├── RagSidebar.tsx
│   │   │       ├── SourceCard.tsx
│   │   │       └── ToolActivity.tsx
│   │   ├── hooks/
│   │   │   ├── useChat.ts
│   │   │   └── useSession.ts
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   └── vite.config.ts
├── docs/plans/
└── package.json                  # Root scripts
```

## Tech Stack

- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS
- **Backend**: Express, TypeScript, tsx (dev)
- **Cloud Proxy**: `@calculator-5329/cloud-proxy` (AI, vectors, firestore)
- **LLM**: Claude (Anthropic) via cloud proxy
- **Embeddings**: Gemini via cloud proxy vectors module
- **State**: In-memory sessions (backend), React state (frontend)
