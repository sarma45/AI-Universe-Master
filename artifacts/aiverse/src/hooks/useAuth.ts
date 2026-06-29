import { useState, useEffect, useCallback } from "react";
import {
  apiLogin, apiRegister, apiMe,
  getToken, setToken, clearToken,
  getStoredUser, setStoredUser,
  type AuthUser,
} from "@/lib/auth";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);
  const [loading, setLoading] = useState(!getStoredUser());

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    apiMe(token).then((u) => {
      if (u) { setUser(u); setStoredUser(u); }
      else { clearToken(); setUser(null); }
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: u } = await apiLogin(email, password);
    setToken(token);
    setStoredUser(u);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { token, user: u } = await apiRegister(name, email, password);
    setToken(token);
    setStoredUser(u);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return { user, loading, login, register, logout, isAuthenticated: !!user };
}
