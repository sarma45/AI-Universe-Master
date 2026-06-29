import { Router, type IRouter } from "express";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const OPENROUTER_API_KEY = process.env["OPENAI_API_KEY"] ?? "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

router.post("/ai/chat", async (req, res): Promise<void> => {
  const {
    messages = [],
    model = "moonshotai/kimi-k2:free",
    systemPrompt,
  } = req.body as {
    messages?: { role: string; content: string }[];
    model?: string;
    systemPrompt?: string;
  };

  if (!OPENROUTER_API_KEY) {
    res.status(503).json({ error: "AI service not configured — set OPENAI_API_KEY" });
    return;
  }

  const systemMsg = systemPrompt
    ? [{ role: "system", content: systemPrompt }]
    : [{ role: "system", content: "You are AIVerse, an advanced AI assistant. Be concise, helpful, and technically precise." }];

  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://aiverse.replit.app",
        "X-Title": "AIVerse 2.0",
      },
      body: JSON.stringify({
        model,
        messages: [...systemMsg, ...messages],
        stream: true,
      }),
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      logger.error({ err }, "OpenRouter error");
      res.status(upstream.status).json({ error: err });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const reader = upstream.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      res.write(chunk);
    }

    res.end();
  } catch (err) {
    logger.error({ err }, "AI chat error");
    if (!res.headersSent) {
      res.status(500).json({ error: "AI service error" });
    }
  }
});

export default router;
