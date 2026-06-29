// app/api/campaigns/[id]/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

// GET /api/campaigns/[id]/stats — detailed stats for a campaign

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
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", user.workspace_id)
    .single();

  if (error || !campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const sent = campaign.sent ?? 0;
  const deliveryRate = sent > 0 ? Math.round(((campaign.delivered ?? 0) / sent) * 100) : 0;
  const optoutRate = sent > 0 ? Math.round(((campaign.opted_out ?? 0) / sent) * 100) : 0;
  const emmaRouteRate = (campaign.replied ?? 0) > 0
    ? Math.round(((campaign.emma_synced ?? 0) / (campaign.replied ?? 0)) * 100)
    : 0;

  // Fetch recent messages for this campaign
  const { data: recentMessages } = await supabase
    .from("messages")
    .select("id, lead_id, external_status, created_at")
    .eq("campaign_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  return NextResponse.json({
    ...campaign,
    delivery_rate: deliveryRate,
    optout_rate: optoutRate,
    emma_route_rate: emmaRouteRate,
    recent_messages: recentMessages ?? [],
  });
}
