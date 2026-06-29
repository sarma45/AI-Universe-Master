import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Zap, Bot, Code2, Network, CreditCard, Shield,
  ArrowRight, Check, Star, ChevronRight, Sparkles,
  Globe, Cpu, BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Bot,
    title: "AI Agent Builder",
    description: "Create specialized AI agents with custom system prompts, models, and behavior configurations.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
  {
    icon: Network,
    title: "Agent Swarm Orchestration",
    description: "Deploy multi-agent swarms that collaborate, research, execute, and synthesize results in parallel.",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    icon: Code2,
    title: "AI Workspace IDE",
    description: "Full Monaco editor + terminal + streaming AI chat in a 4-panel workspace layout.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
  {
    icon: Zap,
    title: "Real-time Streaming",
    description: "Watch agents think and execute in real time with Server-Sent Events and live updates.",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
  {
    icon: CreditCard,
    title: "Flexible Billing",
    description: "Stripe and Razorpay dual gateway — pay in USD or INR with seamless subscription management.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Role-based access control, JWT authentication, encrypted secrets, and audit logging.",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "/month",
    desc: "Perfect for exploring AIVerse",
    features: ["5 swarm sessions/month", "2 custom agents", "Basic models", "Community support"],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Pro",
    price: "₹2,299",
    period: "/month",
    desc: "For developers & power users",
    features: ["Unlimited swarm sessions", "50 custom agents", "All NVIDIA NIM models", "Priority support", "Workspace IDE", "Advanced analytics"],
    cta: "Start Pro",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "₹7,999",
    period: "/month",
    desc: "For teams & organizations",
    features: ["Everything in Pro", "Unlimited agents", "Custom models", "Dedicated support", "SSO / SAML", "SLA guarantee"],
    cta: "Contact Sales",
    highlight: false,
  },
];

const STATS = [
  { value: "10K+", label: "Swarm Executions" },
  { value: "98.7%", label: "Success Rate" },
  { value: "4", label: "AI Models" },
  { value: "<2s", label: "Avg Plan Time" },
];

export default function LandingPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(0,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-violet-500/20 rounded-lg">
            <Zap className="w-5 h-5 text-violet-400" />
          </div>
          <span className="text-lg font-bold">AIVerse</span>
          <span className="text-xs text-cyan-400 font-mono bg-cyan-400/10 px-2 py-0.5 rounded">2.0</span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/login")}
            className="text-white/60 hover:text-white"
          >
            Sign In
          </Button>
          <Button
            size="sm"
            onClick={() => setLocation("/register")}
            className="bg-cyan-400 hover:bg-cyan-300 text-black font-semibold"
          >
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-6 py-24 text-center max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-400/20 bg-cyan-400/5 text-cyan-400 text-sm mb-8">
            <Sparkles className="w-4 h-4" />
            Powered by NVIDIA NIM · Kimi K2 · DeepSeek · Llama 4
          </div>

          <h1 className="text-6xl md:text-7xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">
              Build. Deploy.
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              Monetize AI Agents.
            </span>
          </h1>

          <p className="text-xl text-white/50 mb-10 max-w-2xl mx-auto leading-relaxed">
            The enterprise-grade platform for creating, orchestrating, and deploying intelligent AI agent swarms. From a single prompt to a coordinated team of AI specialists.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button
              size="lg"
              onClick={() => setLocation("/register")}
              className="bg-cyan-400 hover:bg-cyan-300 text-black font-bold px-8 h-12"
            >
              Start Building Free <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLocation("/login")}
              className="border-white/10 text-white hover:bg-white/5 h-12 px-8"
            >
              Sign In <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20"
        >
          {STATS.map((s) => (
            <div key={s.label} className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="text-3xl font-black text-cyan-400">{s.value}</div>
              <div className="text-sm text-white/40 mt-1">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 py-20 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-black mb-4">Everything you need to ship AI</h2>
          <p className="text-white/40 text-lg">A complete platform for the full AI agent lifecycle.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur hover:border-white/10 transition-colors group"
            >
              <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <h3 className="font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="relative z-10 px-6 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-black mb-4">Simple, transparent pricing</h2>
          <p className="text-white/40 text-lg">Pay in INR or USD. Cancel anytime.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative p-7 rounded-2xl border transition-all ${
                plan.highlight
                  ? "border-cyan-400/40 bg-cyan-400/5 shadow-[0_0_40px_rgba(0,255,255,0.08)]"
                  : "border-white/5 bg-white/[0.02]"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-cyan-400 text-black text-xs font-bold rounded-full">
                  Most Popular
                </div>
              )}
              <div className="mb-5">
                <h3 className="font-bold text-lg mb-1">{plan.name}</h3>
                <p className="text-white/40 text-sm mb-3">{plan.desc}</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black">{plan.price}</span>
                  <span className="text-white/40 text-sm mb-1">{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-2.5 mb-7">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                    <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full ${plan.highlight ? "bg-cyan-400 hover:bg-cyan-300 text-black font-bold" : "border-white/10 text-white hover:bg-white/5"}`}
                variant={plan.highlight ? "default" : "outline"}
                onClick={() => setLocation("/register")}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="relative z-10 px-6 py-16 max-w-4xl mx-auto text-center">
        <div className="p-12 rounded-3xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10 border border-white/5">
          <h2 className="text-4xl font-black mb-4">Ready to build the future?</h2>
          <p className="text-white/40 mb-8 text-lg">Join thousands of developers building with AIVerse 2.0.</p>
          <Button
            size="lg"
            onClick={() => setLocation("/register")}
            className="bg-cyan-400 hover:bg-cyan-300 text-black font-bold px-10 h-12"
          >
            Get Started for Free <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-white/5 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-violet-400" />
          <span className="font-bold">AIVerse 2.0</span>
        </div>
        <div className="flex items-center justify-center gap-6 text-sm text-white/30">
          <span>© 2026 AIVerse. All rights reserved.</span>
          <span>·</span>
          <span>GitHub: sarma45/Application</span>
          <span>·</span>
          <span>application-rosy-one.vercel.app</span>
        </div>
      </footer>
    </div>
  );
}
