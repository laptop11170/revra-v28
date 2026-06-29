// app/api/sequences/[id]/steps/route.ts
// Add, reorder, or remove steps from a sequence

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
  .select("workspace_id")
  .eq("id", id)
  .eq("workspace_id", user.workspace_id)
  .single();

  if (!seq) return NextResponse.json({ error: "Sequence not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.steps)) {
  return NextResponse.json({ error: "steps array required" }, { status: 400 });
  }

  // Delete existing steps and insert new ones
  await supabase.from("sequence_steps").delete().eq("sequence_id", id);

  const rows = body.steps.map((s: any, i: number) => ({
  sequence_id: id,
  step_number: i + 1,
  name: s.name || `Step ${i + 1}`,
  channel: s.channel || "sms",
  body: s.body,
  delay_days: s.delay_days ?? 0,
  delay_hours: s.delay_hours ?? 0,
  }));

  const { data, error } = await supabase.from("sequence_steps").insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ steps: data });
}
