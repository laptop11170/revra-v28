// app/api/campaigns/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

// GET /api/campaigns/stats — aggregate stats across all workspace campaigns

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

  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("id, sent, delivered, failed, replied, opted_out, emma_synced, status")
    .eq("workspace_id", user.workspace_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const totals = (campaigns ?? []).reduce(
    (acc, c) => ({
      total_campaigns: acc.total_campaigns + 1,
      total_sent: acc.total_sent + (c.sent ?? 0),
      total_delivered: acc.total_delivered + (c.delivered ?? 0),
      total_failed: acc.total_failed + (c.failed ?? 0),
      total_replied: acc.total_replied + (c.replied ?? 0),
      total_opted_out: acc.total_opted_out + (c.opted_out ?? 0),
      total_emma_synced: acc.total_emma_synced + (c.emma_synced ?? 0),
      active_campaigns: acc.active_campaigns + (c.status === "active" ? 1 : 0),
    }),
    {
      total_campaigns: 0,
      total_sent: 0,
      total_delivered: 0,
      total_failed: 0,
      total_replied: 0,
      total_opted_out: 0,
      total_emma_synced: 0,
      active_campaigns: 0,
    }
  );

  return NextResponse.json({
    ...totals,
    delivery_rate: totals.total_sent > 0
      ? Math.round((totals.total_delivered / totals.total_sent) * 100)
      : 0,
  });
}
