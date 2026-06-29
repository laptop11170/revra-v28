"use client";

// /user/campaigns/email — Email Campaigns section (default landing for /user/campaigns).
// Owns its own header, KPIs, list, and the bulk wizard + single-send composer.
// Sister page to /user/campaigns/sms.

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Shell } from "@/components/layouts/Shell";
import {
 Plus,
 RefreshCw,
 Loader2,
 AlertCircle,
 X,
 Pause,
 Play,
 Send,
 Trash2,
 Mail,
} from "lucide-react";
import { EmailCampaignWizard, type ApiEmailCampaign } from "@/components/features/campaigns/EmailCampaignWizard";
import { SingleEmailComposer } from "@/components/features/campaigns/SingleEmailComposer";

const EMAIL_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
 active: { label: "Active", color: "var(--mint)", bg: "rgba(16,185,129,0.15)" },
 paused: { label: "Paused", color: "var(--amber)", bg: "rgba(245,158,11,0.15)" },
 draft: { label: "Draft", color: "var(--ink-mute)", bg: "var(--surface-3)" },
 scheduled: { label: "Scheduled", color: "var(--cyan)", bg: "rgba(6,182,212,0.15)" },
 completed: { label: "Completed", color: "var(--indi-400)", bg: "rgba(99,102,241,0.15)" },
};
const EMAIL_DEFAULT_STATUS = { label: "Unknown", color: "var(--ink-mute)", bg: "var(--surface-3)" };

export default function EmailCampaignsPage() {
 const [campaigns, setCampaigns] = useState<ApiEmailCampaign[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [sendingId, setSendingId] = useState<string | null>(null);

 const [showWizard, setShowWizard] = useState(false);
 const [showSingleSend, setShowSingleSend] = useState(false);

 const [senderEmail, setSenderEmail] = useState("hello@yourdomain.com");
 const [senderName, setSenderName] = useState("RevRa CRM");

 const fetchCampaigns = useCallback(async () => {
 setLoading(true);
 setError(null);
 try {
 const res = await fetch("/api/campaigns/email");
 if (!res.ok) throw new Error("Failed to fetch email campaigns");
 const data = await res.json();
 setCampaigns(data.campaigns ?? []);
 } catch (err) {
 setError(err instanceof Error ? err.message : "Failed to load email campaigns");
 } finally {
 setLoading(false);
 }
 }, []);

 const fetchSenderInfo = useCallback(async () => {
 try {
 const res = await fetch("/api/sendgrid/config");
 if (!res.ok) return;
 const data = await res.json();
 if (data.from_email) setSenderEmail(data.from_email);
 if (data.from_name) setSenderName(data.from_name);
 } catch { /* keep defaults */ }
 }, []);

 useEffect(() => {
 fetchCampaigns();
 fetchSenderInfo();
 }, [fetchCampaigns, fetchSenderInfo]);

 async function sendCampaign(c: ApiEmailCampaign) {
 setSendingId(c.id);
 setError(null);
 try {
 const res = await fetch(`/api/campaigns/email/${c.id}/send`, {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({}),
 });
 const data = await res.json().catch(() => ({}));
 if (!res.ok) throw new Error(data.error ?? "Send failed");
 await fetchCampaigns();
 } catch (err) {
 setError(err instanceof Error ? err.message : "Send failed");
 } finally {
 setSendingId(null);
 }
 }

 async function pauseResume(c: ApiEmailCampaign) {
 const newStatus = c.status === "active" ? "paused" : "active";
 try {
 await fetch(`/api/campaigns/${c.id}`, {
 method: "PATCH",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ status: newStatus }),
 });
 await fetchCampaigns();
 } catch { /* noop */ }
 }

 async function deleteCampaign(id: string) {
 try {
 await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
 setCampaigns((prev) => prev.filter((c) => c.id !== id));
 } catch { /* noop */ }
 }

 const totals = campaigns.reduce(
 (acc, c) => ({
 sent: acc.sent + (c.sent ?? 0),
 delivered: acc.delivered + (c.delivered ?? 0),
 opened: acc.opened + (c.opened ?? 0),
 clicked: acc.clicked + (c.clicked ?? 0),
 bounced: acc.bounced + (c.bounced ?? 0),
 optedOut: acc.optedOut + (c.opted_out ?? 0),
 }),
 { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, optedOut: 0 }
 );
 const openRate = totals.sent > 0 ? ((totals.opened / totals.sent) * 100).toFixed(1) : "0";
 const clickRate = totals.sent > 0 ? ((totals.clicked / totals.sent) * 100).toFixed(1) : "0";
 const deliveryRate = totals.sent > 0 ? ((totals.delivered / totals.sent) * 100).toFixed(1) : "0";

 return (
 <Shell role="user">
 <div style={{ padding: "32px 40px" }}>

 {/* Channel Navigation Tabs */}
 <div style={{ display: "flex", borderBottom: "1px solid var(--line)", marginBottom: 24 }}>
   <Link href="/user/campaigns/email" style={{
     padding: "12px 20px",
     fontSize: 14,
     fontWeight: 600,
     color: "var(--viol-400)",
     borderBottom: "2px solid var(--viol-400)",
     textDecoration: "none",
     transition: "all 0.15s",
   }}
   >
     Email Campaigns
   </Link>
   <Link href="/user/campaigns/sms" style={{
     padding: "12px 20px",
     fontSize: 14,
     fontWeight: 500,
     color: "var(--ink-mute)",
     borderBottom: "2px solid transparent",
     textDecoration: "none",
     transition: "all 0.15s",
   }}
   >
     SMS Campaigns
   </Link>
 </div>

 {/* Header */}
 <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
 <div>
 <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.005em" }}>
 Email Campaigns
 </h1>
 <p style={{ fontSize: 13, color: "var(--ink-mute)", marginTop: 4 }}>
 Bulk email campaigns via SendGrid — design, send, and track open/click rates.
 </p>
 </div>
 <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
 <button className="btn-ghost" style={{ padding: "8px 12px", fontSize: 12 }} onClick={fetchCampaigns} title="Refresh">
 <RefreshCw size={14} />
 </button>
 <button
 className="btn-ghost"
 style={{ padding: "8px 14px", fontSize: 12.5, display: "flex", alignItems: "center", gap: 6, color: "var(--viol-400)" }}
 onClick={() => setShowSingleSend(true)}
 title="Send a one-off email to a single lead"
 >
 <Send size={13} />
 Send Single Email
 </button>
 <button
 className="btn-primary"
 style={{ padding: "8px 16px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
 onClick={() => setShowWizard(true)}
 >
 <Plus size={13} />
 New Campaign
 </button>
 </div>
 </div>

 {/* KPI row */}
 <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
 {[
 { label: "Total Sent", value: totals.sent.toLocaleString(), color: "var(--ink)" },
 { label: "Delivery Rate", value: `${deliveryRate}%`, color: "var(--mint)" },
 { label: "Open Rate", value: `${openRate}%`, color: "var(--viol-400)" },
 { label: "Click Rate", value: `${clickRate}%`, color: "var(--cyan)" },
 ].map((k) => (
 <div key={k.label} className="kpi-card">
 <div className="label">{k.label}</div>
 <div className="value" style={{ color: k.color }}>{k.value}</div>
 </div>
 ))}
 </div>

 {/* Loading */}
 {loading && (
 <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
 <Loader2 size={24} style={{ color: "var(--ink-mute)", animation: "spin 1s linear infinite" }} />
 <span style={{ marginLeft: 12, color: "var(--ink-mute)", fontSize: 14 }}>Loading email campaigns...</span>
 </div>
 )}

 {/* Error */}
 {!loading && error && (
 <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: 16 }}>
 <div style={{ color: "hsl(var(--destructive))", fontSize: 14 }}>{error}</div>
 <button className="btn-primary" style={{ padding: "8px 16px", fontSize: 13 }} onClick={fetchCampaigns}>
 <RefreshCw size={13} style={{ marginRight: 6 }} />Retry
 </button>
 </div>
 )}

 {/* Empty state */}
 {!loading && !error && campaigns.length === 0 && (
 <div style={{ textAlign: "center", padding: "80px 0", color: "var(--ink-mute)", fontSize: 14 }}>
 <Mail size={36} style={{ margin: "0 auto 12px", opacity: 0.3, display: "block" }} />
 No email campaigns yet.{" "}
 <button
 style={{ color: "var(--viol-400)", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}
 onClick={() => setShowWizard(true)}
 >
 Create your first email campaign
 </button>
 <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink-faint)" }}>
 or fire off a one-off via{" "}
 <button
 style={{ color: "var(--viol-400)", background: "none", border: "none", cursor: "pointer", fontSize: 12, textDecoration: "underline" }}
 onClick={() => setShowSingleSend(true)}
 >
 Send Single Email
 </button>
 .
 </div>
 </div>
 )}

 {/* Campaign list */}
 {!loading && !error && campaigns.length > 0 && (
 <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
 {campaigns.map((c) => {
 const st = EMAIL_STATUS_CONFIG[c.status] ?? EMAIL_DEFAULT_STATUS;
 const sent = c.sent ?? 0;
 const opened = c.opened ?? 0;
 const clicked = c.clicked ?? 0;
 const cOpenRate = sent > 0 ? ((opened / sent) * 100).toFixed(1) : "0";
 const cClickRate = sent > 0 ? ((clicked / sent) * 100).toFixed(1) : "0";
 return (
 <div
 key={c.id}
 style={{
 borderRadius: "var(--radius-xl)",
 border: "1px solid var(--line)",
 background: "rgba(19,24,38,0.5)",
 overflow: "hidden",
 }}
 >
 <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}>
 <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
 <div style={{ width: 40, height: 40, borderRadius: "var(--radius-lg)", background: "rgba(139,92,246,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
 <Mail size={18} style={{ color: "var(--viol-400)" }} />
 </div>
 <div>
 <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
 <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{c.name}</span>
 <span style={{ padding: "2px 8px", borderRadius: "var(--radius-md)", background: st.bg, color: st.color, fontSize: 11, fontWeight: 500 }}>
 {st.label}
 </span>
 </div>
 <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
 <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{c.leads.toLocaleString()} leads</span>
 <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>·</span>
 <span style={{ fontSize: 12, color: "var(--ink-mute)", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "inline-block" }}>
 {c.subject ?? "(no subject)"}
 </span>
 </div>
 </div>
 </div>
 <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
 {c.status === "active" && <button className="btn-icon p-2" title="Pause" onClick={() => pauseResume(c)}><Pause size={14} /></button>}
 {c.status === "paused" && <button className="btn-icon p-2" title="Resume" onClick={() => pauseResume(c)}><Play size={14} /></button>}
 {(c.status === "draft" || c.status === "scheduled") && (
 <button
 className="btn-primary"
 style={{ padding: "7px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}
 onClick={() => sendCampaign(c)}
 disabled={sendingId === c.id}
 >
 {sendingId === c.id ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={12} />}
 Launch
 </button>
 )}
 {c.status === "completed" && <button className="btn-icon p-2" title="Delete" onClick={() => deleteCampaign(c.id)}><Trash2 size={14} /></button>}
 </div>
 </div>

 <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 0, borderTop: "1px solid rgba(37,43,63,0.5)" }}>
 {[
 { label: "Sent", value: (c.sent ?? 0).toLocaleString(), color: "var(--ink)" },
 { label: "Delivered", value: (c.delivered ?? 0).toLocaleString(), color: "var(--mint)" },
 { label: "Opens", value: `${cOpenRate}%`, color: "var(--viol-400)" },
 { label: "Clicks", value: `${cClickRate}%`, color: "var(--cyan)" },
 { label: "Bounces", value: (c.bounced ?? 0).toLocaleString(), color: "hsl(var(--destructive))" },
 { label: "Opt-Outs", value: (c.opted_out ?? 0).toLocaleString(), color: "var(--amber)" },
 ].map((m) => (
 <div key={m.label} style={{ padding: "14px 20px", borderRight: "1px solid rgba(37,43,63,0.4)", textAlign: "center" }}>
 <div style={{ fontSize: 16, fontWeight: 600, color: m.color, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{m.value}</div>
 <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 4 }}>{m.label}</div>
 </div>
 ))}
 </div>
 </div>
 );
 })}
 </div>
 )}

 {error && !loading && (
 <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "hsl(var(--destructive)/0.1)", color: "hsl(var(--destructive))", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
 <AlertCircle size={14} />
 {error}
 <button style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit", cursor: "pointer" }} onClick={() => setError(null)}><X size={14} /></button>
 </div>
 )}
 </div>

 {/* Bulk email wizard */}
 <EmailCampaignWizard
 open={showWizard}
 onClose={() => setShowWizard(false)}
 senderEmail={senderEmail}
 senderName={senderName}
 onCreated={(c) => setCampaigns((prev) => [c, ...prev])}
 />

 {/* Single-send composer */}
 <SingleEmailComposer
 open={showSingleSend}
 onClose={() => setShowSingleSend(false)}
 senderEmail={senderEmail}
 senderName={senderName}
 onSent={() => {/* could refresh leads.last_emailed_at etc. */}}
 />
 </Shell>
 );
}
