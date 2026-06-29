// app/api/campaigns/email/[id]/stats/route.ts
// GET /api/campaigns/email/[id]/stats — detailed stats for an email campaign

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

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
 .eq("channel", "email")
 .single();

 if (error || !campaign) {
 return NextResponse.json({ error: "Email campaign not found" }, { status: 404 });
 }

 const sent = campaign.sent ?? 0;
 const delivered = campaign.delivered ?? 0;
 const opened = campaign.opened ?? 0;
 const clicked = campaign.clicked ?? 0;
 const bounced = campaign.bounced ?? 0;
 const failed = campaign.failed ?? 0;

 // Pull recent email events (audit log)
 const { data: events } = await supabase
 .from("email_events")
 .select("id, event_type, email, created_at, message_id")
 .eq("campaign_id", id)
 .order("created_at", { ascending: false })
 .limit(50);

 // Pull per-recipient message states (for a future table view)
 const { data: recentMessages } = await supabase
 .from("messages")
 .select("id, lead_id, external_status, email_opened_at, email_clicked_at, email_bounced_at, sent_at")
 .eq("campaign_id", id)
 .order("sent_at", { ascending: false })
 .limit(100);

 return NextResponse.json({
 ...campaign,
 delivery_rate: sent > 0 ? Math.round((delivered / sent) * 100) : 0,
 open_rate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
 click_rate: sent > 0 ? Math.round((clicked / sent) * 100) : 0,
 bounce_rate: sent > 0 ? Math.round((bounced / sent) * 100) : 0,
 recent_events: events ?? [],
 recent_messages: recentMessages ?? [],
 });
}
