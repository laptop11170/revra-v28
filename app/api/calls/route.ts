// app/api/calls/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const { data: user } = await supabase
  .from("users")
  .select("workspace_id")
  .eq("clerk_user_id", userId)
  .single();

  if (!user?.workspace_id) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get("lead_id") || undefined;
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  let query = supabase
  .from("calls")
  .select(`
  *,
  lead:leads!calls_lead_id_fkey(id, first_name, last_name, phone)
  `, { count: "exact" })
  .eq("workspace_id", user.workspace_id)
  .order("created_at", { ascending: false })
  .range(offset, offset + limit - 1);

  if (leadId) query = query.eq("lead_id", leadId);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const allCalls = data || [];
  const totalCalls = count ?? allCalls.length;

  const contactedCount = allCalls.filter(
  (c) => c.duration_seconds && c.duration_seconds > 10
  ).length;
  const noAnswerCount = allCalls.filter(
  (c) => c.status === "no_answer" || c.status === "busy"
  ).length;
  const failedCount = allCalls.filter((c) => c.status === "failed").length;

  const callsWithLeadName = allCalls.map((call) => ({
  ...call,
  lead_name: call.lead
  ? `${call.lead.first_name || ""} ${call.lead.last_name || ""}`.trim()
  : null,
  }));

  return NextResponse.json({
  calls: callsWithLeadName,
  total: totalCalls,
  stats: {
  total: totalCalls,
  contacted: contactedCount,
  no_answer: noAnswerCount,
  failed: failedCount,
  },
  });
}
