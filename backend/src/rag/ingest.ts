import "dotenv/config";
import path from "path";
import { readdir } from "fs/promises";
import { fileURLToPath } from "url";
import mammoth from "mammoth";
import { chunkText, type Chunk } from "./chunker.js";
import { proxy } from "../proxy-client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.resolve(__dirname, "../../docs");
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
  console.log(
    `Stored ${result.count} chunks with IDs: ${result.ids.slice(0, 3).join(", ")}...`
  );
  console.log("Ingestion complete.");
}

ingest().catch(console.error);
