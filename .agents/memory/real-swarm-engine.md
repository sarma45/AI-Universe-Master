---
name: Real swarm engine
description: Architecture decisions for the real LLM-powered swarm engine in AIVerse 2.0
---

# Real Swarm Engine Architecture

## LLM Providers
- **NVIDIA NIM** (OpenAI-compatible) at `https://integrate.api.nvidia.com/v1`, key: `NVIDIA_API_KEY`
- **Sakana AI** at `https://api.sakana.ai/v1`, key: `SAKANA_API_KEY` (NOTE: prepaid credits exhausted as of 2026-06-28)
- Using `openai` npm SDK pointed at both base URLs

## Models (NVIDIA NIM confirmed available)
- `moonshotai/kimi-k2.6` — orchestrator / complex reasoning
- `deepseek-ai/deepseek-v4-pro` — analysis/synthesis  
- `deepseek-ai/deepseek-v4-flash` — fast execution tasks
- `meta/llama-4-maverick-17b-128e-instruct` — research
- `meta/llama-3.3-70b-instruct` — critic/review
- `nvidia/llama-3.1-nemotron-ultra-253b-v1` — heavy lifting
- Sakana: `fugu`, `fugu-ultra` (wired in, but currently no credits)

## DB Role Constraint
The DB enum `agent_role` only accepts: ORCHESTRATOR, RESEARCHER, EXECUTOR, CRITIC, SYNTHESIZER, TOOL_CALLER.
LLMs often return non-standard roles like "ANALYST". **Always run through `sanitizeRole()` before DB insert.**

**Why:** Kimi K2.6 returned "ANALYST" in its plan which caused a Drizzle insert error crash.

**How to apply:** In swarm-engine.ts, call `sanitizeRole(step.agent_role)` before any DB write.

## Key Files
- `artifacts/api-server/src/lib/llm-client.ts` — NVIDIA NIM + Sakana clients with 90s timeout
- `artifacts/api-server/src/lib/swarm-tools.ts` — web_search (DuckDuckGo), read_url, code_execute (vm), memory
- `artifacts/api-server/src/lib/swarm-engine.ts` — real DAG orchestrator with topological sort + parallel group execution

## Tool Implementation
- `web_search` → DuckDuckGo Instant Answer API (free, no key needed)
- `read_url` → native fetch + HTML stripping
- `code_execute` → Node.js `vm` module, 5s timeout in `runInContext` (NOT in Script constructor)
- `memory_store/retrieve/list` → in-process Map per sessionId, cleared on swarm end

## LLM Timeout
Set `timeout: 90_000` on NVIDIA client, `60_000` on Sakana. Without this, large context calls hang indefinitely.
