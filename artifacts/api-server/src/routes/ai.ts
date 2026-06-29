import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

function getNvidiaKey(): string {
  const key = process.env["NVIDIA_API_KEY_1"] ?? process.env["NVIDIA_API_KEY"];
  if (!key) throw new Error("No NVIDIA API key configured");
  return key;
}

router.post("/ai/chat", async (req, res): Promise<void> => {
  const {
    messages = [],
    model = "kimi-k2.6",
    systemPrompt,
  } = req.body as {
    messages?: { role: string; content: string }[];
    model?: string;
    systemPrompt?: string;
  };

  const MODEL_MAP: Record<string, string> = {
    "kimi-k2.6": "moonshotai/kimi-k2.6",
    "deepseek-v4-pro": "deepseek-ai/deepseek-v4-pro",
    "deepseek-v4-flash": "deepseek-ai/deepseek-v4-flash",
    "llama-4-maverick": "meta/llama-4-maverick-17b-128e-instruct",
    "llama-3.3-70b": "meta/llama-3.3-70b-instruct",
  };

  const resolvedModel = MODEL_MAP[model] ?? MODEL_MAP["kimi-k2.6"];

  try {
    const apiKey = getNvidiaKey();
    const client = new OpenAI({ baseURL: NVIDIA_BASE_URL, apiKey, timeout: 60_000 });

    const systemMsg = systemPrompt
      ? [{ role: "system" as const, content: systemPrompt }]
      : [{ role: "system" as const, content: "You are AIVerse, an advanced AI assistant. Be concise, helpful, and technically precise." }];

    const allMessages = [
      ...systemMsg,
      ...messages.map(m => ({ role: m.role as "user" | "assistant" | "system", content: m.content })),
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await client.chat.completions.create({
      model: resolvedModel,
      messages: allMessages,
      max_tokens: 2048,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    logger.error({ err }, "AI chat error");
    if (!res.headersSent) {
      res.status(500).json({ error: err instanceof Error ? err.message : "AI service error" });
    }
  }
});

export default router;
