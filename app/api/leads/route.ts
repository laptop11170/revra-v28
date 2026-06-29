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
  .select("id, workspace_id, role")
  .eq("clerk_user_id", userId)
  .single();

  if (!user?.workspace_id) {
  return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const stage = searchParams.get("stage") || undefined;
  const agentId = searchParams.get("agent_id") || undefined;
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  let query = supabase
  .from("leads")
  .select("*", { count: "exact" })
  .eq("workspace_id", user.workspace_id)
  .order("score", { ascending: false })
  .range(offset, offset + limit - 1);

  if (stage) query = query.eq("pipeline_stage", stage);
  if (user.role === "agent") {
  // Agents see all leads in workspace (not just their own) so they can work any lead
  } else if (agentId) {
  query = query.eq("assigned_agent_id", agentId);
  }

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ leads: data, total: count });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const { data: user } = await supabase
  .from("users")
  .select("workspace_id, role")
  .eq("clerk_user_id", userId)
  .single();

  if (!user?.workspace_id) {
  return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  if (user.role === "agent") {
  // Agents can create leads — assigned to themselves, not flagged as admin leads
  }

  const body = await req.json();
  const {
    first_name, last_name, phone, email,
    lead_type, source, assigned_agent_id,
    is_admin_lead, is_marketplace_lead,
    ignore_duplicates = false,
  } = body;

  if (!first_name || !phone) {
    return NextResponse.json({ error: "first_name and phone are required" }, { status: 400 });
  }

  const { data: agentUser } = await supabase
    .from("users")
    .select("id, role")
    .eq("clerk_user_id", userId)
    .single();

  // Normalize phone for duplicate check
  const normalizedPhone = phone.replace(/\D/g, "");

  if (!ignore_duplicates) {
    const { data: duplicateLead } = await supabase
      .from("leads")
      .select("id, first_name, last_name")
      .eq("workspace_id", user.workspace_id)
      .eq("phone_normalized", normalizedPhone)
      .maybeSingle();

    if (duplicateLead) {
      return NextResponse.json({
        error: "Duplicate detected",
        message: `A lead with this phone number already exists: ${duplicateLead.first_name} ${duplicateLead.last_name}`,
        lead: duplicateLead,
      }, { status: 409 });
    }
  }

  // Mark as admin lead only if an admin (not agent) is creating it on behalf of someone else
  const isCreatedByAdmin = agentUser?.role === "admin" || agentUser?.role === "superadmin";
  const wasAssignedToOther = assigned_agent_id && assigned_agent_id !== agentUser?.id;

  const { data, error } = await supabase
    .from("leads")
    .insert({
      workspace_id: user.workspace_id,
      first_name,
      last_name: last_name || null,
      phone,
      email: email || null,
      lead_type: lead_type || null,
      source: source || null,
      assigned_agent_id: assigned_agent_id || agentUser?.id || null,
      pipeline_stage: "new_lead",
      score: 0,
      tags: [],
      previous_stages: [],
      is_admin_lead: isCreatedByAdmin && wasAssignedToOther,
      is_marketplace_lead: is_marketplace_lead || false,
      created_by: agentUser?.id || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log initial pipeline move
  await supabase
    .from("pipeline_moves")
    .insert({
      lead_id: data.id,
      from_stage: null,
      to_stage: "new_lead",
      moved_by: agentUser?.id || null,
      note: "Lead created manually",
    });

  return NextResponse.json({ lead: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const { data: user } = await supabase
  .from("users")
  .select("id, workspace_id, role")
  .eq("clerk_user_id", userId)
  .single();

  if (!user?.workspace_id) {
  return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  // Verify lead belongs to this workspace
  const { data: existingLead } = await supabase
  .from("leads")
  .select("id, pipeline_stage, workspace_id")
  .eq("id", id)
  .single();

  if (!existingLead || existingLead.workspace_id !== user.workspace_id) {
  return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // Track stage change for audit log
  const stageChanged = updates.pipeline_stage && existingLead.pipeline_stage !== updates.pipeline_stage;

  // Add previous stage to history if moving
  if (stageChanged) {
  const prevStages = [existingLead.pipeline_stage];
  updates.previous_stages = [...prevStages];
  }

  const { data, error } = await supabase
  .from("leads")
  .update(updates)
  .eq("id", id)
  .select()
  .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ lead: data });
}
