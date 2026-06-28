import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  swarmSessionsTable,
  swarmAgentsTable,
  swarmEventsTable,
} from "@workspace/db";
import { logger } from "./logger.js";
import {
  chatCompletion,
  chatCompletionText,
  resolveModelId,
  MODEL_CONFIGS,
  type ChatMessage,
  type ModelId,
} from "./llm-client.js";
import { executeTool, clearSessionMemory, TOOL_DEFINITIONS } from "./swarm-tools.js";
import type OpenAI from "openai";

async function generateId(): Promise<string> {
  const { nanoid } = await import("nanoid");
  return nanoid();
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

interface PlanStep {
  id: string;
  title: string;
  task: string;
  agent_role: string;
  depends_on: string[];
  model?: string;
}

interface SwarmPlan {
  plan_title: string;
  steps: PlanStep[];
}

type ValidRole = "ORCHESTRATOR" | "RESEARCHER" | "EXECUTOR" | "CRITIC" | "SYNTHESIZER" | "TOOL_CALLER";
const VALID_ROLES = new Set<ValidRole>(["ORCHESTRATOR", "RESEARCHER", "EXECUTOR", "CRITIC", "SYNTHESIZER", "TOOL_CALLER"]);

function sanitizeRole(raw: string): ValidRole {
  const upper = raw.toUpperCase() as ValidRole;
  if (VALID_ROLES.has(upper)) return upper;
  if (upper.includes("RESEARCH") || upper.includes("GATHER") || upper.includes("SEARCH")) return "RESEARCHER";
  if (upper.includes("EXECUT") || upper.includes("IMPLEMENT") || upper.includes("CODE")) return "EXECUTOR";
  if (upper.includes("CRITIC") || upper.includes("REVIEW") || upper.includes("QA") || upper.includes("QUALITY")) return "CRITIC";
  if (upper.includes("SYNTH") || upper.includes("SUMMAR") || upper.includes("ANALYS") || upper.includes("ANALYZ")) return "SYNTHESIZER";
  if (upper.includes("TOOL") || upper.includes("CALL") || upper.includes("FETCH")) return "TOOL_CALLER";
  return "EXECUTOR";
}

const ROLE_MODELS: Record<string, ModelId> = {
  ORCHESTRATOR: "llama-4-maverick",
  RESEARCHER: "llama-4-maverick",
  EXECUTOR: "deepseek-v4-flash",
  SYNTHESIZER: "llama-4-maverick",
  TOOL_CALLER: "deepseek-v4-flash",
  CRITIC: "deepseek-v4-flash",
};

async function createPlan(objective: string, orchestratorModel: ModelId): Promise<SwarmPlan> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are a master orchestrator AI. Given an objective, design an efficient multi-agent execution plan.
Output ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "plan_title": "Short descriptive title",
  "steps": [
    {
      "id": "step_1",
      "title": "Step title",
      "task": "Detailed description of exactly what this agent should do and produce",
      "agent_role": "RESEARCHER",
      "depends_on": []
    }
  ]
}
Rules:
- agent_role MUST be one of EXACTLY these values: RESEARCHER, EXECUTOR, SYNTHESIZER, CRITIC
- depends_on contains step IDs this step must wait for (empty array if no dependencies)
- 3-5 steps total — keep it lean and practical
- Make tasks concrete and actionable
- Do NOT include a "model" field`,
    },
    {
      role: "user",
      content: `Create an execution plan for this objective:\n\n${objective}`,
    },
  ];

  const raw = await chatCompletionText(orchestratorModel, messages, { jsonMode: true, maxTokens: 2048 });
  try {
    const parsed = JSON.parse(raw) as SwarmPlan;
    if (!parsed.steps || !Array.isArray(parsed.steps)) throw new Error("Invalid plan structure");
    return parsed;
  } catch {
    return {
      plan_title: objective.slice(0, 60),
      steps: [
        { id: "step_1", title: "Research", task: `Research and gather information about: ${objective}`, agent_role: "RESEARCHER" as const, depends_on: [], model: "llama-4-maverick" },
        { id: "step_2", title: "Synthesis", task: `Analyze the research findings and extract key insights about: ${objective}`, agent_role: "SYNTHESIZER" as const, depends_on: ["step_1"], model: "llama-4-maverick" },
        { id: "step_3", title: "Execution", task: `Execute and produce the final output based on analysis for: ${objective}`, agent_role: "EXECUTOR" as const, depends_on: ["step_2"], model: "deepseek-v4-flash" },
        { id: "step_4", title: "Review", task: `Review and critique the output for quality and completeness regarding: ${objective}`, agent_role: "CRITIC" as const, depends_on: ["step_3"], model: "deepseek-v4-flash" },
      ],
    };
  }
}

async function runAgent(
  sessionId: string,
  agentId: string,
  agentName: string,
  agentRole: string,
  modelId: ModelId,
  task: string,
  priorContext: string,
  maxTokens = 2048
): Promise<{ summary: string; output: string; tokensUsed: number }> {
  const modelLabel = MODEL_CONFIGS[modelId]?.label ?? modelId;
  const systemPrompt = `You are a ${agentRole} agent in an AI swarm (model: ${modelLabel}).

Your assigned task: ${task}

${priorContext ? `Context from previous agents:\n${priorContext}\n` : ""}
You have tools available. Use them actively to gather real information and produce concrete results.
Be thorough, specific, and produce actionable output. When done, provide a clear summary of your findings.`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Complete your assigned task. Use tools as needed, then provide a comprehensive result.` },
  ];

  let totalTokens = 0;
  const MAX_ITERATIONS = 4;
  const AGENT_DEADLINE = Date.now() + 120_000;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    if (Date.now() > AGENT_DEADLINE) {
      return { summary: "Agent timed out after 2 minutes.", output: "Agent wall-clock limit reached.", tokensUsed: totalTokens };
    }
    await insertEvent(
      sessionId,
      "AGENT_THINKING",
      { message: iteration === 0 ? "Analyzing task and planning approach..." : `Iteration ${iteration + 1}: processing tool results...`, step: iteration + 1 },
      agentId,
      agentName,
      agentRole
    );

    const completion = await chatCompletion(modelId, messages, {
      tools: TOOL_DEFINITIONS,
      maxTokens,
    });

    const choice = completion.choices[0];
    if (!choice) throw new Error("No response from LLM");

    totalTokens += completion.usage?.total_tokens ?? 0;

    const assistantMsg = choice.message;
    messages.push(assistantMsg as ChatMessage);

    if (choice.finish_reason === "stop" || !assistantMsg.tool_calls?.length) {
      const content = assistantMsg.content ?? "";
      const summaryMatch = content.match(/(?:summary|result|conclusion)[:\s]+(.+?)(?:\n|$)/i);
      const summary = summaryMatch ? summaryMatch[1].slice(0, 300) : content.slice(0, 300);
      return { summary: summary || "Task completed.", output: content, tokensUsed: totalTokens };
    }

    const toolCalls = assistantMsg.tool_calls!;

    for (const toolCall of toolCalls) {
      if (!("function" in toolCall) || !toolCall.function) continue;
      const fnName = (toolCall.function as { name: string }).name;
      let args: Record<string, unknown> = {};
      try { args = JSON.parse((toolCall.function as { arguments: string }).arguments) as Record<string, unknown>; } catch { /* ignore */ }

      await insertEvent(
        sessionId,
        "TOOL_CALLED",
        { tool: fnName, args },
        agentId,
        agentName,
        agentRole
      );

      const toolResult = await executeTool(sessionId, fnName, args);

      await insertEvent(
        sessionId,
        "TOOL_RESULT",
        { tool: fnName, result: toolResult.result.slice(0, 500), error: toolResult.error },
        agentId,
        agentName,
        agentRole
      );

      messages.push({
        role: "tool",
        content: toolResult.result,
        tool_call_id: toolCall.id,
      } as ChatMessage);
    }
  }

  let lastMsg: ChatMessage | undefined;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "assistant") { lastMsg = messages[i]; break; }
  }
  const content = (lastMsg && "content" in lastMsg ? lastMsg.content : null) ?? "Task completed (max iterations reached).";
  return { summary: String(content).slice(0, 300), output: String(content), tokensUsed: totalTokens };
}

function topologicalSort(steps: PlanStep[]): PlanStep[][] {
  const remaining = new Set(steps.map((s) => s.id));
  const completed = new Set<string>();
  const groups: PlanStep[][] = [];

  while (remaining.size > 0) {
    const ready = steps.filter(
      (s) => remaining.has(s.id) && s.depends_on.every((d) => completed.has(d))
    );
    if (ready.length === 0) {
      const leftover = steps.filter((s) => remaining.has(s.id));
      groups.push(leftover);
      break;
    }
    groups.push(ready);
    ready.forEach((s) => { remaining.delete(s.id); completed.add(s.id); });
  }

  return groups;
}

const activeSessions = new Set<string>();

export async function simulateSwarm(sessionId: string, objective: string, rawOrchestratorModel?: string): Promise<void> {
  if (activeSessions.has(sessionId)) {
    logger.warn({ sessionId }, "Session already running, skipping duplicate start");
    return;
  }
  activeSessions.add(sessionId);

  try {
    logger.info({ sessionId, objective }, "Starting real swarm");

    const orchestratorModelId = resolveModelId(rawOrchestratorModel ?? "kimi-k2.6");

    await db
      .update(swarmSessionsTable)
      .set({ status: "PLANNING", startedAt: new Date(), updatedAt: new Date() })
      .where(eq(swarmSessionsTable.id, sessionId));

    await insertEvent(sessionId, "SWARM_STARTED", {
      objective,
      orchestratorModel: MODEL_CONFIGS[orchestratorModelId]?.label ?? orchestratorModelId,
    });

    await insertEvent(sessionId, "AGENT_THINKING", {
      message: `Orchestrator (${MODEL_CONFIGS[orchestratorModelId]?.label}) is planning the swarm...`,
      step: 0,
    });

    const plan = await createPlan(objective, orchestratorModelId);

    await insertEvent(sessionId, "PLAN_CREATED", { plan });
    await db
      .update(swarmSessionsTable)
      .set({ status: "RUNNING", planJson: plan, updatedAt: new Date() })
      .where(eq(swarmSessionsTable.id, sessionId));

    const groups = topologicalSort(plan.steps);
    const stepOutputs: Record<string, string> = {};
    const agentIdMap: Record<string, string> = {};
    let totalTokens = 0;

    for (const step of plan.steps) {
      const agentId = await generateId();
      agentIdMap[step.id] = agentId;
      const role = sanitizeRole(step.agent_role);
      const modelId = step.model ? resolveModelId(step.model) : (ROLE_MODELS[role] ?? "kimi-k2.6");
      const modelLabel = MODEL_CONFIGS[modelId]?.label ?? modelId;

      await db.insert(swarmAgentsTable).values({
        id: agentId,
        sessionId,
        name: step.title,
        role,
        model: modelLabel,
        status: "IDLE",
        systemPrompt: `${role} agent. Task: ${step.task}`,
      });

      await insertEvent(sessionId, "AGENT_SPAWNED", {
        name: step.title,
        role,
        model: modelLabel,
      }, agentId, step.title, role);
    }

    for (const group of groups) {
      const groupPromises = group.map(async (step) => {
        const agentId = agentIdMap[step.id];
        const role = sanitizeRole(step.agent_role);
        const modelId = step.model ? resolveModelId(step.model) : (ROLE_MODELS[role] ?? "kimi-k2.6");
        const modelLabel = MODEL_CONFIGS[modelId]?.label ?? modelId;

        const priorContext = step.depends_on
          .map((depId) => {
            const depStep = plan.steps.find((s) => s.id === depId);
            return depStep && stepOutputs[depId]
              ? `=== ${depStep.title} output ===\n${stepOutputs[depId].slice(0, 1500)}`
              : "";
          })
          .filter(Boolean)
          .join("\n\n");

        await db
          .update(swarmAgentsTable)
          .set({ status: "THINKING", startedAt: new Date(), currentTask: step.task, updatedAt: new Date() })
          .where(eq(swarmAgentsTable.id, agentId));

        await insertEvent(sessionId, "PLAN_STEP_STARTED", { step }, agentId, step.title, role);
        await insertEvent(sessionId, "AGENT_THINKING", {
          message: `[${modelLabel}] Starting: ${step.task.slice(0, 100)}...`,
          step: 1,
        }, agentId, step.title, role);

        try {
          await db
            .update(swarmAgentsTable)
            .set({ status: "EXECUTING", updatedAt: new Date() })
            .where(eq(swarmAgentsTable.id, agentId));

          await insertEvent(sessionId, "AGENT_EXECUTING", { task: step.task }, agentId, step.title, role);

          const { summary, output, tokensUsed } = await runAgent(
            sessionId,
            agentId,
            step.title,
            role,
            modelId,
            step.task,
            priorContext,
            2048
          );

          stepOutputs[step.id] = output;
          totalTokens += tokensUsed;

          await db
            .update(swarmAgentsTable)
            .set({
              status: "COMPLETED",
              outputJson: { summary, output: output.slice(0, 2000), tokensUsed },
              tokensUsed,
              currentTask: null,
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(swarmAgentsTable.id, agentId));

          await db
            .update(swarmSessionsTable)
            .set({ totalTokens, updatedAt: new Date() })
            .where(eq(swarmSessionsTable.id, sessionId));

          await insertEvent(sessionId, "AGENT_COMPLETED", { summary, tokensUsed }, agentId, step.title, role);
          await insertEvent(sessionId, "PLAN_STEP_COMPLETED", { step, summary }, agentId, step.title, role);
        } catch (err) {
          logger.error({ sessionId, agentId, step: step.id, err }, "Agent step failed");
          stepOutputs[step.id] = `Agent failed: ${String(err)}`;

          await db
            .update(swarmAgentsTable)
            .set({ status: "FAILED", completedAt: new Date(), updatedAt: new Date() })
            .where(eq(swarmAgentsTable.id, agentId));

          await insertEvent(sessionId, "AGENT_COMPLETED", {
            summary: `Failed: ${String(err)}`,
            error: true,
          }, agentId, step.title, role);
        }
      });

      await Promise.all(groupPromises);
    }

    await insertEvent(sessionId, "AGENT_THINKING", {
      message: `Orchestrator synthesizing results from ${plan.steps.length} agents...`,
      step: 0,
    });

    const allOutputs = plan.steps
      .map((s) => `=== ${s.title} ===\n${(stepOutputs[s.id] ?? "No output").slice(0, 1000)}`)
      .join("\n\n");

    const synthesisMessages: ChatMessage[] = [
      {
        role: "system",
        content: `You are the orchestrator. Synthesize agent outputs into a final cohesive result for the objective: "${objective}"`,
      },
      {
        role: "user",
        content: `Agent outputs:\n\n${allOutputs}\n\nProvide a comprehensive final synthesis with key findings, conclusions, and actionable recommendations.`,
      },
    ];

    let synthesis = "";
    try {
      synthesis = await chatCompletionText(orchestratorModelId, synthesisMessages, { maxTokens: 2048 });
    } catch {
      synthesis = allOutputs.slice(0, 2000);
    }

    const estimatedCost = (totalTokens / 1_000_000) * 2.0;

    const finalResult = {
      summary: synthesis.slice(0, 500),
      fullSynthesis: synthesis,
      plan: plan.plan_title,
      agentsUsed: plan.steps.length,
      totalTokens,
      insights: plan.steps.map((s) => `${s.title}: ${(stepOutputs[s.id] ?? "").slice(0, 100)}`),
    };

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
    logger.info({ sessionId, totalTokens }, "Real swarm completed");
  } catch (err) {
    logger.error({ sessionId, err }, "Swarm failed");
    await db
      .update(swarmSessionsTable)
      .set({ status: "FAILED", completedAt: new Date(), updatedAt: new Date() })
      .where(eq(swarmSessionsTable.id, sessionId));
    await insertEvent(sessionId, "SWARM_FAILED", { error: String(err) });
  } finally {
    activeSessions.delete(sessionId);
    clearSessionMemory(sessionId);
  }
}
