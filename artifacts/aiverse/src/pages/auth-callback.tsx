import { useEffect } from "react";
import { useLocation } from "wouter";
import { setToken, getStoredUser, setStoredUser, apiMe } from "@/lib/auth";
import { toast } from "sonner";
import { Zap } from "lucide-react";

export default function AuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const error = params.get("error");

    if (error) {
      toast.error(decodeURIComponent(error));
      setLocation("/login");
      return;
    }

    if (!token) {
      toast.error("No token received");
      setLocation("/login");
      return;
    }

    setToken(token);
    apiMe(token).then((user) => {
      if (user) {
        setStoredUser(user);
        toast.success(`Welcome, ${user.name ?? user.email}!`);
      }
      setLocation("/dashboard");
    }).catch(() => {
      setLocation("/dashboard");
    });
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="p-2 bg-violet-500/20 rounded-xl animate-pulse">
            <Zap className="w-6 h-6 text-violet-400" />
          </div>
        </div>
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-white/40 text-sm">Signing you in…</p>
      </div>
    </div>
  );
}
