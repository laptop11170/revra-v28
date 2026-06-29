"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/layouts/Shell";
import {
 Loader2,
 RefreshCw,
 Phone,
 MessageSquare,
 CheckCircle2,
 AlertTriangle,
 PhoneCall,
 PhoneIncoming,
 PhoneOutgoing,
 FileAudio,
 FileText,
 Coins,
 Hash,
 ArrowUpRight,
 X,
} from "lucide-react";

// ─── Types mirroring the API response shape ─────────────────────────────

type TwilioDashboardData = {
 account: {
 sid: string;
 friendlyName: string | null;
 status: string | null;
 type: string | null;
 dateCreated: string | null;
 dateUpdated: string | null;
 uri: string | null;
 } | null;
 balance: { balance: string | null; currency: string | null } | null;
 envCallerId: string | null;
 incomingPhoneNumbers: Array<{
 sid: string;
 phoneNumber: string;
 friendlyName: string | null;
 capabilities: { voice: boolean; sms: boolean; mms: boolean };
 voiceUrl: string | null;
 smsUrl: string | null;
 status: string | null;
 dateCreated: string | null;
 }>;
 recentCalls: Array<{
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
 }>;
 recentMessages: Array<{
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
 }>;
 recentRecordings: Array<{
 sid: string;
 callSid: string | null;
 duration: string | null;
 channels: number | null;
 status: string | null;
 source: string | null;
 dateCreated: string | null;
 uri: string | null;
 }>;
 recentTranscriptions: Array<{
 sid: string;
 recordingSid: string | null;
 status: string | null;
 duration: string | null;
 text: string | null;
 dateCreated: string | null;
 uri: string | null;
 }>;
 usageLastMonth: Array<{
 category: string;
 description: string;
 count: string | null;
 usage: string | null;
 usageUnit: string | null;
 price: string | null;
 priceUnit: string | null;
 }>;
 workspace: {
 id: string;
 name: string;
 plan: string;
 slug: string | null;
 twilio_account_sid: string | null;
 default_caller_id: string | null;
 twilio_balance: number | null;
 created_at: string;
 } | null;
 callsWithLeads: Array<{
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
 }>;
 dbMessages: Array<{
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
 }>;
 dbPhoneNumbers: Array<{
 id: string;
 phone_number: string;
 twilio_sid: string;
 friendly_name: string | null;
 capabilities: Record<string, boolean> | null;
 voice_url: string | null;
 sms_url: string | null;
 status: string | null;
 is_active: boolean | null;
 }>;
 twilioError: string | null;
 fetchedAt: string;
};

type DrawerItem =
 | { kind: "liveCall"; sid: string }
 | { kind: "appCall"; id: string }
 | { kind: "liveMessage"; sid: string }
 | { kind: "dbMessage"; id: string }
 | { kind: "recording"; sid: string; callSid: string | null }
 | { kind: "transcription"; sid: string; recordingSid: string | null }
 | { kind: "phoneNumber"; sid: string; source: "live" | "db" }
 | null;

// ─── Tiny formatting helpers ─────────────────────────────────────────────

function formatDuration(seconds: number | string | null | undefined): string {
 if (seconds == null) return "0:00";
 const n = typeof seconds === "string" ? parseInt(seconds, 10) : seconds;
 if (!n || Number.isNaN(n)) return "0:00";
 const m = Math.floor(n / 60);
 const s = n % 60;
 return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(iso: string | null | undefined): string {
 if (!iso) return "—";
 const d = new Date(iso);
 if (Number.isNaN(d.getTime())) return "—";
 return d.toLocaleString("en-US", {
 month: "short",
 day: "numeric",
 year: "numeric",
 hour: "numeric",
 minute: "2-digit",
 });
}

function formatPrice(price: string | null, unit: string | null): string {
 if (!price) return "—";
 const n = parseFloat(price);
 if (Number.isNaN(n)) return price;
 const formatted = n.toFixed(n < 0.01 && n > 0 ? 4 : 2);
 return unit ? `$${formatted} ${unit}` : `$${formatted}`;
}

function formatBalance(balance: string | null | undefined, currency: string | null | undefined): string {
 if (!balance) return "—";
 const n = parseFloat(balance);
 if (Number.isNaN(n)) return `${balance} ${currency || ""}`.trim();
 return `${n.toFixed(2)} ${currency || "USD"}`;
}

function statusColor(status: string | null | undefined): { fg: string; bg: string } {
 const s = (status || "").toLowerCase();
 if (["completed", "delivered", "active", "succeeded"].includes(s))
 return { fg: "var(--mint)", bg: "rgba(16,185,129,0.12)" };
 if (["ringing", "sending", "queued", "pending", "processing", "in-progress"].includes(s))
 return { fg: "var(--amber)", bg: "rgba(245,158,11,0.12)" };
 if (["failed", "undelivered", "suspended", "closed", "canceled", "no-answer", "busy"].includes(s))
 return { fg: "var(--rose)", bg: "rgba(239,68,68,0.12)" };
 return { fg: "var(--ink-mute)", bg: "var(--surface-3)" };
}

// ─── Page component ─────────────────────────────────────────────────────

export default function TwilioDashboardPage() {
 const [data, setData] = useState<TwilioDashboardData | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [drawer, setDrawer] = useState<DrawerItem>(null);
 const [callsTab, setCallsTab] = useState<"live" | "app">("live");
 const [refreshing, setRefreshing] = useState(false);

 const fetchData = useCallback(async (showSpinner = true) => {
 if (showSpinner) setLoading(true);
 setRefreshing(true);
 setError(null);
 try {
 const res = await fetch("/api/twilio/dashboard", { cache: "no-store" });
 if (!res.ok) throw new Error(`Request failed (${res.status})`);
 const json = (await res.json()) as TwilioDashboardData;
 setData(json);
 } catch (err: unknown) {
 const e = err as { message?: string };
 setError(e.message || "Failed to load Twilio dashboard");
 } finally {
 setLoading(false);
 setRefreshing(false);
 }
 }, []);

 useEffect(() => {
 fetchData(false);
 }, [fetchData]);

 // Derived counts
 const livePhoneCount = data?.incomingPhoneNumbers.length ?? 0;
 const voiceMinutes = useMemo(() => {
 if (!data) return 0;
 return data.usageLastMonth
 .filter((u) =>
 ["calls-inbound", "calls-outbound", "calls", "voice"].some((c) =>
 (u.category || "").toLowerCase().includes(c)
 )
 )
 .reduce((acc, u) => acc + (parseFloat(u.usage || "0") || 0), 0);
 }, [data]);

 const smsCount = useMemo(() => {
 if (!data) return 0;
 return data.usageLastMonth
 .filter((u) => (u.category || "").toLowerCase().includes("sms"))
 .reduce((acc, u) => acc + (parseFloat(u.count || "0") || 0), 0);
 }, [data]);

 const totalUsageCost = useMemo(() => {
 if (!data) return 0;
 return data.usageLastMonth.reduce(
 (acc, u) => acc + (parseFloat(u.price || "0") || 0),
 0
 );
 }, [data]);

 return (
 <Shell role="user">
 <div className="max-w-[1600px] mx-auto p-3 sm:p-6 space-y-6">
 {/* Header */}
 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 gap-4 border-b border-[var(--line)]">
 <div>
 <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)] bg-gradient-to-r from-[var(--ink)] to-[var(--ink-mute)] bg-clip-text">
 Twilio Account
 </h1>
 <p className="text-sm text-[var(--ink-mute)] mt-1">
 Live read-only view of the platform's connected Twilio account.
 {data?.fetchedAt && (
 <> Last fetched {formatDate(data.fetchedAt)}.</>
 )}
 </p>
 </div>
 <button
 className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md hover:shadow-lg shadow-emerald-500/10 active:scale-95 transition-all disabled:opacity-50"
 onClick={() => fetchData(true)}
 disabled={refreshing}
 >
 <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
 {refreshing ? "Refreshing..." : "Refresh"}
 </button>
 </div>

 {error && (
 <div className="flex items-start gap-2 p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400">
 <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
 <div>
 <p className="text-sm font-semibold">Failed to load dashboard</p>
 <p className="text-xs mt-0.5">{error}</p>
 </div>
 </div>
 )}

 {data?.twilioError && !error && (
 <div className="flex items-start gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
 <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
 <p className="text-xs">
 Twilio live API partially failed: <span className="font-mono">{data.twilioError}</span>
 . App-recorded data is still shown below.
 </p>
 </div>
 )}

 {loading && !data ? (
 <div className="flex flex-col items-center justify-center py-24 gap-3">
 <Loader2 size={32} className="animate-spin text-[var(--ink-mute)]" />
 <p className="text-sm text-[var(--ink-mute)]">Loading Twilio dashboard...</p>
 </div>
 ) : data ? (
 <>
 {/* Section 1: Account status */}
 <section>
 <SectionHeader title="Account status" subtitle="Live data from the Twilio REST API" />
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 {/* Account card */}
 <div className="bg-[var(--surface-2)]/60 backdrop-blur-md border border-[var(--line-2)] rounded-2xl p-5 shadow-xl">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div
 className="w-10 h-10 rounded-xl flex items-center justify-center"
 style={{
 background: statusColor(data.account?.status).bg,
 }}
 >
 <CheckCircle2 size={20} style={{ color: statusColor(data.account?.status).fg }} />
 </div>
 <div>
 <p className="text-sm font-bold text-[var(--ink)]">
 {data.account?.friendlyName || "Twilio Account"}
 </p>
 <p className="text-[11px] text-[var(--ink-mute)] mt-0.5">
 Twilio account (live)
 </p>
 </div>
 </div>
 <StatusPill label={data.account?.status} />
 </div>
 <KeyValueGrid
 items={[
 ["Account SID", data.account?.sid, "mono"],
 ["Type", data.account?.type],
 ["Created", formatDate(data.account?.dateCreated)],
 ["Updated", formatDate(data.account?.dateUpdated)],
 ]}
 />
 </div>

 {/* Workspace card */}
 <div className="bg-[var(--surface-2)]/60 backdrop-blur-md border border-[var(--line-2)] rounded-2xl p-5 shadow-xl">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-[var(--viol-400)]/10 border border-[var(--viol-400)]/20 flex items-center justify-center">
 <Hash size={20} className="text-[var(--viol-400)]" />
 </div>
 <div>
 <p className="text-sm font-bold text-[var(--ink)]">
 {data.workspace?.name || "Demo workspace"}
 </p>
 <p className="text-[11px] text-[var(--ink-mute)] mt-0.5">
 Workspace (this app)
 </p>
 </div>
 </div>
 <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--surface-3)] border border-[var(--line)] text-[var(--ink-mute)]">
 {data.workspace?.plan || "—"}
 </span>
 </div>
 <KeyValueGrid
 items={[
 ["Workspace ID", data.workspace?.id, "mono"],
 ["Slug", data.workspace?.slug || "—", "mono"],
 ["Stored Twilio SID", data.workspace?.twilio_account_sid || "—", "mono"],
 ["Default caller ID", data.workspace?.default_caller_id || data.envCallerId || "—", "mono"],
 ]}
 />
 </div>
 </div>
 </section>

 {/* Section 2: Stat tiles */}
 <section>
 <SectionHeader title="At a glance" subtitle="Account balance and last-30-days usage" />
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 <StatTile
 label="Account balance"
 value={formatBalance(data.balance?.balance, data.balance?.currency)}
 icon={<Coins size={18} className="text-emerald-500" />}
 accent="emerald"
 />
 <StatTile
 label="Phone numbers"
 value={livePhoneCount.toString()}
 sub={data.dbPhoneNumbers.length ? `${data.dbPhoneNumbers.length} tracked in app` : "Live from Twilio"}
 icon={<Phone size={18} className="text-[var(--viol-400)]" />}
 accent="viol"
 />
 <StatTile
 label="Voice minutes (30d)"
 value={voiceMinutes.toFixed(1)}
 sub="Calls (in + out)"
 icon={<PhoneCall size={18} className="text-[var(--blue-400)]" />}
 accent="blue"
 />
 <StatTile
 label="SMS sent (30d)"
 value={smsCount.toString()}
 sub={`Total spend $${totalUsageCost.toFixed(2)}`}
 icon={<MessageSquare size={18} className="text-[var(--amber)]" />}
 accent="amber"
 />
 </div>
 </section>

 {/* Section 3: Owned phone numbers */}
 <section>
 <SectionHeader
 title="Owned phone numbers"
 subtitle={`${livePhoneCount} number${livePhoneCount === 1 ? "" : "s"} on the Twilio account`}
 />
 <PhoneNumbersTable
 live={data.incomingPhoneNumbers}
 db={data.dbPhoneNumbers}
 onRowClick={(n) => setDrawer({ kind: "phoneNumber", sid: n.sid, source: "live" })}
 />
 </section>

 {/* Section 4: Recent calls */}
 <section>
 <SectionHeader
 title="Recent calls"
 subtitle="Last 20 — switch between live Twilio and app-recorded calls"
 />
 <div className="flex items-center gap-2 mb-3">
 <TabButton
 active={callsTab === "live"}
 onClick={() => setCallsTab("live")}
 icon={<PhoneCall size={12} />}
 label={`Live (${data.recentCalls.length})`}
 />
 <TabButton
 active={callsTab === "app"}
 onClick={() => setCallsTab("app")}
 icon={<Hash size={12} />}
 label={`App (${data.callsWithLeads.length})`}
 />
 </div>
 {callsTab === "live" ? (
 <LiveCallsTable calls={data.recentCalls} onRowClick={(c) => setDrawer({ kind: "liveCall", sid: c.sid })} />
 ) : (
 <AppCallsTable calls={data.callsWithLeads} onRowClick={(c) => setDrawer({ kind: "appCall", id: c.id })} />
 )}
 </section>

 {/* Section 5: SMS messages */}
 <section>
 <SectionHeader title="Recent SMS" subtitle="Last 20 messages — live Twilio and app-recorded" />
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 <div>
 <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-mute)] mb-2">
 Live Twilio
 </h3>
 <LiveMessagesTable
 messages={data.recentMessages}
 onRowClick={(m) => setDrawer({ kind: "liveMessage", sid: m.sid })}
 />
 </div>
 <div>
 <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-mute)] mb-2">
 App-recorded
 </h3>
 <DbMessagesTable
 messages={data.dbMessages}
 onRowClick={(m) => setDrawer({ kind: "dbMessage", id: m.id })}
 />
 </div>
 </div>
 </section>

 {/* Section 6: Recordings & transcriptions */}
 <section>
 <SectionHeader
 title="Recordings & transcriptions"
 subtitle={`${data.recentRecordings.length} recordings · ${data.recentTranscriptions.length} transcriptions`}
 />
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
 <div>
 <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-mute)] mb-2">
 Recordings
 </h3>
 <RecordingsTable
 recordings={data.recentRecordings}
 onRowClick={(r) => setDrawer({ kind: "recording", sid: r.sid, callSid: r.callSid })}
 />
 </div>
 <div>
 <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-mute)] mb-2">
 Transcriptions
 </h3>
 <TranscriptionsTable
 transcriptions={data.recentTranscriptions}
 onRowClick={(t) => setDrawer({ kind: "transcription", sid: t.sid, recordingSid: t.recordingSid })}
 />
 </div>
 </div>
 </section>

 {/* Section 7: Usage */}
 <section>
 <SectionHeader
 title="Last 30 days usage"
 subtitle={`Total: $${totalUsageCost.toFixed(2)} · ${data.usageLastMonth.length} categories`}
 />
 <UsageBars usage={data.usageLastMonth} />
 </section>

 {/* Footer */}
 <div className="text-[11px] text-[var(--ink-faint)] text-center pt-2 pb-6">
 Live data from the Twilio REST API. App-recorded calls and messages come from Supabase. Cached for 30 s.
 </div>
 </>
 ) : null}
 </div>

 {/* Detail drawer */}
 {drawer && data && (
 <DetailDrawer
 item={drawer}
 data={data}
 onClose={() => setDrawer(null)}
 />
 )}
 </Shell>
 );
}

// ─── Section header ──────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
 return (
 <div className="mb-3">
 <h2 className="text-base font-bold text-[var(--ink)]">{title}</h2>
 {subtitle && <p className="text-[11px] text-[var(--ink-mute)] mt-0.5">{subtitle}</p>}
 </div>
 );
}

// ─── Status pill ─────────────────────────────────────────────────────────

function StatusPill({ label }: { label: string | null | undefined }) {
 const c = statusColor(label);
 return (
 <span
 className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border"
 style={{
 background: c.bg,
 color: c.fg,
 borderColor: c.fg + "33",
 }}
 >
 {label || "unknown"}
 </span>
 );
}

// ─── Key/value grid ──────────────────────────────────────────────────────

type KeyValueItem = [string, string | null | undefined, "mono"?];

function KeyValueGrid({ items }: { items: KeyValueItem[] }) {
 return (
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
 {items.map(([k, v, mono]) => (
 <div key={k} className="min-w-0">
 <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-mute)]">{k}</p>
 <p
 className={
 "text-sm mt-0.5 truncate " +
 (mono ? "font-mono text-[var(--ink)]" : "text-[var(--ink)]")
 }
 title={v || "—"}
 >
 {v || "—"}
 </p>
 </div>
 ))}
 </div>
 );
}

// ─── Stat tile ───────────────────────────────────────────────────────────

function StatTile({
 label,
 value,
 sub,
 icon,
 accent,
}: {
 label: string;
 value: string;
 sub?: string;
 icon: React.ReactNode;
 accent: "emerald" | "viol" | "blue" | "amber";
}) {
 const bg =
 accent === "emerald"
 ? "bg-emerald-500/10 border-emerald-500/20"
 : accent === "viol"
 ? "bg-[var(--viol-400)]/10 border-[var(--viol-400)]/20"
 : accent === "blue"
 ? "bg-[var(--blue-400)]/10 border-[var(--blue-400)]/20"
 : "bg-amber-500/10 border-amber-500/20";
 return (
 <div
 className={`bg-[var(--surface-2)]/60 backdrop-blur-md border border-[var(--line-2)] rounded-2xl p-5 shadow-xl flex items-start justify-between`}
 >
 <div className="min-w-0">
 <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-mute)]">{label}</p>
 <p className="text-2xl sm:text-3xl font-extrabold text-[var(--ink)] mt-1.5 truncate">{value}</p>
 {sub && <p className="text-[10px] text-[var(--ink-mute)] mt-1">{sub}</p>}
 </div>
 <div className={`w-9 h-9 rounded-xl border ${bg} flex items-center justify-center flex-shrink-0 ml-3`}>
 {icon}
 </div>
 </div>
 );
}

// ─── Tab button ──────────────────────────────────────────────────────────

function TabButton({
 active,
 onClick,
 icon,
 label,
}: {
 active: boolean;
 onClick: () => void;
 icon: React.ReactNode;
 label: string;
}) {
 return (
 <button
 onClick={onClick}
 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
 active
 ? "bg-[var(--viol-400)]/15 border border-[var(--viol-400)]/40 text-[var(--viol-400)]"
 : "bg-[var(--surface-3)] border border-[var(--line)] text-[var(--ink-mute)] hover:text-[var(--ink)]"
 }`}
 >
 {icon}
 {label}
 </button>
 );
}

// ─── Phone numbers table ─────────────────────────────────────────────────

function PhoneNumbersTable({
 live,
 db,
 onRowClick,
}: {
 live: TwilioDashboardData["incomingPhoneNumbers"];
 db: TwilioDashboardData["dbPhoneNumbers"];
 onRowClick: (n: { sid: string }) => void;
}) {
 if (live.length === 0 && db.length === 0) {
 return (
 <EmptyState
 icon={<Phone size={20} />}
 text="No phone numbers on this account yet. Buy one in the Twilio console."
 />
 );
 }
 return (
 <TableCard>
 <table className="w-full text-xs text-left min-w-[700px]">
 <thead>
 <tr className="border-b border-[var(--line-2)] bg-[var(--surface-3)]">
 <Th>Number</Th>
 <Th>SID</Th>
 <Th>Friendly name</Th>
 <Th>Capabilities</Th>
 <Th>Voice URL</Th>
 <Th>SMS URL</Th>
 <Th>Status</Th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[var(--line)]">
 {(live.length ? live : db.map((d) => ({
 sid: d.twilio_sid,
 phoneNumber: d.phone_number,
 friendlyName: d.friendly_name,
 capabilities: {
 voice: !!d.capabilities?.voice,
 sms: !!d.capabilities?.sms,
 mms: !!d.capabilities?.mms,
 },
 voiceUrl: d.voice_url,
 smsUrl: d.sms_url,
 status: d.status,
 dateCreated: null,
 }))).map((n) => (
 <tr
 key={n.sid}
 onClick={() => onRowClick({ sid: n.sid })}
 className="hover:bg-[var(--surface-3)]/60 transition-colors cursor-pointer"
 >
 <Td>
 <span className="font-mono font-semibold">{n.phoneNumber}</span>
 </Td>
 <Td>
 <span className="font-mono text-[var(--ink-mute)] text-[10px]">{n.sid}</span>
 </Td>
 <Td>{n.friendlyName || <span className="text-[var(--ink-faint)]">—</span>}</Td>
 <Td>
 <div className="flex flex-wrap gap-1">
 <Cap label="Voice" on={n.capabilities.voice} />
 <Cap label="SMS" on={n.capabilities.sms} />
 <Cap label="MMS" on={n.capabilities.mms} />
 </div>
 </Td>
 <Td>
 <span className="font-mono text-[10px] text-[var(--ink-mute)] truncate inline-block max-w-[180px]" title={n.voiceUrl || ""}>
 {n.voiceUrl || "—"}
 </span>
 </Td>
 <Td>
 <span className="font-mono text-[10px] text-[var(--ink-mute)] truncate inline-block max-w-[180px]" title={n.smsUrl || ""}>
 {n.smsUrl || "—"}
 </span>
 </Td>
 <Td>
 <StatusPill label={n.status} />
 </Td>
 </tr>
 ))}
 </tbody>
 </table>
 </TableCard>
 );
}

function Cap({ label, on }: { label: string; on: boolean }) {
 return (
 <span
 className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
 on
 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
 : "bg-[var(--surface-3)] text-[var(--ink-faint)] border-[var(--line)]"
 }`}
 >
 {label}
 </span>
 );
}

// ─── Live calls table ────────────────────────────────────────────────────

function LiveCallsTable({
 calls,
 onRowClick,
}: {
 calls: TwilioDashboardData["recentCalls"];
 onRowClick: (c: TwilioDashboardData["recentCalls"][number]) => void;
}) {
 if (calls.length === 0) {
 return <EmptyState icon={<PhoneCall size={20} />} text="No recent calls on this account." />;
 }
 return (
 <TableCard>
 <table className="w-full text-xs text-left min-w-[700px]">
 <thead>
 <tr className="border-b border-[var(--line-2)] bg-[var(--surface-3)]">
 <Th>From</Th>
 <Th>To</Th>
 <Th>Direction</Th>
 <Th>Status</Th>
 <Th>Duration</Th>
 <Th>Started</Th>
 <Th>Price</Th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[var(--line)]">
 {calls.map((c) => {
 const isInbound = c.direction === "inbound";
 return (
 <tr
 key={c.sid}
 onClick={() => onRowClick(c)}
 className="hover:bg-[var(--surface-3)]/60 transition-colors cursor-pointer"
 >
 <Td>
 <span className="font-mono text-[11px]">{c.from || "—"} {c.hasRecording && <FileAudio size={11} className="inline ml-1 text-[var(--viol-400)]" />}</span>
 </Td>
 <Td>
 <span className="font-mono text-[11px]">{c.to || "—"}</span>
 </Td>
 <Td>
 <DirectionBadge inbound={isInbound} />
 </Td>
 <Td>
 <StatusPill label={c.status} />
 </Td>
 <Td>
 <span className="font-mono text-[var(--ink-mute)]">{formatDuration(c.duration)}</span>
 </Td>
 <Td>
 <span className="text-[10px] text-[var(--ink-mute)]">{formatDate(c.startTime)}</span>
 </Td>
 <Td>
 <span className="text-[var(--ink-mute)]">{formatPrice(c.price, c.priceUnit)}</span>
 </Td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </TableCard>
 );
}

// ─── App calls table ─────────────────────────────────────────────────────

function AppCallsTable({
 calls,
 onRowClick,
}: {
 calls: TwilioDashboardData["callsWithLeads"];
 onRowClick: (c: TwilioDashboardData["callsWithLeads"][number]) => void;
}) {
 if (calls.length === 0) {
 return <EmptyState icon={<PhoneCall size={20} />} text="No app-recorded calls in this workspace." />;
 }
 return (
 <TableCard>
 <table className="w-full text-xs text-left min-w-[700px]">
 <thead>
 <tr className="border-b border-[var(--line-2)] bg-[var(--surface-3)]">
 <Th>Lead</Th>
 <Th>Direction</Th>
 <Th>Status</Th>
 <Th>Duration</Th>
 <Th>Recording</Th>
 <Th>Transcription</Th>
 <Th>When</Th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[var(--line)]">
 {calls.map((c) => {
 const isInbound = c.direction === "inbound";
 return (
 <tr
 key={c.id}
 onClick={() => onRowClick(c)}
 className="hover:bg-[var(--surface-3)]/60 transition-colors cursor-pointer"
 >
 <Td>
 <div className="flex flex-col">
 <span className="font-semibold text-[var(--ink)]">{c.lead_name || "Unknown lead"}</span>
 <span className="text-[10px] text-[var(--ink-mute)] font-mono">{c.lead_phone || "—"}</span>
 </div>
 </Td>
 <Td>
 <DirectionBadge inbound={isInbound} />
 </Td>
 <Td>
 <StatusPill label={c.status} />
 </Td>
 <Td>
 <span className="font-mono text-[var(--ink-mute)]">{formatDuration(c.duration_seconds)}</span>
 </Td>
 <Td>
 {c.recording_url ? <FileAudio size={14} className="text-[var(--viol-400)]" /> : <span className="text-[var(--ink-faint)]">—</span>}
 </Td>
 <Td>
 {(c.transcription_text || c.transcription) ? <FileText size={14} className="text-emerald-500" /> : <span className="text-[var(--ink-faint)]">—</span>}
 </Td>
 <Td>
 <span className="text-[10px] text-[var(--ink-mute)]">{formatDate(c.started_at || c.created_at)}</span>
 </Td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </TableCard>
 );
}

// ─── Live messages table ─────────────────────────────────────────────────

function LiveMessagesTable({
 messages,
 onRowClick,
}: {
 messages: TwilioDashboardData["recentMessages"];
 onRowClick: (m: TwilioDashboardData["recentMessages"][number]) => void;
}) {
 if (messages.length === 0) {
 return <EmptyState icon={<MessageSquare size={20} />} text="No recent SMS on this account." small />;
 }
 return (
 <TableCard>
 <table className="w-full text-xs text-left min-w-[400px]">
 <thead>
 <tr className="border-b border-[var(--line-2)] bg-[var(--surface-3)]">
 <Th>From → To</Th>
 <Th>Body</Th>
 <Th>Status</Th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[var(--line)]">
 {messages.map((m) => (
 <tr
 key={m.sid}
 onClick={() => onRowClick(m)}
 className="hover:bg-[var(--surface-3)]/60 transition-colors cursor-pointer"
 >
 <Td>
 <div className="flex flex-col gap-0.5">
 <span className="font-mono text-[10px] text-[var(--ink-mute)]">{m.from || "—"}</span>
 <span className="font-mono text-[10px]">→ {m.to || "—"}</span>
 </div>
 </Td>
 <Td>
 <span className="line-clamp-2 text-[var(--ink-mute)] text-[11px]">
 {m.body || <span className="italic text-[var(--ink-faint)]">no body</span>}
 </span>
 </Td>
 <Td>
 <StatusPill label={m.status} />
 </Td>
 </tr>
 ))}
 </tbody>
 </table>
 </TableCard>
 );
}

// ─── DB messages table ───────────────────────────────────────────────────

function DbMessagesTable({
 messages,
 onRowClick,
}: {
 messages: TwilioDashboardData["dbMessages"];
 onRowClick: (m: TwilioDashboardData["dbMessages"][number]) => void;
}) {
 if (messages.length === 0) {
 return <EmptyState icon={<MessageSquare size={20} />} text="No app-recorded messages in this workspace." small />;
 }
 return (
 <TableCard>
 <table className="w-full text-xs text-left min-w-[400px]">
 <thead>
 <tr className="border-b border-[var(--line-2)] bg-[var(--surface-3)]">
 <Th>Lead</Th>
 <Th>Body</Th>
 <Th>Channel</Th>
 <Th>Status</Th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[var(--line)]">
 {messages.map((m) => (
 <tr
 key={m.id}
 onClick={() => onRowClick(m)}
 className="hover:bg-[var(--surface-3)]/60 transition-colors cursor-pointer"
 >
 <Td>
 <div className="flex flex-col">
 <span className="font-semibold text-[var(--ink)]">{m.lead_name || "—"}</span>
 <span className="text-[10px] text-[var(--ink-mute)] font-mono">{m.lead_phone || ""}</span>
 </div>
 </Td>
 <Td>
 <span className="line-clamp-2 text-[var(--ink-mute)] text-[11px]">
 {m.body || <span className="italic text-[var(--ink-faint)]">no body</span>}
 </span>
 </Td>
 <Td>
 <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-mute)]">
 {m.channel || "—"}
 </span>
 </Td>
 <Td>
 <StatusPill label={m.external_status || (m.direction === "outbound" ? "sent" : "received")} />
 </Td>
 </tr>
 ))}
 </tbody>
 </table>
 </TableCard>
 );
}

// ─── Recordings table ────────────────────────────────────────────────────

function RecordingsTable({
 recordings,
 onRowClick,
}: {
 recordings: TwilioDashboardData["recentRecordings"];
 onRowClick: (r: TwilioDashboardData["recentRecordings"][number]) => void;
}) {
 if (recordings.length === 0) {
 return <EmptyState icon={<FileAudio size={20} />} text="No recordings yet." small />;
 }
 return (
 <TableCard>
 <table className="w-full text-xs text-left min-w-[400px]">
 <thead>
 <tr className="border-b border-[var(--line-2)] bg-[var(--surface-3)]">
 <Th>SID</Th>
 <Th>Call SID</Th>
 <Th>Duration</Th>
 <Th>Source</Th>
 <Th>Status</Th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[var(--line)]">
 {recordings.map((r) => (
 <tr
 key={r.sid}
 onClick={() => onRowClick(r)}
 className="hover:bg-[var(--surface-3)]/60 transition-colors cursor-pointer"
 >
 <Td>
 <span className="font-mono text-[10px] text-[var(--ink-mute)]">{r.sid}</span>
 </Td>
 <Td>
 <span className="font-mono text-[10px] text-[var(--ink-mute)]">{r.callSid || "—"}</span>
 </Td>
 <Td>
 <span className="font-mono text-[var(--ink-mute)]">{formatDuration(r.duration)}</span>
 </Td>
 <Td>
 <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-mute)]">
 {r.source || "—"}
 </span>
 </Td>
 <Td>
 <StatusPill label={r.status} />
 </Td>
 </tr>
 ))}
 </tbody>
 </table>
 </TableCard>
 );
}

// ─── Transcriptions table ────────────────────────────────────────────────

function TranscriptionsTable({
 transcriptions,
 onRowClick,
}: {
 transcriptions: TwilioDashboardData["recentTranscriptions"];
 onRowClick: (t: TwilioDashboardData["recentTranscriptions"][number]) => void;
}) {
 if (transcriptions.length === 0) {
 return <EmptyState icon={<FileText size={20} />} text="No transcriptions yet." small />;
 }
 return (
 <TableCard>
 <table className="w-full text-xs text-left min-w-[400px]">
 <thead>
 <tr className="border-b border-[var(--line-2)] bg-[var(--surface-3)]">
 <Th>Recording</Th>
 <Th>Text preview</Th>
 <Th>Duration</Th>
 <Th>Status</Th>
 </tr>
 </thead>
 <tbody className="divide-y divide-[var(--line)]">
 {transcriptions.map((t) => (
 <tr
 key={t.sid}
 onClick={() => onRowClick(t)}
 className="hover:bg-[var(--surface-3)]/60 transition-colors cursor-pointer"
 >
 <Td>
 <span className="font-mono text-[10px] text-[var(--ink-mute)]">{t.recordingSid || "—"}</span>
 </Td>
 <Td>
 <span className="line-clamp-2 text-[var(--ink-mute)] text-[11px]">
 {t.text || <span className="italic text-[var(--ink-faint)]">no text</span>}
 </span>
 </Td>
 <Td>
 <span className="font-mono text-[var(--ink-mute)]">{formatDuration(t.duration)}</span>
 </Td>
 <Td>
 <StatusPill label={t.status} />
 </Td>
 </tr>
 ))}
 </tbody>
 </table>
 </TableCard>
 );
}

// ─── Usage bars (last 30 days) ──────────────────────────────────────────

function UsageBars({ usage }: { usage: TwilioDashboardData["usageLastMonth"] }) {
 if (usage.length === 0) {
 return <EmptyState icon={<Coins size={20} />} text="No usage data for the last 30 days." />;
 }
 // Take top 12 by price so the bar chart stays readable
 const top = [...usage]
 .sort((a, b) => (parseFloat(b.price || "0") || 0) - (parseFloat(a.price || "0") || 0))
 .slice(0, 12);
 const maxPrice = Math.max(...top.map((u) => parseFloat(u.price || "0") || 0), 0.0001);

 return (
 <div className="bg-[var(--surface-2)]/60 backdrop-blur-md border border-[var(--line-2)] rounded-2xl p-5 shadow-xl space-y-3">
 {top.map((u) => {
 const price = parseFloat(u.price || "0") || 0;
 const pct = (price / maxPrice) * 100;
 return (
 <div key={`${u.category}-${u.description}`} className="space-y-1">
 <div className="flex items-center justify-between text-[11px]">
 <span className="font-semibold text-[var(--ink)] truncate pr-3">
 {u.description || u.category}
 </span>
 <span className="font-mono text-[var(--ink-mute)] whitespace-nowrap">
 {formatPrice(u.price, u.priceUnit)}
 {u.usage && (
 <span className="text-[var(--ink-faint)] ml-2">
 ({u.usage} {u.usageUnit || ""})
 </span>
 )}
 </span>
 </div>
 <div className="h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
 <div
 className="h-full bg-gradient-to-r from-[var(--viol-400)] to-cyan-400 transition-all"
 style={{ width: `${pct}%` }}
 />
 </div>
 </div>
 );
 })}
 </div>
 );
}

// ─── Shared building blocks ──────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
 return (
 <th className="px-4 py-3 font-bold uppercase tracking-wider text-[var(--ink-mute)] text-[10px]">
 {children}
 </th>
 );
}

function Td({ children }: { children: React.ReactNode }) {
 return <td className="px-4 py-3 align-top">{children}</td>;
}

function TableCard({ children }: { children: React.ReactNode }) {
 return (
 <div className="bg-[var(--surface-2)]/60 border border-[var(--line-2)] rounded-2xl overflow-hidden shadow-xl">
 <div className="overflow-x-auto custom-scrollbar">{children}</div>
 </div>
 );
}

function DirectionBadge({ inbound }: { inbound: boolean }) {
 return (
 <span
 className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border"
 style={{
 background: inbound ? "rgba(16,185,129,0.08)" : "rgba(59,130,246,0.08)",
 color: inbound ? "var(--mint)" : "var(--blue-400)",
 borderColor: inbound ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)",
 }}
 >
 {inbound ? <PhoneIncoming size={9} /> : <PhoneOutgoing size={9} />}
 {inbound ? "Inbound" : "Outbound"}
 </span>
 );
}

function EmptyState({
 icon,
 text,
 small,
}: {
 icon: React.ReactNode;
 text: string;
 small?: boolean;
}) {
 return (
 <div
 className={
 (small
 ? "bg-[var(--surface-2)]/40 border border-[var(--line)] rounded-xl p-6 text-center"
 : "bg-[var(--surface-2)]/60 backdrop-blur-md border border-[var(--line-2)] rounded-2xl p-12 text-center shadow-xl") +
 " text-[var(--ink-faint)]"
 }
 >
 <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[var(--surface-3)] mb-2">
 {icon}
 </div>
 <p className="text-xs">{text}</p>
 </div>
 );
}

// ─── Detail drawer ───────────────────────────────────────────────────────

function DetailDrawer({
 item,
 data,
 onClose,
}: {
 item: Exclude<DrawerItem, null>;
 data: TwilioDashboardData;
 onClose: () => void;
}) {
 let title = "";
 let body: React.ReactNode = null;

 if (item.kind === "liveCall") {
 const c = data.recentCalls.find((x) => x.sid === item.sid);
 if (!c) return null;
 title = `Call ${c.sid}`;
 body = (
 <div className="space-y-4">
 <KeyValueGrid
 items={[
 ["SID", c.sid, "mono"],
 ["From", c.from, "mono"],
 ["To", c.to, "mono"],
 ["Direction", c.direction || "—"],
 ["Status", c.status || "—"],
 ["Duration", formatDuration(c.duration)],
 ["Started", formatDate(c.startTime)],
 ["Ended", formatDate(c.endTime)],
 ["Price", formatPrice(c.price, c.priceUnit)],
 ]}
 />
 {c.hasRecording && (
 <div>
 <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-mute)] mb-2 flex items-center gap-1.5">
 <FileAudio size={12} /> Recording
 </p>
 <RecordingPlayer
 url={`https://api.twilio.com/2010-04-01/Accounts/${data.account?.sid}/Recordings/${c.sid}`}
 />
 </div>
 )}
 </div>
 );
 } else if (item.kind === "appCall") {
 const c = data.callsWithLeads.find((x) => x.id === item.id);
 if (!c) return null;
 title = `App call · ${c.lead_name || c.lead_phone || c.id}`;
 body = (
 <div className="space-y-4">
 <KeyValueGrid
 items={[
 ["Call ID", c.id, "mono"],
 ["Twilio SID", c.twilio_call_sid || "—", "mono"],
 ["Lead", c.lead_name || "—"],
 ["Lead phone", c.lead_phone || "—", "mono"],
 ["Direction", c.direction || "—"],
 ["Status", c.status || "—"],
 ["Duration", formatDuration(c.duration_seconds)],
 ["Started", formatDate(c.started_at)],
 ["Ended", formatDate(c.ended_at)],
 ]}
 />
 {c.recording_url && (
 <div>
 <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-mute)] mb-2 flex items-center gap-1.5">
 <FileAudio size={12} /> Recording
 </p>
 <RecordingPlayer url={c.recording_url} />
 </div>
 )}
 {(c.transcription_text || c.transcription) && (
 <div>
 <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-mute)] mb-2 flex items-center gap-1.5">
 <FileText size={12} /> Transcription
 {c.transcription_status && (
 <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
 {c.transcription_status}
 </span>
 )}
 </p>
 <div className="max-h-48 overflow-y-auto p-3 rounded-lg bg-[var(--surface-3)] border border-[var(--line)] text-xs text-[var(--ink)] leading-relaxed whitespace-pre-wrap">
 {c.transcription_text || c.transcription}
 </div>
 </div>
 )}
 </div>
 );
 } else if (item.kind === "liveMessage") {
 const m = data.recentMessages.find((x) => x.sid === item.sid);
 if (!m) return null;
 title = `SMS ${m.sid}`;
 body = (
 <div className="space-y-4">
 <KeyValueGrid
 items={[
 ["SID", m.sid, "mono"],
 ["From", m.from, "mono"],
 ["To", m.to, "mono"],
 ["Direction", m.direction || "—"],
 ["Status", m.status || "—"],
 ["Price", formatPrice(m.price, m.priceUnit)],
 ["Sent", formatDate(m.dateCreated)],
 ["Error code", m.errorCode ? String(m.errorCode) : "—"],
 ["Error message", m.errorMessage || "—"],
 ["Media", m.numMedia || "0"],
 ]}
 />
 <div>
 <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-mute)] mb-2">
 Body
 </p>
 <div className="p-3 rounded-lg bg-[var(--surface-3)] border border-[var(--line)] text-xs text-[var(--ink)] leading-relaxed whitespace-pre-wrap">
 {m.body || <span className="italic text-[var(--ink-faint)]">no body</span>}
 </div>
 </div>
 </div>
 );
 } else if (item.kind === "dbMessage") {
 const m = data.dbMessages.find((x) => x.id === item.id);
 if (!m) return null;
 title = `Message · ${m.lead_name || m.lead_phone || m.id}`;
 body = (
 <div className="space-y-4">
 <KeyValueGrid
 items={[
 ["ID", m.id, "mono"],
 ["Lead", m.lead_name || "—"],
 ["Lead phone", m.lead_phone || "—", "mono"],
 ["Channel", m.channel || "—"],
 ["Direction", m.direction || "—"],
 ["External SID", m.external_id || "—", "mono"],
 ["External status", m.external_status || "—"],
 ["Sent at", formatDate(m.sent_at)],
 ]}
 />
 <div>
 <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-mute)] mb-2">
 Body
 </p>
 <div className="p-3 rounded-lg bg-[var(--surface-3)] border border-[var(--line)] text-xs text-[var(--ink)] leading-relaxed whitespace-pre-wrap">
 {m.body || <span className="italic text-[var(--ink-faint)]">no body</span>}
 </div>
 </div>
 </div>
 );
 } else if (item.kind === "recording") {
 const r = data.recentRecordings.find((x) => x.sid === item.sid);
 if (!r) return null;
 title = `Recording ${r.sid}`;
 body = (
 <div className="space-y-4">
 <KeyValueGrid
 items={[
 ["SID", r.sid, "mono"],
 ["Call SID", r.callSid || "—", "mono"],
 ["Duration", formatDuration(r.duration)],
 ["Channels", r.channels?.toString() || "—"],
 ["Source", r.source || "—"],
 ["Status", r.status || "—"],
 ["Created", formatDate(r.dateCreated)],
 ]}
 />
 <div>
 <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-mute)] mb-2 flex items-center gap-1.5">
 <FileAudio size={12} /> Audio
 </p>
 <RecordingPlayer
 url={`https://api.twilio.com/2010-04-01/Accounts/${data.account?.sid}/Recordings/${r.sid}`}
 />
 </div>
 </div>
 );
 } else if (item.kind === "transcription") {
 const t = data.recentTranscriptions.find((x) => x.sid === item.sid);
 if (!t) return null;
 title = `Transcription ${t.sid}`;
 body = (
 <div className="space-y-4">
 <KeyValueGrid
 items={[
 ["SID", t.sid, "mono"],
 ["Recording SID", t.recordingSid || "—", "mono"],
 ["Status", t.status || "—"],
 ["Duration", formatDuration(t.duration)],
 ["Created", formatDate(t.dateCreated)],
 ]}
 />
 <div>
 <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-mute)] mb-2 flex items-center gap-1.5">
 <FileText size={12} /> Text
 </p>
 <div className="max-h-64 overflow-y-auto p-3 rounded-lg bg-[var(--surface-3)] border border-[var(--line)] text-xs text-[var(--ink)] leading-relaxed whitespace-pre-wrap">
 {t.text || <span className="italic text-[var(--ink-faint)]">no text</span>}
 </div>
 </div>
 {t.recordingSid && (
 <div>
 <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-mute)] mb-2 flex items-center gap-1.5">
 <FileAudio size={12} /> Audio
 </p>
 <RecordingPlayer
 url={`https://api.twilio.com/2010-04-01/Accounts/${data.account?.sid}/Recordings/${t.recordingSid}`}
 />
 </div>
 )}
 </div>
 );
 } else if (item.kind === "phoneNumber") {
 const n = data.incomingPhoneNumbers.find((x) => x.sid === item.sid);
 if (!n) return null;
 title = `Phone number ${n.phoneNumber}`;
 body = (
 <div className="space-y-4">
 <KeyValueGrid
 items={[
 ["Phone number", n.phoneNumber, "mono"],
 ["SID", n.sid, "mono"],
 ["Friendly name", n.friendlyName || "—"],
 ["Status", n.status || "—"],
 ["Voice URL", n.voiceUrl || "—", "mono"],
 ["SMS URL", n.smsUrl || "—", "mono"],
 ["Created", formatDate(n.dateCreated)],
 ]}
 />
 <div>
 <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-mute)] mb-2">
 Capabilities
 </p>
 <div className="flex flex-wrap gap-1.5">
 <Cap label="Voice" on={n.capabilities.voice} />
 <Cap label="SMS" on={n.capabilities.sms} />
 <Cap label="MMS" on={n.capabilities.mms} />
 </div>
 </div>
 </div>
 );
 }

 return (
 <div
 className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
 onClick={(e) => {
 if (e.target === e.currentTarget) onClose();
 }}
 >
 <div className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--surface)] border border-[var(--line-2)] rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl animate-scale-up custom-scrollbar">
 <div className="flex justify-between items-start mb-4 gap-3">
 <div className="min-w-0">
 <h3 className="text-base font-bold text-[var(--ink)] truncate">{title}</h3>
 <p className="text-[11px] text-[var(--ink-mute)] mt-0.5">Twilio detail</p>
 </div>
 <button
 onClick={onClose}
 className="p-1 rounded-lg hover:bg-[var(--surface-3)] text-[var(--ink-mute)] flex-shrink-0"
 >
 <X size={18} />
 </button>
 </div>
 {body}
 </div>
 </div>
 );
}

// ─── RecordingPlayer ─────────────────────────────────────────────────────

function RecordingPlayer({ url }: { url: string }) {
 const candidates = React.useMemo(() => {
 if (!url) return [];
 if (/\.[a-z0-9]{2,4}$/i.test(url)) return [url];
 return [`${url}.mp3`, `${url}.wav`];
 }, [url]);

 if (!candidates.length) return null;

 return (
 <div className="space-y-2">
 <audio controls className="w-full h-9 focus:outline-none">
 {candidates.map((src) => (
 <source key={src} src={src} />
 ))}
 </audio>
 <a
 href={candidates[0]}
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--viol-400)] hover:underline"
 >
 Open in new tab ↗
 </a>
 </div>
 );
}
