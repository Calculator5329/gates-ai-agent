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
