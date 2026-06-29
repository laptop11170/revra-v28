// app/api/sendillo/messages/route.ts
// GET /api/sendillo/messages?phone_number=%2B1555…&limit=200
// Returns the SMS log (outbound + inbound) for a single Sendillo sender number
// in the current user's workspace.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

// Columns added in migration 018_sendillo_delivery_status.sql.
// We probe for them so the endpoint still works if the migration hasn't been
// applied yet — in that case we just don't return the new fields.
const EXTRA_COLS = "external_error, external_status_detail, provider_message_id";
const BASE_COLS =
 "id, lead_id, channel, direction, body, external_id, external_status, sent_at, created_at, campaign_id, agent_id";

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
 return NextResponse.json({ error: "No workspace" }, { status: 404 });
 }

 const { searchParams } = new URL(req.url);
 const phoneNumber = searchParams.get("phone_number");
 const limit = Math.min(parseInt(searchParams.get("limit") || "200"), 500);

 if (!phoneNumber) {
 return NextResponse.json({ error: "phone_number is required" }, { status: 400 });
 }

 // Outbound SMS rows store the Sendillo sender number in external_id
 // (see app/api/campaigns/[id]/send/route.ts). Inbound replies have
 // external_id = the lead's phone (from the inbound webhook handler),
 // so we also match messages where the lead's phone equals this number
 // for inbound rows in the same workspace.
 const normalized = phoneNumber.replace(/[^\d+]/g, "");
 const tail = normalized.replace(/^\+/, "").slice(-10);

 // Try the full query first (with the new columns). If the migration hasn't
 // been applied, fall back to the base columns so the page still works.
 const fullSelect = `${BASE_COLS}, ${EXTRA_COLS}, lead:leads(id, first_name, last_name, phone)`;
 const baseSelect = `${BASE_COLS}, lead:leads(id, first_name, last_name, phone)`;

 let data: any[] | null = null;
 let error: { message: string } | null = null;

 const { data: d1, error: e1 } = await supabase
 .from("messages")
 .select(fullSelect)
 .eq("workspace_id", user.workspace_id)
 .eq("channel", "sms")
 .order("created_at", { ascending: false })
 .limit(limit);

 if (e1 && /column .* does not exist|relation .* does not exist/i.test(e1.message)) {
 // Migration not yet applied — fall back to base columns
 const { data: d2, error: e2 } = await supabase
 .from("messages")
 .select(baseSelect)
 .eq("workspace_id", user.workspace_id)
 .eq("channel", "sms")
 .order("created_at", { ascending: false })
 .limit(limit);
 data = d2 as any[] | null;
 error = e2;
 } else {
 data = d1 as any[] | null;
 error = e1;
 }

 if (error) return NextResponse.json({ error: error.message }, { status: 500 });

 // Filter in memory: outbound = external_id matches the sender number;
 // inbound = the lead's phone matches (so replies via this number show up).
 const matches = (data ?? []).filter((m: any) => {
 const lead = Array.isArray(m.lead) ? m.lead[0] : m.lead;
 const leadPhone = (lead?.phone ?? "").replace(/[^\d+]/g, "").replace(/^\+/, "").slice(-10);

 if (m.direction === "outbound") {
 const eid = (m.external_id ?? "").replace(/[^\d+]/g, "").replace(/^\+/, "").slice(-10);
 return eid && eid === tail;
 }
 // inbound
 return leadPhone && leadPhone === tail;
 });

 return NextResponse.json({ messages: matches, total: matches.length });
}