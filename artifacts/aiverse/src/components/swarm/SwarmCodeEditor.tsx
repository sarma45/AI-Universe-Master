import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import type { SwarmSessionDetail } from "@workspace/api-client-react";
import { Copy, Check } from "lucide-react";

interface Props {
  session: SwarmSessionDetail;
}

function buildOutput(session: SwarmSessionDetail): string {
  const lines: string[] = [];
  lines.push(`# Swarm Session: ${session.title}`);
  lines.push(`# Status: ${session.status}`);
  lines.push(`# Objective: ${session.objective}`);
  lines.push("");

  if (session.planJson) {
    lines.push("## Execution Plan");
    lines.push("```json");
    lines.push(JSON.stringify(session.planJson, null, 2));
    lines.push("```");
    lines.push("");
  }

  if (session.agents && session.agents.length > 0) {
    lines.push("## Agent Outputs");
    lines.push("");
    for (const agent of session.agents) {
      lines.push(`### ${agent.name} (${agent.role})`);
      lines.push(`Model: ${agent.model}`);
      lines.push(`Status: ${agent.status}`);
      lines.push(`Tokens: ${agent.tokensUsed}`);
      if (agent.outputJson) {
        lines.push("Output:");
        lines.push("```json");
        lines.push(JSON.stringify(agent.outputJson, null, 2));
        lines.push("```");
      }
      lines.push("");
    }
  }

  if (session.resultJson) {
    lines.push("## Final Result");
    lines.push("```json");
    lines.push(JSON.stringify(session.resultJson, null, 2));
    lines.push("```");
  }

  if (session.status === "RUNNING" || session.status === "PLANNING") {
    lines.push("# ⟳ Swarm is running... results will appear here");
  }

  return lines.join("\n");
}

export function SwarmCodeEditor({ session }: Props) {
  const [content, setContent] = useState(() => buildOutput(session));
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setContent(buildOutput(session));
  }, [session.status, session.agents, session.resultJson, session.planJson]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border flex-shrink-0">
        <span className="text-xs text-muted-foreground font-mono">swarm-output.md</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
          data-testid="button-copy-code"
        >
          {copied ? <Check className="w-3 h-3 text-[hsl(152_100%_50%)]" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="markdown"
          value={content}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 12,
            fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
            lineNumbers: "off",
            folding: false,
            wordWrap: "on",
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>
    </div>
  );
}
