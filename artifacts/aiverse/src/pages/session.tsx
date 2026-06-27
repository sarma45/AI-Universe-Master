import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Pause,
  Play,
  X,
  CheckCircle,
  Clock,
  Zap,
  Terminal,
  Code2,
  MessageSquare,
  Bot,
  RefreshCw,
} from "lucide-react";
import {
  useGetSwarmSession,
  usePauseSwarmSession,
  useResumeSwarmSession,
  useCancelSwarmSession,
  getGetSwarmSessionQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AgentCard } from "@/components/swarm/AgentCard";
import { EventFeed } from "@/components/swarm/EventFeed";
import { SwarmCodeEditor } from "@/components/swarm/SwarmCodeEditor";
import { SwarmTerminal } from "@/components/swarm/SwarmTerminal";
import { formatDistanceToNow } from "@/lib/utils";

const STATUS_BG: Record<string, string> = {
  PENDING: "bg-yellow-400/10 text-yellow-400",
  PLANNING: "bg-blue-400/10 text-blue-400",
  RUNNING: "bg-cyan-400/10 text-cyan-400",
  PAUSED: "bg-orange-400/10 text-orange-400",
  COMPLETED: "bg-emerald-400/10 text-emerald-400",
  FAILED: "bg-red-400/10 text-red-400",
  CANCELLED: "bg-gray-400/10 text-gray-400",
};

type PanelView = "events" | "code" | "terminal";

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activePanel, setActivePanel] = useState<PanelView>("events");

  const { data: session, isLoading } = useGetSwarmSession(id!, {
    query: {
      enabled: !!id,
      queryKey: getGetSwarmSessionQueryKey(id!),
      refetchInterval: (query) => {
        const data = query.state.data;
        if (!data) return 1000;
        const active = ["PENDING", "PLANNING", "RUNNING"].includes(data.status);
        return active ? 1000 : false;
      },
    },
  });

  const pause = usePauseSwarmSession();
  const resume = useResumeSwarmSession();
  const cancel = useCancelSwarmSession();

  const handlePause = async () => {
    await pause.mutateAsync({ id: id! });
    queryClient.invalidateQueries({ queryKey: getGetSwarmSessionQueryKey(id!) });
  };

  const handleResume = async () => {
    await resume.mutateAsync({ id: id! });
    queryClient.invalidateQueries({ queryKey: getGetSwarmSessionQueryKey(id!) });
  };

  const handleCancel = async () => {
    await cancel.mutateAsync({ id: id! });
    queryClient.invalidateQueries({ queryKey: getGetSwarmSessionQueryKey(id!) });
  };

  const isActive = session?.status === "RUNNING" || session?.status === "PLANNING";
  const isDone = ["COMPLETED", "FAILED", "CANCELLED"].includes(session?.status ?? "");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-[hsl(248_100%_70%)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Session not found</p>
        <Button variant="ghost" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
        <button
          onClick={() => setLocation("/")}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-foreground truncate">{session.title}</h1>
            <Badge className={`text-xs flex-shrink-0 ${STATUS_BG[session.status]}`}>
              {session.status === "RUNNING" || session.status === "PLANNING" ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
                  {session.status}
                </span>
              ) : session.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{session.objective}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {session.totalTokens > 0 && (
            <span className="text-xs text-muted-foreground">
              {session.totalTokens.toLocaleString()} tokens
            </span>
          )}
          {isActive && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={session.status === "PAUSED" ? handleResume : handlePause}
                disabled={pause.isPending || resume.isPending}
                className="h-7 text-xs"
                data-testid="button-pause-resume"
              >
                {session.status === "PAUSED" ? (
                  <><Play className="w-3 h-3 mr-1" /> Resume</>
                ) : (
                  <><Pause className="w-3 h-3 mr-1" /> Pause</>
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={cancel.isPending}
                className="h-7 text-xs text-destructive hover:text-destructive"
                data-testid="button-cancel"
              >
                <X className="w-3 h-3 mr-1" /> Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main content: split layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Agents */}
        <div className="w-56 flex-shrink-0 border-r border-border flex flex-col">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Agents ({session.agents?.length ?? 0})
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {(session.agents ?? []).map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
            {(session.agents ?? []).length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bot className="w-6 h-6 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">
                  {isActive ? "Spawning agents..." : "No agents"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Tabbed panels */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Panel tabs */}
          <div className="flex items-center gap-0 border-b border-border px-2 flex-shrink-0">
            {([
              { id: "events", label: "Narration", icon: MessageSquare },
              { id: "code", label: "Code", icon: Code2 },
              { id: "terminal", label: "Terminal", icon: Terminal },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  activePanel === tab.id
                    ? "border-[hsl(248_100%_70%)] text-[hsl(248_100%_70%)]"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 min-h-0">
            {activePanel === "events" && (
              <EventFeed
                events={session.recentEvents ?? []}
                isLive={isActive}
              />
            )}
            {activePanel === "code" && (
              <SwarmCodeEditor session={session} />
            )}
            {activePanel === "terminal" && (
              <SwarmTerminal session={session} />
            )}
          </div>
        </div>
      </div>

      {/* Footer stats */}
      {isDone && (
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {session.completedAt
              ? `Completed ${formatDistanceToNow(new Date(session.completedAt))} ago`
              : "Finished"}
          </div>
          {(session.totalCostUsd ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="w-3 h-3" />
              ${(session.totalCostUsd ?? 0).toFixed(4)}
            </div>
          )}
          {session.status === "COMPLETED" && (
            <div className="flex items-center gap-1.5 text-xs text-[hsl(152_100%_50%)]">
              <CheckCircle className="w-3 h-3" />
              Swarm completed successfully
            </div>
          )}
        </div>
      )}
    </div>
  );
}
