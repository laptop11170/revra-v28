// app/api/campaigns/email/route.ts
// GET /api/campaigns/email — list email campaigns
// POST /api/campaigns/email — create an email campaign

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { getSendGridConfig } from "@/lib/sendgrid/client";
import { getTemplateById, renderMergeTags } from "@/lib/sendgrid/templates";

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
 .eq("channel", "email")
 .order("created_at", { ascending: false })
 .range(offset, offset + limit - 1);

 if (status) query = query.eq("status", status);

 const { data, count, error } = await query;
 if (error) return NextResponse.json({ error: error.message }, { status: 500 });

 return NextResponse.json({ campaigns: data ?? [], total: count ?? 0 });
}

export async function POST(req: NextRequest) {
 const { userId } = await auth();
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const supabase = createServiceSupabaseClient();
 if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

 const { data: user } = await supabase
 .from("users")
 .select("id, workspace_id, full_name")
 .eq("clerk_user_id", userId)
 .single();

 if (!user?.workspace_id) return NextResponse.json({ error: "No workspace" }, { status: 404 });

 // Validate SendGrid config
 let sendgridCfg;
 try {
 sendgridCfg = getSendGridConfig();
 } catch {
 return NextResponse.json(
 { error: "SendGrid is not configured. Contact your superadmin." },
 { status: 503 }
 );
 }

 const body = await req.json().catch(() => null);
 if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

 const { name, subject, template_id, html_body, lead_ids, schedule_at } = body;

 if (!name || !subject) {
 return NextResponse.json(
 { error: "name and subject are required" },
 { status: 400 }
 );
 }

 // Choose body: custom or template
 let finalHtml = html_body ?? "";
 if (!finalHtml && template_id) {
 const tpl = getTemplateById(template_id);
 if (tpl) finalHtml = tpl.html;
 }
 if (!finalHtml) {
 return NextResponse.json(
 { error: "Either template_id or html_body is required" },
 { status: 400 }
 );
 }

 // Resolve and filter leads with email
 let validLeadIds: string[] = [];
 if (lead_ids && Array.isArray(lead_ids) && lead_ids.length > 0) {
 const { data: leads } = await supabase
 .from("leads")
 .select("id, email")
 .in("id", lead_ids)
 .eq("workspace_id", user.workspace_id)
 .eq("opted_out", false)
 .not("email", "is", null)
 .ilike("email", "%@%");

 validLeadIds = (leads ?? []).map((l) => l.id);
 }

 // Insert campaign
 const { data: campaign, error: insertErr } = await supabase
 .from("campaigns")
 .insert({
 workspace_id: user.workspace_id,
 name,
 channel: "email",
 status: schedule_at ? "scheduled" : "draft",
 subject,
 template_id: template_id ?? null,
 html_body: finalHtml,
 leads: validLeadIds.length,
 created_by: user.id,
 start_date: schedule_at || null,
 })
 .select()
 .single();

 if (insertErr) {
 console.error("[EmailCampaign] insert failed:", insertErr);
 return NextResponse.json({ error: insertErr.message }, { status: 500 });
 }

 // Enroll selected leads in the campaign_leads pivot table.
 // The send endpoint reads from this table — without these rows, send would fall back to "all leads".
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
 console.error("[EmailCampaign] campaign_leads insert failed:", enrollErr);
 return NextResponse.json({ error: enrollErr.message }, { status: 500 });
 }
 }

 return NextResponse.json({ campaign }, { status: 201 });
}