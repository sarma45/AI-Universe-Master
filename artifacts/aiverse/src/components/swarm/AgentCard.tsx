import { motion } from "framer-motion";
import type { SwarmAgent } from "@workspace/api-client-react";
import { Bot, Brain, Wrench, Eye, FileText, Cpu } from "lucide-react";

const ROLE_ICONS: Record<string, React.ElementType> = {
  ORCHESTRATOR: Cpu,
  RESEARCHER: Eye,
  EXECUTOR: Wrench,
  CRITIC: Brain,
  SYNTHESIZER: FileText,
  TOOL_CALLER: Bot,
};

const ROLE_COLORS: Record<string, string> = {
  ORCHESTRATOR: "text-[hsl(248_100%_70%)] bg-[hsl(248_100%_70%/0.15)]",
  RESEARCHER: "text-[hsl(192_100%_42%)] bg-[hsl(192_100%_42%/0.15)]",
  EXECUTOR: "text-[hsl(25_100%_60%)] bg-[hsl(25_100%_60%/0.15)]",
  CRITIC: "text-[hsl(310_80%_60%)] bg-[hsl(310_80%_60%/0.15)]",
  SYNTHESIZER: "text-[hsl(152_100%_50%)] bg-[hsl(152_100%_50%/0.15)]",
  TOOL_CALLER: "text-yellow-400 bg-yellow-400/15",
};

const STATUS_DOTS: Record<string, string> = {
  IDLE: "bg-gray-500",
  THINKING: "bg-[hsl(248_100%_70%)] animate-pulse",
  EXECUTING: "bg-[hsl(192_100%_42%)] animate-pulse",
  WAITING: "bg-orange-400",
  COMPLETED: "bg-[hsl(152_100%_50%)]",
  FAILED: "bg-red-400",
};

interface Props {
  agent: SwarmAgent;
}

export function AgentCard({ agent }: Props) {
  const Icon = ROLE_ICONS[agent.role] ?? Bot;
  const colorClass = ROLE_COLORS[agent.role] ?? "text-muted-foreground bg-muted";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-[hsl(240_12%_11%)] border border-border rounded-lg p-2.5"
      data-testid={`agent-card-${agent.id}`}
    >
      <div className="flex items-start gap-2">
        <div className={`p-1.5 rounded-md flex-shrink-0 ${colorClass}`}>
          <Icon className="w-3 h-3" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-foreground truncate">{agent.name}</span>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOTS[agent.status] ?? "bg-gray-500"}`} />
          </div>
          <div className="text-xs text-muted-foreground truncate">{agent.role}</div>
          {agent.currentTask && (
            <div className="text-xs text-[hsl(248_100%_70%/0.8)] truncate mt-0.5 italic">
              {agent.currentTask}
            </div>
          )}
          {(agent.tokensUsed ?? 0) > 0 && (
            <div className="text-xs text-muted-foreground/60 mt-0.5">
              {(agent.tokensUsed ?? 0).toLocaleString()} tokens
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
