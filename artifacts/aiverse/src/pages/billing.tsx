import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Zap, Crown, Building2, CreditCard, Star, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const PLANS = [
  {
    id: "FREE",
    icon: Zap,
    name: "Free",
    priceINR: "₹0",
    priceUSD: "$0",
    period: "/month",
    desc: "Perfect for exploring AIVerse",
    color: "text-white/60",
    bg: "bg-white/5",
    border: "border-white/5",
    features: [
      "5 swarm sessions per month",
      "2 custom agents",
      "Basic AI models (Kimi K2 free)",
      "Community support",
      "Basic analytics",
    ],
    cta: "Current Plan",
    highlight: false,
  },
  {
    id: "PRO",
    icon: Crown,
    name: "Pro",
    priceINR: "₹2,299",
    priceUSD: "$29",
    period: "/month",
    desc: "For developers & power users",
    color: "text-cyan-400",
    bg: "bg-cyan-400/5",
    border: "border-cyan-400/20",
    features: [
      "Unlimited swarm sessions",
      "50 custom agents",
      "All NVIDIA NIM models",
      "Priority support",
      "Workspace IDE with Monaco",
      "Advanced analytics & cost tracking",
      "API access",
    ],
    cta: "Upgrade to Pro",
    highlight: true,
  },
  {
    id: "ENTERPRISE",
    icon: Building2,
    name: "Enterprise",
    priceINR: "₹7,999",
    priceUSD: "$99",
    period: "/month",
    desc: "For teams & organizations",
    color: "text-violet-400",
    bg: "bg-violet-400/5",
    border: "border-violet-400/20",
    features: [
      "Everything in Pro",
      "Unlimited agents",
      "Custom fine-tuned models",
      "Dedicated account manager",
      "SSO / SAML integration",
      "SLA guarantee (99.9% uptime)",
      "Custom deployment options",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
];

const USAGE = [
  { label: "Swarm Sessions", used: 3, limit: 5, color: "bg-cyan-400" },
  { label: "Custom Agents", used: 1, limit: 2, color: "bg-violet-400" },
  { label: "API Calls Today", used: 47, limit: 100, color: "bg-emerald-400" },
];

export default function BillingPage() {
  const { user } = useAuth();
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [paying, setPaying] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    if (planId === "FREE") return;
    if (planId === "ENTERPRISE") {
      toast.info("Contact us at enterprise@aiverse.dev for Enterprise plans.");
      return;
    }
    setPaying(planId);
    try {
      toast.info(`Stripe/Razorpay checkout coming soon! Plan: ${planId} (${currency})`);
    } finally {
      setPaying(null);
    }
  };

  const currentPlan = user?.plan ?? "FREE";

  return (
    <div className="flex flex-col h-full overflow-auto bg-background">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">Billing & Subscription</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your plan and payment methods</p>
      </div>

      <div className="flex-1 p-6 space-y-8">
        {/* Current Usage */}
        <section>
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Current Usage</h2>
          <div className="p-5 rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-bold">{currentPlan}</span>
                  <Badge variant="outline" className="text-xs border-white/10 text-white/50">Active</Badge>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full">
                <Shield className="w-3.5 h-3.5" />
                Secure
              </div>
            </div>
            <div className="space-y-4">
              {USAGE.map((u) => (
                <div key={u.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-white/60">{u.label}</span>
                    <span className="text-white/40">{u.used} / {u.limit}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${u.color} rounded-full transition-all`}
                      style={{ width: `${Math.min((u.used / u.limit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Currency toggle */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Plans</h2>
            <div className="flex items-center gap-1 p-1 bg-white/5 rounded-lg text-xs">
              <button
                onClick={() => setCurrency("INR")}
                className={`px-3 py-1.5 rounded-md transition-colors font-medium ${currency === "INR" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}
              >
                ₹ INR
              </button>
              <button
                onClick={() => setCurrency("USD")}
                className={`px-3 py-1.5 rounded-md transition-colors font-medium ${currency === "USD" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}
              >
                $ USD
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {PLANS.map((plan, i) => {
              const Icon = plan.icon;
              const isCurrent = plan.id === currentPlan;
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`relative p-6 rounded-2xl border ${plan.border} ${plan.bg} ${plan.highlight ? `shadow-[0_0_30px_rgba(0,255,255,0.06)]` : ""}`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-cyan-400 text-black text-xs font-bold rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" /> Most Popular
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={`w-9 h-9 rounded-xl ${plan.bg} border ${plan.border} flex items-center justify-center`}>
                      <Icon className={`w-4.5 h-4.5 ${plan.color}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{plan.name}</h3>
                      <p className="text-xs text-white/40">{plan.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-end gap-1 mb-5">
                    <span className="text-3xl font-black text-white">{currency === "INR" ? plan.priceINR : plan.priceUSD}</span>
                    <span className="text-white/30 text-sm mb-1">{plan.period}</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-white/60">
                        <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.color}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${
                      isCurrent
                        ? "bg-white/5 text-white/40 cursor-default"
                        : plan.highlight
                          ? "bg-cyan-400 hover:bg-cyan-300 text-black font-bold"
                          : "border-white/10 text-white hover:bg-white/5"
                    }`}
                    variant={plan.highlight && !isCurrent ? "default" : "outline"}
                    disabled={isCurrent || paying === plan.id}
                    onClick={() => !isCurrent && handleUpgrade(plan.id)}
                  >
                    {isCurrent ? "Current Plan" : plan.cta}
                    {!isCurrent && <ArrowRight className="w-4 h-4 ml-2" />}
                  </Button>
                  {!isCurrent && plan.id === "PRO" && (
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <CreditCard className="w-3 h-3 text-white/20" />
                      <span className="text-xs text-white/20">Stripe · Razorpay</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Billing info */}
        <section>
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Payment Methods</h2>
          <div className="p-5 rounded-xl border border-border bg-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-7 rounded bg-white/5 border border-white/10 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-white/30" />
              </div>
              <div>
                <p className="text-sm text-white/60">No payment method added</p>
                <p className="text-xs text-white/30">Add a card to upgrade your plan</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="border-white/10 text-white/60 hover:text-white">
              Add Card
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
