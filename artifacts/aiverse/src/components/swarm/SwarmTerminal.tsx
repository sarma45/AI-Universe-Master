import { useEffect, useRef } from "react";
import type { SwarmSessionDetail } from "@workspace/api-client-react";

interface Props {
  session: SwarmSessionDetail;
}

function buildTerminalLines(session: SwarmSessionDetail): string[] {
  const lines: string[] = [];
  const ts = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  lines.push(`\x1b[35m█████╗ ██╗██╗   ██╗███████╗██████╗ ███████╗███████╗\x1b[0m`);
  lines.push(`\x1b[35m██╔══██╗██║██║   ██║██╔════╝██╔══██╗██╔════╝██╔════╝\x1b[0m`);
  lines.push(`\x1b[35m███████║██║██║   ██║█████╗  ██████╔╝███████╗█████╗  \x1b[0m`);
  lines.push(`\x1b[35m██╔══██║██║╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██╔══╝  \x1b[0m`);
  lines.push(`\x1b[35m██║  ██║██║ ╚████╔╝ ███████╗██║  ██║███████║███████╗\x1b[0m`);
  lines.push(`\x1b[35m╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝\x1b[0m`);
  lines.push("");
  lines.push(`\x1b[36mAIVerse 2.0 — Multi-Agent Swarm Terminal\x1b[0m`);
  lines.push(`\x1b[90m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
  lines.push("");
  lines.push(`\x1b[90m[SYS]\x1b[0m Session ID: \x1b[33m${session.id}\x1b[0m`);
  lines.push(`\x1b[90m[SYS]\x1b[0m Title: \x1b[37m${session.title}\x1b[0m`);
  lines.push(`\x1b[90m[SYS]\x1b[0m Status: ${
    session.status === "COMPLETED" ? "\x1b[32m" :
    session.status === "FAILED" ? "\x1b[31m" :
    session.status === "RUNNING" ? "\x1b[36m" :
    "\x1b[33m"
  }${session.status}\x1b[0m`);
  lines.push(`\x1b[90m[SYS]\x1b[0m Orchestrator: \x1b[37m${session.orchestratorModel}\x1b[0m`);
  lines.push(`\x1b[90m[SYS]\x1b[0m Max Agents: \x1b[37m${session.maxParallelAgents}\x1b[0m`);
  lines.push("");

  if (session.agents && session.agents.length > 0) {
    lines.push(`\x1b[90m[SYS]\x1b[0m \x1b[36mAgent Fleet:\x1b[0m`);
    for (const agent of session.agents) {
      const statusColor = agent.status === "COMPLETED" ? "\x1b[32m" :
        agent.status === "FAILED" ? "\x1b[31m" :
        agent.status === "THINKING" || agent.status === "EXECUTING" ? "\x1b[36m" :
        "\x1b[90m";
      lines.push(
        `  \x1b[35m▸\x1b[0m ${agent.name.padEnd(16)} \x1b[90m${agent.role.padEnd(14)}\x1b[0m ${statusColor}${agent.status}\x1b[0m  \x1b[90m${agent.model}\x1b[0m`
      );
      if (agent.currentTask) {
        lines.push(`    \x1b[90m→ ${agent.currentTask}\x1b[0m`);
      }
    }
    lines.push("");
  }

  if (session.recentEvents && session.recentEvents.length > 0) {
    lines.push(`\x1b[90m[SYS]\x1b[0m \x1b[36mEvent Log:\x1b[0m`);
    const events = session.recentEvents.slice(-20);
    for (const evt of events) {
      const d = new Date(evt.timestamp);
      const tStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const agentStr = evt.agentName ? `\x1b[35m[${evt.agentName}]\x1b[0m ` : "";
      const p = evt.payload as Record<string, unknown>;

      let msg = "";
      switch (evt.type) {
        case "AGENT_THINKING": msg = `\x1b[34mTHINK\x1b[0m  ${String(p.message ?? "")}`.slice(0, 80); break;
        case "AGENT_EXECUTING": msg = `\x1b[36mEXEC\x1b[0m   ${String(p.task ?? "")}`.slice(0, 80); break;
        case "TOOL_CALLED": msg = `\x1b[33mTOOL\x1b[0m   ${String(p.tool ?? "")} ${JSON.stringify(p.args ?? {}).slice(0, 40)}`; break;
        case "TOOL_RESULT": msg = `\x1b[32mRESULT\x1b[0m ${String(p.result ?? "").slice(0, 60)}`; break;
        case "AGENT_COMPLETED": msg = `\x1b[32mDONE\x1b[0m   Agent completed`; break;
        case "SWARM_COMPLETED": msg = `\x1b[32m✓ SWARM COMPLETED SUCCESSFULLY\x1b[0m`; break;
        case "SWARM_FAILED": msg = `\x1b[31m✗ SWARM FAILED: ${String(p.error ?? "")}\x1b[0m`; break;
        case "PLAN_CREATED": msg = `\x1b[35mPLAN\x1b[0m   Execution plan created`; break;
        case "PLAN_STEP_STARTED": {
          const step = p.step as { title?: string } | undefined;
          msg = `\x1b[36m▸ STEP\x1b[0m  ${step?.title ?? ""}`;
          break;
        }
        default: msg = `\x1b[90m${evt.type}\x1b[0m`;
      }
      lines.push(`\x1b[90m${tStr}\x1b[0m  ${agentStr}${msg}`);
    }
    lines.push("");
  }

  if (session.status === "COMPLETED") {
    lines.push(`\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
    lines.push(`\x1b[32m✓ Swarm completed. Tokens: ${session.totalTokens.toLocaleString()} | Cost: $${(session.totalCostUsd ?? 0).toFixed(4)}\x1b[0m`);
  } else if (session.status === "RUNNING" || session.status === "PLANNING") {
    lines.push(`\x1b[36m⟳ Swarm in progress... [${session.status}]\x1b[0m`);
  }

  lines.push("");
  lines.push(`\x1b[90maiverse@swarm:~$\x1b[0m \x1b[90m_\x1b[0m`);

  return lines;
}

export function SwarmTerminal({ session }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [session.recentEvents?.length, session.status]);

  const lines = buildTerminalLines(session);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto bg-[hsl(240_20%_2%)] p-4 font-mono text-xs leading-5"
      style={{ fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace" }}
      data-testid="swarm-terminal"
    >
      {lines.map((line, i) => (
        <div
          key={i}
          className="whitespace-pre-wrap break-all"
          dangerouslySetInnerHTML={{ __html: ansiToHtml(line) }}
        />
      ))}
    </div>
  );
}

function ansiToHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\x1b\[0m/g, "</span>")
    .replace(/\x1b\[90m/g, '<span style="color:#555">')
    .replace(/\x1b\[31m/g, '<span style="color:#f66">')
    .replace(/\x1b\[32m/g, '<span style="color:#5fa">')
    .replace(/\x1b\[33m/g, '<span style="color:#fa0">')
    .replace(/\x1b\[34m/g, '<span style="color:#88f">')
    .replace(/\x1b\[35m/g, '<span style="color:#b09fff">')
    .replace(/\x1b\[36m/g, '<span style="color:#00d4ff">')
    .replace(/\x1b\[37m/g, '<span style="color:#ddd">');
}
