import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

// GET /api/leads/[id]/conversations — list conversation threads for a lead
// One row per (lead × channel) — i.e. one "thread" per messaging channel.
// Ordered by most recent activity.
export async function GET(
 req: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 const { userId } = await auth();
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const { id: leadId } = await params;
 const supabase = createServiceSupabaseClient();
 if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

 const { data: user, error: userError } = await supabase
 .from("users")
 .select("id, workspace_id")
 .eq("clerk_user_id", userId)
 .maybeSingle();

 if (userError) {
 console.error("[api/leads/conversations GET] users lookup error:", userError);
 return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
 }
 if (!user?.workspace_id) {
 return NextResponse.json({ error: "No workspace found" }, { status: 404 });
 }

 // Verify the lead belongs to the workspace before exposing threads
 const { data: lead, error: leadError } = await supabase
 .from("leads")
 .select("id")
 .eq("id", leadId)
 .eq("workspace_id", user.workspace_id)
 .maybeSingle();

 if (leadError) {
 console.error("[api/leads/conversations GET] lead lookup error:", leadError);
 return NextResponse.json({ error: "Failed to load lead" }, { status: 500 });
 }
 if (!lead) {
 return NextResponse.json({ error: "Lead not found" }, { status: 404 });
 }

 const { data, error } = await supabase
 .from("conversations")
 .select("id, channel, last_message, last_message_at, unread_count, created_at, updated_at")
 .eq("lead_id", leadId)
 .eq("workspace_id", user.workspace_id)
 .order("last_message_at", { ascending: false });

 if (error) {
 console.error("[api/leads/conversations GET] list error:", error);
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 return NextResponse.json({ conversations: data ?? [] });
}
