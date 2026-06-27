import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Plus, Minus } from "lucide-react";
import { useCreateSwarmSession, getListSwarmSessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const formSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  objective: z.string().min(10, "Objective must be at least 10 characters").max(2000),
  orchestratorModel: z.string(),
  maxParallelAgents: z.number().min(1).max(10),
  maxStepsPerAgent: z.number().min(1).max(50),
  humanCheckpoints: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

const EXAMPLE_OBJECTIVES = [
  "Research the latest advances in quantum computing and write a comprehensive summary report with actionable insights",
  "Analyze the competitive landscape for AI agent platforms and identify key market opportunities",
  "Design a microservices architecture for a real-time chat application with 1M+ concurrent users",
  "Generate a detailed business plan for a SaaS productivity tool targeting remote teams",
];

const MODEL_OPTIONS = [
  { value: "claude-sonnet", label: "Claude Sonnet 4" },
  { value: "claude-opus", label: "Claude Opus 4" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gemini-pro", label: "Gemini Pro" },
];

interface Props {
  onClose: () => void;
  onLaunched: (id: string) => void;
}

export function SwarmLauncher({ onClose, onLaunched }: Props) {
  const queryClient = useQueryClient();
  const createSession = useCreateSwarmSession();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      objective: "",
      orchestratorModel: "claude-sonnet",
      maxParallelAgents: 4,
      maxStepsPerAgent: 10,
      humanCheckpoints: false,
    },
  });

  const onSubmit = async (values: FormValues) => {
    const session = await createSession.mutateAsync({
      data: {
        title: values.title,
        objective: values.objective,
        orchestratorModel: values.orchestratorModel,
        maxParallelAgents: values.maxParallelAgents,
        maxStepsPerAgent: values.maxStepsPerAgent,
        humanCheckpoints: values.humanCheckpoints,
      },
    });
    queryClient.invalidateQueries({ queryKey: getListSwarmSessionsQueryKey() });
    onLaunched(session.id);
  };

  const fillExample = (i: number) => {
    const obj = EXAMPLE_OBJECTIVES[i];
    const title = obj.slice(0, 50) + (obj.length > 50 ? "..." : "");
    form.setValue("objective", obj);
    form.setValue("title", title);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full max-w-2xl bg-[hsl(240_14%_7%)] border border-[hsl(248_100%_70%/0.3)] rounded-2xl overflow-hidden shadow-2xl"
          data-testid="swarm-launcher"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-[hsl(248_100%_70%/0.05)]">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[hsl(248_100%_70%/0.2)] rounded-lg">
                <Zap className="w-4 h-4 text-[hsl(248_100%_70%)]" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Launch Swarm</h2>
                <p className="text-xs text-muted-foreground">Deploy a multi-agent task force</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
              data-testid="button-close-launcher"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-5">
              {/* Example objectives */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Quick examples:</p>
                <div className="flex flex-wrap gap-2">
                  {["Research Report", "Market Analysis", "Architecture Design", "Business Plan"].map((label, i) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => fillExample(i)}
                      className="text-xs px-2.5 py-1 rounded-full border border-[hsl(248_100%_70%/0.3)] text-[hsl(248_100%_70%)] hover:bg-[hsl(248_100%_70%/0.1)] transition-colors"
                      data-testid={`button-example-${i}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">Swarm Name</FormLabel>
                    <FormControl>
                      <input
                        {...field}
                        placeholder="e.g. Market Research Swarm"
                        className="w-full bg-[hsl(240_12%_11%)] border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[hsl(248_100%_70%)]"
                        data-testid="input-title"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="objective"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">Objective</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        rows={4}
                        placeholder="Describe what the swarm should accomplish..."
                        className="w-full bg-[hsl(240_12%_11%)] border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[hsl(248_100%_70%)] resize-none"
                        data-testid="input-objective"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="orchestratorModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Orchestrator Model</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full bg-[hsl(240_12%_11%)] border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[hsl(248_100%_70%)]"
                          data-testid="select-model"
                        >
                          {MODEL_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxParallelAgents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">Parallel Agents</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => field.onChange(Math.max(1, field.value - 1))}
                            className="p-1.5 bg-muted rounded hover:bg-muted/80 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="flex-1 text-center text-sm font-medium text-foreground">{field.value}</span>
                          <button
                            type="button"
                            onClick={() => field.onChange(Math.min(10, field.value + 1))}
                            className="p-1.5 bg-muted rounded hover:bg-muted/80 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="text-sm"
                  data-testid="button-cancel-launcher"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createSession.isPending}
                  className="bg-[hsl(248_100%_70%)] hover:bg-[hsl(248_100%_65%)] text-black font-medium gap-2"
                  data-testid="button-submit-launch"
                >
                  {createSession.isPending ? (
                    <>
                      <div className="w-3 h-3 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                      Launching...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Launch Swarm
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
