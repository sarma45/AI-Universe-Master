import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@workspace/db";
import { userAgentsTable } from "@workspace/db";
import { verifyToken } from "./auth.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

function getUser(req: { headers: Record<string, string | string[] | undefined> }) {
  const authHeader = req.headers["authorization"] as string | undefined;
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return null;
  return verifyToken(token);
}

async function generateId(): Promise<string> {
  const { nanoid } = await import("nanoid");
  return nanoid();
}

router.get("/agents", async (req, res): Promise<void> => {
  const payload = getUser(req as any);
  if (!payload) { res.status(401).json({ error: "Unauthorized" }); return; }

  const agents = await db
    .select()
    .from(userAgentsTable)
    .where(eq(userAgentsTable.userId, payload.userId))
    .orderBy(desc(userAgentsTable.createdAt));

  res.json({ agents });
});

router.post("/agents", async (req, res): Promise<void> => {
  const payload = getUser(req as any);
  if (!payload) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { name, description, systemPrompt, model, isPublic } = req.body as {
    name?: string; description?: string; systemPrompt?: string; model?: string; isPublic?: boolean;
  };
  if (!name || !systemPrompt) {
    res.status(400).json({ error: "Name and system prompt are required" });
    return;
  }

  const id = await generateId();
  const [agent] = await db.insert(userAgentsTable).values({
    id,
    userId: payload.userId,
    name,
    description: description ?? null,
    systemPrompt,
    model: model ?? "moonshotai/kimi-k2:free",
    isPublic: isPublic ?? false,
    isActive: true,
    config: {},
  }).returning();

  logger.info({ agentId: agent!.id }, "Agent created");
  res.status(201).json(agent);
});

router.get("/agents/:id", async (req, res): Promise<void> => {
  const payload = getUser(req as any);
  if (!payload) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [agent] = await db
    .select()
    .from(userAgentsTable)
    .where(and(eq(userAgentsTable.id, req.params["id"]!), eq(userAgentsTable.userId, payload.userId)))
    .limit(1);

  if (!agent) { res.status(404).json({ error: "Agent not found" }); return; }
  res.json(agent);
});

router.put("/agents/:id", async (req, res): Promise<void> => {
  const payload = getUser(req as any);
  if (!payload) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { name, description, systemPrompt, model, isPublic, isActive } = req.body as {
    name?: string; description?: string; systemPrompt?: string; model?: string; isPublic?: boolean; isActive?: boolean;
  };

  const [existing] = await db
    .select()
    .from(userAgentsTable)
    .where(and(eq(userAgentsTable.id, req.params["id"]!), eq(userAgentsTable.userId, payload.userId)))
    .limit(1);

  if (!existing) { res.status(404).json({ error: "Agent not found" }); return; }

  const [updated] = await db
    .update(userAgentsTable)
    .set({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(systemPrompt !== undefined && { systemPrompt }),
      ...(model !== undefined && { model }),
      ...(isPublic !== undefined && { isPublic }),
      ...(isActive !== undefined && { isActive }),
      updatedAt: new Date(),
    })
    .where(eq(userAgentsTable.id, req.params["id"]!))
    .returning();

  res.json(updated);
});

router.delete("/agents/:id", async (req, res): Promise<void> => {
  const payload = getUser(req as any);
  if (!payload) { res.status(401).json({ error: "Unauthorized" }); return; }

  const [existing] = await db
    .select()
    .from(userAgentsTable)
    .where(and(eq(userAgentsTable.id, req.params["id"]!), eq(userAgentsTable.userId, payload.userId)))
    .limit(1);

  if (!existing) { res.status(404).json({ error: "Agent not found" }); return; }

  await db.delete(userAgentsTable).where(eq(userAgentsTable.id, req.params["id"]!));
  res.json({ success: true });
});

export default router;
