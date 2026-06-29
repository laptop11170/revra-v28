// app/api/ai/re-engage/route.ts
// AI suggests which cold leads to re-contact based on inactivity

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

function getAnthropic() {
  if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const { data: user } = await supabase
  .from("users")
  .select("workspace_id, role")
  .eq("clerk_user_id", userId)
  .single();

  if (!user?.workspace_id) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const daysInactive = parseInt(searchParams.get("days") || "14");
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 25);

  const cutoff = new Date(Date.now() - daysInactive * 24 * 60 * 60 * 1000).toISOString();

  // Find cold leads: no contact in N days, not converted/lost/dnc
  const { data: leads } = await supabase
  .from("leads")
  .select("id, first_name, last_name, phone, email, lead_type, pipeline_stage, score, source, last_contacted_at, last_message_at, last_call_at, notes")
  .eq("workspace_id", user.workspace_id)
  .not("pipeline_stage", "in", "('converted','lost','dnc')")
  .or(`last_contacted_at.lt.${cutoff},last_contacted_at.is.null`)
  .eq("opted_out", false)
  .order("score", { ascending: false })
  .limit(limit * 2);

  if (!leads || leads.length === 0) {
  return NextResponse.json({ suggestions: [], count: 0 });
  }

  // Get recent messages for context
  const leadIds = leads.map((l) => l.id);
  const { data: recentMessages } = await supabase
  .from("messages")
  .select("lead_id, body, direction, created_at")
  .in("lead_id", leadIds)
  .order("created_at", { ascending: false })
  .limit(leadIds.length * 3);

  const messagesByLead = new Map<string, { body: string; direction: string }[]>();
  for (const m of recentMessages || []) {
  if (!messagesByLead.has(m.lead_id)) messagesByLead.set(m.lead_id, []);
  messagesByLead.get(m.lead_id)!.push({ body: m.body, direction: m.direction });
  }

  // Build prompt
  const leadsContext = leads.slice(0, limit).map((l) => {
  const msgs = messagesByLead.get(l.id) || [];
  return {
  id: l.id,
  name: `${l.first_name || ""} ${l.last_name || ""}`.trim() || "Unknown",
  type: l.lead_type || "unknown",
  stage: l.pipeline_stage,
  score: l.score,
  source: l.source,
  lastContacted: l.last_contacted_at,
  recentMessages: msgs.map((m) => `${m.direction}: ${m.body}`).join("\n"),
  };
  });

  // Call Claude for suggestions
  let suggestions: Array<{
  lead_id: string;
  name: string;
  reason: string;
  message_suggestion: string;
  priority: "high" | "medium" | "low";
  }> = [];

  try {
  const systemPrompt = `You are a senior insurance sales strategist. Analyze cold leads and suggest which to re-engage with, why, and what message to send. Return ONLY valid JSON in this exact format:
[
  {
  "lead_id": "...",
  "name": "...",
  "reason": "Brief reason for re-engagement",
  "message_suggestion": "A personalized SMS message to send (under 160 chars)",
  "priority": "high|medium|low"
  }
]
Be specific, concise, and actionable.`;

  const userPrompt = `Here are ${leadsContext.length} cold leads (no contact in ${daysInactive}+ days). Analyze and rank by priority. Provide a re-engagement SMS for each.

Leads:
${JSON.stringify(leadsContext, null, 2)}`;

  const response = await getAnthropic().messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 4096,
  system: systemPrompt,
  messages: [{ role: "user", content: userPrompt }],
  });

  const content = response.content[0];
  if (content.type === "text") {
  const text = content.text;
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
  suggestions = JSON.parse(jsonMatch[0]);
  }
  }
  } catch (err: unknown) {
  const e = err as { message?: string };
  console.error("[AIReEngage] Claude call failed:", e.message);
  // Fallback: return leads without AI suggestions
  suggestions = leadsContext.map((l) => ({
  lead_id: l.id,
  name: l.name,
  reason: `${daysInactive}+ days since last contact. Stage: ${l.stage}. Score: ${l.score}.`,
  message_suggestion: `Hi ${l.name.split(" ")[0]}, following up on your ${l.type} inquiry. Ready to chat?`,
  priority: (l.score >= 70 ? "high" : l.score >= 40 ? "medium" : "low") as "high" | "medium" | "low",
  }));
  }

  return NextResponse.json({ suggestions, count: suggestions.length });
}
