import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
 const { userId } = await auth();
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const supabase = createServiceSupabaseClient();
 if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

 const { data: user, error: userError } = await supabase
 .from("users")
 .select("workspace_id, id")
 .eq("clerk_user_id", userId)
 .maybeSingle();

 if (userError) {
 console.error("[api/home] users lookup error:", userError);
 return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
 }

 if (!user?.workspace_id) {
 // No workspace yet — return empty home data so the dashboard renders zeros
 // instead of the API breaking on a hard 404.
 const emptySpark = Array.from({ length: 7 }, (_, i) => {
 const d = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
 return { label: d.toLocaleDateString("en-US", { weekday: "short" }), value: 0 };
 });
 return NextResponse.json({
 conversations: 0,
 repliesSent: 0,
 meetingsBooked: 0,
 opportunities: 0,
 totalLeads: 0,
 hotLeads: 0,
 sparkData: emptySpark,
 deltas: {
 conversations: null,
 repliesSent: null,
 meetingsBooked: null,
 opportunities: null,
 },
 });
 }

 const now = new Date();
 const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
 const todayStartIso = todayStart.toISOString();
 const yesterdayStartIso = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000).toISOString();

 // ── Today counts (parallel) ────────────────────────────────────────────────
 const [
 { count: todayOutbound },
 { data: todayConvRows },
 { count: todayBooked },
 { count: todayOpportunities },
 { count: hotLeads },
 { count: totalLeads },
 // Yesterday baselines for delta %
 { count: yestOutbound },
 { data: yestConvRows },
 { count: yestBooked },
 { count: yestOpportunities },
 ] = await Promise.all([
 supabase
 .from("messages")
 .select("*", { count: "exact", head: true })
 .eq("workspace_id", user.workspace_id)
 .eq("direction", "outbound")
 .gte("created_at", todayStartIso),
 // Distinct leads messaged today = "conversations" today
 supabase
 .from("messages")
 .select("lead_id")
 .eq("workspace_id", user.workspace_id)
 .gte("created_at", todayStartIso),
 supabase
 .from("leads")
 .select("*", { count: "exact", head: true })
 .eq("workspace_id", user.workspace_id)
 .eq("pipeline_stage", "booked")
 .gte("updated_at", todayStartIso),
 // Opportunities = new high-score leads (score >= 70) created today
 supabase
 .from("leads")
 .select("*", { count: "exact", head: true })
 .eq("workspace_id", user.workspace_id)
 .gte("score", 70)
 .gte("created_at", todayStartIso),
 supabase
 .from("leads")
 .select("*", { count: "exact", head: true })
 .gte("score", 80)
 .eq("workspace_id", user.workspace_id),
 supabase
 .from("leads")
 .select("*", { count: "exact", head: true })
 .eq("workspace_id", user.workspace_id),
 // Yesterday baselines
 supabase
 .from("messages")
 .select("*", { count: "exact", head: true })
 .eq("workspace_id", user.workspace_id)
 .eq("direction", "outbound")
 .gte("created_at", yesterdayStartIso)
 .lt("created_at", todayStartIso),
 supabase
 .from("messages")
 .select("lead_id")
 .eq("workspace_id", user.workspace_id)
 .gte("created_at", yesterdayStartIso)
 .lt("created_at", todayStartIso),
 supabase
 .from("leads")
 .select("*", { count: "exact", head: true })
 .eq("workspace_id", user.workspace_id)
 .eq("pipeline_stage", "booked")
 .gte("updated_at", yesterdayStartIso)
 .lt("updated_at", todayStartIso),
 supabase
 .from("leads")
 .select("*", { count: "exact", head: true })
 .eq("workspace_id", user.workspace_id)
 .gte("score", 70)
 .gte("created_at", yesterdayStartIso)
 .lt("created_at", todayStartIso),
 ]);

 const conversationsToday = new Set((todayConvRows ?? []).map((r: { lead_id: string }) => r.lead_id).filter(Boolean)).size;
 const conversationsYesterday = new Set((yestConvRows ?? []).map((r: { lead_id: string }) => r.lead_id).filter(Boolean)).size;

 function pctDelta(today: number, yesterday: number): number | null {
 // No baseline yet — don't fabricate a delta.
 if (yesterday === 0 && today === 0) return null;
 if (yesterday === 0) return null;
 return Math.round(((today - yesterday) / yesterday) * 100);
 }

 const conversationsDelta = pctDelta(conversationsToday, conversationsYesterday);
 const repliesDelta = pctDelta(todayOutbound ?? 0, yestOutbound ?? 0);
 const meetingsDelta = pctDelta(todayBooked ?? 0, yestBooked ?? 0);
 const opportunitiesDelta = pctDelta(todayOpportunities ?? 0, yestOpportunities ?? 0);

 // ── 7-day sparkline (outbound messages per day) ────────────────────────────
 const sparkDays = Array.from({ length: 7 }, (_, i) => {
 const dayStart = new Date(todayStart.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
 const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
 return {
 label: dayStart.toLocaleDateString("en-US", { weekday: "short" }),
 start: dayStart.toISOString(),
 end: dayEnd.toISOString(),
 };
 });

 const sparkCounts = await Promise.all(
 sparkDays.map((d) =>
 supabase
 .from("messages")
 .select("*", { count: "exact", head: true })
 .eq("workspace_id", user.workspace_id)
 .eq("direction", "outbound")
 .gte("created_at", d.start)
 .lt("created_at", d.end)
 )
 );
 const sparkData = sparkDays.map((d, i) => ({
 label: d.label,
 value: sparkCounts[i]?.count ?? 0,
 }));

 // `repliesSent` is also outbound, so for the summary card we use the same
 // value but re-label the metric — alias to keep the existing API shape stable.
 return NextResponse.json({
 conversations: conversationsToday,
 repliesSent: todayOutbound ?? 0,
 meetingsBooked: todayBooked ?? 0,
 opportunities: todayOpportunities ?? 0,
 totalLeads: totalLeads ?? 0,
 hotLeads: hotLeads ?? 0,
 sparkData,
 deltas: {
 conversations: conversationsDelta,
 repliesSent: repliesDelta,
 meetingsBooked: meetingsDelta,
 opportunities: opportunitiesDelta,
 },
 });
}
