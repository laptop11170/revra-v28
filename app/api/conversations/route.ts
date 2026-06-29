// app/api/conversations/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

// GET /api/conversations — list conversations for this workspace
// Enriched with lead info, latest message preview, and unread count
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const { data: user } = await supabase
  .from("users")
  .select("id, workspace_id, role")
  .eq("clerk_user_id", userId)
  .single();

  if (!user?.workspace_id) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const tab = searchParams.get("tab") || "all";

  // Base query: conversations + lead info
  let query = supabase
  .from("conversations")
  .select(`
  id,
  channel,
  last_message,
  last_message_at,
  unread_count,
  created_at,
  lead:leads (id, first_name, last_name, phone, email, score, pipeline_stage, lead_type, source, opted_out)
  `)
  .eq("workspace_id", user.workspace_id)
  .order("last_message_at", { ascending: false })
  .limit(limit);

  // Tab filters
  if (tab === "unread") {
  query = query.gt("unread_count", 0);
  }
  if (tab === "sms") {
  query = query.eq("channel", "sms");
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const conversations = (data || []).map((row) => {
  const lead = Array.isArray(row.lead) ? row.lead[0] : row.lead;
  return {
  id: row.id,
  channel: row.channel,
  last_message: row.last_message,
  last_message_at: row.last_message_at,
  unread_count: row.unread_count ?? 0,
  created_at: row.created_at,
  lead: lead
  ? {
  id: lead.id,
  first_name: lead.first_name,
  last_name: lead.last_name,
  phone: lead.phone,
  email: lead.email,
  score: lead.score,
  pipeline_stage: lead.pipeline_stage,
  lead_type: lead.lead_type,
  source: lead.source,
  opted_out: lead.opted_out,
  }
  : null,
  };
  });

  return NextResponse.json({ conversations });
}

// POST /api/conversations — create a conversation for a lead
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const { data: user } = await supabase
  .from("users")
  .select("id, workspace_id")
  .eq("clerk_user_id", userId)
  .single();

  if (!user?.workspace_id) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { lead_id, channel = "sms" } = body;
  if (!lead_id) return NextResponse.json({ error: "lead_id is required" }, { status: 400 });

  // Check lead exists and belongs to workspace
  const { data: lead } = await supabase
  .from("leads")
  .select("id")
  .eq("id", lead_id)
  .eq("workspace_id", user.workspace_id)
  .single();

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Check if conversation already exists
  const { data: existing } = await supabase
  .from("conversations")
  .select("id")
  .eq("workspace_id", user.workspace_id)
  .eq("lead_id", lead_id)
  .eq("channel", channel)
  .maybeSingle();

  if (existing) return NextResponse.json({ conversation_id: existing.id }, { status: 200 });

  const { data: conv, error } = await supabase
  .from("conversations")
  .insert({
  workspace_id: user.workspace_id,
  lead_id,
  channel,
  })
  .select()
  .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ conversation_id: conv.id }, { status: 201 });
}
