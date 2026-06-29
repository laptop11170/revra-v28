// app/api/sequences/[id]/enroll/route.ts
// Enroll leads into a sequence

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const { data: user } = await supabase.from("users").select("workspace_id").eq("clerk_user_id", userId).single();
  if (!user?.workspace_id) return NextResponse.json({ error: "No workspace" }, { status: 404 });

  const { id } = await params;

  const { data: seq } = await supabase
  .from("sequences")
  .select("id, status, workspace_id")
  .eq("id", id)
  .eq("workspace_id", user.workspace_id)
  .single();

  if (!seq) return NextResponse.json({ error: "Sequence not found" }, { status: 404 });
  if (seq.status !== "active") return NextResponse.json({ error: "Sequence must be active to enroll leads" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.lead_ids) || body.lead_ids.length === 0) {
  return NextResponse.json({ error: "lead_ids array required" }, { status: 400 });
  }

  // Validate leads belong to workspace and are not opted out
  const { data: validLeads } = await supabase
  .from("leads")
  .select("id")
  .in("id", body.lead_ids)
  .eq("workspace_id", user.workspace_id)
  .eq("opted_out", false);

  const validIds = (validLeads ?? []).map((l) => l.id);
  if (validIds.length === 0) return NextResponse.json({ error: "No valid leads to enroll" }, { status: 400 });

  // Fetch first step
  const { data: firstStep } = await supabase
  .from("sequence_steps")
  .select("delay_days, delay_hours")
  .eq("sequence_id", id)
  .eq("step_number", 1)
  .single();

  const delayMs = ((firstStep?.delay_days ?? 0) * 24 + (firstStep?.delay_hours ?? 0)) * 3600000;
  const nextSendAt = new Date(Date.now() + delayMs).toISOString();

  const enrollments = validIds.map((leadId) => ({
  sequence_id: id,
  lead_id: leadId,
  current_step: 0,
  status: "active" as string,
  next_send_at: nextSendAt,
  }));

  const { data, error } = await supabase.from("sequence_enrollments").insert(enrollments).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ enrolled: data.length, lead_ids: validIds });
}
