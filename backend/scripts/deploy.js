#!/usr/bin/env node
/**
 * Deploy backend to Cloud Run with env vars from .env
 * Usage: node scripts/deploy.js
 */
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const envPath = join(rootDir, ".env");
const deployEnvPath = join(rootDir, ".env.cloudrun");

// Read .env, strip comments and empty lines, convert to YAML for gcloud
const raw = readFileSync(envPath, "utf-8");
const entries = raw
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .filter((l) => !l.startsWith("PORT=")) // Cloud Run sets PORT automatically
  .map((l) => {
    const eq = l.indexOf("=");
    const key = l.slice(0, eq);
    const val = l.slice(eq + 1).replace(/^["']|["']$/g, "");
    return `${key}: "${val.replace(/"/g, '\\"')}"`;
  });

writeFileSync(deployEnvPath, entries.join("\n") + "\n");

try {
  execSync(
    `gcloud run deploy gates-ai-agent --source . --region us-central1 --env-vars-file=.env.cloudrun --allow-unauthenticated`,
    { cwd: rootDir, stdio: "inherit" }
  );
} finally {
  if (existsSync(deployEnvPath)) {
    unlinkSync(deployEnvPath);
  }
}
