import OpenAI from "openai";
import { logger } from "./logger.js";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const SAKANA_BASE_URL = "https://api.sakana.ai/v1";

function getNvidiaClient(): OpenAI {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error("NVIDIA_API_KEY is not set");
  return new OpenAI({ baseURL: NVIDIA_BASE_URL, apiKey, timeout: 90_000, maxRetries: 0 });
}

function getSakanaClient(): OpenAI {
  const apiKey = process.env.SAKANA_API_KEY;
  if (!apiKey) throw new Error("SAKANA_API_KEY is not set");
  return new OpenAI({ baseURL: SAKANA_BASE_URL, apiKey, timeout: 60_000, maxRetries: 0 });
}

export type ModelId =
  | "kimi-k2.6"
  | "deepseek-v4-pro"
  | "deepseek-v4-flash"
  | "llama-4-maverick"
  | "llama-3.3-70b"
  | "nemotron-ultra"
  | "fugu"
  | "fugu-ultra";

interface ModelConfig {
  provider: "nvidia" | "sakana";
  modelId: string;
  label: string;
}

export const MODEL_CONFIGS: Record<ModelId, ModelConfig> = {
  "kimi-k2.6": { provider: "nvidia", modelId: "moonshotai/kimi-k2.6", label: "Kimi K2.6" },
  "deepseek-v4-pro": { provider: "nvidia", modelId: "deepseek-ai/deepseek-v4-pro", label: "DeepSeek V4 Pro" },
  "deepseek-v4-flash": { provider: "nvidia", modelId: "deepseek-ai/deepseek-v4-flash", label: "DeepSeek V4 Flash" },
  "llama-4-maverick": { provider: "nvidia", modelId: "meta/llama-4-maverick-17b-128e-instruct", label: "Llama 4 Maverick" },
  "llama-3.3-70b": { provider: "nvidia", modelId: "meta/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
  "nemotron-ultra": { provider: "nvidia", modelId: "nvidia/llama-3.1-nemotron-ultra-253b-v1", label: "Nemotron Ultra 253B" },
  "fugu": { provider: "sakana", modelId: "fugu", label: "Sakana Fugu" },
  "fugu-ultra": { provider: "sakana", modelId: "fugu-ultra", label: "Sakana Fugu Ultra" },
};

export function resolveModelId(raw: string): ModelId {
  if (raw in MODEL_CONFIGS) return raw as ModelId;
  const lower = raw.toLowerCase();
  if (lower.includes("kimi")) return "kimi-k2.6";
  if (lower.includes("deepseek") && lower.includes("flash")) return "deepseek-v4-flash";
  if (lower.includes("deepseek")) return "deepseek-v4-pro";
  if (lower.includes("llama-4") || lower.includes("maverick")) return "llama-4-maverick";
  if (lower.includes("llama")) return "llama-3.3-70b";
  if (lower.includes("nemotron")) return "nemotron-ultra";
  if (lower.includes("fugu-ultra")) return "fugu-ultra";
  if (lower.includes("fugu") || lower.includes("sakana")) return "fugu";
  return "kimi-k2.6";
}

function getClient(modelId: ModelId): { client: OpenAI; config: ModelConfig } {
  const config = MODEL_CONFIGS[modelId];
  const client = config.provider === "sakana" ? getSakanaClient() : getNvidiaClient();
  return { client, config };
}

export type ChatMessage = OpenAI.Chat.ChatCompletionMessageParam;
export type ToolDefinition = OpenAI.Chat.ChatCompletionTool;

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isLast = attempt === retries;
      const status = (err as { status?: number })?.status;
      if (isLast || (status && status < 429)) throw err;
      const wait = delay * Math.pow(2, attempt);
      logger.warn({ attempt, wait, status }, "LLM call failed, retrying");
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error("Unreachable");
}

export async function chatCompletion(
  modelId: ModelId,
  messages: ChatMessage[],
  options: {
    tools?: ToolDefinition[];
    maxTokens?: number;
    jsonMode?: boolean;
  } = {}
): Promise<OpenAI.Chat.ChatCompletion> {
  const { client, config } = getClient(modelId);
  return withRetry(() =>
    client.chat.completions.create({
      model: config.modelId,
      messages,
      tools: options.tools && options.tools.length > 0 ? options.tools : undefined,
      tool_choice: options.tools && options.tools.length > 0 ? "auto" : undefined,
      max_tokens: options.maxTokens ?? 4096,
      ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
    })
  );
}

export async function chatCompletionText(
  modelId: ModelId,
  messages: ChatMessage[],
  options: { maxTokens?: number; jsonMode?: boolean } = {}
): Promise<string> {
  const completion = await chatCompletion(modelId, messages, options);
  return completion.choices[0]?.message?.content ?? "";
}
