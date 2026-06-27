import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Plus, Zap, Activity, CheckCircle, XCircle, Clock, DollarSign, TrendingUp, Play } from "lucide-react";
import { useListSwarmSessions, useGetSwarmAnalytics, useDeleteSwarmSession, getListSwarmSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SwarmLauncher } from "@/components/swarm/SwarmLauncher";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatDistanceToNow } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "text-yellow-400",
  PLANNING: "text-blue-400",
  RUNNING: "text-[hsl(192_100%_42%)]",
  PAUSED: "text-orange-400",
  COMPLETED: "text-[hsl(152_100%_50%)]",
  FAILED: "text-red-400",
  CANCELLED: "text-gray-400",
};

const STATUS_BG: Record<string, string> = {
  PENDING: "bg-yellow-400/10 text-yellow-400",
  PLANNING: "bg-blue-400/10 text-blue-400",
  RUNNING: "bg-cyan-400/10 text-cyan-400",
  PAUSED: "bg-orange-400/10 text-orange-400",
  COMPLETED: "bg-emerald-400/10 text-emerald-400",
  FAILED: "bg-red-400/10 text-red-400",
  CANCELLED: "bg-gray-400/10 text-gray-400",
};

export default function Dashboard() {
  const [showLauncher, setShowLauncher] = useState(false);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: sessionsData, isLoading } = useListSwarmSessions();
  const { data: analytics } = useGetSwarmAnalytics();
  const deleteSession = useDeleteSwarmSession();

  const sessions = sessionsData?.sessions ?? [];

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteSession.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListSwarmSessionsQueryKey() });
  };

  const statCards = [
    {
      label: "Total Sessions",
      value: analytics?.totalSessions ?? 0,
      icon: Activity,
      color: "text-[hsl(248_100%_70%)]",
      bg: "bg-[hsl(248_100%_70%/0.1)]",
    },
    {
      label: "Completed",
      value: analytics?.completedSessions ?? 0,
      icon: CheckCircle,
      color: "text-[hsl(152_100%_50%)]",
      bg: "bg-[hsl(152_100%_50%/0.1)]",
    },
    {
      label: "Failed",
      value: analytics?.failedSessions ?? 0,
      icon: XCircle,
      color: "text-red-400",
      bg: "bg-red-400/10",
    },
    {
      label: "Success Rate",
      value: `${(analytics?.successRate ?? 0).toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-[hsl(192_100%_42%)]",
      bg: "bg-[hsl(192_100%_42%/0.1)]",
    },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground">AIVerse Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">AI Agent Swarm Orchestration</p>
        </div>
        <Button
          onClick={() => setShowLauncher(true)}
          className="bg-[hsl(248_100%_70%)] hover:bg-[hsl(248_100%_65%)] text-black font-medium gap-2"
          data-testid="button-launch-swarm"
        >
          <Plus className="w-4 h-4" />
          Launch Swarm
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-card-border rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Chart */}
        {analytics?.sessionsLast7Days && analytics.sessionsLast7Days.length > 0 && (
          <div className="bg-card border border-card-border rounded-xl p-4">
            <h2 className="text-sm font-medium text-foreground mb-4">Sessions Last 7 Days</h2>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={analytics.sessionsLast7Days}>
                <defs>
                  <linearGradient id="plasmaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(248 100% 70%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(248 100% 70%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(220 10% 50%)" }} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "hsl(240 14% 7%)", border: "1px solid hsl(240 10% 14%)", borderRadius: "8px" }}
                  labelStyle={{ color: "hsl(220 15% 92%)", fontSize: "12px" }}
                  itemStyle={{ color: "hsl(248 100% 70%)", fontSize: "12px" }}
                />
                <Area type="monotone" dataKey="count" stroke="hsl(248 100% 70%)" fill="url(#plasmaGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Session List */}
        <div className="bg-card border border-card-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Recent Sessions</h2>
            <span className="text-xs text-muted-foreground">{sessions.length} total</span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[hsl(248_100%_70%)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Zap className="w-10 h-10 text-[hsl(248_100%_70%/0.3)] mb-3" />
              <p className="text-sm font-medium text-foreground">No swarms yet</p>
              <p className="text-xs text-muted-foreground mt-1">Launch your first agent swarm to get started</p>
              <Button
                size="sm"
                className="mt-4 bg-[hsl(248_100%_70%)] text-black"
                onClick={() => setShowLauncher(true)}
                data-testid="button-launch-first"
              >
                <Plus className="w-3 h-3 mr-1" />
                Launch Swarm
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sessions.map((session) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between px-4 py-3 hover:bg-[hsl(240_14%_9%)] cursor-pointer transition-colors group"
                  onClick={() => setLocation(`/session/${session.id}`)}
                  data-testid={`row-session-${session.id}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      session.status === "RUNNING" || session.status === "PLANNING"
                        ? "bg-[hsl(192_100%_42%)] animate-pulse"
                        : session.status === "COMPLETED"
                        ? "bg-[hsl(152_100%_50%)]"
                        : session.status === "FAILED"
                        ? "bg-red-400"
                        : "bg-gray-400"
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{session.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{session.objective}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge className={`text-xs ${STATUS_BG[session.status]}`}>
                      {session.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(session.createdAt))}
                    </span>
                    <button
                      className="opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-300 transition-opacity"
                      onClick={(e) => handleDelete(session.id, e)}
                      data-testid={`button-delete-${session.id}`}
                    >
                      ×
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showLauncher && (
        <SwarmLauncher
          onClose={() => setShowLauncher(false)}
          onLaunched={(id) => {
            setShowLauncher(false);
            setLocation(`/session/${id}`);
          }}
        />
      )}
    </div>
  );
}
