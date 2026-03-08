import express from "express";
import cors from "cors";
import { proxy } from "./proxy-client.js";

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

app.listen(PORT, () => {
  console.log(`GatesAI Agent server running on port ${PORT}`);
});
