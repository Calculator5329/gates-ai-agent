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
