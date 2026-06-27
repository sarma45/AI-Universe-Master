import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  swarmSessionsTable,
  swarmAgentsTable,
  swarmEventsTable,
} from "@workspace/db";
import { logger } from "./logger";

async function generateId(): Promise<string> {
  const { nanoid } = await import("nanoid");
  return nanoid();
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function insertEvent(
  sessionId: string,
  type: typeof swarmEventsTable.$inferInsert["type"],
  payload: object,
  agentId?: string,
  agentName?: string,
  agentRole?: string
): Promise<void> {
  await db.insert(swarmEventsTable).values({
    id: await generateId(),
    sessionId,
    agentId: agentId ?? null,
    agentName: agentName ?? null,
    agentRole: agentRole ?? null,
    type,
    payload,
  });
}

const AGENT_CONFIGS = [
  { name: "Orchestrator", role: "ORCHESTRATOR" as const, model: "claude-sonnet" },
  { name: "Researcher", role: "RESEARCHER" as const, model: "gpt-4o" },
  { name: "Executor", role: "EXECUTOR" as const, model: "claude-haiku" },
  { name: "Critic", role: "CRITIC" as const, model: "gemini-flash" },
];

const THINKING_MESSAGES = [
  "Analyzing the objective and breaking it into subtasks...",
  "Researching relevant information and context...",
  "Formulating an execution strategy...",
  "Cross-referencing available data sources...",
  "Evaluating potential approaches...",
  "Synthesizing findings from multiple sources...",
  "Reviewing outputs for quality and coherence...",
  "Optimizing the solution based on constraints...",
];

const TOOL_CALLS = [
  { tool: "web_search", args: { query: "latest research" }, result: "Found 47 relevant documents" },
  { tool: "code_execute", args: { language: "python", code: "print('analysis')" }, result: "Analysis complete" },
  { tool: "read_url", args: { url: "https://example.com" }, result: "Content extracted successfully" },
  { tool: "memory", args: { action: "store", key: "findings" }, result: "Stored in memory" },
  { tool: "file_write", args: { path: "output.md" }, result: "File written successfully" },
];

export async function simulateSwarm(sessionId: string, objective: string): Promise<void> {
  try {
    logger.info({ sessionId }, "Starting swarm simulation");

    await db
      .update(swarmSessionsTable)
      .set({ status: "PLANNING", startedAt: new Date(), updatedAt: new Date() })
      .where(eq(swarmSessionsTable.id, sessionId));

    await insertEvent(sessionId, "SWARM_STARTED", { objective });
    await sleep(800);

    const plan = {
      steps: [
        { id: 1, title: "Research & Context Gathering", agent: "Researcher" },
        { id: 2, title: "Analysis & Processing", agent: "Executor" },
        { id: 3, title: "Quality Review", agent: "Critic" },
        { id: 4, title: "Synthesis & Output", agent: "Orchestrator" },
      ],
    };

    await insertEvent(sessionId, "PLAN_CREATED", { plan });

    await db
      .update(swarmSessionsTable)
      .set({ status: "RUNNING", planJson: plan, updatedAt: new Date() })
      .where(eq(swarmSessionsTable.id, sessionId));

    await sleep(600);

    const agentIds: string[] = [];
    for (const cfg of AGENT_CONFIGS) {
      const agentId = await generateId();
      agentIds.push(agentId);

      await db.insert(swarmAgentsTable).values({
        id: agentId,
        sessionId,
        name: cfg.name,
        role: cfg.role,
        model: cfg.model,
        status: "IDLE",
        systemPrompt: `You are a ${cfg.role} agent in the swarm. Objective: ${objective}`,
      });

      await insertEvent(sessionId, "AGENT_SPAWNED", { name: cfg.name, role: cfg.role, model: cfg.model }, agentId, cfg.name, cfg.role);
      await sleep(200);
    }

    let totalTokens = 0;

    for (let step = 0; step < AGENT_CONFIGS.length; step++) {
      const cfg = AGENT_CONFIGS[step];
      const agentId = agentIds[step];
      const planStep = plan.steps[step];

      await db
        .update(swarmAgentsTable)
        .set({ status: "THINKING", startedAt: new Date(), currentTask: planStep.title, updatedAt: new Date() })
        .where(eq(swarmAgentsTable.id, agentId));

      await insertEvent(sessionId, "PLAN_STEP_STARTED", { step: planStep }, agentId, cfg.name, cfg.role);

      const thinkingCount = 2 + Math.floor(Math.random() * 3);
      for (let t = 0; t < thinkingCount; t++) {
        const message = THINKING_MESSAGES[(step * 3 + t) % THINKING_MESSAGES.length];
        await insertEvent(sessionId, "AGENT_THINKING", { message, step: t + 1 }, agentId, cfg.name, cfg.role);
        const tokens = 150 + Math.floor(Math.random() * 350);
        totalTokens += tokens;
        await db
          .update(swarmAgentsTable)
          .set({ tokensUsed: tokens, updatedAt: new Date() })
          .where(eq(swarmAgentsTable.id, agentId));
        await sleep(600 + Math.random() * 800);
      }

      await db
        .update(swarmAgentsTable)
        .set({ status: "EXECUTING", updatedAt: new Date() })
        .where(eq(swarmAgentsTable.id, agentId));

      await insertEvent(sessionId, "AGENT_EXECUTING", { task: planStep.title }, agentId, cfg.name, cfg.role);

      const toolCount = 1 + Math.floor(Math.random() * 3);
      for (let t = 0; t < toolCount; t++) {
        const toolCall = TOOL_CALLS[(step + t) % TOOL_CALLS.length];
        await insertEvent(sessionId, "TOOL_CALLED", { tool: toolCall.tool, args: toolCall.args }, agentId, cfg.name, cfg.role);
        await sleep(400 + Math.random() * 600);
        await insertEvent(sessionId, "TOOL_RESULT", { tool: toolCall.tool, result: toolCall.result }, agentId, cfg.name, cfg.role);
        await sleep(200);
      }

      const output = {
        summary: `${cfg.name} completed: ${planStep.title}`,
        findings: `Analyzed objective "${objective}" from ${cfg.role} perspective. Found ${10 + step * 5} relevant data points.`,
        confidence: 0.7 + Math.random() * 0.3,
      };

      await db
        .update(swarmAgentsTable)
        .set({
          status: "COMPLETED",
          outputJson: output,
          currentTask: null,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(swarmAgentsTable.id, agentId));

      await insertEvent(sessionId, "AGENT_COMPLETED", { output }, agentId, cfg.name, cfg.role);
      await insertEvent(sessionId, "PLAN_STEP_COMPLETED", { step: planStep, output }, agentId, cfg.name, cfg.role);

      await db
        .update(swarmSessionsTable)
        .set({ totalTokens, updatedAt: new Date() })
        .where(eq(swarmSessionsTable.id, sessionId));

      await sleep(300);
    }

    const finalResult = {
      summary: `Swarm successfully completed objective: "${objective}"`,
      agentsUsed: AGENT_CONFIGS.length,
      totalTokens,
      insights: [
        "Gathered comprehensive context from multiple sources",
        "Executed analysis with high confidence score",
        "Quality review passed all checks",
        "Final synthesis produced actionable output",
      ],
    };

    const estimatedCost = (totalTokens / 1000) * 0.002;

    await db
      .update(swarmSessionsTable)
      .set({
        status: "COMPLETED",
        resultJson: finalResult,
        totalTokens,
        totalCostUsd: estimatedCost.toFixed(6),
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(swarmSessionsTable.id, sessionId));

    await insertEvent(sessionId, "SWARM_COMPLETED", { result: finalResult });
    logger.info({ sessionId, totalTokens }, "Swarm simulation completed");
  } catch (err) {
    logger.error({ sessionId, err }, "Swarm simulation failed");
    await db
      .update(swarmSessionsTable)
      .set({ status: "FAILED", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(swarmSessionsTable.id, sessionId));
    await insertEvent(sessionId, "SWARM_FAILED", { error: String(err) });
  }
}
