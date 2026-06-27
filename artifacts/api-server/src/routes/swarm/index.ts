import { Router, type IRouter } from "express";
import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  swarmSessionsTable,
  swarmAgentsTable,
  swarmEventsTable,
} from "@workspace/db";
import {
  CreateSwarmSessionBody,
  GetSwarmSessionParams,
  DeleteSwarmSessionParams,
  PauseSwarmSessionParams,
  ResumeSwarmSessionParams,
  CancelSwarmSessionParams,
  ApproveSwarmCheckpointParams,
  ApproveSwarmCheckpointBody,
  ListSwarmAgentsParams,
  GetSessionEventsParams,
  ListSwarmSessionsResponse,
  CreateSwarmSessionResponse,
  GetSwarmSessionResponse,
  DeleteSwarmSessionResponse,
  PauseSwarmSessionResponse,
  ResumeSwarmSessionResponse,
  CancelSwarmSessionResponse,
  ApproveSwarmCheckpointResponse,
  ListSwarmAgentsResponse,
  GetSessionEventsResponse,
  GetSwarmAnalyticsResponse,
} from "@workspace/api-zod";
import { simulateSwarm } from "../../lib/swarm-engine";

const router: IRouter = Router();

router.get("/swarm/sessions", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(swarmSessionsTable)
    .orderBy(desc(swarmSessionsTable.createdAt))
    .limit(50);

  const parsed = ListSwarmSessionsResponse.parse({
    sessions: rows.map(serializeSession),
    total: rows.length,
    nextCursor: null,
  });
  res.json(parsed);
});

router.post("/swarm/sessions", async (req, res): Promise<void> => {
  const parsed = CreateSwarmSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { nanoid } = await import("nanoid");
  const id = nanoid();
  const data = parsed.data;

  const [session] = await db
    .insert(swarmSessionsTable)
    .values({
      id,
      title: data.title,
      objective: data.objective,
      orchestratorModel: data.orchestratorModel ?? "claude-sonnet",
      workerModels: data.workerModels ?? ["gpt-4o", "claude-haiku", "gemini-flash"],
      maxParallelAgents: data.maxParallelAgents ?? 4,
      maxStepsPerAgent: data.maxStepsPerAgent ?? 10,
      toolsAllowed: data.toolsAllowed ?? ["web_search", "code_execute", "read_url", "memory", "file_write"],
      humanCheckpoints: data.humanCheckpoints ?? false,
      budgetCapUsd: data.budgetCapUsd?.toString() ?? null,
      status: "PENDING",
    })
    .returning();

  simulateSwarm(id, data.objective).catch(() => {});

  res.status(201).json(CreateSwarmSessionResponse.parse(serializeSession(session)));
});

router.get("/swarm/sessions/:id", async (req, res): Promise<void> => {
  const params = GetSwarmSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(swarmSessionsTable)
    .where(eq(swarmSessionsTable.id, params.data.id));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const agents = await db
    .select()
    .from(swarmAgentsTable)
    .where(eq(swarmAgentsTable.sessionId, params.data.id))
    .orderBy(swarmAgentsTable.createdAt);

  const events = await db
    .select()
    .from(swarmEventsTable)
    .where(eq(swarmEventsTable.sessionId, params.data.id))
    .orderBy(desc(swarmEventsTable.timestamp))
    .limit(100);

  res.json(
    GetSwarmSessionResponse.parse({
      ...serializeSession(session),
      agents: agents.map(serializeAgent),
      recentEvents: events.reverse().map(serializeEvent),
    })
  );
});

router.delete("/swarm/sessions/:id", async (req, res): Promise<void> => {
  const params = DeleteSwarmSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db
    .delete(swarmSessionsTable)
    .where(eq(swarmSessionsTable.id, params.data.id));

  res.json(DeleteSwarmSessionResponse.parse({ success: true }));
});

router.post("/swarm/sessions/:id/pause", async (req, res): Promise<void> => {
  const params = PauseSwarmSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .update(swarmSessionsTable)
    .set({ status: "PAUSED", updatedAt: new Date() })
    .where(eq(swarmSessionsTable.id, params.data.id))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(PauseSwarmSessionResponse.parse(serializeSession(session)));
});

router.post("/swarm/sessions/:id/resume", async (req, res): Promise<void> => {
  const params = ResumeSwarmSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .update(swarmSessionsTable)
    .set({ status: "RUNNING", updatedAt: new Date() })
    .where(eq(swarmSessionsTable.id, params.data.id))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(ResumeSwarmSessionResponse.parse(serializeSession(session)));
});

router.post("/swarm/sessions/:id/cancel", async (req, res): Promise<void> => {
  const params = CancelSwarmSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .update(swarmSessionsTable)
    .set({ status: "CANCELLED", completedAt: new Date(), updatedAt: new Date() })
    .where(eq(swarmSessionsTable.id, params.data.id))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(CancelSwarmSessionResponse.parse(serializeSession(session)));
});

router.post("/swarm/sessions/:id/approve", async (req, res): Promise<void> => {
  const params = ApproveSwarmCheckpointParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = ApproveSwarmCheckpointBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { nanoid } = await import("nanoid");

  await db.insert(swarmEventsTable).values({
    id: nanoid(),
    sessionId: params.data.id,
    type: body.data.approved ? "HUMAN_APPROVED" : "HUMAN_REJECTED",
    payload: { approved: body.data.approved, feedback: body.data.feedback ?? null },
  });

  const status = body.data.approved ? "RUNNING" : "CANCELLED";
  const [session] = await db
    .update(swarmSessionsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(swarmSessionsTable.id, params.data.id))
    .returning();

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json(ApproveSwarmCheckpointResponse.parse(serializeSession(session)));
});

router.get("/swarm/sessions/:id/agents", async (req, res): Promise<void> => {
  const params = ListSwarmAgentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const agents = await db
    .select()
    .from(swarmAgentsTable)
    .where(eq(swarmAgentsTable.sessionId, params.data.id))
    .orderBy(swarmAgentsTable.createdAt);

  res.json(ListSwarmAgentsResponse.parse(agents.map(serializeAgent)));
});

router.get("/swarm/sessions/:id/events", async (req, res): Promise<void> => {
  const params = GetSessionEventsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const events = await db
    .select()
    .from(swarmEventsTable)
    .where(eq(swarmEventsTable.sessionId, params.data.id))
    .orderBy(swarmEventsTable.timestamp)
    .limit(200);

  res.json(GetSessionEventsResponse.parse({ events: events.map(serializeEvent), nextCursor: null }));
});

router.get("/swarm/analytics", async (_req, res): Promise<void> => {
  const sessions = await db.select().from(swarmSessionsTable);

  const total = sessions.length;
  const completed = sessions.filter((s) => s.status === "COMPLETED").length;
  const failed = sessions.filter((s) => s.status === "FAILED").length;
  const running = sessions.filter((s) => s.status === "RUNNING" || s.status === "PLANNING").length;
  const successRate = total > 0 ? (completed / total) * 100 : 0;

  const totalTokens = sessions.reduce((a, s) => a + s.totalTokens, 0);
  const totalCost = sessions.reduce((a, s) => a + parseFloat(s.totalCostUsd ?? "0"), 0);

  const completedWithDuration = sessions.filter(
    (s) => s.status === "COMPLETED" && s.startedAt && s.completedAt
  );
  const avgDurationMs =
    completedWithDuration.length > 0
      ? completedWithDuration.reduce(
          (a, s) => a + (s.completedAt!.getTime() - s.startedAt!.getTime()),
          0
        ) / completedWithDuration.length
      : 0;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sessionsThisMonth = sessions.filter((s) => s.createdAt >= startOfMonth).length;
  const costThisMonth = sessions
    .filter((s) => s.createdAt >= startOfMonth)
    .reduce((a, s) => a + parseFloat(s.totalCostUsd ?? "0"), 0);

  const sessionsLast7Days: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const count = sessions.filter((s) => s.createdAt.toISOString().split("T")[0] === dateStr).length;
    sessionsLast7Days.push({ date: dateStr, count });
  }

  res.json(
    GetSwarmAnalyticsResponse.parse({
      totalSessions: total,
      completedSessions: completed,
      failedSessions: failed,
      runningSessions: running,
      successRate,
      totalTokensUsed: totalTokens,
      totalCostUsd: totalCost,
      avgDurationMs,
      sessionsThisMonth,
      costThisMonth,
      sessionsLast7Days,
    })
  );
});

router.get("/swarm/sessions/:id/stream", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  let lastEventCount = 0;
  const interval = setInterval(async () => {
    try {
      const [session] = await db
        .select()
        .from(swarmSessionsTable)
        .where(eq(swarmSessionsTable.id, id));

      if (!session) {
        clearInterval(interval);
        res.end();
        return;
      }

      const agents = await db
        .select()
        .from(swarmAgentsTable)
        .where(eq(swarmAgentsTable.sessionId, id))
        .orderBy(swarmAgentsTable.createdAt);

      const events = await db
        .select()
        .from(swarmEventsTable)
        .where(eq(swarmEventsTable.sessionId, id))
        .orderBy(swarmEventsTable.timestamp)
        .offset(lastEventCount);

      if (events.length > 0) {
        lastEventCount += events.length;
        for (const evt of events) {
          sendEvent({ type: "event", data: serializeEvent(evt) });
        }
      }

      sendEvent({
        type: "state",
        session: serializeSession(session),
        agents: agents.map(serializeAgent),
      });

      if (["COMPLETED", "FAILED", "CANCELLED"].includes(session.status)) {
        clearInterval(interval);
        sendEvent({ type: "done" });
        res.end();
      }
    } catch {
      clearInterval(interval);
      res.end();
    }
  }, 500);

  req.on("close", () => {
    clearInterval(interval);
  });
});

function serializeSession(s: typeof swarmSessionsTable.$inferSelect) {
  return {
    ...s,
    totalCostUsd: parseFloat(s.totalCostUsd ?? "0"),
    budgetCapUsd: s.budgetCapUsd ? parseFloat(s.budgetCapUsd) : null,
    startedAt: s.startedAt?.toISOString() ?? null,
    completedAt: s.completedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function serializeAgent(a: typeof swarmAgentsTable.$inferSelect) {
  return {
    ...a,
    startedAt: a.startedAt?.toISOString() ?? null,
    completedAt: a.completedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

function serializeEvent(e: typeof swarmEventsTable.$inferSelect) {
  return {
    ...e,
    timestamp: e.timestamp.toISOString(),
  };
}

export default router;
