import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { SwarmEvent } from "@workspace/api-client-react";
import {
  Zap, Bot, Wrench, CheckCircle, XCircle, MessageSquare,
  Search, Code, Globe, Database, FileText, Brain, PlayCircle,
  AlertCircle, ChevronRight
} from "lucide-react";

const EVENT_CONFIGS: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  SWARM_STARTED: { icon: Zap, color: "text-[hsl(248_100%_70%)]", label: "Swarm Started" },
  SWARM_COMPLETED: { icon: CheckCircle, color: "text-[hsl(152_100%_50%)]", label: "Swarm Completed" },
  SWARM_FAILED: { icon: XCircle, color: "text-red-400", label: "Swarm Failed" },
  AGENT_SPAWNED: { icon: Bot, color: "text-[hsl(192_100%_42%)]", label: "Agent Spawned" },
  AGENT_THINKING: { icon: Brain, color: "text-[hsl(248_100%_70%)]", label: "Thinking" },
  AGENT_EXECUTING: { icon: PlayCircle, color: "text-[hsl(25_100%_60%)]", label: "Executing" },
  AGENT_COMPLETED: { icon: CheckCircle, color: "text-[hsl(152_100%_50%)]", label: "Agent Done" },
  AGENT_FAILED: { icon: XCircle, color: "text-red-400", label: "Agent Failed" },
  TOOL_CALLED: { icon: Wrench, color: "text-yellow-400", label: "Tool Call" },
  TOOL_RESULT: { icon: CheckCircle, color: "text-[hsl(152_100%_50%)/0.8]", label: "Tool Result" },
  TOOL_FAILED: { icon: AlertCircle, color: "text-red-400", label: "Tool Failed" },
  MESSAGE_SENT: { icon: MessageSquare, color: "text-[hsl(192_100%_42%)]", label: "Message" },
  MESSAGE_RECEIVED: { icon: MessageSquare, color: "text-muted-foreground", label: "Message" },
  PLAN_CREATED: { icon: FileText, color: "text-[hsl(248_100%_70%)]", label: "Plan Created" },
  PLAN_STEP_STARTED: { icon: ChevronRight, color: "text-[hsl(192_100%_42%)]", label: "Step Started" },
  PLAN_STEP_COMPLETED: { icon: CheckCircle, color: "text-[hsl(152_100%_50%)]", label: "Step Done" },
  HUMAN_CHECKPOINT: { icon: AlertCircle, color: "text-[hsl(25_100%_60%)]", label: "Checkpoint" },
  HUMAN_APPROVED: { icon: CheckCircle, color: "text-[hsl(152_100%_50%)]", label: "Approved" },
  HUMAN_REJECTED: { icon: XCircle, color: "text-red-400", label: "Rejected" },
  MEMORY_STORED: { icon: Database, color: "text-[hsl(310_80%_60%)]", label: "Memory Stored" },
  MEMORY_RETRIEVED: { icon: Database, color: "text-[hsl(310_80%_60%)/0.7]", label: "Memory Retrieved" },
};

const TOOL_ICONS: Record<string, React.ElementType> = {
  web_search: Search,
  code_execute: Code,
  read_url: Globe,
  memory: Database,
  file_write: FileText,
};

function getEventMessage(event: SwarmEvent): string {
  const p = event.payload as Record<string, unknown>;
  switch (event.type) {
    case "SWARM_STARTED": return `Swarm launched with objective: "${String(p.objective ?? "").slice(0, 60)}${String(p.objective ?? "").length > 60 ? "..." : ""}"`;
    case "SWARM_COMPLETED": return "All agents completed. Swarm finished successfully.";
    case "SWARM_FAILED": return `Swarm failed: ${String(p.error ?? "Unknown error")}`;
    case "AGENT_SPAWNED": return `Spawned ${String(p.name)} (${String(p.role)}) using ${String(p.model)}`;
    case "AGENT_THINKING": return String(p.message ?? "Processing...");
    case "AGENT_EXECUTING": return `Executing: ${String(p.task ?? "")}`;
    case "AGENT_COMPLETED": {
      const out = p.output as Record<string, unknown> | undefined;
      return out?.summary ? String(out.summary) : "Agent completed task";
    }
    case "AGENT_FAILED": return `Agent failed: ${String(p.error ?? "Unknown error")}`;
    case "TOOL_CALLED": return `Calling ${String(p.tool)}${p.args ? ` with args: ${JSON.stringify(p.args).slice(0, 60)}` : ""}`;
    case "TOOL_RESULT": return `${String(p.tool)} returned: ${String(p.result ?? "").slice(0, 80)}`;
    case "TOOL_FAILED": return `${String(p.tool)} failed: ${String(p.error ?? "")}`;
    case "PLAN_CREATED": {
      const plan = p.plan as { steps?: { title: string }[] } | undefined;
      return `Plan created with ${plan?.steps?.length ?? 0} steps`;
    }
    case "PLAN_STEP_STARTED": {
      const step = p.step as { title?: string } | undefined;
      return `Starting: ${step?.title ?? ""}`;
    }
    case "PLAN_STEP_COMPLETED": {
      const step = p.step as { title?: string } | undefined;
      return `Completed: ${step?.title ?? ""}`;
    }
    case "HUMAN_CHECKPOINT": return "Waiting for human approval...";
    case "HUMAN_APPROVED": return `Human approved${p.feedback ? `: "${String(p.feedback)}"` : ""}`;
    case "HUMAN_REJECTED": return `Human rejected${p.feedback ? `: "${String(p.feedback)}"` : ""}`;
    case "MEMORY_STORED": return `Stored to memory: ${String(p.key ?? "")}`;
    case "MEMORY_RETRIEVED": return `Retrieved from memory: ${String(p.key ?? "")}`;
    default: return JSON.stringify(event.payload).slice(0, 100);
  }
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

interface Props {
  events: SwarmEvent[];
  isLive: boolean;
}

export function EventFeed({ events, isLive }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLive && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [events.length, isLive]);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto p-4 space-y-1 font-mono text-xs"
      data-testid="event-feed"
    >
      {events.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="w-8 h-8 border-2 border-[hsl(248_100%_70%/0.3)] border-t-[hsl(248_100%_70%)] rounded-full animate-spin mb-4" />
          <p className="text-muted-foreground">Waiting for swarm events...</p>
        </div>
      )}

      <AnimatePresence initial={false}>
        {events.map((event, i) => {
          const cfg = EVENT_CONFIGS[event.type] ?? { icon: Zap, color: "text-muted-foreground", label: event.type };
          const Icon = cfg.icon;
          const isTool = event.type === "TOOL_CALLED" || event.type === "TOOL_RESULT";
          const toolName = (event.payload as Record<string, unknown>).tool as string | undefined;
          const ToolIcon = toolName ? (TOOL_ICONS[toolName] ?? Wrench) : null;

          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-start gap-2 py-1 px-2 rounded-lg hover:bg-[hsl(240_12%_11%)] transition-colors group ${
                event.type === "SWARM_COMPLETED" ? "bg-[hsl(152_100%_50%/0.05)] border border-[hsl(152_100%_50%/0.1)]" :
                event.type === "SWARM_FAILED" ? "bg-red-400/5 border border-red-400/10" :
                event.type === "PLAN_CREATED" ? "bg-[hsl(248_100%_70%/0.05)] border border-[hsl(248_100%_70%/0.1)]" :
                ""
              }`}
              data-testid={`event-${event.id}`}
            >
              <span className="text-muted-foreground/40 flex-shrink-0 w-20 text-right">
                {formatTime(event.timestamp)}
              </span>

              <div className={`flex-shrink-0 mt-0.5 ${cfg.color}`}>
                {ToolIcon && isTool ? <ToolIcon className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
              </div>

              <div className="flex-1 min-w-0">
                {event.agentName && (
                  <span className="text-[hsl(192_100%_42%/0.7)] mr-1">[{event.agentName}]</span>
                )}
                <span className={`${cfg.color} mr-1 font-medium`}>{cfg.label}:</span>
                <span className="text-foreground/80 break-words">{getEventMessage(event)}</span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {isLive && events.length > 0 && (
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex items-center gap-2 px-2 py-1 text-[hsl(248_100%_70%/0.6)]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[hsl(248_100%_70%)] animate-pulse" />
          <span>Live</span>
        </motion.div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
