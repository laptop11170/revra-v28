// app/api/sequences/process/route.ts
// Process pending sequence steps — send SMS to leads whose next_send_at has passed.
// Designed to be called by a cron job or scheduled task every few minutes.

import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { sendSMS } from "@/lib/sendillo/client";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.SEQUENCE_PROCESS_SECRET;

  // Require a secret header if configured
  if (secret && authHeader !== `Bearer ${secret}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const now = new Date().toISOString();

  // Find active enrollments that are due
  const { data: enrollments } = await supabase
  .from("sequence_enrollments")
  .select(`
  *,
  lead:leads(id, phone, first_name, last_name),
  sequence:sequences(id, sender_phone_id, workspace_id)
  `)
  .eq("status", "active")
  .lte("next_send_at", now)
  .order("next_send_at", { ascending: true })
  .limit(50);

  if (!enrollments || enrollments.length === 0) {
  return NextResponse.json({ processed: 0, sent: 0 });
  }

  let sent = 0;
  let failed = 0;

  for (const en of enrollments as any[]) {
  const sequenceId = en.sequence_id;
  const workspaceId = en.sequence?.workspace_id;
  const lead = en.lead;
  const nextStep = en.current_step + 1;

  if (!lead?.phone) {
  await supabase
  .from("sequence_enrollments")
  .update({ status: "cancelled" })
  .eq("id", en.id);
  continue;
  }

  // Get the step
  const { data: step } = await supabase
  .from("sequence_steps")
  .select("*")
  .eq("sequence_id", sequenceId)
  .eq("step_number", nextStep)
  .single();

  if (!step) {
  // No more steps — mark completed
  await supabase
  .from("sequence_enrollments")
  .update({ status: "completed", completed_at: now })
  .eq("id", en.id);
  continue;
  }

  // Get sender number
  let fromNumber: string | null = null;
  if (en.sequence?.sender_phone_id) {
  const { data: sp } = await supabase
  .from("sendillo_phone_numbers")
  .select("phone_number")
  .eq("id", en.sequence.sender_phone_id)
  .eq("workspace_id", workspaceId)
  .single();
  if (sp) fromNumber = sp.phone_number;
  }

  if (!fromNumber) {
  // Try workspace default
  const { data: wsPhone } = await supabase
  .from("sendillo_phone_numbers")
  .select("phone_number")
  .eq("workspace_id", workspaceId)
  .eq("is_active", true)
  .limit(1)
  .single();
  if (wsPhone) fromNumber = wsPhone.phone_number;
  }

  if (!fromNumber) {
  failed++;
  continue;
  }

  // Personalize body
  let body = step.body;
  body = body.replace(/\{\{first_name\}\}/gi, lead.first_name || "");
  body = body.replace(/\{\{last_name\}\}/gi, lead.last_name || "");

  // Send
  try {
  await sendSMS({
  from: fromNumber,
  to: lead.phone,
  body,
  });
  sent++;
  } catch (err: unknown) {
  const e = err as { message?: string };
  console.error("[Sequence] Send failed:", e.message);
  failed++;

  // Log failure but don't cancel enrollment — retry next cycle
  await supabase.from("sequence_messages").insert({
  enrollment_id: en.id,
  step_id: step.id,
  status: "failed",
  sent_at: now,
  });

  // Push next_send_at forward slightly to avoid spamming
  const retryAt = new Date(Date.now() + 3600000).toISOString();
  await supabase
  .from("sequence_enrollments")
  .update({ next_send_at: retryAt })
  .eq("id", en.id);
  continue;
  }

  // Log message
  const { data: msgRow } = await supabase
  .from("messages")
  .insert({
  workspace_id: workspaceId,
  lead_id: lead.id,
  channel: "sms",
  direction: "outbound",
  body,
  external_id: fromNumber,
  external_status: "pending",
  sent_at: now,
  })
  .select("id")
  .single();

  await supabase.from("sequence_messages").insert({
  enrollment_id: en.id,
  step_id: step.id,
  message_id: msgRow?.id || null,
  status: "sent",
  sent_at: now,
  });

  // Advance or schedule next step
  const { data: nextNextStep } = await supabase
  .from("sequence_steps")
  .select("delay_days, delay_hours")
  .eq("sequence_id", sequenceId)
  .eq("step_number", nextStep + 1)
  .single();

  if (nextNextStep) {
  const delayMs = ((nextNextStep.delay_days ?? 0) * 24 + (nextNextStep.delay_hours ?? 0)) * 3600000;
  const nextAt = new Date(Date.now() + delayMs).toISOString();
  await supabase
  .from("sequence_enrollments")
  .update({
  current_step: nextStep,
  next_send_at: nextAt,
  last_sent_at: now,
  messages_sent: en.messages_sent + 1,
  })
  .eq("id", en.id);
  } else {
  // Completed all steps
  await supabase
  .from("sequence_enrollments")
  .update({
  current_step: nextStep,
  status: "completed",
  completed_at: now,
  last_sent_at: now,
  messages_sent: en.messages_sent + 1,
  })
  .eq("id", en.id);
  }
  }

  return NextResponse.json({ processed: enrollments.length, sent, failed });
}
