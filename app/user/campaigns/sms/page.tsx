"use client";

// /user/campaigns/sms — SMS Campaigns section (cyan accent).
// Sister page to /user/campaigns/email. Bulk SMS via Twilio / Sendillo,
// tracks replies + routes warm leads to Emma AI.

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Shell } from "@/components/layouts/Shell";
import {
 Send,
 Plus,
 Search,
 X,
 ChevronRight,
 MessageSquare,
 Pause,
 Play,
 Trash2,
 RefreshCw,
 Loader2,
 AlertCircle,
 Zap,
 XCircle,
 CheckCircle2,
} from "lucide-react";

interface SendilloPhone {
 id: string;
 phone_number: string;
 label: string | null;
 agent_id: string;
 is_active: boolean;
}

interface ApiCampaign {
 id: string;
 name: string;
 channel: string;
 status: string;
 sent: number;
 delivered: number;
 failed: number;
 replied: number;
 opted_out: number;
 emma_synced: number;
 leads: number;
 sender_phone_id: string | null;
 message_body: string | null;
 positive_keywords: string[];
 optout_keywords: string[];
 start_date: string | null;
 created_by: string | null;
 created_at: string;
}

interface LeadOption {
 id: string;
 first_name: string;
 last_name: string;
 phone: string;
 pipeline_stage: string;
 opted_out: boolean;
 assigned_agent_id: string | null;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
 active: { label: "Active", color: "var(--mint)", bg: "rgba(16,185,129,0.15)" },
 paused: { label: "Paused", color: "var(--amber)", bg: "rgba(245,158,11,0.15)" },
 draft: { label: "Draft", color: "var(--ink-mute)", bg: "var(--surface-3)" },
 scheduled: { label: "Scheduled", color: "var(--cyan)", bg: "rgba(6,182,212,0.15)" },
 completed: { label: "Completed", color: "var(--indi-400)", bg: "rgba(99,102,241,0.15)" },
};

const defaultStatus = { label: "Unknown", color: "var(--ink-mute)", bg: "var(--surface-3)" };

type TabType = "all" | "active" | "paused" | "draft" | "completed";
const tabs: TabType[] = ["all", "active", "paused", "draft", "completed"];

const STEP_LABELS = ["Campaign Setup", "Compose Message", "Select Leads", "Keywords", "Review & Launch"];

export default function CampaignsPage() {
 const [campaigns, setCampaigns] = useState<ApiCampaign[]>([]);
 const [phones, setPhones] = useState<SendilloPhone[]>([]);
 const [leads, setLeads] = useState<LeadOption[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [activeTab, setActiveTab] = useState<TabType>("all");
 const [showWizard, setShowWizard] = useState(false);
 const [wizardStep, setWizardStep] = useState(0);
 const [creating, setCreating] = useState(false);
 const [createError, setCreateError] = useState("");
 const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);
 const [sendError, setSendError] = useState("");
 const [deletingId, setDeletingId] = useState<string | null>(null);
 const [pauseResumeLoading, setPauseResumeLoading] = useState<string | null>(null);

 // Wizard state
  const [wizardName, setWizardName] = useState("");
  const [wizardPhoneId, setWizardPhoneId] = useState("");
  const [wizardBody, setWizardBody] = useState("");
  const [wizardSendCount, setWizardSendCount] = useState(1);
  const [wizardPositiveKw, setWizardPositiveKw] = useState("interested, yes, more info");
  const [wizardOptoutKw, setWizardOptoutKw] = useState("STOP, UNSUBSCRIBE, CANCEL");
  const [wizardSelectedLeads, setWizardSelectedLeads] = useState<string[]>([]);
  const [wizardSearch, setWizardSearch] = useState("");

 const fetchCampaigns = useCallback(async () => {
 try {
 const res = await fetch("/api/campaigns");
 if (!res.ok) throw new Error("Failed to fetch campaigns");
 const data = await res.json();
 setCampaigns(data.campaigns ?? []);
 } catch (err) {
 setError(err instanceof Error ? err.message : "Something went wrong");
 }
 }, []);

 const fetchPhones = useCallback(async () => {
 try {
 const res = await fetch("/api/sendillo/numbers?type=registered");
 if (!res.ok) return;
 const data = await res.json();
 const registered = (data as { numbers?: SendilloPhone[] }).numbers ?? [];
 setPhones(registered);
 } catch { /* non-critical */ }
 }, []);

 const fetchLeads = useCallback(async () => {
 try {
 const res = await fetch("/api/leads?limit=500");
 if (!res.ok) return;
 const data = await res.json();
 setLeads(
 (data.leads ?? []).map((l: LeadOption) => ({
 ...l,
 opted_out: false,
 }))
 );
 } catch { /* non-critical */ }
 }, []);

 useEffect(() => {
 async function load() {
 setLoading(true);
 await Promise.all([fetchCampaigns(), fetchPhones()]);
 setLoading(false);
 }
 load();
 }, [fetchCampaigns, fetchPhones]);

 const filtered = campaigns.filter((c) => activeTab === "all" || c.status === activeTab);

 const totals = campaigns.reduce(
 (acc, c) => ({
 sent: acc.sent + (c.sent ?? 0),
 delivered: acc.delivered + (c.delivered ?? 0),
 failed: acc.failed + (c.failed ?? 0),
 replied: acc.replied + (c.replied ?? 0),
 optedOut: acc.optedOut + (c.opted_out ?? 0),
 emmaSynced: acc.emmaSynced + (c.emma_synced ?? 0),
 }),
 { sent: 0, delivered: 0, failed: 0, replied: 0, optedOut: 0, emmaSynced: 0 }
 );

 const deliveryRate = totals.sent > 0 ? ((totals.delivered / totals.sent) * 100).toFixed(1) : "0";
 const emmaRate = totals.replied > 0 ? ((totals.emmaSynced / totals.replied) * 100).toFixed(1) : "0";

 // Campaign actions
 async function pauseResume(campaign: ApiCampaign) {
 setPauseResumeLoading(campaign.id);
 try {
 const newStatus = campaign.status === "active" ? "paused" : "active";
 const res = await fetch(`/api/campaigns/${campaign.id}`, {
 method: "PATCH",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({ status: newStatus }),
 });
 if (res.ok) fetchCampaigns();
 } finally {
 setPauseResumeLoading(null);
 }
 }

 async function deleteCampaign(id: string) {
 setDeletingId(id);
 try {
 const res = await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
 if (res.ok) setCampaigns((prev) => prev.filter((c) => c.id !== id));
 } finally {
 setDeletingId(null);
 }
 }

 async function sendCampaign(campaign: ApiCampaign) {
 setSendingCampaignId(campaign.id);
 setSendError("");
 try {
 const res = await fetch(`/api/campaigns/${campaign.id}/send`, {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({}),
 });
 if (!res.ok) {
 const err = await res.json();
 setSendError(err.error ?? "Send failed");
 } else {
 setSendingCampaignId(null);
 fetchCampaigns();
 }
 } catch {
 setSendError("Network error");
 }
 }

 // Wizard
  function openWizard() {
  setShowWizard(true);
  setWizardStep(0);
  setWizardName("");
  setWizardPhoneId(phones[0]?.id ?? "");
  setWizardBody("");
  setWizardSendCount(1);
  setWizardPositiveKw("interested, yes, more info");
  setWizardOptoutKw("STOP, UNSUBSCRIBE, CANCEL");
  setWizardSelectedLeads([]);
  setWizardSearch("");
  fetchLeads();
  }

 function closeWizard() {
 setShowWizard(false);
 setWizardStep(0);
 }

 async function createCampaign() {
 setCreating(true);
 setCreateError("");
 try {
 const positiveKeywords = wizardPositiveKw
 .split(",")
 .map((k) => k.trim())
 .filter(Boolean);
 const optoutKeywords = wizardOptoutKw
 .split(",")
 .map((k) => k.trim())
 .filter(Boolean);

  const res = await fetch("/api/campaigns", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
  name: wizardName.trim(),
  sender_phone_id: wizardPhoneId,
  message_body: wizardBody.trim(),
  positive_keywords: positiveKeywords,
  optout_keywords: optoutKeywords,
  lead_ids: wizardSelectedLeads,
  send_count: wizardSendCount,
  }),
  });

 if (res.ok) {
 const data = await res.json();
 setCampaigns((prev) => [data.campaign, ...prev]);
 closeWizard();
 } else {
 const err = await res.json();
 setCreateError(err.error ?? "Failed to create campaign");
 }
 } catch {
 setCreateError("Network error. Please try again.");
 } finally {
 setCreating(false);
 }
 }

 const wizardLeadFiltered = leads.filter((l) => {
 if (!wizardSearch) return true;
 const q = wizardSearch.toLowerCase();
 return (
 l.first_name.toLowerCase().includes(q) ||
 l.last_name.toLowerCase().includes(q) ||
 l.phone.includes(q)
 );
 });

 const wizardPhone = phones.find((p) => p.id === wizardPhoneId);
 const wizardCharCount = wizardBody.length;
 const wizardSegments = Math.ceil(wizardCharCount / 160) || 1;
 const wizardCanNext = [
 wizardName.trim().length > 0 && wizardPhoneId.length > 0,
 wizardBody.trim().length > 0,
 wizardSelectedLeads.length > 0,
 true,
 true,
 ];

 return (
 <Shell role="user">
 <div style={{ padding: "32px 40px" }}>

  {/* Channel Navigation Tabs */}
  <div style={{ display: "flex", borderBottom: "1px solid var(--line)", marginBottom: 24 }}>
    <Link href="/user/campaigns/email" style={{
      padding: "12px 20px",
      fontSize: 14,
      fontWeight: 500,
      color: "var(--ink-mute)",
      borderBottom: "2px solid transparent",
      textDecoration: "none",
      transition: "all 0.15s",
    }}
    >
      Email Campaigns
    </Link>
    <Link href="/user/campaigns/sms" style={{
      padding: "12px 20px",
      fontSize: 14,
      fontWeight: 600,
      color: "var(--cyan)",
      borderBottom: "2px solid var(--cyan)",
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
 SMS Campaigns
 </h1>
 <p style={{ fontSize: 13, color: "var(--ink-mute)", marginTop: 4 }}>
 Bulk SMS campaigns — send, track replies, and route warm leads to Emma AI.
 </p>
 </div>
 <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
 <button className="btn-ghost" style={{ padding: "8px 12px", fontSize: 12 }} onClick={fetchCampaigns} title="Refresh">
 <RefreshCw size={14} />
 </button>
 <button className="btn-primary" style={{ padding: "8px 16px", fontSize: 13 }} onClick={openWizard}>
 <Plus size={13} style={{ marginRight: 6 }} />
 New Campaign
 </button>
 </div>
 </div>

 {/* Loading */}
 {loading && (
 <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
 <Loader2 size={24} style={{ color: "var(--ink-mute)", animation: "spin 1s linear infinite" }} />
 <span style={{ marginLeft: 12, color: "var(--ink-mute)", fontSize: 14 }}>Loading campaigns...</span>
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

 {!loading && !error && (<>

 {/* KPI row */}
 <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
 {[
 { label: "Total Sent", value: totals.sent.toLocaleString(), color: "var(--ink)" },
 { label: "Delivery Rate", value: `${deliveryRate}%`, color: "var(--mint)" },
 { label: "Emma Synced", value: totals.emmaSynced.toLocaleString(), color: "var(--viol-400)" },
 { label: "Opted Out", value: totals.optedOut.toLocaleString(), color: "var(--amber)" },
 ].map((k) => (
 <div key={k.label} className="kpi-card">
 <div className="label">{k.label}</div>
 <div className="value" style={{ color: k.color }}>{k.value}</div>
 </div>
 ))}
 </div>

 {/* Tabs */}
 <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
 {tabs.map((t) => (
 <button
 key={t}
 onClick={() => setActiveTab(t)}
 style={{
 padding: "6px 14px",
 borderRadius: "var(--radius-md)",
 fontSize: 12.5,
 fontWeight: 500,
 cursor: "pointer",
 border: "none",
 textTransform: "capitalize",
 background: activeTab === t ? "var(--surface-2)" : "transparent",
 color: activeTab === t ? "var(--ink)" : "var(--ink-mute)",
 boxShadow: activeTab === t ? "inset 0 0 0 1px var(--line-2)" : "none",
 transition: "all 0.12s",
 }}
 >
 {t}
 <span style={{ marginLeft: 6, padding: "1px 6px", borderRadius: 999, fontSize: 10,
 background: activeTab === t ? "var(--line)" : "var(--surface-3)", color: "var(--ink-dim)" }}>
 {t === "all" ? campaigns.length : campaigns.filter((c) => c.status === t).length}
 </span>
 </button>
 ))}
 </div>

 {/* Campaign list */}
 <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
 {filtered.length === 0 && (
 <div style={{ textAlign: "center", padding: "60px 0", color: "var(--ink-mute)", fontSize: 14 }}>
 No campaigns yet.{" "}
 <button style={{ color: "var(--indi-400)", background: "none", border: "none", cursor: "pointer", fontSize: 14 }} onClick={openWizard}>
 Create your first campaign
 </button>
 </div>
 )}
 {filtered.map((c) => {
 const st = statusConfig[c.status] ?? defaultStatus;
 const delRate = c.sent > 0 ? ((c.delivered / c.sent) * 100).toFixed(1) : "0";
 const emmaRouteRate = c.replied > 0 ? ((c.emma_synced / c.replied) * 100).toFixed(1) : "0";

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
 {/* Card header */}
 <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}>
 <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
 <div style={{ width: 40, height: 40, borderRadius: "var(--radius-lg)", background: "rgba(6,182,212,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
 <MessageSquare size={18} style={{ color: "var(--cyan)" }} />
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
 <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{c.positive_keywords?.join(", ") || "no keywords"}</span>
 </div>
 </div>
 </div>
 <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
 {c.status === "active" && (
 <button className="btn-icon p-2" title="Pause" onClick={() => pauseResume(c)} disabled={pauseResumeLoading === c.id}>
 {pauseResumeLoading === c.id ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Pause size={14} />}
 </button>
 )}
 {c.status === "paused" && (
 <button className="btn-icon p-2" title="Resume" onClick={() => pauseResume(c)} disabled={pauseResumeLoading === c.id}>
 {pauseResumeLoading === c.id ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Play size={14} />}
 </button>
 )}
 {(c.status === "draft" || c.status === "scheduled") && (
 <button
 className="btn-primary"
 style={{ padding: "7px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}
 onClick={() => sendCampaign(c)}
 disabled={sendingCampaignId === c.id}
 >
 {sendingCampaignId === c.id ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={12} />}
 Launch
 </button>
 )}
 {c.status === "completed" && (
 <button className="btn-icon p-2" title="Delete" onClick={() => deleteCampaign(c.id)} disabled={deletingId === c.id}>
 <Trash2 size={14} />
 </button>
 )}
 </div>
 </div>

 {/* Metrics row */}
 <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 0, borderTop: "1px solid rgba(37,43,63,0.5)" }}>
 {[
 { label: "Sent", value: c.sent.toLocaleString(), color: "var(--ink)" },
 { label: "Delivered", value: `${delRate}%`, color: "var(--mint)" },
 { label: "Failed", value: c.failed.toLocaleString(), color: "hsl(var(--destructive))" },
 { label: "Opted Out", value: c.opted_out.toLocaleString(), color: "var(--amber)" },
 { label: "Replied", value: c.replied.toLocaleString(), color: "var(--cyan)" },
 { label: "Emma Synced", value: `${emmaRouteRate}%`, color: "var(--viol-400)" },
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

 {sendError && (
 <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "hsl(var(--destructive)/0.1)", color: "hsl(var(--destructive))", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
 <AlertCircle size={14} />
 {sendError}
 <button style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit", cursor: "pointer" }} onClick={() => setSendError("")}><X size={14} /></button>
 </div>
 )}
 </>)}
 </div>

 {/* Campaign Wizard Modal */}
 {showWizard && (
 <div style={{ position: "fixed", inset: 0, background: "rgba(5,7,15,0.62)", backdropFilter: "blur(6px)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80, overflowY: "auto" }}
 onClick={(e) => { if (e.target === e.currentTarget) closeWizard(); }}>
 <div style={{ width: "100%", maxWidth: 680, borderRadius: "var(--radius-2xl)", background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7)", margin: "20px" }} onClick={(e) => e.stopPropagation()}>

 {/* Wizard header */}
 <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid rgba(37,43,63,0.5)" }}>
 <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>New SMS Campaign</h3>
 <button className="btn-icon p-2" onClick={closeWizard}><X size={16} /></button>
 </div>

 {/* Step indicator */}
 <div style={{ display: "flex", padding: "16px 24px 0", gap: 0 }}>
 {STEP_LABELS.map((label, i) => (
 <div key={label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
 <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
 <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, background: i < wizardStep ? "var(--mint)" : i === wizardStep ? "var(--indi-500)" : "var(--surface-3)", color: i <= wizardStep ? "#fff" : "var(--ink-mute)", border: i === wizardStep ? "2px solid var(--indi-400)" : "none", transition: "all 0.2s" }}>
 {i < wizardStep ? <CheckCircle2 size={14} /> : i + 1}
 </div>
 <span style={{ fontSize: 10, color: i === wizardStep ? "var(--ink)" : "var(--ink-mute)", fontWeight: i === wizardStep ? 500 : 400, textAlign: "center", maxWidth: 70 }}>{label}</span>
 </div>
 {i < STEP_LABELS.length - 1 && <div style={{ flex: 1, height: 1, background: i < wizardStep ? "var(--mint)" : "var(--line)", margin: "0 4px", marginBottom: 18 }} />}
 </div>
 ))}
 </div>

 {/* Step content */}
 <div style={{ padding: "24px" }}>

 {/* Step 0: Setup */}
 {wizardStep === 0 && (
 <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
 <div>
 <label className="input-label">Campaign Name</label>
 <input className="input" value={wizardName} onChange={(e) => setWizardName(e.target.value)} placeholder="e.g., Medicare Advantage Q3 Blast" />
 </div>
 <div>
 <label className="input-label">Sender Number</label>
 {phones.length === 0 ? (
 <div style={{ padding: "12px 14px", borderRadius: "var(--radius-lg)", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "var(--amber)", fontSize: 13 }}>
 No Sendillo numbers registered. Ask your superadmin to add numbers first.
 </div>
 ) : (
 <select className="input" style={{ appearance: "none" }} value={wizardPhoneId} onChange={(e) => setWizardPhoneId(e.target.value)}>
 <option value="">Select a number...</option>
 {phones.map((p) => (
 <option key={p.id} value={p.id}>{p.phone_number}{p.label ? ` — ${p.label}` : ""}</option>
 ))}
 </select>
 )}
 </div>
 <div>
 <label className="input-label">Messages per Lead (Send Count)</label>
 <input
   type="number"
   className="input"
   min={1}
   max={100}
   value={wizardSendCount}
   onChange={(e) => setWizardSendCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
   placeholder="1"
 />
 <span style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 4, display: "block" }}>
   Specify how many SMS messages to send in bulk to each selected lead (e.g. 1 to 100).
 </span>
 </div>
 </div>
 )}

 {/* Step 1: Compose */}
 {wizardStep === 1 && (
 <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
 <div>
 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
 <label className="input-label" style={{ marginBottom: 0 }}>Message Body</label>
 <span style={{ fontSize: 11, color: wizardCharCount > 160 ? "var(--amber)" : "var(--ink-faint)" }}>
 {wizardCharCount}/160 ({wizardSegments} SMS segment{wizardSegments > 1 ? "s" : ""})
 </span>
 </div>
 <textarea
 className="input"
 value={wizardBody}
 onChange={(e) => setWizardBody(e.target.value)}
 placeholder="Hi {{first_name}}, this is from RevRa. We have an exclusive offer for you — reply INTERESTED to learn more!"
 style={{ minHeight: 100, resize: "vertical" }}
 />
 {wizardCharCount > 160 && (
 <div style={{ marginTop: 6, fontSize: 12, color: "var(--amber)" }}>
 Message will be split into {wizardSegments} segments. Keep under 160 chars for a single SMS.
 </div>
 )}
 </div>
 </div>
 )}

 {/* Step 2: Select Leads */}
 {wizardStep === 2 && (
 <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
 <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
 <label className="input-label" style={{ marginBottom: 0 }}>
 Select Leads — {wizardSelectedLeads.length} selected
 </label>
 <div style={{ display: "flex", gap: 8 }}>
 <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }}
 onClick={() => setWizardSelectedLeads(leads.filter((l) => !l.opted_out).map((l) => l.id))}>
 Select All
 </button>
 <button className="btn-ghost" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setWizardSelectedLeads([])}>
 Clear
 </button>
 </div>
 </div>
 <div style={{ position: "relative" }}>
 <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--ink-mute)" }} />
 <input className="input" style={{ paddingLeft: 36 }} placeholder="Search leads..." value={wizardSearch} onChange={(e) => setWizardSearch(e.target.value)} />
 </div>
 <div style={{ maxHeight: 260, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
 {wizardLeadFiltered.map((l) => (
 <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: "var(--radius-lg)", background: wizardSelectedLeads.includes(l.id) ? "rgba(99,102,241,0.1)" : "transparent", border: `1px solid ${wizardSelectedLeads.includes(l.id) ? "rgba(99,102,241,0.4)" : "transparent"}`, cursor: "pointer" }}
 onClick={() => {
 if (l.opted_out) return;
 setWizardSelectedLeads((prev) => prev.includes(l.id) ? prev.filter((id) => id !== l.id) : [...prev, l.id]);
 }}>
 <input type="checkbox" checked={wizardSelectedLeads.includes(l.id)} readOnly style={{ accentColor: "var(--indi-500)", cursor: "pointer" }} />
 <div style={{ flex: 1 }}>
 <div style={{ fontSize: 13, fontWeight: 500, color: l.opted_out ? "var(--ink-mute)" : "var(--ink)" }}>{l.first_name} {l.last_name}</div>
 <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>{l.phone}</div>
 </div>
 {l.opted_out && <span style={{ fontSize: 11, color: "var(--amber)", background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: 999 }}>Opted Out</span>}
 <span style={{ fontSize: 11, color: "var(--ink-mute)" }}>{l.pipeline_stage}</span>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Step 3: Keywords */}
 {wizardStep === 3 && (
 <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
 <div>
 <label className="input-label">Positive Keywords</label>
 <input className="input" value={wizardPositiveKw} onChange={(e) => setWizardPositiveKw(e.target.value)} placeholder="interested, yes, more info" />
 <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-mute)", display: "flex", alignItems: "center", gap: 6 }}>
 <Zap size={12} style={{ color: "var(--viol-400)" }} />
 Replies matching these keywords will be routed to Emma AI
 </div>
 </div>
 <div>
 <label className="input-label">Opt-out Keywords</label>
 <input className="input" value={wizardOptoutKw} onChange={(e) => setWizardOptoutKw(e.target.value)} placeholder="STOP, UNSUBSCRIBE, CANCEL" />
 <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-mute)", display: "flex", alignItems: "center", gap: 6 }}>
 <XCircle size={12} style={{ color: "var(--amber)" }} />
 Replies matching these keywords will mark the lead as opted out
 </div>
 </div>
 </div>
 )}

 {/* Step 4: Review */}
 {wizardStep === 4 && (
 <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
 {[
 ["Campaign Name", wizardName],
 ["Sender", wizardPhone?.phone_number ?? "—"],
 ["Message", wizardBody],
 ["Leads", `${wizardSelectedLeads.length} leads`],
 ["Messages per Lead", `${wizardSendCount} SMS per lead`],
 ["Positive Keywords", wizardPositiveKw],
 ["Opt-out Keywords", wizardOptoutKw],
 ].map(([label, value]) => (
 <div key={label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
 <span style={{ fontSize: 12, color: "var(--ink-mute)", minWidth: 130 }}>{label}</span>
 <span style={{ fontSize: 13, color: "var(--ink)" }}>{value}</span>
 </div>
 ))}
 {createError && (
 <div style={{ padding: "10px 14px", borderRadius: 8, background: "hsl(var(--destructive)/0.1)", color: "hsl(var(--destructive))", fontSize: 13 }}>
 {createError}
 </div>
 )}
 </div>
 )}

 {/* Navigation */}
 <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 16, borderTop: "1px solid rgba(37,43,63,0.4)" }}>
 <button className="btn-ghost" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => wizardStep === 0 ? closeWizard() : setWizardStep((s) => s - 1)}>
 {wizardStep === 0 ? "Cancel" : "Back"}
 </button>
 {wizardStep < STEP_LABELS.length - 1 ? (
 <button className="btn-primary" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => setWizardStep((s) => s + 1)} disabled={!wizardCanNext[wizardStep]}>
 Next <ChevronRight size={14} style={{ marginLeft: 4 }} />
 </button>
 ) : (
 <button className="btn-primary" style={{ padding: "8px 16px", fontSize: 13 }} onClick={createCampaign} disabled={creating}>
 {creating ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={13} style={{ marginRight: 6 }} />}
 Save & Launch
 </button>
 )}
 </div>
 </div>
 </div>
 </div>
 )}
 </Shell>
 );
}