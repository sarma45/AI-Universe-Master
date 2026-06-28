import { logger } from "./logger.js";

const sessionMemory = new Map<string, Map<string, string>>();

export interface ToolResult {
  tool: string;
  args: Record<string, unknown>;
  result: string;
  error?: boolean;
}

async function webSearch(query: string): Promise<string> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "AIVerse/2.0 (research bot)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) throw new Error(`DDG API: ${resp.status}`);
    const data = await resp.json() as {
      AbstractText?: string;
      AbstractSource?: string;
      AbstractURL?: string;
      RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
      Answer?: string;
      Heading?: string;
    };

    const parts: string[] = [];
    if (data.Answer) parts.push(`Answer: ${data.Answer}`);
    if (data.Heading) parts.push(`Topic: ${data.Heading}`);
    if (data.AbstractText) parts.push(`Summary: ${data.AbstractText}`);
    if (data.AbstractSource) parts.push(`Source: ${data.AbstractSource} (${data.AbstractURL})`);

    const topics = (data.RelatedTopics ?? [])
      .filter((t) => t.Text)
      .slice(0, 5)
      .map((t) => `- ${t.Text} [${t.FirstURL ?? ""}]`);
    if (topics.length > 0) parts.push(`Related:\n${topics.join("\n")}`);

    if (parts.length === 0) {
      return `No instant answer found for "${query}". Try a more specific query or use read_url to fetch a specific page.`;
    }
    return parts.join("\n\n");
  } catch (err) {
    logger.warn({ err, query }, "web_search failed");
    return `Search failed: ${String(err)}. Consider using read_url with a direct URL.`;
  }
}

async function readUrl(url: string): Promise<string> {
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AIVerse/2.0; research bot)",
        Accept: "text/html,application/json,text/plain",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const contentType = resp.headers.get("content-type") ?? "";
    const text = await resp.text();

    if (contentType.includes("application/json")) {
      try {
        const json = JSON.parse(text);
        return `JSON response from ${url}:\n${JSON.stringify(json, null, 2).slice(0, 4000)}`;
      } catch {
        return text.slice(0, 4000);
      }
    }

    const stripped = text
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{3,}/g, "\n\n")
      .replace(/[ \t]+/g, " ")
      .trim();

    const truncated = stripped.length > 4000 ? stripped.slice(0, 4000) + "\n\n[...content truncated...]" : stripped;
    return `Content from ${url}:\n\n${truncated}`;
  } catch (err) {
    logger.warn({ err, url }, "read_url failed");
    return `Failed to read ${url}: ${String(err)}`;
  }
}

async function executeCode(code: string, language: string): Promise<string> {
  if (!["javascript", "js"].includes(language.toLowerCase())) {
    return `Code execution only supports JavaScript/Node.js in this environment. Received: ${language}.\nHere is the code that would be run:\n\`\`\`${language}\n${code}\n\`\`\``;
  }

  try {
    const vm = await import("vm");
    const output: string[] = [];
    const context = vm.createContext({
      console: {
        log: (...args: unknown[]) => output.push(args.map(String).join(" ")),
        error: (...args: unknown[]) => output.push("ERROR: " + args.map(String).join(" ")),
        warn: (...args: unknown[]) => output.push("WARN: " + args.map(String).join(" ")),
      },
      Math,
      JSON,
      Object,
      Array,
      String,
      Number,
      Boolean,
      Date,
      RegExp,
      Error,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURIComponent,
      decodeURIComponent,
    });

    const script = new vm.Script(code);
    const result = script.runInContext(context, { timeout: 5000 });

    const lines = output.join("\n");
    const resultStr = result !== undefined ? `\nReturn value: ${JSON.stringify(result)}` : "";
    return `Executed successfully:\n${lines}${resultStr}` || "Executed (no output)";
  } catch (err) {
    return `Execution error: ${String(err)}`;
  }
}

function memoryStore(sessionId: string, key: string, value: string): string {
  if (!sessionMemory.has(sessionId)) sessionMemory.set(sessionId, new Map());
  sessionMemory.get(sessionId)!.set(key, value);
  return `Stored "${key}" in session memory.`;
}

function memoryRetrieve(sessionId: string, key: string): string {
  const mem = sessionMemory.get(sessionId);
  if (!mem) return `No memory found for this session.`;
  const val = mem.get(key);
  return val !== undefined ? `Memory["${key}"]: ${val}` : `Key "${key}" not found in memory. Available: ${[...mem.keys()].join(", ") || "none"}`;
}

function memoryList(sessionId: string): string {
  const mem = sessionMemory.get(sessionId);
  if (!mem || mem.size === 0) return "Memory is empty.";
  return [...mem.entries()].map(([k, v]) => `${k}: ${v.slice(0, 200)}`).join("\n");
}

export function clearSessionMemory(sessionId: string): void {
  sessionMemory.delete(sessionId);
}

export async function executeTool(
  sessionId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  logger.info({ sessionId, toolName, args }, "Executing tool");
  try {
    let result: string;
    switch (toolName) {
      case "web_search":
        result = await webSearch(String(args.query ?? ""));
        break;
      case "read_url":
        result = await readUrl(String(args.url ?? ""));
        break;
      case "code_execute":
        result = await executeCode(String(args.code ?? ""), String(args.language ?? "javascript"));
        break;
      case "memory_store":
        result = memoryStore(sessionId, String(args.key ?? ""), String(args.value ?? ""));
        break;
      case "memory_retrieve":
        result = memoryRetrieve(sessionId, String(args.key ?? ""));
        break;
      case "memory_list":
        result = memoryList(sessionId);
        break;
      default:
        result = `Unknown tool: ${toolName}`;
    }
    return { tool: toolName, args, result };
  } catch (err) {
    logger.error({ sessionId, toolName, err }, "Tool execution error");
    return { tool: toolName, args, result: `Tool error: ${String(err)}`, error: true };
  }
}

export const TOOL_DEFINITIONS: import("openai").OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for current information, facts, or news. Returns a summary of top results.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_url",
      description: "Fetch and read the text content of any URL. Good for reading articles, docs, or APIs.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL to fetch" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "code_execute",
      description: "Execute JavaScript/Node.js code in a sandbox. Use for calculations, data processing, or formatting.",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "JavaScript code to execute" },
          language: { type: "string", description: "Programming language (only 'javascript' is supported)", enum: ["javascript"] },
        },
        required: ["code", "language"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "memory_store",
      description: "Store a piece of information in session memory for later retrieval by other agents.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Memory key name" },
          value: { type: "string", description: "Value to store" },
        },
        required: ["key", "value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "memory_retrieve",
      description: "Retrieve a stored memory value by key.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Memory key to retrieve" },
        },
        required: ["key"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "memory_list",
      description: "List all keys currently stored in session memory.",
      parameters: { type: "object", properties: {} },
    },
  },
];
