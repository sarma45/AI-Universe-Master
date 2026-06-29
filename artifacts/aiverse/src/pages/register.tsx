import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Zap, User, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      toast.success("Account created! Welcome to AIVerse.");
      setLocation("/dashboard");
    } catch (err: any) {
      toast.error(err.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(139,92,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.03) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="p-2 bg-violet-500/20 rounded-xl">
              <Zap className="w-6 h-6 text-violet-400" />
            </div>
            <span className="text-2xl font-black">AIVerse</span>
            <span className="text-sm text-cyan-400 font-mono bg-cyan-400/10 px-2 py-0.5 rounded">2.0</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Create your account</h1>
          <p className="text-white/40">Start building AI agents for free today</p>
        </div>

        <div className="p-8 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white/70 text-sm">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-400/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/70 text-sm">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-400/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/70 text-sm">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-violet-400/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-violet-500 hover:bg-violet-400 text-white font-bold h-11"
              disabled={loading}
            >
              {loading ? "Creating account…" : "Create Account"}
              {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </form>

          <p className="text-center text-xs text-white/20 mt-4">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>

          <p className="text-center text-sm text-white/40 mt-4">
            Already have an account?{" "}
            <button
              onClick={() => setLocation("/login")}
              className="text-violet-400 hover:text-violet-300 font-medium"
            >
              Sign in
            </button>
          </p>
        </div>

        <p className="text-center text-sm text-white/20 mt-6">
          <button onClick={() => setLocation("/")} className="hover:text-white/40">
            ← Back to home
          </button>
        </p>
      </motion.div>
    </div>
  );
}
