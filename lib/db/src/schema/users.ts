import {
  pgTable,
  text,
  timestamp,
  pgEnum,
  index,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["USER", "ADMIN", "SUPER_ADMIN"]);
export const userPlanEnum = pgEnum("user_plan", ["FREE", "PRO", "ENTERPRISE"]);

export const usersTable = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    email: text("email").notNull().unique(),
    password: text("password"),
    role: userRoleEnum("role").notNull().default("USER"),
    plan: userPlanEnum("plan").notNull().default("FREE"),
    avatar: text("avatar"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("idx_users_email").on(t.email)],
);

export const userAgentsTable = pgTable(
  "user_agents",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    systemPrompt: text("system_prompt").notNull(),
    model: text("model").notNull().default("moonshotai/kimi-k2:free"),
    isPublic: boolean("is_public").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    config: jsonb("config").notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("idx_user_agents_user").on(t.userId)],
);

export const insertUserSchema = createInsertSchema(usersTable).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertUserAgentSchema = createInsertSchema(userAgentsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserAgent = typeof userAgentsTable.$inferSelect;
export type InsertUserAgent = z.infer<typeof insertUserAgentSchema>;
