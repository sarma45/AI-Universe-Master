import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Bot, Send, Loader2, Terminal, Code2, MessageSquare, ChevronRight, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Editor from "@monaco-editor/react";
import { getToken } from "@/lib/auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/api`;

const MODELS = [
  { id: "moonshotai/kimi-k2:free", label: "Kimi K2", color: "text-cyan-400" },
  { id: "deepseek/deepseek-chat-v3-0324:free", label: "DeepSeek V3", color: "text-violet-400" },
  { id: "meta-llama/llama-4-maverick:free", label: "Llama 4", color: "text-emerald-400" },
];

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const STARTER_CODE = `// AIVerse 2.0 — AI Workspace
// Write code here. Use the AI chat panel to get help.

interface Agent {
  id: string;
  name: string;
  model: string;
  systemPrompt: string;
}

async function runAgent(agent: Agent, input: string): Promise<string> {
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: agent.id,
      messages: [{ role: 'user', content: input }],
    }),
  });
  return response.text();
}

// Example: Create a research agent
const researcher: Agent = {
  id: 'research-1',
  name: 'Research Agent',
  model: 'moonshotai/kimi-k2:free',
  systemPrompt: 'You are an expert research assistant.',
};
`;

const TERMINAL_LINES = [
  { text: "AIVerse 2.0 — Workspace Terminal", color: "text-cyan-400" },
  { text: "─".repeat(50), color: "text-white/10" },
  { text: "$ node --version", color: "text-white/60" },
  { text: "v20.18.0", color: "text-white/40" },
  { text: "$ pnpm --version", color: "text-white/60" },
  { text: "10.26.1", color: "text-white/40" },
  { text: "$ aiverse status", color: "text-white/60" },
  { text: "✓ API Server connected", color: "text-emerald-400" },
  { text: "✓ Database connected", color: "text-emerald-400" },
  { text: "✓ Swarm engine ready", color: "text-emerald-400" },
  { text: "$ _", color: "text-cyan-400" },
];

export default function WorkspacePage() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content: "Welcome to AIVerse Workspace! I'm your AI coding assistant. I can help you write code, debug issues, and build AI agents. What would you like to work on?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(MODELS[0]!.id);
  const [code, setCode] = useState(STARTER_CODE);
  const [activePanel, setActivePanel] = useState<"editor" | "terminal">("editor");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const newMsgs: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setLoading(true);

    try {
      const token = getToken();
      const res = await fetch(`${API}/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: newMsgs,
          systemPrompt: "You are an expert AI coding assistant helping users build AI agents and applications in the AIVerse platform. Be concise, helpful, and provide working code examples when relevant.",
        }),
      });

      if (!res.ok) throw new Error("AI request failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let reply = "";

      setMessages(m => [...m, { role: "assistant", content: "▋" }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter(l => l.startsWith("data: "));
          for (const line of lines) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content ?? "";
              reply += delta;
              setMessages(m => [...m.slice(0, -1), { role: "assistant", content: reply || "▋" }]);
            } catch {}
          }
        }
      }

      if (!reply) {
        const data = await res.json().catch(() => null);
        reply = data?.content ?? data?.message ?? "I couldn't generate a response.";
        setMessages(m => [...m.slice(0, -1), { role: "assistant", content: reply }]);
      }
    } catch (err) {
      setMessages(m => [...m.slice(0, -1), { role: "assistant", content: "Sorry, I encountered an error. Make sure the AI endpoint is configured." }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, model]);

  return (
    <div className="flex h-full overflow-hidden bg-[#050505]">
      {/* Left: Code + Terminal */}
      <div className="flex flex-col flex-1 min-w-0 border-r border-border">
        {/* Panel tabs */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-[#0a0a0a]">
          <button
            onClick={() => setActivePanel("editor")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activePanel === "editor" ? "bg-white/8 text-white" : "text-white/40 hover:text-white/70"}`}
          >
            <Code2 className="w-3.5 h-3.5" /> Editor
          </button>
          <button
            onClick={() => setActivePanel("terminal")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activePanel === "terminal" ? "bg-white/8 text-white" : "text-white/40 hover:text-white/70"}`}
          >
            <Terminal className="w-3.5 h-3.5" /> Terminal
          </button>
        </div>

        {/* Monaco Editor */}
        {activePanel === "editor" && (
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="typescript"
              value={code}
              onChange={(v) => setCode(v ?? "")}
              theme="vs-dark"
              options={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                minimap: { enabled: false },
                lineNumbers: "on",
                wordWrap: "on",
                scrollBeyondLastLine: false,
                padding: { top: 16 },
                renderWhitespace: "selection",
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
              }}
            />
          </div>
        )}

        {/* Terminal */}
        {activePanel === "terminal" && (
          <div className="flex-1 overflow-auto p-4 font-mono text-sm bg-[#050505]">
            {TERMINAL_LINES.map((line, i) => (
              <div key={i} className={`${line.color} leading-6`}>{line.text}</div>
            ))}
          </div>
        )}
      </div>

      {/* Right: AI Chat */}
      <div className="w-[380px] flex-shrink-0 flex flex-col bg-[#080808]">
        {/* Chat header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-white">AI Assistant</span>
          </div>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="text-xs bg-white/5 border border-white/10 rounded-md px-2 py-1 text-white/70 focus:outline-none"
          >
            {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              {msg.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-violet-400" />
                </div>
              )}
              <div
                className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-cyan-500/15 text-cyan-100 rounded-tr-sm"
                    : "bg-white/5 text-white/85 rounded-tl-sm"
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
          {loading && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <Loader2 className="w-3.5 h-3.5 text-violet-400 animate-spin" />
              </div>
              <div className="px-3.5 py-2.5 rounded-xl bg-white/5 text-white/40 text-sm">Thinking…</div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask AI anything…"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/25 text-sm"
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-cyan-500 hover:bg-cyan-400 text-black flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-white/20 mt-2 text-center">Press Enter to send · Shift+Enter for newline</p>
        </div>
      </div>
    </div>
  );
}
