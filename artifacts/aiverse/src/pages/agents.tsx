import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Bot, Trash2, Edit2, Power, PowerOff,
  Copy, Loader2, ChevronDown, ChevronUp, Globe, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { getToken } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API = `${BASE}/api`;

const MODELS = [
  { id: "moonshotai/kimi-k2:free", label: "Kimi K2 (Free)" },
  { id: "deepseek/deepseek-chat-v3-0324:free", label: "DeepSeek V3 Flash" },
  { id: "meta-llama/llama-4-maverick:free", label: "Llama 4 Maverick" },
  { id: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
];

interface Agent {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  model: string;
  isPublic: boolean;
  isActive: boolean;
  createdAt: string;
}

async function fetchAgents(): Promise<Agent[]> {
  const token = getToken();
  const res = await fetch(`${API}/agents`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Failed to fetch agents");
  const data = await res.json();
  return data.agents ?? [];
}

async function createAgent(body: Partial<Agent>) {
  const token = getToken();
  const res = await fetch(`${API}/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create agent");
  return res.json();
}

async function updateAgent(id: string, body: Partial<Agent>) {
  const token = getToken();
  const res = await fetch(`${API}/agents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update agent");
  return res.json();
}

async function deleteAgent(id: string) {
  const token = getToken();
  const res = await fetch(`${API}/agents/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to delete agent");
}

const BLANK: Partial<Agent> = { name: "", description: "", systemPrompt: "", model: "moonshotai/kimi-k2:free", isPublic: false };

export default function AgentsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [form, setForm] = useState<Partial<Agent>>(BLANK);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: agents = [], isLoading } = useQuery({ queryKey: ["agents"], queryFn: fetchAgents });

  const createMut = useMutation({
    mutationFn: createAgent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agents"] }); setOpen(false); setForm(BLANK); toast.success("Agent created"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Agent> }) => updateAgent(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agents"] }); setOpen(false); setEditing(null); toast.success("Agent updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteAgent,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["agents"] }); toast.success("Agent deleted"); },
    onError: (e: any) => toast.error(e.message),
  });

  const openCreate = () => { setEditing(null); setForm(BLANK); setOpen(true); };
  const openEdit = (agent: Agent) => { setEditing(agent); setForm({ name: agent.name, description: agent.description ?? "", systemPrompt: agent.systemPrompt, model: agent.model, isPublic: agent.isPublic }); setOpen(true); };

  const handleSave = () => {
    if (!form.name?.trim() || !form.systemPrompt?.trim()) { toast.error("Name and system prompt are required"); return; }
    if (editing) updateMut.mutate({ id: editing.id, body: form });
    else createMut.mutate(form);
  };

  const toggleActive = (agent: Agent) => {
    updateMut.mutate({ id: agent.id, body: { isActive: !agent.isActive } });
  };

  return (
    <div className="flex flex-col h-full overflow-auto bg-background">
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Agents</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create and manage your custom AI agents</p>
        </div>
        <Button onClick={openCreate} className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold gap-1.5">
          <Plus className="w-4 h-4" /> New Agent
        </Button>
      </div>

      <div className="flex-1 p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-center">
            <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-4">
              <Bot className="w-7 h-7 text-violet-400" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No agents yet</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs">Create your first AI agent with a custom system prompt and model configuration.</p>
            <Button onClick={openCreate} variant="outline" className="border-white/10">
              <Plus className="w-4 h-4 mr-2" /> Create First Agent
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent, i) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-5 rounded-xl border border-border bg-card hover:border-white/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${agent.isActive ? "bg-cyan-500/10" : "bg-white/5"}`}>
                      <Bot className={`w-4 h-4 ${agent.isActive ? "text-cyan-400" : "text-white/30"}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-foreground leading-tight">{agent.name}</h3>
                      <p className="text-xs text-muted-foreground">{MODELS.find(m => m.id === agent.model)?.label ?? agent.model}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {agent.isPublic ? <Globe className="w-3.5 h-3.5 text-cyan-400" /> : <Lock className="w-3.5 h-3.5 text-white/30" />}
                  </div>
                </div>

                {agent.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{agent.description}</p>
                )}

                <div className="flex items-center gap-1.5 mt-auto pt-3 border-t border-border">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => openEdit(agent)}>
                    <Edit2 className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => toggleActive(agent)}>
                    {agent.isActive ? <PowerOff className="w-3 h-3 mr-1 text-amber-400" /> : <Power className="w-3 h-3 mr-1 text-emerald-400" />}
                    {agent.isActive ? "Disable" : "Enable"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 ml-auto"
                    onClick={() => { if (confirm("Delete this agent?")) deleteMut.mutate(agent.id); }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Agent" : "Create New Agent"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Name *</Label>
              <Input
                value={form.name ?? ""}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Research Assistant"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Description</Label>
              <Input
                value={form.description ?? ""}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What does this agent do?"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">Model</Label>
              <select
                value={form.model ?? "moonshotai/kimi-k2:free"}
                onChange={(e) => setForm(f => ({ ...f, model: e.target.value }))}
                className="w-full h-9 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm"
              >
                {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-sm">System Prompt *</Label>
              <Textarea
                value={form.systemPrompt ?? ""}
                onChange={(e) => setForm(f => ({ ...f, systemPrompt: e.target.value }))}
                placeholder="You are a helpful AI assistant that..."
                rows={5}
                className="bg-white/5 border-white/10 text-white resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isPublic ?? false}
                onCheckedChange={(v) => setForm(f => ({ ...f, isPublic: v }))}
              />
              <div>
                <p className="text-sm text-white/70">Public Agent</p>
                <p className="text-xs text-white/30">Visible to all users on the platform</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-white/60">Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={createMut.isPending || updateMut.isPending}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
            >
              {createMut.isPending || updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? "Save Changes" : "Create Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
