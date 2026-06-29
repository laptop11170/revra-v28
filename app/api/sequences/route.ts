// app/api/sequences/route.ts
// List and create SMS sequences

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
  const status = searchParams.get("status") || undefined;

  let query = supabase
  .from("sequences")
  .select("*, steps:sequence_steps(*), enrollments:sequence_enrollments(count)")
  .eq("workspace_id", user.workspace_id)
  .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ sequences: data ?? [] });
}

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

  const { name, description, trigger_type, trigger_config, sender_phone_id, steps } = body;

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!steps || !Array.isArray(steps) || steps.length === 0) {
  return NextResponse.json({ error: "At least one step is required" }, { status: 400 });
  }

  // Create sequence
  const { data: sequence, error: seqErr } = await supabase
  .from("sequences")
  .insert({
  workspace_id: user.workspace_id,
  name,
  description: description || null,
  trigger_type: trigger_type || "manual",
  trigger_config: trigger_config || {},
  sender_phone_id: sender_phone_id || null,
  created_by: user.id,
  })
  .select()
  .single();

  if (seqErr || !sequence) {
  return NextResponse.json({ error: seqErr?.message || "Failed to create sequence" }, { status: 500 });
  }

  // Insert steps
  const stepRows = steps.map((s: any, i: number) => ({
  sequence_id: sequence.id,
  step_number: i + 1,
  name: s.name || `Step ${i + 1}`,
  channel: s.channel || "sms",
  body: s.body,
  delay_days: s.delay_days ?? 1,
  delay_hours: s.delay_hours ?? 0,
  }));

  const { error: stepErr } = await supabase.from("sequence_steps").insert(stepRows);
  if (stepErr) {
  await supabase.from("sequences").delete().eq("id", sequence.id);
  return NextResponse.json({ error: stepErr.message }, { status: 500 });
  }

  return NextResponse.json({ sequence }, { status: 201 });
}
