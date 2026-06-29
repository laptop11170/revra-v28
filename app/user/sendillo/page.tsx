"use client";

// /user/sendillo — Sendillo numbers + SMS log + 1-to-1 SMS composer.
//
// Three tabs:
// 1. "Send SMS" — pick a USA sender, type any E.164 destination (India +91, US +1…),
// write a body, hit send. Message is logged immediately; webhooks update status.
// 2. "Numbers" — every registered Sendillo number for the workspace with its SMS log.
// 3. "How it works" — end-to-end diagram of the send pipeline.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/layouts/Shell";
import {
 Phone,
 RefreshCw,
 Loader2,
 MessageSquare,
 Send,
 Inbox,
 ChevronDown,
 ChevronRight,
 AlertCircle,
 Search,
 CheckCircle2,
 XCircle,
 Info,
} from "lucide-react";

interface SendilloNumber {
 id: string;
 phone_number: string;
 label: string | null;
 agent_id: string;
 is_active: boolean;
 agent?: { id: string; full_name: string; email: string } | null;
}

interface SendilloMessage {
 id: string;
 lead_id: string | null;
 channel: string;
 direction: "outbound" | "inbound";
 body: string | null;
 external_id: string | null;
 external_status: string | null;
 external_error: string | null;
 external_status_detail: string | null;
 provider_message_id: string | null;
 sent_at: string | null;
 created_at: string | null;
 campaign_id: string | null;
 lead?: { id: string; first_name: string; last_name: string; phone: string } | null;
}

type Tab = "compose" | "numbers" | "how";

function StatusPill({ status }: { status: string | null }) {
 const s = (status ?? "").toLowerCase();
 const map: Record<string, { label: string; color: string; bg: string }> = {
 delivered: { label: "Delivered", color: "var(--mint)", bg: "rgba(16,185,129,0.15)" },
 sent: { label: "Sent", color: "var(--cyan)", bg: "rgba(6,182,212,0.15)" },
 failed: { label: "Failed", color: "hsl(var(--destructive))", bg: "hsl(var(--destructive)/0.15)" },
 pending: { label: "Pending", color: "var(--amber)", bg: "rgba(245,158,11,0.15)" },
 received: { label: "Received", color: "var(--viol-400)", bg: "rgba(139,92,246,0.15)" },
 };
 const cfg = map[s] ?? { label: status ?? "—", color: "var(--ink-mute)", bg: "var(--surface-3)" };
 return (
 <span style={{
 fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: "var(--radius-md)",
 background: cfg.bg, color: cfg.color,
 }}>
 {cfg.label}
 </span>
 );
}

// Normalize a stored Sendillo number into strict E.164 (+1XXXXXXXXXX for US/Canada).
// The sendillo_phone_numbers table stores values inconsistently — sometimes
// "+14074294442", sometimes "14074294442", sometimes with spaces/dashes —
// so we always coerce before sending to the API.
function toE164(raw: string): string {
 if (!raw) return "";
 const trimmed = raw.trim().replace(/[\s\-()]/g, "");
 if (trimmed.startsWith("+")) return trimmed;
 // 10-digit US/Canada number → prepend +1
 if (/^\d{10}$/.test(trimmed)) return `+1${trimmed}`;
 // 11 digits starting with 1 → +1XXXXXXXXXX
 if (/^1\d{10}$/.test(trimmed)) return `+${trimmed}`;
 return `+${trimmed}`;
}

// Same idea but for arbitrary destinations typed by the user.
function normalizeDestination(raw: string): string {
 return raw.trim().replace(/[\s\-()]/g, "");
}

// Renders the failure reason + provider message id + status detail under a
// message body. Only shown for outbound messages with non-success status.
function MessageDetail({ m }: { m: SendilloMessage }) {
 if (m.direction !== "outbound") return null;
 const isFailure = (m.external_status ?? "").toLowerCase() === "failed";
 if (!isFailure && !m.external_status_detail && !m.provider_message_id) return null;
 return (
 <div style={{
 marginTop: 6, padding: "6px 8px", borderRadius: 6,
 background: isFailure ? "hsl(var(--destructive)/0.08)" : "var(--surface-3)",
 border: `1px solid ${isFailure ? "hsl(var(--destructive)/0.25)" : "var(--line)"}`,
 display: "flex", flexDirection: "column", gap: 3,
 }}>
 {isFailure && m.external_error && (
 <div style={{ display: "flex", alignItems: "flex-start", gap: 5, fontSize: 11.5, color: "hsl(var(--destructive))", fontWeight: 500 }}>
 <XCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} />
 <span style={{ wordBreak: "break-word" }}>{m.external_error}</span>
 </div>
 )}
 {!isFailure && m.external_status_detail && (
 <div style={{ fontSize: 10.5, color: "var(--ink-mute)" }}>{m.external_status_detail}</div>
 )}
 {m.provider_message_id && (
 <div style={{ fontSize: 10, color: "var(--ink-faint)", fontFamily: "monospace" }}>
 ID: {m.provider_message_id}
 </div>
 )}
 </div>
 );
}

function formatDate(iso: string | null): string {
 if (!iso) return "—";
 const d = new Date(iso);
 return d.toLocaleString("en-US", {
 month: "short", day: "numeric",
 hour: "numeric", minute: "2-digit",
 });
}

export default function UserSendilloPage() {
 // ── Shared state ──
 const [tab, setTab] = useState<Tab>("compose");
 const [numbers, setNumbers] = useState<SendilloNumber[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);

 // ── Numbers tab state ──
 const [messagesByNumber, setMessagesByNumber] = useState<Record<string, SendilloMessage[]>>({});
 const [expanded, setExpanded] = useState<string | null>(null);
 const [search, setSearch] = useState("");

 // ── Compose tab state ──
 const [fromNumber, setFromNumber] = useState("");
 const [toNumber, setToNumber] = useState("+91");
 const [body, setBody] = useState("");
 const [sending, setSending] = useState(false);
 const [sendResult, setSendResult] = useState<{ ok: boolean; msg?: string } | null>(null);

 // ── Loaders ──
 const fetchNumbers = useCallback(async () => {
 try {
 const res = await fetch("/api/sendillo/numbers?type=registered");
 if (!res.ok) {
 setError("Failed to load numbers");
 setNumbers([]);
 return;
 }
 const data = await res.json();
 setNumbers((data.numbers ?? []) as SendilloNumber[]);
 } catch (err) {
 setError(err instanceof Error ? err.message : "Something went wrong");
 }
 }, []);

 const fetchMessages = useCallback(async (phoneNumber: string) => {
 const res = await fetch(`/api/sendillo/messages?phone_number=${encodeURIComponent(phoneNumber)}&limit=200`);
 if (!res.ok) return;
 const data = await res.json();
 setMessagesByNumber((prev) => ({ ...prev, [phoneNumber]: data.messages ?? [] }));
 }, []);

 const refresh = useCallback(async () => {
 setLoading(true);
 setError(null);
 await fetchNumbers();
 setLoading(false);
 }, [fetchNumbers]);

 useEffect(() => { refresh(); }, [refresh]);

 useEffect(() => {
 if (expanded && !messagesByNumber[expanded]) {
 fetchMessages(expanded);
 }
 }, [expanded, messagesByNumber, fetchMessages]);

 // Light polling: every 5s, refetch the currently-expanded number's SMS log
 // so webhook-driven status changes (delivered / failed / inbound reply)
 // appear live. Same cadence as the /user/conversations page.
 useEffect(() => {
 if (!expanded) return;
 const t = setInterval(() => fetchMessages(expanded), 5000);
 return () => clearInterval(t);
 }, [expanded, fetchMessages]);

 // Default the "from" picker to the first active number once they load.
 useEffect(() => {
 if (!fromNumber && numbers.length > 0) {
 const firstActive = numbers.find((n) => n.is_active) ?? numbers[0];
 setFromNumber(toE164(firstActive.phone_number));
 }
 }, [numbers, fromNumber]);

 // Auto-fetch the "Recent" panel for the currently selected from-number
 useEffect(() => {
 if (fromNumber && messagesByNumber[fromNumber] === undefined) {
 fetchMessages(fromNumber);
 }
 }, [fromNumber, messagesByNumber, fetchMessages]);

 // Poll every 5s while on Compose tab so the "Recent" panel shows webhook
 // updates (delivery + inbound replies) in near real time. Same cadence as
 // the /user/conversations page.
 useEffect(() => {
 if (tab !== "compose" || !fromNumber) return;
 const t = setInterval(() => fetchMessages(fromNumber), 5000);
 return () => clearInterval(t);
 }, [tab, fromNumber, fetchMessages]);

 // ── Derived ──
 const activeNumbers = useMemo(() => numbers.filter((n) => n.is_active), [numbers]);

 const summary = useMemo(() => {
 const out: Record<string, { sent: number; received: number; delivered: number; failed: number }> = {};
 for (const n of numbers) {
 const list = messagesByNumber[n.phone_number] ?? [];
 const s = list.reduce(
 (acc, m) => ({
 sent: acc.sent + (m.direction === "outbound" ? 1 : 0),
 received: acc.received + (m.direction === "inbound" ? 1 : 0),
 delivered: acc.delivered + (m.external_status === "delivered" ? 1 : 0),
 failed: acc.failed + (m.external_status === "failed" ? 1 : 0),
 }),
 { sent: 0, received: 0, delivered: 0, failed: 0 }
 );
 out[n.phone_number] = s;
 }
 return out;
 }, [numbers, messagesByNumber]);

 const filteredNumbers = useMemo(() => {
 if (!search) return numbers;
 const q = search.toLowerCase();
 return numbers.filter(
 (n) =>
 n.phone_number.toLowerCase().includes(q) ||
 (n.label ?? "").toLowerCase().includes(q) ||
 (n.agent?.full_name ?? "").toLowerCase().includes(q)
 );
 }, [numbers, search]);

 const totalSent = numbers.reduce((acc, n) => acc + (summary[n.phone_number]?.sent ?? 0), 0);
 const totalReceived = numbers.reduce((acc, n) => acc + (summary[n.phone_number]?.received ?? 0), 0);
 const totalDelivered = numbers.reduce((acc, n) => acc + (summary[n.phone_number]?.delivered ?? 0), 0);

 // ── Send handler ──
 async function handleSend() {
 setSendResult(null);
 setSending(true);
 try {
 const fromE164 = toE164(fromNumber);
 const toClean = normalizeDestination(toNumber);
 const res = await fetch("/api/sendillo/messages/send", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ from: fromE164, to: toClean, body }),
 });
 const data = await res.json();
 if (res.ok) {
 setSendResult({ ok: true, msg: `Sent — message id ${data.message?.id?.slice(0, 8) ?? "—"}` });
 setBody("");
 // Refresh the number's log so the new message shows up immediately.
 if (messagesByNumber[fromNumber]) {
 setMessagesByNumber((prev) => {
 const next = { ...prev };
 delete next[fromNumber];
 return next;
 });
 }
 } else {
 setSendResult({ ok: false, msg: data.error ?? data.warning ?? "Send failed" });
 }
 } catch (err) {
 setSendResult({ ok: false, msg: err instanceof Error ? err.message : "Network error" });
 } finally {
 setSending(false);
 }
 }

 const charCount = body.length;
 const segments = Math.ceil(charCount / 160) || 1;

 // ── Render ──
 return (
 <Shell role="user">
 <div style={{ padding: "32px 40px" }}>
 {/* Header */}
 <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
 <div>
 <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.005em" }}>
 Sendillo
 </h1>
 <p style={{ fontSize: 13, color: "var(--ink-mute)", marginTop: 4 }}>
 Send SMS, browse numbers, and watch delivery in real time.
 </p>
 </div>
 <button className="btn-ghost" style={{ padding: "8px 12px", fontSize: 12 }} onClick={refresh} title="Refresh">
 <RefreshCw size={14} />
 </button>
 </div>

 {/* Tabs */}
 <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
 {([
 { key: "compose", label: "Send SMS" },
 { key: "numbers", label: "Numbers" },
 { key: "how", label: "How it works" },
 ] as { key: Tab; label: string }[]).map((t) => (
 <button
 key={t.key}
 onClick={() => setTab(t.key)}
 style={{
 padding: "8px 16px",
 borderRadius: "var(--radius-md)",
 fontSize: 13,
 fontWeight: 500,
 cursor: "pointer",
 border: "none",
 background: tab === t.key ? "var(--surface-2)" : "transparent",
 color: tab === t.key ? "var(--ink)" : "var(--ink-mute)",
 boxShadow: tab === t.key ? "inset 0 0 0 1px var(--line-2)" : "none",
 transition: "all 0.12s",
 }}
 >
 {t.label}
 </button>
 ))}
 </div>

 {/* ─────────── Compose tab ─────────── */}
 {tab === "compose" && (
 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
 {/* Composer card */}
 <div className="card" style={{ padding: 20, borderRadius: "var(--radius-xl)", border: "1px solid var(--line)", background: "rgba(19,24,38,0.5)" }}>
 <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
 <div style={{ width: 32, height: 32, borderRadius: "var(--radius-md)", background: "rgba(6,182,212,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
 <Send size={15} style={{ color: "var(--cyan)" }} />
 </div>
 <div>
 <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>New SMS</div>
 <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>Send from your workspace's Sendillo number</div>
 </div>
 </div>

 {activeNumbers.length === 0 ? (
 <div style={{ padding: 16, borderRadius: "var(--radius-lg)", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "var(--amber)", fontSize: 13 }}>
 No active Sendillo numbers are registered for your workspace yet. Ask your superadmin to register one first.
 </div>
 ) : (
 <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
 {/* From */}
 <div>
 <label className="input-label">From (your USA number)</label>
 <select className="input" style={{ appearance: "none" }} value={fromNumber} onChange={(e) => setFromNumber(e.target.value)}>
 {activeNumbers.map((n) => {
 const e164 = toE164(n.phone_number);
 return (
 <option key={n.id} value={e164}>
 {e164}{n.label ? ` — ${n.label}` : ""}
 </option>
 );
 })}
 </select>
 <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--ink-mute)" }}>
 Only numbers registered to your workspace are shown. {activeNumbers.length} active.
 </div>
 </div>

 {/* To */}
 <div>
 <label className="input-label">To (destination — include country code)</label>
 <input
 className="input"
 value={toNumber}
 onChange={(e) => setToNumber(e.target.value)}
 placeholder="+91XXXXXXXXXX (India) or +1XXXXXXXXXX (US/Canada)"
 />
 <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--ink-mute)" }}>
 India = <code style={{ background: "var(--surface-3)", padding: "1px 4px", borderRadius: 3 }}>+91</code>, US/Canada = <code style={{ background: "var(--surface-3)", padding: "1px 4px", borderRadius: 3 }}>+1</code>, UK = <code style={{ background: "var(--surface-3)", padding: "1px 4px", borderRadius: 3 }}>+44</code>.
 </div>
 </div>

 {/* Body */}
 <div>
 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
 <label className="input-label" style={{ marginBottom: 0 }}>Message</label>
 <span style={{ fontSize: 11, color: charCount > 160 ? "var(--amber)" : "var(--ink-faint)" }}>
 {charCount}/160 ({segments} segment{segments > 1 ? "s" : ""})
 </span>
 </div>
 <textarea
 className="input"
 value={body}
 onChange={(e) => setBody(e.target.value)}
 placeholder="Hi! This is RevRa reaching out — reply STOP to opt out."
 style={{ minHeight: 110, resize: "vertical" }}
 maxLength={1600}
 />
 </div>

 <button
 className="btn-primary"
 style={{ padding: "10px 16px", fontSize: 13, alignSelf: "flex-start" }}
 onClick={handleSend}
 disabled={sending || !fromNumber || !toNumber || !body.trim()}
 >
 {sending ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite", marginRight: 6 }} /> : <Send size={13} style={{ marginRight: 6 }} />}
 {sending ? "Sending…" : "Send SMS"}
 </button>

 {sendResult && (
 <div style={{
 display: "flex", alignItems: "flex-start", gap: 8,
 padding: "10px 14px", borderRadius: 8,
 background: sendResult.ok ? "rgba(16,185,129,0.1)" : "hsl(var(--destructive)/0.1)",
 color: sendResult.ok ? "var(--mint)" : "hsl(var(--destructive))",
 fontSize: 13, border: `1px solid ${sendResult.ok ? "rgba(16,185,129,0.3)" : "hsl(var(--destructive)/0.3)"}`,
 }}>
 {sendResult.ok ? <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 1 }} /> : <XCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />}
 <span>{sendResult.msg}</span>
 </div>
 )}
 </div>
 )}
 </div>

 {/* Right rail: the most recent outbound from the selected "from" number */}
 <div className="card" style={{ padding: 20, borderRadius: "var(--radius-xl)", border: "1px solid var(--line)", background: "rgba(19,24,38,0.5)" }}>
 <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
 <div style={{ width: 32, height: 32, borderRadius: "var(--radius-md)", background: "rgba(6,182,212,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
 <MessageSquare size={15} style={{ color: "var(--cyan)" }} />
 </div>
 <div>
 <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Recent from {fromNumber || "—"}</div>
 <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>Outbound + inbound from this sender</div>
 </div>
 </div>
 {fromNumber && (messagesByNumber[fromNumber] === undefined ? (
 <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
 <Loader2 size={16} style={{ color: "var(--ink-mute)", animation: "spin 1s linear infinite" }} />
 <span style={{ marginLeft: 8, color: "var(--ink-mute)", fontSize: 13 }}>Loading…</span>
 </div>
 ) : (messagesByNumber[fromNumber] ?? []).length === 0 ? (
 <div style={{ padding: 24, textAlign: "center", color: "var(--ink-mute)", fontSize: 13 }}>
 No messages yet on this number. Send one to see it here.
 </div>
 ) : (
 <div style={{ maxHeight: 480, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
 {(messagesByNumber[fromNumber] ?? []).slice(0, 15).map((m) => {
 const lead = m.lead ?? null;
 const isOutbound = m.direction === "outbound";
 // For inbound rows, the sender's phone is stored in external_id by the
 // webhook handler; that's the best fallback when we don't have a lead
 // row joined in.
 const name = lead
 ? `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim() || lead.phone
 : isOutbound
 ? toNumber
 : m.external_id ?? "Unknown";
 return (
 <div key={m.id} style={{
 padding: "10px 12px", borderRadius: "var(--radius-lg)",
 background: isOutbound ? "rgba(6,182,212,0.06)" : "rgba(139,92,246,0.06)",
 border: `1px solid ${isOutbound ? "rgba(6,182,212,0.18)" : "rgba(139,92,246,0.18)"}`,
 }}>
 <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
 <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink)" }}>
 {isOutbound ? "→ " : "← "}{name}
 </span>
 <StatusPill status={isOutbound ? m.external_status : "received"} />
 <span style={{ marginLeft: "auto", fontSize: 10.5, color: "var(--ink-faint)" }}>{formatDate(m.sent_at ?? m.created_at)}</span>
 </div>
 <div style={{ fontSize: 12.5, color: "var(--ink)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
 {m.body ?? "(no body)"}
 </div>
 <MessageDetail m={m} />
 </div>
 );
 })}
 </div>
 ))}
 </div>
 </div>
 )}

 {/* ─────────── Numbers tab ─────────── */}
 {tab === "numbers" && (
 <>
 {/* Loading */}
 {loading && (
 <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
 <Loader2 size={24} style={{ color: "var(--ink-mute)", animation: "spin 1s linear infinite" }} />
 <span style={{ marginLeft: 12, color: "var(--ink-mute)", fontSize: 14 }}>Loading Sendillo numbers…</span>
 </div>
 )}

 {!loading && error && (
 <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: 16 }}>
 <AlertCircle size={28} style={{ color: "var(--amber)" }} />
 <div style={{ color: "var(--ink)", fontSize: 14, maxWidth: 480, textAlign: "center" }}>{error}</div>
 </div>
 )}

 {!loading && !error && numbers.length === 0 && (
 <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-mute)", fontSize: 14 }}>
 <Phone size={28} style={{ color: "var(--ink-faint)", marginBottom: 12 }} />
 <div>No Sendillo numbers are registered for your workspace yet.</div>
 <div style={{ fontSize: 12, marginTop: 6 }}>Ask your superadmin to register numbers via the Sendillo admin page.</div>
 </div>
 )}

 {!loading && !error && numbers.length > 0 && (<>
 {/* KPI row */}
 <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
 {[
 { label: "Numbers", value: numbers.length.toLocaleString(), color: "var(--ink)" },
 { label: "Total Sent", value: totalSent.toLocaleString(), color: "var(--cyan)" },
 { label: "Total Delivered", value: totalDelivered.toLocaleString(), color: "var(--mint)" },
 { label: "Total Received", value: totalReceived.toLocaleString(), color: "var(--viol-400)" },
 ].map((k) => (
 <div key={k.label} className="kpi-card">
 <div className="label">{k.label}</div>
 <div className="value" style={{ color: k.color }}>{k.value}</div>
 </div>
 ))}
 </div>

 {/* Search */}
 <div style={{ position: "relative", marginBottom: 16, maxWidth: 360 }}>
 <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)" }} />
 <input
 className="input"
 style={{ paddingLeft: 36 }}
 placeholder="Search by number, label, or agent…"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>

 {/* Numbers + SMS log */}
 <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
 {filteredNumbers.map((n) => {
 const isOpen = expanded === n.phone_number;
 const s = summary[n.phone_number] ?? { sent: 0, received: 0, delivered: 0, failed: 0 };
 const msgs = messagesByNumber[n.phone_number];
 return (
 <div
 key={n.id}
 style={{
 borderRadius: "var(--radius-xl)",
 border: "1px solid var(--line)",
 background: "rgba(19,24,38,0.5)",
 overflow: "hidden",
 }}
 >
 <button
 onClick={() => setExpanded(isOpen ? null : n.phone_number)}
 style={{
 width: "100%",
 display: "flex", alignItems: "center", justifyContent: "space-between",
 padding: "16px 20px",
 background: "transparent", border: "none", cursor: "pointer", textAlign: "left",
 }}
 >
 <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
 <div style={{
 width: 40, height: 40, borderRadius: "var(--radius-lg)",
 background: "rgba(6,182,212,0.12)",
 display: "flex", alignItems: "center", justifyContent: "center",
 }}>
 <Phone size={18} style={{ color: "var(--cyan)" }} />
 </div>
 <div>
 <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
 <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
 {n.phone_number}
 </span>
 {n.label && (
 <span style={{
 fontSize: 11, padding: "2px 8px", borderRadius: "var(--radius-md)",
 background: "var(--surface-3)", color: "var(--ink-mute)",
 }}>
 {n.label}
 </span>
 )}
 {!n.is_active && (
 <span style={{
 fontSize: 11, padding: "2px 8px", borderRadius: "var(--radius-md)",
 background: "rgba(245,158,11,0.15)", color: "var(--amber)",
 }}>
 Inactive
 </span>
 )}
 </div>
 <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
 <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>
 {n.agent?.full_name ?? "Unassigned"}
 </span>
 <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>·</span>
 <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>
 {s.sent} sent · {s.received} received
 </span>
 </div>
 </div>
 </div>
 <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
 <div style={{ display: "flex", alignItems: "center", gap: 4, marginRight: 8 }}>
 <span title="Sent" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "var(--ink-mute)" }}>
 <Send size={11} /> {s.sent}
 </span>
 <span title="Received" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: "var(--ink-mute)" }}>
 <Inbox size={11} /> {s.received}
 </span>
 </div>
 {isOpen ? <ChevronDown size={16} style={{ color: "var(--ink-mute)" }} /> : <ChevronRight size={16} style={{ color: "var(--ink-mute)" }} />}
 </div>
 </button>

 {isOpen && (
 <div style={{ borderTop: "1px solid rgba(37,43,63,0.5)" }}>
 {msgs === undefined ? (
 <div style={{ padding: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
 <Loader2 size={16} style={{ color: "var(--ink-mute)", animation: "spin 1s linear infinite" }} />
 <span style={{ marginLeft: 8, color: "var(--ink-mute)", fontSize: 13 }}>Loading SMS log…</span>
 </div>
 ) : msgs.length === 0 ? (
 <div style={{ padding: "24px", textAlign: "center", color: "var(--ink-mute)", fontSize: 13 }}>
 No SMS sent or received from this number yet.
 </div>
 ) : (
 <div style={{ maxHeight: 480, overflowY: "auto" }}>
 {msgs.map((m) => {
 const lead = m.lead ?? null;
 const isOutbound = m.direction === "outbound";
 return (
 <div
 key={m.id}
 style={{
 display: "flex", alignItems: "flex-start", gap: 12,
 padding: "12px 20px",
 borderBottom: "1px solid rgba(37,43,63,0.4)",
 }}
 >
 <div style={{
 width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
 background: isOutbound ? "rgba(6,182,212,0.12)" : "rgba(139,92,246,0.12)",
 display: "flex", alignItems: "center", justifyContent: "center",
 }}>
 {isOutbound
 ? <Send size={13} style={{ color: "var(--cyan)" }} />
 : <MessageSquare size={13} style={{ color: "var(--viol-400)" }} />
 }
 </div>
 <div style={{ flex: 1, minWidth: 0 }}>
 <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
 <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
 {isOutbound ? "To: " : "From: "}
 {lead ? `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim() || lead.phone : "Unknown"}
 </span>
 {lead?.phone && (
 <span style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>{lead.phone}</span>
 )}
 <StatusPill status={isOutbound ? m.external_status : "received"} />
 </div>
 <div style={{
 fontSize: 13, color: "var(--ink)",
 whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.45,
 }}>
 {m.body ?? "(no body)"}
 </div>
 <MessageDetail m={m} />
 <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>
 {formatDate(m.sent_at ?? m.created_at)}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 )}
 </div>
 );
 })}
 </div>
 </>)}
 </>)}

 {/* ─────────── How it works tab ─────────── */}
 {tab === "how" && (
 <div className="card" style={{ padding: 28, borderRadius: "var(--radius-xl)", border: "1px solid var(--line)", background: "rgba(19,24,38,0.5)" }}>
 <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
 <div style={{ width: 32, height: 32, borderRadius: "var(--radius-md)", background: "rgba(6,182,212,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
 <Info size={15} style={{ color: "var(--cyan)" }} />
 </div>
 <div>
 <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>How Sendillo SMS works in RevRa</div>
 <div style={{ fontSize: 12.5, color: "var(--ink-mute)" }}>End-to-end pipeline from your browser to a phone in India (or anywhere).</div>
 </div>
 </div>

 <ol style={{ paddingLeft: 18, margin: 0, display: "flex", flexDirection: "column", gap: 14, color: "var(--ink)", fontSize: 13.5, lineHeight: 1.6 }}>
 <li>
 <strong>1. You pick a sender.</strong> The "Send SMS" tab loads your workspace's active Sendillo numbers from{" "}
 <code style={{ background: "var(--surface-3)", padding: "1px 5px", borderRadius: 3 }}>GET /api/sendillo/numbers?type=registered</code>.
 These are the USA numbers your superadmin registered in <code style={{ background: "var(--surface-3)", padding: "1px 5px", borderRadius: 3 }}>sendillo_phone_numbers</code>.
 </li>
 <li>
 <strong>2. You type the destination.</strong> The "To" field accepts any E.164 number — <code style={{ background: "var(--surface-3)", padding: "1px 5px", borderRadius: 3 }}>+91XXXXXXXXXX</code> for India,
 <code style={{ background: "var(--surface-3)", padding: "1px 5px", borderRadius: 3 }}>+1XXXXXXXXXX</code> for US/Canada, etc. Always include the country code.
 </li>
 <li>
 <strong>3. The browser POSTs to RevRa.</strong> The page calls{" "}
 <code style={{ background: "var(--surface-3)", padding: "1px 5px", borderRadius: 3 }}>POST /api/sendillo/messages/send</code>{" "}
 with <code style={{ background: "var(--surface-3)", padding: "1px 5px", borderRadius: 3 }}>{`{ from, to, body }`}</code>.
 The server (a) verifies the from-number is registered for your workspace, (b) validates the to-number is E.164,
 and (c) checks if a lead exists with that phone (last 10 digits).
 </li>
 <li>
 <strong>4. RevRa calls Sendillo.</strong> The server makes a server-to-server{" "}
 <code style={{ background: "var(--surface-3)", padding: "1px 5px", borderRadius: 3 }}>POST https://www.sendillo.com/api/v1/messages</code>{" "}
 with <code style={{ background: "var(--surface-3)", padding: "1px 5px", borderRadius: 3 }}>{`{ from, to, body, clientRef }`}</code>. Sendillo routes the SMS through its carrier partners to the destination country.
 </li>
 <li>
 <strong>5. RevRa logs the message.</strong> A row is inserted into <code style={{ background: "var(--surface-3)", padding: "1px 5px", borderRadius: 3 }}>messages</code> with{" "}
 <code style={{ background: "var(--surface-3)", padding: "1px 5px", borderRadius: 3 }}>direction = "outbound"</code>,{" "}
 <code style={{ background: "var(--surface-3)", padding: "1px 5px", borderRadius: 3 }}>channel = "sms"</code>, and{" "}
 <code style={{ background: "var(--surface-3)", padding: "1px 5px", borderRadius: 3 }}>external_id = from</code> (so the Numbers tab log can find it).
 If a lead matched, it's linked and the SMS conversation is upserted.
 </li>
 <li>
 <strong>6. Sendillo fires webhooks back.</strong> Sendillo POSTs to your{" "}
 <code style={{ background: "var(--surface-3)", padding: "1px 5px", borderRadius: 3 }}>POST /api/webhooks/sendillo</code> with one of:
 <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 18 }}>
 <li><code style={{ background: "var(--surface-3)", padding: "1px 5px", borderRadius: 3 }}>message.sent</code> — accepted by Sendillo (status: sent)</li>
 <li><code style={{ background: "var(--surface-3)", padding: "1px 5px", borderRadius: 3 }}>message.delivered</code> — delivered to handset (status: delivered)</li>
 <li><code style={{ background: "hsl(var(--destructive)/0.15)", padding: "1px 5px", borderRadius: 3 }}>message.failed</code> — carrier rejected (status: failed)</li>
 <li><code style={{ background: "var(--surface-3)", padding: "1px 5px", borderRadius: 3 }}>inbound.received</code> — recipient replied (creates inbound row)</li>
 </ul>
 </li>
 <li>
 <strong>7. The UI updates in real time.</strong> When the webhook handler updates <code style={{ background: "var(--surface-3)", padding: "1px 5px", borderRadius: 3 }}>external_status</code>, the Numbers tab log shows the new status pill the next time you open it. Inbound replies appear under "From" in the same log.
 </li>
 </ol>

 <div style={{ marginTop: 22, padding: 14, borderRadius: "var(--radius-lg)", background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.2)" }}>
 <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--cyan)", marginBottom: 6 }}>India-specific tips</div>
 <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "var(--ink)", lineHeight: 1.7 }}>
 <li>Always use the +91 country code in the "To" field — bare 10-digit Indian numbers will be rejected.</li>
 <li>Indian DLT (regulatory) rules apply to high-volume traffic; if Sendillo's API returns 400 with a DLT error, the number may need a DLT template registered on the Sendillo dashboard.</li>
 <li>Inbound replies from Indian numbers work the same way as US replies — the <code style={{ background: "var(--surface-3)", padding: "1px 5px", borderRadius: 3 }}>inbound.received</code> webhook matches the sender's phone to a lead by last-10-digits.</li>
 </ul>
 </div>
 </div>
 )}
 </div>
 </Shell>
 );
}