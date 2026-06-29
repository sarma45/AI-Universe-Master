import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const JWT_SECRET = process.env["JWT_SECRET"] ?? "aiverse-dev-secret-change-in-prod";

export function signToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

async function generateId(): Promise<string> {
  const { nanoid } = await import("nanoid");
  return nanoid();
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const { name, email, password } = req.body as { name?: string; email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const id = await generateId();

  const [user] = await db.insert(usersTable).values({
    id,
    name: name ?? email.split("@")[0],
    email: email.toLowerCase(),
    password: hashed,
    role: "USER",
    plan: "FREE",
  }).returning();

  const token = signToken(user!.id);
  logger.info({ userId: user!.id }, "User registered");

  res.status(201).json({
    token,
    user: { id: user!.id, name: user!.name, email: user!.email, role: user!.role, plan: user!.plan },
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user || !user.password) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken(user.id);
  logger.info({ userId: user.id }, "User logged in");

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan },
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan });
});

export default router;
