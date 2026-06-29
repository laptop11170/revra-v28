// app/api/sendgrid/send-single/route.ts
// POST /api/sendgrid/send-single — send a one-off email to a single lead
// without going through the bulk campaign flow. Used by the
// SingleEmailComposer modal in /user/campaigns/email and in /user/conversations.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import {
 sendEmail,
 SendGridAPIError,
 getSendGridConfig,
} from "@/lib/sendgrid/client";
import { getTemplateById, renderMergeTags } from "@/lib/sendgrid/templates";

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

 if (!user?.workspace_id) {
 return NextResponse.json({ error: "No workspace" }, { status: 404 });
 }

 // Validate SendGrid config (returns 503 if not configured)
 try {
 getSendGridConfig();
 } catch (e) {
 if (e instanceof SendGridAPIError) {
 return NextResponse.json({ error: e.message }, { status: 503 });
 }
 throw e;
 }

 const body = await req.json().catch(() => null);
 if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

 const { lead_id, subject, html_body, template_id } = body as {
 lead_id?: string;
 subject?: string;
 html_body?: string;
 template_id?: string;
 };

 if (!lead_id) {
 return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
 }

 // Resolve the final HTML body — explicit html_body wins, then template lookup.
 let finalHtml = html_body?.trim() ?? "";
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

 const finalSubject = subject?.trim() ?? "";
 if (!finalSubject) {
 return NextResponse.json({ error: "subject is required" }, { status: 400 });
 }

 // Load the lead — must belong to the workspace and have a valid email
 const { data: lead, error: leadErr } = await supabase
 .from("leads")
 .select("id, first_name, last_name, email, opted_out")
 .eq("id", lead_id)
 .eq("workspace_id", user.workspace_id)
 .single();

 if (leadErr || !lead) {
 return NextResponse.json({ error: "Lead not found" }, { status: 404 });
 }
 if (!lead.email || !lead.email.includes("@")) {
 return NextResponse.json(
 { error: "This lead has no email address on file" },
 { status: 400 }
 );
 }

 // Personalize
 const mergeVars = {
 first_name: lead.first_name ?? "",
 last_name: lead.last_name ?? "",
 agent_name: user.full_name ?? "Your RevRa Advisor",
 };
 const personalizedHtml = renderMergeTags(finalHtml, mergeVars);
 const personalizedSubject = renderMergeTags(finalSubject, mergeVars);

 // Pre-allocate a messages row so we have a stable id for tracking/webhook correlation
 const messageId = crypto.randomUUID();
 const { error: msgInsertErr } = await supabase.from("messages").insert({
 id: messageId,
 workspace_id: user.workspace_id,
 lead_id: lead.id,
 agent_id: user.id,
 channel: "email",
 direction: "outbound",
 body: finalSubject,
 media_url: null,
 external_status: "pending",
 sent_at: new Date().toISOString(),
 });
 if (msgInsertErr) {
 return NextResponse.json({ error: msgInsertErr.message }, { status: 500 });
 }

 // Send
 let result;
 try {
 result = await sendEmail({
 to: lead.email,
 subject: personalizedSubject,
 html: personalizedHtml,
 campaignId: "single",
 messageId,
 workspaceId: user.workspace_id,
 });
 } catch (err) {
 if (err instanceof SendGridAPIError) {
 await supabase
 .from("messages")
 .update({ external_status: "failed" })
 .eq("id", messageId);
 return NextResponse.json({ error: err.message }, { status: 502 });
 }
 throw err;
 }

 // Update message row with the SendGrid result
 await supabase
 .from("messages")
 .update({
 external_id: result.messageId,
 external_status: result.success ? "sent" : "failed",
 })
 .eq("id", messageId);

 if (!result.success) {
 return NextResponse.json(
 { error: result.error ?? "Send failed", message_id: messageId },
 { status: 502 }
 );
 }

 return NextResponse.json({
 success: true,
 message_id: messageId,
 sendgrid_message_id: result.messageId,
 to: lead.email,
 subject: personalizedSubject,
 });
}
