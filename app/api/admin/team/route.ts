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

  if (!user?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  // Get all workspace members with their lead counts
  const { data: members } = await supabase
    .from("users")
    .select("id, email, full_name, role, status, created_at")
    .eq("workspace_id", user.workspace_id)
    .order("created_at", { ascending: true });

  const { data: allLeads } = await supabase
    .from("leads")
    .select("assigned_agent_id")
    .eq("workspace_id", user.workspace_id);

  const leadCountMap: Record<string, number> = {};
  for (const lead of allLeads || []) {
    if (lead.assigned_agent_id) {
      leadCountMap[lead.assigned_agent_id] = (leadCountMap[lead.assigned_agent_id] || 0) + 1;
    }
  }

  const membersWithLeads = (members || []).map(member => ({
    ...member,
    leads_count: leadCountMap[member.id] || 0,
  }));

  return NextResponse.json({ members: membersWithLeads });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const { data: user } = await supabase
    .from("users")
    .select("workspace_id")
    .eq("clerk_user_id", userId)
    .single();

  if (!user?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  const body = await req.json();
  const { email, name, role } = body;

  if (!email || !name) {
    return NextResponse.json({ error: "email and name are required" }, { status: 400 });
  }

  // Check if user already exists in workspace
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("workspace_id", user.workspace_id)
    .eq("email", email)
    .single();

  if (existing) {
    return NextResponse.json({ error: "User already exists in workspace" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("users")
    .insert({
      workspace_id: user.workspace_id,
      email,
      full_name: name,
      role: role || "agent",
      status: "active",
      clerk_user_id: null, // Will be set when they sign up via Clerk
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ member: data }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const { data: user } = await supabase
    .from("users")
    .select("workspace_id")
    .eq("clerk_user_id", userId)
    .single();

  if (!user?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  const body = await req.json();
  const { member_id, role, status } = body;

  if (!member_id) {
    return NextResponse.json({ error: "member_id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (role !== undefined) updates.role = role;
  if (status !== undefined) updates.status = status;

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", member_id)
    .eq("workspace_id", user.workspace_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  return NextResponse.json({ member: data });
}