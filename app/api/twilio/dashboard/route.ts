// app/api/twilio/dashboard/route.ts
//
// GET /api/twilio/dashboard
//
// Single aggregated endpoint that powers the /user/twilio dashboard.
// Pulls account-level facts live from the Twilio REST API
// (account, balance, owned phone numbers, recent calls, messages,
// recordings, transcriptions, last-month usage) AND joins in
// app-level facts from Supabase (workspace row, calls-with-leads,
// messages, locally-registered phone numbers).
//
// We fan out all the live Twilio calls in parallel and wrap each
// one in a try/catch so a single failure degrades gracefully
// (the dashboard renders whatever subset succeeded, and the
// `twilioError` field explains what didn't).
//
// Cached for 30 s on the client (`Cache-Control: private, max-age=30,
// stale-while-revalidate=60`) to stay well within Twilio's rate
// limits while still feeling snappy when the user hits Refresh.

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTwilioClient, getTwilioPhoneNumber } from "@/lib/twilio/client";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface SafeCall {
 sid: string;
 from: string | null;
 to: string | null;
 direction: string | null;
 status: string | null;
 duration: string | null;
 startTime: string | null;
 endTime: string | null;
 price: string | null;
 priceUnit: string | null;
 hasRecording: boolean;
}

interface SafeMessage {
 sid: string;
 from: string | null;
 to: string | null;
 body: string | null;
 status: string | null;
 direction: string | null;
 dateCreated: string | null;
 price: string | null;
 priceUnit: string | null;
 errorCode: number | null;
 errorMessage: string | null;
 numMedia: string | null;
}

interface SafeRecording {
 sid: string;
 callSid: string | null;
 duration: string | null;
 channels: number | null;
 status: string | null;
 source: string | null;
 dateCreated: string | null;
 uri: string | null;
}

interface SafeTranscription {
 sid: string;
 recordingSid: string | null;
 status: string | null;
 duration: string | null;
 text: string | null;
 dateCreated: string | null;
 uri: string | null;
}

interface SafePhoneNumber {
 sid: string;
 phoneNumber: string;
 friendlyName: string | null;
 capabilities: { voice: boolean; sms: boolean; mms: boolean };
 voiceUrl: string | null;
 smsUrl: string | null;
 status: string | null;
 dateCreated: string | null;
}

interface SafeAccount {
 sid: string;
 friendlyName: string | null;
 status: string | null;
 type: string | null;
 dateCreated: string | null;
 dateUpdated: string | null;
 uri: string | null;
}

interface SafeBalance {
 balance: string | null;
 currency: string | null;
}

interface SafeUsageCategory {
 category: string;
 description: string;
 count: string | null;
 usage: string | null;
 usageUnit: string | null;
 price: string | null;
 priceUnit: string | null;
}

// Twilio's transcription resource exposes the body as `transcription_text`
// in the SDK's TranscriptionContext solution. `text` is also populated
// at runtime on the instance — we read whichever the SDK gives us.
type TwilioTranscriptionInstance = {
 sid: string;
 recordingSid?: string | null;
 status?: string | null;
 duration?: string | null;
 transcriptionText?: string | null;
 text?: string | null;
 dateCreated?: Date | string | null;
 uri?: string | null;
};

// Twilio's usage record returns `price` as a number at runtime but
// the SDK type lists it as `string`. We accept both via this helper.
type TwilioUsageInstance = {
 category: string;
 description: string;
 count?: string | number | null;
 usage?: string | number | null;
 usageUnit?: string | null;
 price?: string | number | null;
 priceUnit?: string | null;
};

export async function GET() {
 const { userId } = await auth();
 if (!userId) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const twilioErrors: string[] = [];
 let account: SafeAccount | null = null;
 let balance: SafeBalance | null = null;
 let incomingPhoneNumbers: SafePhoneNumber[] = [];
 let recentCalls: SafeCall[] = [];
 let recentMessages: SafeMessage[] = [];
 let recentRecordings: SafeRecording[] = [];
 let recentTranscriptions: SafeTranscription[] = [];
 let usageLastMonth: SafeUsageCategory[] = [];

 const envCallerId = (() => {
 try {
 return getTwilioPhoneNumber();
 } catch {
 return null;
 }
 })();

 // Live Twilio calls, fanned out in parallel. Each one is wrapped in
 // its own try/catch so a 429 or 401 on one resource doesn't kill
 // the whole payload.
 try {
 const client = getTwilioClient();

 const [
 accountRes,
 balanceRes,
 numbersRes,
 callsRes,
 messagesRes,
 recordingsRes,
 transcriptionsRes,
 usageRes,
 ] = await Promise.allSettled([
 client.api.accounts(process.env.TWILIO_ACCOUNT_SID!).fetch(),
 client.balance.fetch(),
 client.incomingPhoneNumbers.list({ limit: 50 }),
 client.calls.list({ limit: 20 }),
 client.messages.list({ limit: 20 }),
 client.recordings.list({ limit: 20 }),
 client.transcriptions.list({ limit: 20 }),
 client.usage.records.lastMonth.list({ limit: 100 }),
 ]);

 if (accountRes.status === "fulfilled") {
 const a = accountRes.value;
 account = {
 sid: a.sid,
 friendlyName: a.friendlyName,
 status: a.status,
 type: a.type,
 dateCreated: a.dateCreated instanceof Date ? a.dateCreated.toISOString() : String(a.dateCreated ?? ""),
 dateUpdated: a.dateUpdated instanceof Date ? a.dateUpdated.toISOString() : String(a.dateUpdated ?? ""),
 uri: a.uri,
 };
 } else {
 twilioErrors.push(`account: ${(accountRes.reason as Error)?.message || "unknown"}`);
 }

 if (balanceRes.status === "fulfilled") {
 const b = balanceRes.value;
 balance = {
 balance: b.balance,
 currency: b.currency,
 };
 } else {
 twilioErrors.push(`balance: ${(balanceRes.reason as Error)?.message || "unknown"}`);
 }

 if (numbersRes.status === "fulfilled") {
 incomingPhoneNumbers = numbersRes.value.map((n) => ({
 sid: n.sid,
 phoneNumber: n.phoneNumber?.toString() ?? "",
 friendlyName: n.friendlyName,
 capabilities: {
 voice: !!n.capabilities?.voice,
 sms: !!n.capabilities?.sms,
 mms: !!n.capabilities?.mms,
 },
 voiceUrl: (n.voiceUrl as string | null) ?? null,
 smsUrl: (n.smsUrl as string | null) ?? null,
 status: n.status,
 dateCreated: n.dateCreated instanceof Date ? n.dateCreated.toISOString() : String(n.dateCreated ?? ""),
 }));
 } else {
 twilioErrors.push(`incomingPhoneNumbers: ${(numbersRes.reason as Error)?.message || "unknown"}`);
 }

 if (callsRes.status === "fulfilled") {
 recentCalls = callsRes.value.map((c) => ({
 sid: c.sid,
 from: c.from,
 to: c.to,
 direction: c.direction,
 status: c.status,
 duration: c.duration,
 startTime: c.startTime instanceof Date ? c.startTime.toISOString() : (c.startTime as string | null),
 endTime: c.endTime instanceof Date ? c.endTime.toISOString() : (c.endTime as string | null),
 price: c.price,
 priceUnit: c.priceUnit,
 hasRecording: Array.isArray((c as { subresourceUris?: Record<string, string> }).subresourceUris?.recordings),
 }));
 } else {
 twilioErrors.push(`calls: ${(callsRes.reason as Error)?.message || "unknown"}`);
 }

 if (messagesRes.status === "fulfilled") {
 recentMessages = messagesRes.value.map((m) => ({
 sid: m.sid,
 from: m.from,
 to: m.to,
 body: m.body,
 status: m.status,
 direction: m.direction,
 dateCreated: m.dateCreated instanceof Date ? m.dateCreated.toISOString() : String(m.dateCreated ?? ""),
 price: m.price,
 priceUnit: m.priceUnit,
 errorCode: m.errorCode ?? null,
 errorMessage: m.errorMessage ?? null,
 numMedia: m.numMedia,
 }));
 } else {
 twilioErrors.push(`messages: ${(messagesRes.reason as Error)?.message || "unknown"}`);
 }

 if (recordingsRes.status === "fulfilled") {
 recentRecordings = recordingsRes.value.map((r) => ({
 sid: r.sid,
 callSid: r.callSid,
 duration: r.duration,
 channels: r.channels,
 status: r.status,
 source: r.source,
 dateCreated: r.dateCreated instanceof Date ? r.dateCreated.toISOString() : String(r.dateCreated ?? ""),
 uri: r.uri,
 }));
 } else {
 twilioErrors.push(`recordings: ${(recordingsRes.reason as Error)?.message || "unknown"}`);
 }

 if (transcriptionsRes.status === "fulfilled") {
 recentTranscriptions = (transcriptionsRes.value as TwilioTranscriptionInstance[]).map((t) => ({
 sid: t.sid,
 recordingSid: t.recordingSid ?? null,
 status: t.status ?? null,
 duration: t.duration ?? null,
 text: t.transcriptionText ?? t.text ?? null,
 dateCreated: t.dateCreated instanceof Date ? t.dateCreated.toISOString() : String(t.dateCreated ?? ""),
 uri: t.uri ?? null,
 }));
 } else {
 twilioErrors.push(`transcriptions: ${(transcriptionsRes.reason as Error)?.message || "unknown"}`);
 }

 if (usageRes.status === "fulfilled") {
 usageLastMonth = (usageRes.value as TwilioUsageInstance[]).map((u) => ({
 category: u.category,
 description: u.description,
 count: u.count != null ? String(u.count) : null,
 usage: u.usage != null ? String(u.usage) : null,
 usageUnit: u.usageUnit ?? null,
 price: u.price != null ? String(u.price) : null,
 priceUnit: u.priceUnit ?? null,
 }));
 } else {
 twilioErrors.push(`usage: ${(usageRes.reason as Error)?.message || "unknown"}`);
 }
 } catch (err: unknown) {
 // Most common: invalid creds, no .env set, or auth() failure.
 twilioErrors.push(`twilio: ${(err as Error)?.message || "Unknown error"}`);
 }

 // DB-side data
 const supabase = createServiceSupabaseClient();
 let workspace: {
 id: string;
 name: string;
 plan: string;
 slug: string | null;
 twilio_account_sid: string | null;
 default_caller_id: string | null;
 twilio_balance: number | null;
 created_at: string;
 } | null = null;
 let callsWithLeads: Array<{
 id: string;
 twilio_call_sid: string | null;
 lead_id: string;
 lead_name: string | null;
 lead_phone: string | null;
 direction: string | null;
 status: string | null;
 duration_seconds: number | null;
 recording_url: string | null;
 transcription: string | null;
 transcription_text: string | null;
 transcription_status: string | null;
 started_at: string | null;
 ended_at: string | null;
 created_at: string;
 price: string | null;
}> = [];
 let dbMessages: Array<{
 id: string;
 lead_id: string | null;
 lead_name: string | null;
 lead_phone: string | null;
 channel: string | null;
 direction: string | null;
 body: string | null;
 external_id: string | null;
 external_status: string | null;
 sent_at: string | null;
 created_at: string;
}> = [];
 let dbPhoneNumbers: Array<{
 id: string;
 phone_number: string;
 twilio_sid: string;
 friendly_name: string | null;
 capabilities: Record<string, boolean> | null;
 voice_url: string | null;
 sms_url: string | null;
 status: string | null;
 is_active: boolean | null;
}> = [];

 if (supabase) {
 const { data: user } = await supabase
 .from("users")
 .select("id, workspace_id")
 .eq("clerk_user_id", userId)
 .maybeSingle();

 const workspaceId = user?.workspace_id ?? null;

 if (workspaceId) {
 const { data: ws } = await supabase
 .from("workspaces")
 .select("id, name, plan, slug, twilio_account_sid, default_caller_id, twilio_balance, created_at")
 .eq("id", workspaceId)
 .maybeSingle();
 workspace = ws;

 const { data: calls } = await supabase
 .from("calls")
 .select(`
 id,
 twilio_call_sid,
 lead_id,
 direction,
 status,
 duration_seconds,
 recording_url,
 transcription,
 transcription_text,
 transcription_status,
 started_at,
 ended_at,
 created_at,
 lead:leads!calls_lead_id_fkey(id, first_name, last_name, phone)
 `)
 .eq("workspace_id", workspaceId)
 .order("created_at", { ascending: false })
 .limit(20);

 callsWithLeads = (calls || []).map((c: Record<string, unknown>) => {
 const lead = c.lead as { first_name?: string; last_name?: string; phone?: string } | null;
 const leadName = lead
 ? `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || null
 : null;
 return {
 id: c.id as string,
 twilio_call_sid: c.twilio_call_sid as string | null,
 lead_id: c.lead_id as string,
 lead_name: leadName,
 lead_phone: lead?.phone ?? null,
 direction: c.direction as string | null,
 status: c.status as string | null,
 duration_seconds: c.duration_seconds as number | null,
 recording_url: c.recording_url as string | null,
 transcription: c.transcription as string | null,
 transcription_text: c.transcription_text as string | null,
 transcription_status: c.transcription_status as string | null,
 started_at: c.started_at as string | null,
 ended_at: c.ended_at as string | null,
 created_at: c.created_at as string,
 price: null,
 };
 });

 const { data: msgs } = await supabase
 .from("messages")
 .select(`
 id,
 lead_id,
 channel,
 direction,
 body,
 external_id,
 external_status,
 sent_at,
 created_at,
 lead:leads!messages_lead_id_fkey(id, first_name, last_name, phone)
 `)
 .eq("workspace_id", workspaceId)
 .order("created_at", { ascending: false })
 .limit(20);

 dbMessages = (msgs || []).map((m: Record<string, unknown>) => {
 const lead = m.lead as { first_name?: string; last_name?: string; phone?: string } | null;
 const leadName = lead
 ? `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || null
 : null;
 return {
 id: m.id as string,
 lead_id: (m.lead_id as string | null) ?? null,
 lead_name: leadName,
 lead_phone: lead?.phone ?? null,
 channel: m.channel as string | null,
 direction: m.direction as string | null,
 body: m.body as string | null,
 external_id: m.external_id as string | null,
 external_status: m.external_status as string | null,
 sent_at: m.sent_at as string | null,
 created_at: m.created_at as string,
 };
 });

 const { data: nums } = await supabase
 .from("twilio_phone_numbers")
 .select("id, phone_number, twilio_sid, friendly_name, capabilities, voice_url, sms_url, status, is_active")
 .eq("workspace_id", workspaceId)
 .order("created_at", { ascending: true });

 dbPhoneNumbers = (nums || []).map((n: Record<string, unknown>) => ({
 id: n.id as string,
 phone_number: n.phone_number as string,
 twilio_sid: n.twilio_sid as string,
 friendly_name: (n.friendly_name as string | null) ?? null,
 capabilities: (n.capabilities as Record<string, boolean> | null) ?? null,
 voice_url: (n.voice_url as string | null) ?? null,
 sms_url: (n.sms_url as string | null) ?? null,
 status: (n.status as string | null) ?? null,
 is_active: (n.is_active as boolean | null) ?? null,
 }));
 }
 }

 return NextResponse.json(
 {
 account,
 balance,
 envCallerId,
 incomingPhoneNumbers,
 recentCalls,
 recentMessages,
 recentRecordings,
 recentTranscriptions,
 usageLastMonth,
 workspace,
 callsWithLeads,
 dbMessages,
 dbPhoneNumbers,
 twilioError: twilioErrors.length ? twilioErrors.join("; ") : null,
 fetchedAt: new Date().toISOString(),
 },
 {
 headers: {
 "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
 },
 }
 );
}
