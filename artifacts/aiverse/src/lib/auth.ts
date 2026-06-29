const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/api`;

export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  plan: string;
}

export async function apiRegister(name: string, email: string, password: string) {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Registration failed");
  return data as { token: string; user: AuthUser };
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Login failed");
  return data as { token: string; user: AuthUser };
}

export async function apiMe(token: string) {
  const res = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as AuthUser;
}

export function getToken(): string | null {
  return localStorage.getItem("aiverse_token");
}

export function setToken(token: string) {
  localStorage.setItem("aiverse_token", token);
}

export function clearToken() {
  localStorage.removeItem("aiverse_token");
  localStorage.removeItem("aiverse_user");
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem("aiverse_user");
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; } catch { return null; }
}

export function setStoredUser(user: AuthUser) {
  localStorage.setItem("aiverse_user", JSON.stringify(user));
}
