// app/api/ai/chat/route.ts
// RevRa AI chat — Anthropic Claude with tool-use (replaces Gemini).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "@anthropic-ai/sdk/resources/messages/messages.js";
import { getAnthropic, getAnthropicModel } from "@/lib/ai/client";

const PIPELINE_STAGES = ["new_lead", "contacted", "qualified", "quote_sent", "won", "lost"] as const;

// ── Tool definitions ─────────────────────────────────────────────────────────

type GeminiParam = {
 type: "STRING" | "NUMBER" | "BOOLEAN" | "OBJECT" | "ARRAY";
 enum?: string[];
 items?: GeminiParam;
 description?: string;
};

type GeminiToolDef = {
 name: string;
 description: string;
 parameters: {
 type: "OBJECT";
 properties: Record<string, GeminiParam>;
 required?: string[];
 };
};

// Same 7 tools the chat route previously exposed to Gemini — translated to
// Anthropic's JSON-Schema input_schema format.
const GEMINI_TOOLS: GeminiToolDef[] = [
 {
 name: "query_leads",
 description: "Search and filter leads in the user's workspace. Returns matching leads with name, phone, email, score, stage, type, source, assigned agent, and last contact info.",
 parameters: {
 type: "OBJECT",
 properties: {
 lead_type: { type: "STRING", enum: ["medicare", "aca", "final_expense", "life", "other"], description: "Filter by insurance type" },
 pipeline_stage: { type: "STRING", enum: [...PIPELINE_STAGES], description: "Filter by pipeline stage" },
 min_score: { type: "NUMBER", description: "Minimum lead score from 0 to 100" },
 max_score: { type: "NUMBER", description: "Maximum lead score from 0 to 100" },
 search_term: { type: "STRING", description: "Search by name, phone, or email using partial matching" },
 source: { type: "STRING", description: "Filter by lead source" },
 is_marketplace_lead: { type: "BOOLEAN", description: "Filter marketplace leads" },
 assigned_to_me: { type: "BOOLEAN", description: "Only leads assigned to the requesting agent" },
 opted_out: { type: "BOOLEAN", description: "Include opted-out leads. Default is false." },
 limit: { type: "NUMBER", description: "Max results to return. Default is 20." },
 },
 required: [],
 },
 },
 {
 name: "get_pipeline_summary",
 description: "Get a breakdown of leads by pipeline stage with counts, average scores, and totals for the workspace.",
 parameters: { type: "OBJECT", properties: { assigned_to_me: { type: "BOOLEAN", description: "Only count leads assigned to the requesting agent" } }, required: [] },
 },
 {
 name: "get_pipeline_details",
 description: "Get exact lead counts and lead details for one, several, or all pipeline stages. Use this for questions like how many leads are won, lost, quote sent, contacted, or who is in a pipeline stage.",
 parameters: {
 type: "OBJECT",
 properties: {
 stages: {
 type: "ARRAY",
 items: { type: "STRING", enum: [...PIPELINE_STAGES, "all"] },
 description: "Pipeline stages to inspect. Use all ",
 },
 include_details: { type: "BOOLEAN", description: "Include lead names and lead details. Default true." },
 limit_per_stage: { type: "NUMBER", description: "Maximum lead details per stage. Default 50." },
 assigned_to_me: { type: "BOOLEAN", description: "Only include leads assigned to the requesting agent" },
 },
 required: [],
 },
 },
 {
 name: "get_stalled_leads",
 description: "Find leads that haven't been contacted (call, message, or any activity) in the last N days.",
 parameters: {
 type: "OBJECT",
 properties: {
 days_inactive: { type: "NUMBER", description: "Days since last contact. Default is 7." },
 limit: { type: "NUMBER", description: "Max results. Default is 20." },
 assigned_to_me: { type: "BOOLEAN", description: "Only leads assigned to the requesting agent" },
 },
 required: [],
 },
 },
 {
 name: "get_hot_leads",
 description: "Get high-score leads (80+) that are actively being worked, optionally filtered by insurance type.",
 parameters: {
 type: "OBJECT",
 properties: {
 lead_type: { type: "STRING", enum: ["medicare", "aca", "final_expense", "life", "other"], description: "Filter by insurance type" },
 min_score: { type: "NUMBER", description: "Minimum score threshold. Default is 80." },
 limit: { type: "NUMBER", description: "Max results. Default is 20." },
 assigned_to_me: { type: "BOOLEAN", description: "Only leads assigned to the requesting agent" },
 },
 required: [],
 },
 },
 {
 name: "get_campaign_stats",
 description: "Get SMS campaign performance stats: sent, delivered, failed, replied, opted out counts.",
 parameters: {
 type: "OBJECT",
 properties: {
 status: { type: "STRING", enum: ["active", "paused", "completed", "draft"], description: "Filter by campaign status" },
 },
 required: [],
 },
 },
 {
 name: "get_workspace_summary",
 description: "Get high-level workspace stats: total leads, leads by stage, average score, new leads this week, recent activity.",
 parameters: { type: "OBJECT", properties: {}, required: [] },
 },
 {
 name: "get_last_sms",
 description: "Get the most recent SMS message in the workspace with lead name, phone number, direction, body, provider/status, and timestamp. Use this for questions like 'who was the last SMS with?' or 'last sms done with'.",
 parameters: {
 type: "OBJECT",
 properties: {
 direction: { type: "STRING", enum: ["inbound", "outbound"], description: "Optional SMS direction filter" },
 },
 required: [],
 },
 },
 {
 name: "get_lead_profile",
 description: "Get rich details for leads matching a name, phone, or email. Includes lead fields plus recent SMS/messages, calls, notes, tasks, and appointments. Use starts_with=true when the user says a name starts with something.",
 parameters: {
 type: "OBJECT",
 properties: {
 search_term: { type: "STRING", description: "Name, phone, or email fragment to search for" },
 starts_with: { type: "BOOLEAN", description: "Match first name, last name, or full name prefix instead of contains" },
 limit: { type: "NUMBER", description: "Maximum matching leads to return. Default 5." },
 },
 required: ["search_term"],
 },
 },
];

// Map a Gemini-style parameter type to JSON Schema used by Anthropic.
function paramToJsonSchema(p: GeminiParam): Record<string, unknown> {
 if (p.type === "ARRAY") {
 return p.items
 ? { type: "array", items: paramToJsonSchema(p.items), description: p.description }
 : { type: "array", description: p.description };
 }
 const out: Record<string, unknown> = { type: p.type === "STRING" ? "string" : p.type === "NUMBER" ? "number" : p.type === "BOOLEAN" ? "boolean" : "object" };
 if (p.description) out.description = p.description;
 if (p.enum) out.enum = p.enum;
 return out;
}

const ANTHROPIC_TOOLS: Tool[] = GEMINI_TOOLS.map((t) => {
 const properties: Record<string, unknown> = {};
 for (const [k, v] of Object.entries(t.parameters.properties)) {
 properties[k] = paramToJsonSchema(v);
 }
 return {
 name: t.name,
 description: t.description,
 input_schema: {
 type: "object" as const,
 properties,
 required: t.parameters.required ?? [],
 },
 };
});

// ── ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are RevRa AI, an intelligent assistant for insurance agents using the RevRa CRM platform. You help agents manage their leads, pipeline, and daily workflow.

Your capabilities:
- Query leads by name, phone, stage, score, type (Medicare, ACA, Final Expense, Life), source, and more
- Find stalled leads (inactive for N days)
- Identify hot leads (high score, actively worked)
- Summarize pipeline performance by stage with accurate counts and lead details
- Show campaign SMS stats
- Show the last SMS with lead name, phone number, message body, direction, and timestamp
- Pull a full lead profile by exact, partial, or starts-with name search, including messages, calls, notes, tasks, and appointments
- Provide workspace-level summaries

Guidelines:
- Be concise but informative. Use bullet points and tables when listing multiple leads.
- Include specific names, scores, and stages when referencing leads.
- For pipeline questions about won/lost/counts/names/details, use get_pipeline_details before answering.
- For "last SMS", "latest text", or "SMS done with" questions, use get_last_sms before answering.
- For "lead detail", "details for lead", or "name starts with ..." questions, use get_lead_profile before answering.
- Suggest actionable next steps (e.g., "Call Robert Williams — he's been stalled for 9 days").
- If no leads match a query, say so clearly.
- For scores: 80+ is hot, 60-79 is warm, below 60 is cold.
- Pipeline stages: new_lead → contacted → qualified → quote_sent → won/lost. Users may say "closed won" for won and "closed lost" for lost.
- Never make up data. Only report what the tools return.
- 
`;

type ClientMessage = { role: "user" | "ai"; content: string };
type ToolInput = Record<string, unknown>;

export async function POST(req: NextRequest) {
 const { userId } = await auth();
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const supabase = createServiceSupabaseClient();
 if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

 // Resolve user workspace + role
 const { data: user } = await supabase
 .from("users")
 .select("id, workspace_id, role, full_name")
 .eq("clerk_user_id", userId)
 .single();

 if (!user?.workspace_id) {
 return NextResponse.json({ error: "No workspace found" }, { status: 404 });
 }

 const body = await req.json();
 const { messages } = body as { messages: ClientMessage[] };

 if (!messages || messages.length === 0) {
 return NextResponse.json({ error: "messages required" }, { status: 400 });
 }

 // Page sends role: "ai" / "user"; Anthropic uses "assistant" / "user".
 const claudeMessages: Anthropic.MessageParam[] = messages.map((m) => ({
 role: m.role === "ai" ? "assistant" : "user",
 content: m.content,
 }));

 try {
 const anthropic = getAnthropic();
 const model = getAnthropicModel();

 const first = await anthropic.messages.create({
 model,
 max_tokens: 2048,
 temperature: 0.35,
 system: SYSTEM_PROMPT,
 tools: ANTHROPIC_TOOLS,
 messages: claudeMessages,
 });

 const toolUses = first.content.filter(
 (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
 );

 if (toolUses.length > 0) {
 const toolResults: Anthropic.ToolResultBlockParam[] = [];

 for (const call of toolUses) {
 const result = await executeTool(call.name, (call.input ?? {}) as ToolInput, supabase, user);
 toolResults.push({
 type: "tool_result",
 tool_use_id: call.id,
 content: JSON.stringify(result ?? {}),
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
 } catch (err) {
 const message = err instanceof Error ? err.message : "AI request failed";
 console.error("[RevRa AI] Claude chat failed:", message);
 return NextResponse.json({ error: message }, { status: 500 });
 }
}

function extractText(res: Anthropic.Messages.Message): string {
 const text = res.content
 .filter((b): b is Anthropic.TextBlock => b.type === "text")
 .map((b) => b.text)
 .join("")
 .trim();

 return text || "I could not generate a response. Please try again.";
}

// ── Helpers shared with tool execution ───────────────────────────────────────

function normalizePipelineStage(stage: string) {
 const normalized = stage.trim().toLowerCase().replace(/[\s-]+/g, "_");
 const aliases: Record<string, string> = {
 new: "new_lead",
 new_leads: "new_lead",
 lead: "new_lead",
 leads: "new_lead",
 contacted_leads: "contacted",
 qualify: "qualified",
 qualified_leads: "qualified",
 quoted: "quote_sent",
 quote: "quote_sent",
 quotes: "quote_sent",
 quote_sent_leads: "quote_sent",
 closed_won: "won",
 converted: "won",
 conversion: "won",
 sale: "won",
 sales: "won",
 won_leads: "won",
 closed_lost: "lost",
 lost_leads: "lost",
 };

 return aliases[normalized] ?? normalized;
}

function getRequestedStages(rawStages: unknown) {
 const values = Array.isArray(rawStages) ? rawStages.map(String) : rawStages ? [String(rawStages)] : ["all"];
 const normalized = values.map(normalizePipelineStage);

 if (normalized.includes("all")) {
 return [...PIPELINE_STAGES];
 }

 const stages = normalized.filter((stage): stage is typeof PIPELINE_STAGES[number] =>
 PIPELINE_STAGES.includes(stage as typeof PIPELINE_STAGES[number])
 );

 return stages.length > 0 ? stages : [...PIPELINE_STAGES];
}

function stageLabel(stage: string) {
 const labels: Record<string, string> = {
 new_lead: "New Lead",
 contacted: "Contacted",
 qualified: "Qualified",
 quote_sent: "Quote Sent",
 won: "Won",
 lost: "Lost",
 };
 return labels[stage] ?? stage;
}

function getAssignedAgentName(assignedAgent: unknown) {
 if (Array.isArray(assignedAgent)) {
 const firstAgent = assignedAgent[0] as { full_name?: string | null } | undefined;
 return firstAgent?.full_name ?? null;
 }

 if (assignedAgent && typeof assignedAgent === "object") {
 return (assignedAgent as { full_name?: string | null }).full_name ?? null;
 }

 return null;
}

// ── Tool execution ───────────────────────────────────────────────────────────

async function executeTool(
 name: string,
 input: ToolInput,
 supabase: NonNullable<ReturnType<typeof createServiceSupabaseClient>>,
 user: { id: string; workspace_id: string; role: string; full_name: string | null }
): Promise<unknown> {
 const workspaceId = user.workspace_id;

 switch (name) {
 case "query_leads": {
 let query = supabase
 .from("leads")
 .select(`
 id, first_name, last_name, email, phone, score,
 pipeline_stage, lead_type, source, notes, tags,
 last_contacted_at, last_call_at, last_message_at,
 is_marketplace_lead, opted_out, created_at,
 assigned_agent:users!assigned_agent_id(full_name)
 `)
 .eq("workspace_id", workspaceId)
 .order("score", { ascending: false });

 if (input.lead_type) query = query.eq("lead_type", input.lead_type);
 if (input.min_score !== undefined) query = query.gte("score", input.min_score);
 if (input.max_score !== undefined) query = query.lte("score", input.max_score);
 if (input.source) query = query.ilike("source", `%${input.source}%`);
 if (input.is_marketplace_lead !== undefined) query = query.eq("is_marketplace_lead", input.is_marketplace_lead);
 if (input.assigned_to_me === true) query = query.eq("assigned_agent_id", user.id);
 if (input.opted_out !== true) query = query.eq("opted_out", false);
 if (input.search_term) {
 const term = String(input.search_term);
 query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
 }

 if (input.pipeline_stage) query = query.eq("pipeline_stage", normalizePipelineStage(String(input.pipeline_stage)));

 const limit = Math.min((input.limit as number) ?? 20, 50);
 query = query.limit(limit);

 const { data, error } = await query;
 if (error) return { error: error.message };
 return { leads: data ?? [], count: (data ?? []).length };
 }

 case "get_pipeline_summary": {
 let query = supabase
 .from("leads")
 .select("pipeline_stage, score", { count: "exact" })
 .eq("workspace_id", workspaceId)
 .eq("opted_out", false);

 if (input.assigned_to_me === true) query = query.eq("assigned_agent_id", user.id);

 const { data, error, count } = await query;
 if (error) return { error: error.message };

 const stages = [...PIPELINE_STAGES];
 const summary = stages.map((stage) => {
 const stageLeads = (data ?? []).filter((l) => l.pipeline_stage === stage);
 const avgScore = stageLeads.length > 0
 ? Math.round(stageLeads.reduce((s, l) => s + (l.score ?? 0), 0) / stageLeads.length)
 : 0;
 return {
 stage,
 count: stageLeads.length,
 avg_score: avgScore,
 };
 });

 return {
 total_leads: count ?? 0,
 stages: summary,
 };
 }

 case "get_pipeline_details": {
 const requestedStages = getRequestedStages(input.stages);
 const includeDetails = input.include_details !== false;
 const limitPerStage = Math.min((input.limit_per_stage as number) ?? 50, 100);

 let query = supabase
 .from("leads")
 .select(`
 id, first_name, last_name, email, phone, score,
 pipeline_stage, lead_type, source, notes, tags,
 last_contacted_at, last_call_at, last_message_at,
 created_at, updated_at,
 assigned_agent:users!assigned_agent_id(full_name)
 `)
 .eq("workspace_id", workspaceId)
 .eq("opted_out", false)
 .in("pipeline_stage", requestedStages)
 .order("updated_at", { ascending: false });

 if (input.assigned_to_me === true) query = query.eq("assigned_agent_id", user.id);

 const { data, error } = await query;
 if (error) return { error: error.message };

 const grouped = requestedStages.map((stage) => {
 const leads = (data ?? []).filter((lead) => lead.pipeline_stage === stage);
 return {
 stage,
 label: stageLabel(stage),
 count: leads.length,
 leads: includeDetails
 ? leads.slice(0, limitPerStage).map((lead) => ({
 id: lead.id,
 name: `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim(),
 phone: lead.phone,
 email: lead.email,
 score: lead.score,
 stage: lead.pipeline_stage,
 lead_type: lead.lead_type,
 source: lead.source,
 assigned_agent: getAssignedAgentName(lead.assigned_agent),
 last_contacted_at: lead.last_contacted_at,
 last_call_at: lead.last_call_at,
 last_message_at: lead.last_message_at,
 created_at: lead.created_at,
 updated_at: lead.updated_at,
 notes: lead.notes,
 tags: lead.tags,
 }))
 : [],
 };
 });

 return {
 total: grouped.reduce((sum, group) => sum + group.count, 0),
 stages: grouped,
 };
 }

 case "get_stalled_leads": {
 const days = (input.days_inactive as number) ?? 7;
 const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

 let query = supabase
 .from("leads")
 .select("id, first_name, last_name, phone, score, pipeline_stage, lead_type, last_contacted_at, last_call_at, last_message_at, assigned_agent:users!assigned_agent_id(full_name)")
 .eq("workspace_id", workspaceId)
 .eq("opted_out", false)
 .not("pipeline_stage", "in", "(won,lost)")
 .or(`last_contacted_at.lt.${cutoff},last_contacted_at.is.null`)
 .order("score", { ascending: false });

 if (input.assigned_to_me === true) query = query.eq("assigned_agent_id", user.id);

 const limit = Math.min((input.limit as number) ?? 20, 50);
 query = query.limit(limit);

 const { data, error } = await query;
 if (error) return { error: error.message };
 return { leads: data ?? [], count: (data ?? []).length, days_inactive: days };
 }

 case "get_hot_leads": {
 const minScore = (input.min_score as number) ?? 80;

 let query = supabase
 .from("leads")
 .select("id, first_name, last_name, phone, email, score, pipeline_stage, lead_type, source, last_contacted_at, assigned_agent:users!assigned_agent_id(full_name)")
 .eq("workspace_id", workspaceId)
 .eq("opted_out", false)
 .gte("score", minScore)
 .not("pipeline_stage", "in", "(won,lost)")
 .order("score", { ascending: false });

 if (input.lead_type) query = query.eq("lead_type", input.lead_type);
 if (input.assigned_to_me === true) query = query.eq("assigned_agent_id", user.id);

 const limit = Math.min((input.limit as number) ?? 20, 50);
 query = query.limit(limit);

 const { data, error } = await query;
 if (error) return { error: error.message };
 return { leads: data ?? [], count: (data ?? []).length, min_score: minScore };
 }

 case "get_campaign_stats": {
 let query = supabase
 .from("campaigns")
 .select("id, name, status, sent, delivered, failed, replied, opted_out, created_at")
 .eq("workspace_id", workspaceId);

 if (input.status) query = query.eq("status", input.status);

 const { data, error } = await query;
 if (error) return { error: error.message };

 const totals = (data ?? []).reduce(
 (acc, c) => ({
 total_sent: acc.total_sent + (c.sent ?? 0),
 total_delivered: acc.total_delivered + (c.delivered ?? 0),
 total_failed: acc.total_failed + (c.failed ?? 0),
 total_replied: acc.total_replied + (c.replied ?? 0),
 total_opted_out: acc.total_opted_out + (c.opted_out ?? 0),
 }),
 { total_sent: 0, total_delivered: 0, total_failed: 0, total_replied: 0, total_opted_out: 0 }
 );

 return {
 campaigns: data ?? [],
 count: (data ?? []).length,
 ...totals,
 delivery_rate: totals.total_sent > 0 ? Math.round((totals.total_delivered / totals.total_sent) * 100) : 0,
 reply_rate: totals.total_sent > 0 ? Math.round((totals.total_replied / totals.total_sent) * 100) : 0,
 };
 }

 case "get_workspace_summary": {
 const { count: totalLeads } = await supabase
 .from("leads")
 .select("*", { count: "exact", head: true })
 .eq("workspace_id", workspaceId)
 .eq("opted_out", false);

 const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
 const { count: newLeadsWeek } = await supabase
 .from("leads")
 .select("*", { count: "exact", head: true })
 .eq("workspace_id", workspaceId)
 .gte("created_at", weekAgo);

 const { count: activeCampaigns } = await supabase
 .from("campaigns")
 .select("*", { count: "exact", head: true })
 .eq("workspace_id", workspaceId)
 .eq("status", "active");

 const { data: scoreData } = await supabase
 .from("leads")
 .select("score")
 .eq("workspace_id", workspaceId)
 .eq("opted_out", false);

 const scores = (scoreData ?? []).map((l) => l.score ?? 0);
 const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

 const { data: stageData } = await supabase
 .from("leads")
 .select("pipeline_stage")
 .eq("workspace_id", workspaceId)
 .eq("opted_out", false);

 const stageCounts: Record<string, number> = {};
 (stageData ?? []).forEach((l) => {
 stageCounts[l.pipeline_stage] = (stageCounts[l.pipeline_stage] ?? 0) + 1;
 });

 return {
 total_leads: totalLeads ?? 0,
 new_leads_this_week: newLeadsWeek ?? 0,
 active_campaigns: activeCampaigns ?? 0,
 average_score: avgScore,
 stage_breakdown: stageCounts,
 };
 }

 default:
 return { error: `Unknown tool: ${name}` };
 }
}
