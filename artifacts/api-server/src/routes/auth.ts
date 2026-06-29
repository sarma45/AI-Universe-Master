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

function getBaseUrl(): string {
  const domains = process.env["REPLIT_DOMAINS"] ?? "";
  const primary = domains.split(",")[0]?.trim();
  if (primary) return `https://${primary}`;
  return `http://localhost:${process.env["PORT"] ?? 8080}`;
}

function getFrontendUrl(): string {
  const domains = process.env["REPLIT_DOMAINS"] ?? "";
  const primary = domains.split(",")[0]?.trim();
  if (primary) return `https://${primary}`;
  return "http://localhost:21752";
}

// ─── Email / Password ─────────────────────────────────────────────────────────

router.post("/auth/register", async (req, res): Promise<void> => {
  const { name, email, password } = req.body as { name?: string; email?: string; password?: string };
  if (!email || !password) { res.status(400).json({ error: "Email and password are required" }); return; }
  if (password.length < 6) { res.status(400).json({ error: "Password must be at least 6 characters" }); return; }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "Email already registered" }); return; }

  const hashed = await bcrypt.hash(password, 12);
  const id = await generateId();
  const [user] = await db.insert(usersTable).values({
    id, name: name ?? email.split("@")[0], email: email.toLowerCase(), password: hashed, role: "USER", plan: "FREE",
  }).returning();

  const token = signToken(user!.id);
  logger.info({ userId: user!.id }, "User registered");
  res.status(201).json({ token, user: { id: user!.id, name: user!.name, email: user!.email, role: user!.role, plan: user!.plan } });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) { res.status(400).json({ error: "Email and password are required" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user || !user.password) { res.status(401).json({ error: "Invalid credentials" }); return; }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) { res.status(401).json({ error: "Invalid credentials" }); return; }

  const token = signToken(user.id);
  logger.info({ userId: user.id }, "User logged in");
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan } });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const token = req.headers["authorization"]?.replace("Bearer ", "");
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }
  const payload = verifyToken(token);
  if (!payload) { res.status(401).json({ error: "Invalid token" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, plan: user.plan });
});

// ─── Google OAuth ─────────────────────────────────────────────────────────────

router.get("/auth/google", (req, res): void => {
  const clientId = process.env["GOOGLE_CLIENT_ID"];
  if (!clientId) { res.redirect(`${getFrontendUrl()}/auth/callback?error=Google+OAuth+not+configured`); return; }
  const redirectUri = encodeURIComponent(`${getBaseUrl()}/api/auth/google/callback`);
  const scope = encodeURIComponent("openid email profile");
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline`);
});

router.get("/auth/google/callback", async (req, res): Promise<void> => {
  const { code } = req.query as { code?: string };
  if (!code) { res.redirect(`${getFrontendUrl()}/auth/callback?error=No+code+from+Google`); return; }
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code, client_id: process.env["GOOGLE_CLIENT_ID"] ?? "",
        client_secret: process.env["GOOGLE_CLIENT_SECRET"] ?? "",
        redirect_uri: `${getBaseUrl()}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    const td = await tokenRes.json() as { access_token?: string; error?: string };
    if (!td.access_token) throw new Error(td.error ?? "No access token");

    const pRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${td.access_token}` },
    });
    const p = await pRes.json() as { id: string; email: string; name: string };
    const token = await upsertOAuthUser({ provider: "google", providerId: p.id, email: p.email, name: p.name });
    res.redirect(`${getFrontendUrl()}/auth/callback?token=${token}`);
  } catch (err) {
    logger.error({ err }, "Google OAuth error");
    res.redirect(`${getFrontendUrl()}/auth/callback?error=Google+sign-in+failed`);
  }
});

// ─── GitHub OAuth ─────────────────────────────────────────────────────────────

router.get("/auth/github", (req, res): void => {
  const clientId = process.env["GITHUB_CLIENT_ID"];
  if (!clientId) { res.redirect(`${getFrontendUrl()}/auth/callback?error=GitHub+OAuth+not+configured`); return; }
  const redirectUri = encodeURIComponent(`${getBaseUrl()}/api/auth/github/callback`);
  res.redirect(`https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=read:user+user:email`);
});

router.get("/auth/github/callback", async (req, res): Promise<void> => {
  const { code } = req.query as { code?: string };
  if (!code) { res.redirect(`${getFrontendUrl()}/auth/callback?error=No+code+from+GitHub`); return; }
  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env["GITHUB_CLIENT_ID"], client_secret: process.env["GITHUB_CLIENT_SECRET"],
        code, redirect_uri: `${getBaseUrl()}/api/auth/github/callback`,
      }),
    });
    const td = await tokenRes.json() as { access_token?: string; error?: string };
    if (!td.access_token) throw new Error(td.error ?? "No access token");

    const pRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${td.access_token}`, "User-Agent": "AIVerse-2.0" },
    });
    const p = await pRes.json() as { id: number; login: string; name?: string; email?: string };

    let email = p.email;
    if (!email) {
      const eRes = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${td.access_token}`, "User-Agent": "AIVerse-2.0" },
      });
      const emails = await eRes.json() as { email: string; primary: boolean }[];
      email = emails.find(e => e.primary)?.email ?? emails[0]?.email ?? `${p.login}@users.noreply.github.com`;
    }
    const token = await upsertOAuthUser({ provider: "github", providerId: String(p.id), email: email!, name: p.name ?? p.login });
    res.redirect(`${getFrontendUrl()}/auth/callback?token=${token}`);
  } catch (err) {
    logger.error({ err }, "GitHub OAuth error");
    res.redirect(`${getFrontendUrl()}/auth/callback?error=GitHub+sign-in+failed`);
  }
});

// ─── Shared OAuth upsert ──────────────────────────────────────────────────────

async function upsertOAuthUser({ email, name }: { provider: string; providerId: string; email: string; name: string }) {
  const normalEmail = email.toLowerCase();
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, normalEmail)).limit(1);
  if (existing) return signToken(existing.id);

  const id = await generateId();
  const [user] = await db.insert(usersTable).values({
    id, name, email: normalEmail, password: null, role: "USER", plan: "FREE",
  }).returning();
  logger.info({ userId: user!.id }, "OAuth user created");
  return signToken(user!.id);
}

export default router;
