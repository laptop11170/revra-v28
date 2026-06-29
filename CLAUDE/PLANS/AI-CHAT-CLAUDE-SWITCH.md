# Plan: Switch `/api/ai/chat` from Gemini to Claude (Sonnet 4.6)

## Context

`/user/ai` currently calls `/api/ai/chat`, which routes through Google's Gemini (`GEMINI_KEY`). The user wants to switch this route to Anthropic Claude (`claude-sonnet-4-6`) using a custom auth token and a custom base URL:

- `ANTHROPIC_AUTH_TOKEN=sk-ant-opm-FKOopEy43Xm9FE-s0fBdFE2ozcQu4WcQ`
- `ANTHROPIC_BASE_URL=https://nc.opusmax.live`
- `ANTHROPIC_MODEL=claude-sonnet-4-6`

The user explicitly confirmed:
- Replace Gemini (do not run both in parallel).
- Store the token in `.env` (which is already in `.gitignore`).

The SDK `@anthropic-ai/sdk@^0.97.1` is already installed. The shared client at `lib/ai/client.ts` currently reads only `ANTHROPIC_API_KEY` and is used by `/api/ai/re-engage`. The chat route uses Gemini and has its own handcrafted request shape.

The client (`app/user/ai/page.tsx`) sends messages with `role: "ai"`; Anthropic expects `role: "assistant"`. The conversion happens in the route, not the page.

---

## Critical Files

| File | Change |
|------|--------|
| `.env` | Add `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL` |
| `lib/ai/client.ts` | Accept `ANTHROPIC_AUTH_TOKEN` (fall back to `ANTHROPIC_API_KEY`) and `ANTHROPIC_BASE_URL`; expose `getAnthropicModel()` |
| `app/api/ai/chat/route.ts` | Rewrite to use Anthropic SDK with tool-use (drop all Gemini code) |
| `lib/ai/tools.ts` | No change — already defines 12 tools, but the chat route currently uses 7 inline tools. We will port those 7 to the chat route (matching what the page advertises in `CAPABILITIES`). |

The 7 advertised tools in `app/user/ai/page.tsx`:
1. `query_leads`
2. `get_pipeline_summary`
3. `get_pipeline_details`
4. `get_stalled_leads`
5. `get_hot_leads`
6. `get_campaign_stats`
7. `get_workspace_summary`

These are exactly the 7 tools already in the Gemini chat route's `executeTool` switch. They stay; only the request/response translation changes.

---

## Implementation

### 1. `.env`

Append at the bottom:

```
ANTHROPIC_AUTH_TOKEN="sk-ant-opm-FKOopEy43Xm9FE-s0fBdFE2ozcQu4WcQ"
ANTHROPIC_BASE_URL="https://nc.opusmax.live"
ANTHROPIC_MODEL="claude-sonnet-4-6"
```

(`ANTHROPIC_API_KEY` is left untouched — `re-engage` still uses it. If the user later wants that route on the new token, that's a separate change.)

### 2. `lib/ai/client.ts`

Replace the body so the helper:

- Reads `process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY` and passes it as `authToken` (preferred) or `apiKey` fallback. **Order matters: `authToken` takes precedence and sends `Authorization: Bearer …` headers, which is what custom gateways like `nc.opusmax.live` expect.**
- Reads `process.env.ANTHROPIC_BASE_URL` and passes as `baseURL`.
- Throws a clear error when neither is set (no silent dummy key — current code logs and silently uses a dummy; we'll keep the warning but still throw on actual use).
- Adds a tiny sibling export `getAnthropicModel()` that returns `process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6"`.

Pseudocode:

```ts
function getAnthropic(): Anthropic {
 const authToken = process.env.ANTHROPIC_AUTH_TOKEN;
 const apiKey = process.env.ANTHROPIC_API_KEY;
 const baseURL = process.env.ANTHROPIC_BASE_URL;
 if (!authToken && !apiKey) {
 throw new Error("ANTHROPIC_AUTH_TOKEN or ANTHROPIC_API_KEY is required");
 }
 return new Anthropic({
 ...(authToken ? { authToken } : { apiKey: apiKey! }),
 ...(baseURL ? { baseURL } : {}),
 });
}

function getAnthropicModel(): string {
 return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
}

export { getAnthropic, getAnthropicModel };
```

This is **non-breaking** for `re-engage`: it uses `apiKey` and the default base URL as before.

### 3. `app/api/ai/chat/route.ts`

**Drop entirely**: all Gemini code (`callGemini`, `toGeminiContents`, `getGeminiParts`, `extractGeminiText`, the Gemini types, `GEMINI_TOOLS`/`GEMINI_MODEL`, `SYSTEM_PROMPT`).

**Keep verbatim**: the `executeTool(name, input, supabase, user)` switch — it's pure Supabase code, unchanged.

**New structure**:

```ts
import Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, getAnthropicModel } from "@/lib/ai/client";
import type { Tool } from "@anthropic-ai/sdk/resources/messages/messages.js";

// Translate Gemini-style tool defs to Anthropic tool format.
// Each Gemini def becomes an Anthropic Tool with:
// name, description, input_schema (JSON Schema with type: "object", properties, required)
// Gemini uses STRING/ENUM/NUMBER/BOOLEAN/ARRAY enums; Anthropic accepts these in JSON Schema as-is.

const ANTHROPIC_TOOLS: Tool[] = GEMINI_TOOLS.map(g => ({
 name: g.name,
 description: g.description,
 input_schema: {
 type: "object",
 properties: g.parameters.properties,
 required: g.parameters.required ?? [],
 },
}));

const SYSTEM_PROMPT = `You are RevRa AI, …`; // unchanged from current

export async function POST(req: NextRequest) {
 // auth + workspace lookup (unchanged)
 // …
 const { messages } = body as { messages: Array<{ role: "user"|"ai"; content: string }> };

 // Convert { role: "ai" } → { role: "assistant" }
 const claudeMessages = messages.map(m => ({
 role: m.role === "ai" ? "assistant" as const : "user" as const,
 content: m.content,
 }));

 const anthropic = getAnthropic();
 const model = getAnthropicModel();

 // First turn: ask Claude (tools enabled)
 const first = await anthropic.messages.create({
 model,
 max_tokens: 2048,
 temperature: 0.35,
 system: SYSTEM_PROMPT,
 tools: ANTHROPIC_TOOLS,
 messages: claudeMessages,
 });

 // If Claude wants tools, run them, then call Claude again with the tool results appended.
 const toolUses = first.content.filter(b => b.type === "tool_use");
 if (toolUses.length > 0) {
 const toolResults: Anthropic.ToolResultBlockParam[] = [];
 for (const call of toolUses) {
 if (call.type !== "tool_use") continue;
 const result = await executeTool(call.name, call.input as ToolInput, supabase, user);
 toolResults.push({
 type: "tool_result",
 tool_use_id: call.id,
 content: JSON.stringify(result),
 });
 }
 const second = await anthropic.messages.create({
 model,
 max_tokens: 2048,
 temperature: 0.35,
 system: SYSTEM_PROMPT,
 tools: ANTHROPIC_TOOLS,
 messages: [
 ...claudeMessages,
 { role: "assistant", content: first.content },
 { role: "user", content: toolResults },
 ],
 });
 return NextResponse.json({ response: extractText(second) });
 }

 return NextResponse.json({ response: extractText(first) });
}

function extractText(res: Anthropic.Messages.Message): string {
 const text = res.content
 .filter((b): b is Anthropic.TextBlock => b.type === "text")
 .map(b => b.text)
 .join("")
 .trim();
 return text || "I could not generate a response. Please try again.";
}
```

Error handling: keep the try/catch — replace the Gemini-specific error message with a generic one that surfaces the SDK's `message`.

### 4. Verification

After changes:

- `npx tsc --noEmit` on `app/api/ai/chat/route.ts` and `lib/ai/client.ts` — expect only the pre-existing `@/...` path-alias warnings, no new errors.
- Hand-test: hit `POST /api/ai/chat` with `{ messages: [{ role: "user", content: "How many leads do I have?" }] }` and confirm a real Claude response comes back. (User will do this on their dev server since the token is theirs.)

---

## Risk & Rollback

- **Risk**: The custom gateway `https://nc.opusmax.live` may not accept standard Anthropic requests, or may not have `claude-sonnet-4-6`. If it fails at request time, the error will surface as a 500 with a clear message — the user can swap the model or the URL in `.env` without code changes.
- **Rollback**: `git checkout .env app/api/ai/chat/route.ts lib/ai/client.ts` — keeps Gemini running.

---

## Out of Scope

- `app/api/ai/re-engage` is left on `ANTHROPIC_API_KEY`. Migrating it to the new token is a one-line change if requested.
- The Emma agent's separate `lib/ai/tools.ts` is not wired into the chat route. It uses different tool names (`get_lead`, `place_call`, …) and would require auth + workspace scoping for each — separate change.
- Streaming responses: not requested. Non-streaming keeps the existing page contract (`{ response: string }`).