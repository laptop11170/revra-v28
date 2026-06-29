// app/api/campaigns/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

// GET /api/campaigns/[id] — get campaign details
// PATCH /api/campaigns/[id] — update campaign (name, status, keywords)
// DELETE /api/campaigns/[id] — delete campaign

async function getCampaignForWorkspace(
  supabase: NonNullable<ReturnType<typeof createServiceSupabaseClient>>,
  campaignId: string,
  workspaceId: string
) {
  return supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("workspace_id", workspaceId)
    .single();
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const { data: campaign, error } = await getCampaignForWorkspace(supabase, id, user.workspace_id);

  if (error || !campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  return NextResponse.json({ campaign });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const { data: existing } = await getCampaignForWorkspace(supabase, id, user.workspace_id);

  if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const allowedFields = [
    "name", "status", "positive_keywords", "optout_keywords",
    "sender_phone_id", "message_body", "start_date",
  ];
  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) updateData[field] = body[field];
  }

  // Only allow keyword edits on draft campaigns
  if (existing.status !== "draft" && (body.positive_keywords || body.optout_keywords)) {
    return NextResponse.json(
      { error: "Keywords can only be edited on draft campaigns" },
      { status: 400 }
    );
  }

  // Validate status transitions
  const validTransitions: Record<string, string[]> = {
    draft: ["active", "scheduled"],
    scheduled: ["active", "paused", "draft"],
    active: ["paused", "completed"],
    paused: ["active", "completed"],
    completed: [],
  };

  if (body.status && !validTransitions[existing.status]?.includes(body.status)) {
    return NextResponse.json(
      { error: `Cannot transition from ${existing.status} to ${body.status}` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("campaigns")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ campaign: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
  if (user.role === "agent") return NextResponse.json({ error: "Agents cannot delete campaigns" }, { status: 403 });

  const { id } = await params;
  const { data: existing } = await getCampaignForWorkspace(supabase, id, user.workspace_id);

  if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (existing.status === "active") {
    return NextResponse.json({ error: "Cannot delete an active campaign" }, { status: 400 });
  }

  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
