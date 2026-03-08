import { retrieveContext } from "../rag/retrieve.js";
import nodemailer from "nodemailer";

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

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
      "Find portfolio evidence of a capability. Only use when the prospect explicitly asks for examples or proof of experience. " +
      "Summarize results generally — do NOT list project names to the prospect unless they ask.",
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
  {
    name: "send_lead_email",
    description:
      "Send an email notification to Ethan with a new lead's details. " +
      "Use this AFTER capture_lead when a prospect has shared contact information. " +
      "This ensures Ethan gets notified immediately about interested prospects.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Prospect's name" },
        email: { type: "string", description: "Prospect's email address" },
        interest: { type: "string", description: "What they're interested in" },
        conversation_summary: {
          type: "string",
          description: "Brief summary of the conversation so far and what the prospect is looking for",
        },
      },
      required: ["interest", "conversation_summary"],
    },
  },
];

export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "search_services": {
      const chunks = await retrieveContext(input.query as string, 3);
      const serviceChunks = chunks.filter((c) => c.source.includes("Services"));
      if (serviceChunks.length === 0) return "No matching services found for this query.";
      return serviceChunks
        .map((c) => `[Source: ${c.source} | Relevance: ${(c.score * 100).toFixed(0)}%]\n${c.text}`)
        .join("\n\n---\n\n");
    }

    case "get_project_examples": {
      const chunks = await retrieveContext(input.capability as string, 3);
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

    case "send_lead_email": {
      const prospectName = (input.name as string) || "Not provided";
      const prospectEmail = (input.email as string) || "Not provided";
      const interest = input.interest as string;
      const summary = input.conversation_summary as string;

      const notifyTo = process.env.LEAD_NOTIFY_EMAIL;
      if (!transporter || !notifyTo) {
        console.log("\n=== LEAD EMAIL (SMTP not configured, logging instead) ===");
        console.log(JSON.stringify({ prospectName, prospectEmail, interest, summary }, null, 2));
        console.log("=========================================================\n");
        return "Email notification logged (SMTP not configured). Lead details recorded.";
      }

      await transporter.sendMail({
        from: `"GatesAI Bot" <${process.env.SMTP_USER}>`,
        to: notifyTo,
        subject: `New Lead: ${prospectName} — ${interest.slice(0, 60)}`,
        html: `
          <h2>New Lead from GatesAI Chatbot</h2>
          <table style="border-collapse:collapse;font-family:sans-serif;">
            <tr><td style="padding:8px;font-weight:bold;">Name</td><td style="padding:8px;">${prospectName}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Email</td><td style="padding:8px;">${prospectEmail}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Interest</td><td style="padding:8px;">${interest}</td></tr>
          </table>
          <h3>Conversation Summary</h3>
          <p>${summary}</p>
          <hr/>
          <p style="color:#888;font-size:12px;">Sent by GatesAI chatbot at ${new Date().toISOString()}</p>
        `,
      });

      return `Email notification sent to Ethan successfully. Lead: ${prospectName} (${prospectEmail}).`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}
