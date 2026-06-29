import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

// GET /api/leads/[id]/campaigns — list campaigns this lead is enrolled in
// Reads from the `campaign_leads` pivot table joined to `campaigns`.
// Ordered by enrollment date (newest first).
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
 console.error("[api/leads/campaigns GET] users lookup error:", userError);
 return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
 }
 if (!user?.workspace_id) {
 return NextResponse.json({ error: "No workspace found" }, { status: 404 });
 }

 // Verify the lead belongs to the workspace before exposing enrollments
 const { data: lead, error: leadError } = await supabase
 .from("leads")
 .select("id")
 .eq("id", leadId)
 .eq("workspace_id", user.workspace_id)
 .maybeSingle();

 if (leadError) {
 console.error("[api/leads/campaigns GET] lead lookup error:", leadError);
 return NextResponse.json({ error: "Failed to load lead" }, { status: 500 });
 }
 if (!lead) {
 return NextResponse.json({ error: "Lead not found" }, { status: 404 });
 }

 const { data, error } = await supabase
 .from("campaign_leads")
 .select(`
 id,
 status,
 sent_at,
 created_at,
 campaign:campaigns!campaign_leads_campaign_id_fkey(
 id,
 name,
 channel,
 status,
 subject,
 created_at
 )
 `)
 .eq("lead_id", leadId)
 .order("created_at", { ascending: false });

 if (error) {
 console.error("[api/leads/campaigns GET] list error:", error);
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 // Normalize: Supabase returns the joined campaign as either an object or
 // an array depending on relationship type. Force into a single object.
 const campaigns = (data ?? []).map((row) => {
 const c = Array.isArray(row.campaign) ? row.campaign[0] : row.campaign;
 return {
 enrollment_id: row.id,
 enrollment_status: row.status,
 sent_at: row.sent_at,
 enrolled_at: row.created_at,
 id: c?.id ?? null,
 name: c?.name ?? "(deleted campaign)",
 channel: c?.channel ?? null,
 status: c?.status ?? null,
 subject: c?.subject ?? null,
 };
 });

 return NextResponse.json({ campaigns });
}
