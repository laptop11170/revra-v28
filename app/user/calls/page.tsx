"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/layouts/Shell";
import { useToast } from "@/components/ui/toast";
import {
  Phone,
  PhoneCall,
  Search,
  Loader2,
  PhoneIncoming,
  PhoneOutgoing,
  FileAudio,
  FileText,
  Delete,
  X,
  User,
  ArrowLeft,
  Circle,
  HelpCircle,
} from "lucide-react";

type ApiCall = {
  id: string;
  lead_id: string;
  lead_name: string | null;
  lead_phone: string | null;
  direction: string;
  status: string;
  duration_seconds: number | null;
  twilio_call_sid: string | null;
  recording_url: string | null;
  recording_duration: number | null;
  transcription: string | null;
transcription_text: string | null;
transcription_url: string | null;
transcription_status: string | null;
transcribed_at: string | null;
twilio_transcription_sid: string | null;
ai_summary: string | null;
  ai_disposition: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function statusConfig(status: string) {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    initiated: { label: "Initiated", color: "var(--ink-mute)", bg: "var(--surface-3)" },
    ringing: { label: "Ringing", color: "var(--amber)", bg: "rgba(245,158,11,0.12)" },
    in_progress: { label: "In Progress", color: "var(--mint)", bg: "rgba(16,185,129,0.12)" },
    completed: { label: "Completed", color: "var(--mint)", bg: "rgba(16,185,129,0.12)" },
    busy: { label: "Busy", color: "var(--rose)", bg: "rgba(239,68,68,0.12)" },
    no_answer: { label: "No Answer", color: "var(--amber)", bg: "rgba(245,158,11,0.12)" },
    failed: { label: "Failed", color: "var(--rose)", bg: "rgba(239,68,68,0.12)" },
  };
  return configs[status] ?? configs.initiated;
}

const OUTCOMES = ["Contacted", "Voicemail", "No Answer", "Callback Requested", "Not Interested", "Wrong Number", "Dead Line"];
const dialKeys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];
const dialKeyHints: Record<string, string> = {
  "2": "ABC",
  "3": "DEF",
  "4": "GHI",
  "5": "JKL",
  "6": "MNO",
  "7": "PQRS",
  "8": "TUV",
  "9": "WXYZ",
  "0": "+",
};

const DEMO_CALLS: ApiCall[] = [
  {
    id: "demo-call-1",
    lead_id: "demo-lead-1",
    lead_name: "Michael Torres",
    lead_phone: "(555) 234-8901",
    direction: "outbound",
    status: "completed",
    duration_seconds: 272,
    twilio_call_sid: null,
    recording_url: "#",
    recording_duration: 272,
    transcription: "Agent: Hi Michael, this is Sarah from RevRa. How are you today?\nMichael: Hi Sarah, I'm doing well thanks. I got a call about Medicare options.\nAgent: Yes! I'd love to walk you through some Medicare Advantage plans available in your area. Are you currently on Original Medicare?\nMichael: Yes, just Part A and B. I've been looking at Advantage plans but I'm not sure what the difference really is.\nAgent: That's a great question. Advantage plans bundle your hospital, medical, and usually prescription drug coverage together, often with extra benefits like dental and vision. Many have $0 premiums.\nMichael: That sounds interesting. What would my out-of-pocket costs look like?\nAgent: It depends on the plan, but most have an annual out-of-pocket maximum to protect you. I can put together a side-by-side comparison and email it over.\nMichael: Yes please, send that by tomorrow if you can.\nAgent: Absolutely, I'll have that in your inbox by end of day tomorrow. Any other questions for now?\nMichael: No, that's it. Talk soon.\nAgent: Thanks Michael, have a great day!",
 transcription_text: "Agent: Hi Michael, this is Sarah from RevRa. How are you today?\nMichael: Hi Sarah, I'm doing well thanks. I got a call about Medicare options.\nAgent: Yes! I'd love to walk you through some Medicare Advantage plans available in your area. Are you currently on Original Medicare?\nMichael: Yes, just Part A and B. I've been looking at Advantage plans but I'm not sure what the difference really is.\nAgent: That's a great question. Advantage plans bundle your hospital, medical, and usually prescription drug coverage together, often with extra benefits like dental and vision. Many have $0 premiums.\nMichael: That sounds interesting. What would my out-of-pocket costs look like?\nAgent: It depends on the plan, but most have an annual out-of-pocket maximum to protect you. I can put together a side-by-side comparison and email it over.\nMichael: Yes please, send that by tomorrow if you can.\nAgent: Absolutely, I'll have that in your inbox by end of day tomorrow. Any other questions for now?\nMichael: No, that's it. Talk soon.\nAgent: Thanks Michael, have a great day!",
 transcription_url: null,
 transcription_status: "completed",
 transcribed_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
 twilio_transcription_sid: null,
 ai_summary: "Interested in Medicare Advantage. Requested quote comparison by tomorrow.",
    ai_disposition: "Contacted",
    started_at: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
    ended_at: new Date(Date.now() - 24 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 28 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-call-2",
    lead_id: "demo-lead-2",
    lead_name: "Linda Chen",
    lead_phone: "(555) 345-6789",
    direction: "outbound",
    status: "ringing",
    duration_seconds: null,
    twilio_call_sid: null,
    recording_url: null,
    recording_duration: null,
    transcription: null,
 transcription_text: null,
 transcription_url: null,
 transcription_status: null,
 transcribed_at: null,
 twilio_transcription_sid: null,
 ai_summary: "Dialing ACA lead from callback queue.",
    ai_disposition: null,
    started_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    ended_at: null,
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
];

function normalizeDialNumber(phone: string) {
  return phone.replace(/[^\d+*#]/g, "");
}

export default function CallHistoryPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [calls, setCalls] = useState<ApiCall[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [leadsSearch, setLeadsSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataNotice, setDataNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState({ status: "", type: "", search: "" });
  const [showLogForm, setShowLogForm] = useState(false);
  const [selectedCall, setSelectedCall] = useState<ApiCall | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialNumber, setDialNumber] = useState("");
  const [dialing, setDialing] = useState(false);
  const [dialError, setDialError] = useState<string | null>(null);
  const [dialSuccess, setDialSuccess] = useState<string | null>(null);

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDataNotice(null);
    try {
      const res = await fetch("/api/calls");
      if (!res.ok) throw new Error("Failed to fetch calls");
      const data = await res.json();
      const apiCalls = data.calls || [];
      setCalls(apiCalls.length ? apiCalls : DEMO_CALLS);
      if (!apiCalls.length) setDataNotice("Showing sample call data until real call history is available.");
    } catch (err) {
      setCalls(DEMO_CALLS);
      setDataNotice(err instanceof Error ? `${err.message}. Showing sample call data.` : "Showing sample call data.");
      addToast?.({ type: "error", title: "Using sample calls" });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const fetchLeads = async () => {
    setLoadingLeads(true);
    try {
      const res = await fetch("/api/leads?limit=100");
      if (res.ok) {
        const json = await res.json();
        setLeads(json.leads || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLeads(false);
    }
  };

  useEffect(() => {
    fetchCalls();
    fetchLeads();
  }, [fetchCalls]);

  useEffect(() => {
    const phone = new URLSearchParams(window.location.search).get("phone");
    if (phone) setDialNumber(normalizeDialNumber(phone));
  }, []);

  const filtered = calls.filter((c) => {
    const callType = c.direction === "inbound" ? "Inbound" : "Outbound";
    if (filter.status && c.status !== filter.status) return false;
    if (filter.type && callType !== filter.type) return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      if (
        !c.lead_name?.toLowerCase().includes(q) &&
        !c.lead_phone?.includes(q)
      )
        return false;
    }
    return true;
  });

  const filteredLeads = leads.filter((l) => {
    const name = `${l.first_name || ""} ${l.last_name || ""}`.toLowerCase();
    return name.includes(leadsSearch.toLowerCase()) || (l.phone && l.phone.includes(leadsSearch));
  });

  const stats = {
  total: filtered.length,
  contacted: filtered.filter(
  (c) => c.duration_seconds && c.duration_seconds > 10 && c.status === "completed"
  ).length,
  noAnswer: filtered.filter(
  (c) => c.status === "no_answer" || c.status === "busy"
  ).length,
  failed: filtered.filter((c) => c.status === "failed").length,
  };

  const handleLogOutcome = async (data: {
    outcome: string;
    notes: string;
    nextStage: string;
  }) => {
    if (!selectedCall) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/calls/${selectedCall.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_summary: data.notes,
          ai_disposition: data.outcome,
          status: "completed",
        }),
      });
      if (!res.ok) throw new Error("Failed to update call");
      setCalls((prev) =>
        prev.map((c) =>
          c.id === selectedCall.id
            ? { ...c, ai_summary: data.notes, ai_disposition: data.outcome, status: "completed" }
            : c
        )
      );
      addToast?.({ type: "success", title: "Call outcome saved" });
    } catch {
      addToast?.({ type: "error", title: "Failed to save outcome" });
    } finally {
      setSaving(false);
      setShowLogForm(false);
      setSelectedCall(null);
    }
  };

  const appendDialKey = (key: string) => {
    setDialNumber((prev) => normalizeDialNumber(`${prev}${key}`));
    setDialError(null);
    setDialSuccess(null);
  };

  const backspaceDial = () => {
    setDialNumber((prev) => prev.slice(0, -1));
    setDialError(null);
    setDialSuccess(null);
  };

  const startDialCall = async () => {
    const cleanNumber = normalizeDialNumber(dialNumber);
    if (!cleanNumber || cleanNumber.replace(/\D/g, "").length < 7) {
      setDialError("Enter a valid phone number.");
      return;
    }

    setDialing(true);
    setDialError(null);
    setDialSuccess(null);

    try {
      const res = await fetch("/api/calls/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: cleanNumber,
          lead_id: selectedLead?.id || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to start call");

      const newCall: ApiCall = {
        id: data.call_id || `local-call-${Date.now()}`,
        lead_id: data.lead_id || (selectedLead?.id ?? "manual-dial"),
        lead_name: selectedLead ? `${selectedLead.first_name} ${selectedLead.last_name || ""}` : (data.lead_name || "Manual Dial"),
        lead_phone: cleanNumber,
        direction: "outbound",
        status: "initiated",
        duration_seconds: null,
        twilio_call_sid: data.call_sid || null,
        recording_url: null,
        recording_duration: null,
        transcription: null,
 transcription_text: null,
 transcription_url: null,
 transcription_status: null,
 transcribed_at: null,
 twilio_transcription_sid: null,
 ai_summary: "Call initiated from Calls dialer.",
        ai_disposition: null,
        started_at: new Date().toISOString(),
        ended_at: null,
        created_at: new Date().toISOString(),
      };
      setCalls((prev) => [newCall, ...prev]);
      setDialSuccess("Call started successfully.");
      addToast?.({ type: "success", title: "Call started" });

    // Redirect to the active-call screen — the Twilio.Device there
    // will actually place the PSTN dial and bridge the conversation.
    if (data.call_id) {
      const params = new URLSearchParams({ callId: data.call_id });
      if (data.lead_id) params.set("leadId", data.lead_id);
      router.push(`/user/calls/active?${params.toString()}`);
    }
    } catch (err) {
      setDialError(err instanceof Error ? err.message : "Failed to start call");
    } finally {
      setDialing(false);
    }
  };

  const selectLeadForCall = (lead: any) => {
    setSelectedLead(lead);
    setDialNumber(normalizeDialNumber(lead.phone || ""));
    setDialError(null);
    setDialSuccess(null);
  };

  return (
    <Shell role="user">
      <div className="max-w-[1600px] mx-auto p-3 sm:p-6 space-y-6">
        
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 gap-4 border-b border-[var(--line)]">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ink)] bg-gradient-to-r from-[var(--ink)] to-[var(--ink-mute)] bg-clip-text">
              Calls Center
            </h1>
            <p className="text-sm text-[var(--ink-mute)] mt-1">Initiate calls and review agent call history</p>
          </div>
          <button 
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg bg-[var(--surface-3)] border border-[var(--line-2)] hover:bg-[var(--surface-4)] text-[var(--ink)] shadow-sm hover:shadow-md transition-all active:scale-95" 
            onClick={fetchCalls}
          >
            Refresh Records
          </button>
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Column 1: Leads Directory Sidebar (3 Cols) */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 bg-[var(--surface-2)]/60 backdrop-blur-md border border-[var(--line-2)] rounded-2xl p-4 shadow-xl">
            <div>
              <h2 className="text-base font-bold text-[var(--ink)] flex items-center gap-2">
                <Circle className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500 animate-pulse" />
                Leads Directory
              </h2>
              <p className="text-[11px] text-[var(--ink-mute)] mt-1">Click a lead to load in dialer</p>
            </div>
            
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]" />
              <input
                placeholder="Search leads..."
                value={leadsSearch}
                onChange={(e) => setLeadsSearch(e.target.value)}
                className="w-full h-10 rounded-xl pl-9 pr-3 text-xs focus:ring-1 focus:ring-[var(--viol-400)]/40 focus:border-[var(--viol-400)] outline-none transition-all"
                style={{ background: "var(--surface-3)", border: "1px solid var(--line)", color: "var(--ink)" }}
              />
            </div>

            <div className="flex-1 overflow-y-auto max-h-[480px] lg:max-h-[520px] space-y-2 pr-1 custom-scrollbar">
              {loadingLeads ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <Loader2 size={24} className="animate-spin text-[var(--ink-mute)]" />
                  <span className="text-xs text-[var(--ink-mute)]">Loading leads...</span>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-12 text-xs text-[var(--ink-faint)]">
                  No matching leads.
                </div>
              ) : (
                filteredLeads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => selectLeadForCall(lead)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                      selectedLead?.id === lead.id
                        ? "bg-[var(--surface-4)] border-[var(--viol-400)] shadow-lg shadow-[var(--viol-400)]/5 scale-[1.02]"
                        : "bg-[var(--surface-3)] border-transparent hover:border-[var(--line)] hover:scale-[1.01]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[var(--surface-2)] border border-[var(--line-2)] flex items-center justify-center font-extrabold text-xs text-[var(--ink)]">
                        {((lead.first_name || "")[0] || "") + ((lead.last_name || "")[0] || "")}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate text-[var(--ink)]">
                          {lead.first_name} {lead.last_name}
                        </p>
                        <p className="text-[10px] text-[var(--ink-mute)] truncate mt-0.5">{lead.phone}</p>
                      </div>
                    </div>
                    <span className="text-[9px] uppercase font-extrabold text-[var(--viol-400)] px-2 py-0.5 bg-[var(--surface-2)] rounded border border-[var(--line)] flex-shrink-0">
                      {lead.lead_type || "Lead"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Column 2: Dialer & Stats & logs (8/9 Cols) */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
            
            {/* Top row: Dialer & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Dialer Panel */}
              <div className="bg-[var(--surface-2)]/60 backdrop-blur-md border border-[var(--line-2)] rounded-2xl p-5 shadow-xl flex justify-center items-center">
                <div className="w-full max-w-[320px] flex flex-col items-center">
                  
                  {/* Phone Header Indicator */}
                  <div className="w-full flex items-center justify-between border-b border-[var(--line)] pb-3 mb-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">outbound line</h3>
                      <p className="text-[10px] text-[var(--ink-mute)] mt-0.5">Connected to Twilio trunk</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[9px] font-bold text-emerald-500 uppercase">active</span>
                    </div>
                  </div>

                  {/* Dialer Display */}
                  <div className="w-full min-h-[92px] bg-[var(--surface-3)] border border-[var(--line-2)] rounded-2xl flex flex-col items-center justify-center p-3 mb-5 gap-2 relative shadow-inner">
                    {selectedLead && (
                      <div 
                        onClick={() => { setSelectedLead(null); setDialNumber(""); }}
                        className="dialer-lead-chip hover:bg-[var(--surface-4)] border-[var(--viol-400)]/40 hover:scale-95 transition-all text-xs font-semibold"
                      >
                        <span>{selectedLead.first_name} {selectedLead.last_name}</span>
                        <X size={10} className="ml-1" />
                      </div>
                    )}
                    <div className={dialNumber ? "dialer-number text-xl font-mono tracking-wide text-[var(--ink)]" : "dialer-number empty font-sans text-xs text-[var(--ink-faint)]"}>
                      {dialNumber || "Enter custom digits or select a lead..."}
                    </div>
                  </div>

                  {/* Dialer Keypad (Circular Keys) */}
                  <div className="grid grid-cols-3 gap-3 w-full justify-items-center mb-5">
                    {dialKeys.map((key) => (
                      <button 
                        key={key} 
                        onClick={() => appendDialKey(key)} 
                        disabled={dialing}
                        className="w-12 h-12 rounded-full flex flex-col items-center justify-center bg-[var(--surface-3)] border border-[var(--line)] hover:bg-[var(--surface-4)] hover:border-[var(--viol-400)]/30 active:scale-90 transition-all text-[var(--ink)]"
                      >
                        <span className="text-lg font-bold leading-none">{key}</span>
                        <span className="text-[8px] text-[var(--ink-mute)] font-medium mt-0.5 leading-none">{dialKeyHints[key] ?? ""}</span>
                      </button>
                    ))}
                  </div>

                  {/* Dialer Controls */}
                  <div className="flex items-center justify-between w-full gap-3">
                    <button 
                      className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--surface-3)] border border-[var(--line)] hover:bg-[var(--surface-4)] text-[var(--ink-mute)] disabled:opacity-40 transition-all active:scale-90" 
                      onClick={backspaceDial} 
                      disabled={dialing || !dialNumber} 
                      title="Backspace"
                    >
                      <Delete size={16} />
                    </button>
                    <button 
                      onClick={startDialCall} 
                      disabled={dialing || !dialNumber}
                      className="flex-1 h-12 rounded-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-md hover:shadow-lg shadow-emerald-500/10 active:scale-95 disabled:opacity-40 transition-all"
                    >
                      {dialing ? <Loader2 size={16} className="animate-spin" /> : <PhoneCall size={16} />}
                      <span>{dialing ? "Dialing..." : "Call Now"}</span>
                    </button>
                    <button 
                      className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--surface-3)] border border-[var(--line)] hover:bg-[var(--surface-4)] text-[var(--ink-mute)] disabled:opacity-40 transition-all active:scale-90" 
                      onClick={() => { setDialNumber(""); setSelectedLead(null); }} 
                      disabled={dialing || !dialNumber} 
                      title="Clear"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {dialError && <p className="text-[11px] text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-xl w-full text-center mt-3 animate-fade-in">{dialError}</p>}
                  {dialSuccess && <p className="text-[11px] text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl w-full text-center mt-3 animate-fade-in">{dialSuccess}</p>}
                </div>
              </div>

              {/* Stats Panel */}
              <div className="bg-[var(--surface-2)]/60 backdrop-blur-md border border-[var(--line-2)] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                <div className="mb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--ink)]">Performance Overview</h3>
                  <p className="text-[11px] text-[var(--ink-mute)] mt-0.5">Workspace call metrics</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 flex-1 justify-content-center">
                  {([
                    [stats.total, "Total Leads", "var(--ink)", "bg-[var(--surface-3)] border-[var(--line)]"],
                    [stats.contacted, "Connected", "var(--mint)", "bg-emerald-500/5 border-emerald-500/10"],
                    [stats.noAnswer, "No Answer", "var(--amber)", "bg-amber-500/5 border-amber-500/10"],
                    [stats.failed, "Failed", "var(--rose)", "bg-red-500/5 border-red-500/10"],
                  ] as [number, string, string, string][]).map(([val, label, color, styleClasses]) => (
                    <div
                      key={label}
                      className={`rounded-2xl p-4 flex flex-col justify-center items-center border ${styleClasses}`}
                    >
                      <span className="text-3xl font-extrabold tracking-tight" style={{ color }}>
                        {val}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-mute)] mt-1.5">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Middle Row: Filtering Controls */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-[var(--surface-2)]/50 border border-[var(--line-2)] rounded-xl p-3 shadow-md">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]" />
                <input
                  placeholder="Search call logs by lead name..."
                  value={filter.search}
                  onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
                  className="w-full h-9 rounded-lg pl-9 pr-3 text-xs outline-none focus:border-[var(--viol-400)] border border-transparent transition-all"
                  style={{ background: "var(--surface-3)", color: "var(--ink)" }}
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={filter.status}
                  onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
                  className="h-9 px-3 rounded-lg text-xs flex-1 outline-none border border-transparent hover:border-[var(--line-2)] cursor-pointer"
                  style={{ background: "var(--surface-3)", color: "var(--ink)" }}
                >
                  <option value="">All Status</option>
                  <option value="initiated">Initiated</option>
                  <option value="ringing">Ringing</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="no_answer">No Answer</option>
                  <option value="busy">Busy</option>
                  <option value="failed">Failed</option>
                </select>

                <select
                  value={filter.type}
                  onChange={(e) => setFilter((f) => ({ ...f, type: e.target.value }))}
                  className="h-9 px-3 rounded-lg text-xs flex-1 outline-none border border-transparent hover:border-[var(--line-2)] cursor-pointer"
                  style={{ background: "var(--surface-3)", color: "var(--ink)" }}
                >
                  <option value="">All Types</option>
                  <option value="Outbound">Outbound</option>
                  <option value="Inbound">Inbound</option>
                </select>
              </div>
            </div>

            {/* Bottom Row: Call Logs Table */}
            <div className="bg-[var(--surface-2)]/60 border border-[var(--line-2)] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-xs text-left min-w-[700px]">
                  <thead>
                    <tr className="border-b border-[var(--line-2)] bg-[var(--surface-3)]">
                      <th className="px-5 py-4 font-bold uppercase tracking-wider text-[var(--ink-mute)]">Lead Details</th>
                      <th className="px-5 py-4 font-bold uppercase tracking-wider text-[var(--ink-mute)]">Direction</th>
                      <th className="px-5 py-4 font-bold uppercase tracking-wider text-[var(--ink-mute)]">Status</th>
                      <th className="px-5 py-4 font-bold uppercase tracking-wider text-[var(--ink-mute)]">Duration</th>
                      <th className="px-5 py-4 font-bold uppercase tracking-wider text-[var(--ink-mute)]">Summary/Notes</th>
                      <th className="px-5 py-4 font-bold uppercase tracking-wider text-[var(--ink-mute)] text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-16 text-center">
                          <Loader2 size={28} className="mx-auto animate-spin text-[var(--ink-mute)]" />
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-16 text-center text-[var(--ink-mute)] font-medium">
                          No matching call records found.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((call) => {
                        const st = statusConfig(call.status);
                        const isInbound = call.direction === "inbound";
                        return (
                          <tr
                            key={call.id}
                            className="hover:bg-[var(--surface-3)]/60 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedCall(call);
                              setShowLogForm(true);
                            }}
                          >
                            <td className="px-5 py-4 font-medium text-[var(--ink)]">
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm">{call.lead_name ?? "Unknown Lead"}</span>
                                <span className="text-[10px] text-[var(--ink-mute)] mt-0.5">{call.lead_phone || "—"}</span>
                                {call.recording_url && call.recording_url !== "#" && (
                                  <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <audio controls className="h-6 w-36 text-xs focus:outline-none" style={{ filter: "scale(0.85)", transformOrigin: "left center" }}>
                                      <source src={call.recording_url.endsWith(".mp3") ? call.recording_url : `${call.recording_url}.mp3`} />
                                      <source src={call.recording_url.endsWith(".wav") ? call.recording_url : `${call.recording_url}.wav`} />
                                    </audio>
                                    <a
                                      href={call.recording_url.endsWith(".mp3") ? call.recording_url : `${call.recording_url}.mp3`}
                                      download
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1 rounded bg-[var(--surface-3)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--ink-mute)] hover:text-[var(--ink)] transition-colors flex items-center justify-center"
                                      title="Download Recording"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="15" x2="12" y2="3" />
                                      </svg>
                                    </a>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase border"
                                style={{
                                  background: isInbound ? "rgba(16,185,129,0.08)" : "rgba(59,130,246,0.08)",
                                  color: isInbound ? "var(--mint)" : "var(--blue-400)",
                                  borderColor: isInbound ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)",
                                }}
                              >
                                {isInbound ? <PhoneIncoming size={9} /> : <PhoneOutgoing size={9} />}
                                {isInbound ? "Inbound" : "Outbound"}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase border" style={{ background: st.bg, color: st.color, borderColor: st.color + "22" }}>
                                {st.label}
                              </span>
                            </td>
                            <td className="px-5 py-4 font-mono text-[var(--ink-mute)]">
                              <div className="flex items-center gap-1.5">
                                <span>{formatDuration(call.duration_seconds)}</span>
                                {call.recording_url && call.recording_url !== "#" && (
                                  <span title="Recording available">
                                    <FileAudio size={14} className="text-[var(--viol-400)] animate-pulse" />
                                  </span>
                                )}
                                {(call.transcription_text || call.transcription) && (
                                  <span title="Transcription available">
                                    <FileText size={14} className="text-emerald-500" />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-5 py-4 max-w-[240px] truncate text-[var(--ink-mute)]">
                              {call.ai_summary || "—"}
                            </td>
                            <td className="px-5 py-4 text-right text-[var(--ink-mute)]">
                              {timeAgo(call.started_at)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Log Outcome Modal */}
      {showLogForm && selectedCall && (
        <LogOutcomeModal
          call={selectedCall}
          onSave={handleLogOutcome}
          onClose={() => {
            setShowLogForm(false);
            setSelectedCall(null);
          }}
          saving={saving}
        />
      )}
    </Shell>
  );
}

function LogOutcomeModal({
  call,
  onSave,
  onClose,
  saving,
}: {
  call: ApiCall;
  onSave: (data: { outcome: string; notes: string; nextStage: string }) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState(call.ai_summary || "");

  useEffect(() => {
    if (call.ai_summary) {
      setNotes(call.ai_summary);
    }
  }, [call.ai_summary]);
  const nextStage = "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-[var(--surface)] border border-[var(--line-2)] rounded-2xl p-6 shadow-2xl animate-scale-up"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-[var(--ink)]">Log Call Outcome</h3>
            <p className="text-xs text-[var(--ink-mute)] mt-1">
              {call.lead_name} · {formatDuration(call.duration_seconds)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--surface-3)] text-[var(--ink-mute)]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-mute)] mb-2">
              Select Call Outcome
            </label>
            <div className="flex flex-wrap gap-2">
              {OUTCOMES.map((oc) => (
                <button
                  key={oc}
                  onClick={() => setOutcome(oc)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    outcome === oc
                      ? "bg-[var(--surface-3)] border-[var(--viol-400)] text-[var(--viol-400)] shadow-sm scale-95"
                      : "bg-[var(--surface-2)] border-[var(--line)] text-[var(--ink-mute)] hover:border-[var(--line-2)]"
                  }`}
                >
                  {oc}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-mute)] mb-2">
              Summary Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What happened on the call..."
              className="w-full h-24 p-3 rounded-xl text-xs resize-none outline-none focus:ring-1 focus:ring-[var(--viol-400)]/40 focus:border-[var(--viol-400)] border border-[var(--line)]"
              style={{
                background: "var(--surface-2)",
                color: "var(--ink)",
              }}
            />
          </div>

          {call.recording_url && (
            <div className="p-4 rounded-xl border border-[var(--line-2)] bg-[var(--surface-2)] space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-mute)] flex items-center gap-1.5">
                <FileAudio size={12} />
                Call Recording
              </label>
              <RecordingPlayer url={call.recording_url} />
            </div>
          )}

          {(call.transcription_text || call.transcription) && (
            <div className="p-4 rounded-xl border border-[var(--line-2)] bg-[var(--surface-2)] space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--ink-mute)] flex items-center gap-1.5">
                <FileText size={12} />
                Call Transcription
                {call.transcription_status && (
                  <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {call.transcription_status}
                  </span>
                )}
              </label>
              <div className="max-h-48 overflow-y-auto p-3 rounded-lg bg-[var(--surface-3)] border border-[var(--line)] text-xs text-[var(--ink)] leading-relaxed whitespace-pre-wrap">
                {call.transcription_text || call.transcription}
              </div>
            </div>
          )}

          {!call.transcription_text && !call.transcription && call.status === "completed" && call.recording_url && (
            <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" />
              <span>Transcription is being generated by Twilio. Refresh in a moment.</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-[var(--line-2)] pt-4 mt-5">
          <button
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--line)] text-[var(--ink-mute)] hover:bg-[var(--surface-3)] active:scale-95 transition-all"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--viol-400)] hover:bg-[var(--viol-500)] text-white shadow-md shadow-[var(--viol-400)]/10 active:scale-95 disabled:opacity-50 transition-all"
            onClick={() => onSave({ outcome, notes, nextStage })}
            disabled={!outcome || saving}
          >
            {saving ? "Saving..." : "Save Outcome"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── RecordingPlayer ──────────────────────────────────────────────────────
// Twilio serves recording URLs WITHOUT an extension. Browsers need a
// concrete MIME-type to know how to play, so we try `.mp3` first then
// `.wav` and let the <audio> element fall back automatically.
function RecordingPlayer({ url }: { url: string }) {
  const candidates = React.useMemo(() => {
    if (!url) return [];
    // If the URL already has an extension, use it as-is.
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
        Open recording in new tab ↗
      </a>
    </div>
  );
}
