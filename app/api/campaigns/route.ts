// app/api/campaigns/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

// GET /api/campaigns — list campaigns for this workspace
// POST /api/campaigns — create a new campaign

export async function GET(req: NextRequest) {
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

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  let query = supabase
    .from("campaigns")
    .select("*", { count: "exact" })
    .eq("workspace_id", user.workspace_id)
    .eq("channel", "sms")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq("status", status);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ campaigns: data, total: count ?? 0 });
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

  const {
    name,
    sender_phone_id,
    message_body,
    positive_keywords,
    optout_keywords,
    lead_ids,
    schedule_at,
    send_count,
  } = body;

  if (!name || !sender_phone_id || !message_body) {
    return NextResponse.json(
      { error: "name, sender_phone_id, and message_body are required" },
      { status: 400 }
    );
  }

  // Validate sender_phone_id belongs to this workspace
  const { data: phoneRecord } = await supabase
    .from("sendillo_phone_numbers")
    .select("id, phone_number, is_active")
    .eq("id", sender_phone_id)
    .eq("workspace_id", user.workspace_id)
    .single();

  if (!phoneRecord) {
    return NextResponse.json({ error: "Invalid sender phone" }, { status: 400 });
  }

  // Resolve lead_ids — validate and filter opted-out
  let validLeadIds: string[] = [];
  if (lead_ids && Array.isArray(lead_ids) && lead_ids.length > 0) {
    const { data: leads } = await supabase
      .from("leads")
      .select("id")
      .in("id", lead_ids)
      .eq("workspace_id", user.workspace_id)
      .eq("opted_out", false);

    validLeadIds = (leads ?? []).map((l) => l.id);
  }

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      workspace_id: user.workspace_id,
      name,
      channel: "sms",
      status: schedule_at ? "scheduled" : "draft",
      sender_phone_id,
      message_body,
      positive_keywords: positive_keywords ?? [],
      optout_keywords: optout_keywords ?? ["STOP", "UNSUBSCRIBE", "CANCEL"],
      leads: validLeadIds.length,
      created_by: user.id,
      start_date: schedule_at || null,
      send_count: send_count ?? 1,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enroll selected leads in the campaign_leads pivot table
  if (validLeadIds.length > 0) {
    const enrollRows = validLeadIds.map((leadId) => ({
      campaign_id: campaign.id,
      lead_id: leadId,
      status: "pending" as const,
    }));
    const { error: enrollErr } = await supabase
      .from("campaign_leads")
      .insert(enrollRows);
    if (enrollErr) {
      console.error("[SMSCampaign] campaign_leads insert failed:", enrollErr);
      return NextResponse.json({ error: enrollErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ campaign }, { status: 201 });
}
