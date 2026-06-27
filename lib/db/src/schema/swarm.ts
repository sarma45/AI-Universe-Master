import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
  decimal,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const swarmStatusEnum = pgEnum("swarm_status", [
  "PENDING",
  "PLANNING",
  "RUNNING",
  "PAUSED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

export const agentStatusEnum = pgEnum("agent_status", [
  "IDLE",
  "THINKING",
  "EXECUTING",
  "WAITING",
  "COMPLETED",
  "FAILED",
]);

export const agentRoleEnum = pgEnum("agent_role", [
  "ORCHESTRATOR",
  "RESEARCHER",
  "EXECUTOR",
  "CRITIC",
  "SYNTHESIZER",
  "TOOL_CALLER",
]);

export const swarmEventTypeEnum = pgEnum("swarm_event_type", [
  "SWARM_STARTED",
  "SWARM_COMPLETED",
  "SWARM_FAILED",
  "AGENT_SPAWNED",
  "AGENT_THINKING",
  "AGENT_EXECUTING",
  "AGENT_COMPLETED",
  "AGENT_FAILED",
  "TOOL_CALLED",
  "TOOL_RESULT",
  "TOOL_FAILED",
  "MESSAGE_SENT",
  "MESSAGE_RECEIVED",
  "PLAN_CREATED",
  "PLAN_STEP_STARTED",
  "PLAN_STEP_COMPLETED",
  "HUMAN_CHECKPOINT",
  "HUMAN_APPROVED",
  "HUMAN_REJECTED",
  "MEMORY_STORED",
  "MEMORY_RETRIEVED",
]);

export const swarmSessionsTable = pgTable(
  "swarm_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().default("demo-user"),
    title: text("title").notNull(),
    status: swarmStatusEnum("status").notNull().default("PENDING"),
    objective: text("objective").notNull(),
    planJson: jsonb("plan_json"),
    resultJson: jsonb("result_json"),
    totalTokens: integer("total_tokens").notNull().default(0),
    totalCostUsd: decimal("total_cost_usd", { precision: 10, scale: 6 })
      .notNull()
      .default("0"),
    orchestratorModel: text("orchestrator_model")
      .notNull()
      .default("claude-sonnet"),
    workerModels: text("worker_models").array().notNull().default([]),
    maxParallelAgents: integer("max_parallel_agents").notNull().default(4),
    maxStepsPerAgent: integer("max_steps_per_agent").notNull().default(10),
    toolsAllowed: text("tools_allowed").array().notNull().default([]),
    humanCheckpoints: boolean("human_checkpoints").notNull().default(false),
    budgetCapUsd: decimal("budget_cap_usd", { precision: 10, scale: 6 }),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("idx_swarm_sessions_user_status").on(t.userId, t.status)],
);

export const swarmAgentsTable = pgTable(
  "swarm_agents",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => swarmSessionsTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: agentRoleEnum("role").notNull(),
    model: text("model").notNull(),
    status: agentStatusEnum("status").notNull().default("IDLE"),
    systemPrompt: text("system_prompt").notNull().default(""),
    currentTask: text("current_task"),
    outputJson: jsonb("output_json"),
    tokensUsed: integer("tokens_used").notNull().default(0),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("idx_swarm_agents_session_status").on(t.sessionId, t.status)],
);

export const swarmEventsTable = pgTable(
  "swarm_events",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => swarmSessionsTable.id, { onDelete: "cascade" }),
    agentId: text("agent_id").references(() => swarmAgentsTable.id),
    agentName: text("agent_name"),
    agentRole: text("agent_role"),
    type: swarmEventTypeEnum("type").notNull(),
    payload: jsonb("payload").notNull().default({}),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
  },
  (t) => [
    index("idx_swarm_events_session_ts").on(t.sessionId, t.timestamp),
    index("idx_swarm_events_agent").on(t.agentId),
  ],
);

export const insertSwarmSessionSchema = createInsertSchema(swarmSessionsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertSwarmAgentSchema = createInsertSchema(swarmAgentsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertSwarmEventSchema = createInsertSchema(swarmEventsTable);

export type SwarmSession = typeof swarmSessionsTable.$inferSelect;
export type InsertSwarmSession = z.infer<typeof insertSwarmSessionSchema>;
export type SwarmAgent = typeof swarmAgentsTable.$inferSelect;
export type InsertSwarmAgent = z.infer<typeof insertSwarmAgentSchema>;
export type SwarmEvent = typeof swarmEventsTable.$inferSelect;
export type InsertSwarmEvent = z.infer<typeof insertSwarmEventSchema>;
