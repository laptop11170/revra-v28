// app/api/campaigns/[id]/send/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { sendBulkSMS, SendilloAPIError } from "@/lib/sendillo/client";

// POST /api/campaigns/[id]/send — execute a campaign send

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  // Fetch campaign
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", user.workspace_id)
    .single();

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  // Email campaigns use a separate SendGrid-based endpoint.
  if (campaign.channel === "email") {
    return NextResponse.json(
      { error: "Use /api/campaigns/email/[id]/send for email campaigns", hint: `/api/campaigns/email/${id}/send` },
      { status: 400 }
    );
  }

  if (campaign.status !== "draft" && campaign.status !== "scheduled") {
    return NextResponse.json({ error: "Campaign must be draft or scheduled to send" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const { lead_ids } = body ?? {};

  // Fetch enrolled leads
  const { data: enrolled, error: lErr } = await supabase
    .from("campaign_leads")
    .select(`
      lead:leads!inner ( id, phone, first_name, last_name, opted_out )
    `)
    .eq("campaign_id", id);

  if (lErr) return NextResponse.json({ error: lErr.message }, { status: 500 });

  type LeadRow = { id: string; phone: string | null; first_name: string | null; last_name: string | null; opted_out: boolean };
  const leads: LeadRow[] = (enrolled ?? [])
    .map((row: any) => row.lead as LeadRow | null)
    .filter((l): l is LeadRow => !!l && !l.opted_out && !!l.phone);

  if (leads.length === 0) {
    return NextResponse.json({ error: "No valid leads enrolled in this campaign" }, { status: 400 });
  }

  // Get sender number
  const { data: senderPhone } = await supabase
    .from("sendillo_phone_numbers")
    .select("phone_number")
    .eq("id", campaign.sender_phone_id)
    .eq("is_active", true)
    .single();

  if (!senderPhone) {
    return NextResponse.json({ error: "Sender phone not found or inactive" }, { status: 400 });
  }

  const sendCount = campaign.send_count && campaign.send_count > 1 ? campaign.send_count : 1;

  // Build bulk message list & message rows
  const messages: Array<{ from: string; to: string; body: string; clientRef: string }> = [];
  const messageRows: Array<any> = [];

  for (const lead of leads) {
    for (let c = 0; c < sendCount; c++) {
      const msgId = crypto.randomUUID();
      messages.push({
        from: senderPhone.phone_number,
        to: lead.phone!,
        body: campaign.message_body ?? "",
        clientRef: msgId,
      });

      messageRows.push({
        id: msgId,
        workspace_id: user.workspace_id,
        lead_id: lead.id,
        agent_id: campaign.created_by ?? null,
        campaign_id: campaign.id,
        channel: "sms",
        direction: "outbound",
        body: campaign.message_body ?? "",
        external_id: senderPhone.phone_number,
        external_status: "pending",
        sent_at: new Date().toISOString(),
      });
    }
  }

  // Send via Sendillo
  let sendilloResult: { total: number; successful: number; failed: number; results?: Array<{ clientRef: string; success: boolean; error?: string }> } | null = null;

  try {
    sendilloResult = await sendBulkSMS(messages);
  } catch (err) {
    if (err instanceof SendilloAPIError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    throw err;
  }

  // Insert outbound messages into DB
  if (messageRows.length > 0) {
    await supabase.from("messages").insert(messageRows);
  }

  // Update per-message status from Sendillo results (matched by clientRef = msgId)
  if (sendilloResult?.results) {
    for (const result of sendilloResult.results) {
      if (result.success) {
        await supabase
          .from("messages")
          .update({ external_status: "pending" })
          .eq("id", result.clientRef);
      } else {
        await supabase
          .from("messages")
          .update({ external_status: "failed" })
          .eq("id", result.clientRef);
      }
    }
  }

  // Update campaign
  await supabase
    .from("campaigns")
    .update({
      status: "active",
      sent: messages.length,
    })
    .eq("id", campaign.id);

  return NextResponse.json({
    campaign_id: campaign.id,
    queued: sendilloResult?.successful ?? messages.length,
    failed: sendilloResult?.failed ?? 0,
    results: sendilloResult?.results ?? [],
  });
}
