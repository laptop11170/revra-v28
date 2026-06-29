"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shell } from "@/components/layouts/Shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useTwilioDevice, type TwilioCallStatus } from "@/lib/twilio/useTwilioDevice";
import {
 Phone,
 PhoneCall,
 PhoneOff,
 Mic,
 MicOff,
 MessageSquare,
 Calendar,
 Clock,
 User,
 Shield,
 DollarSign,
 MapPin,
 CheckSquare,
 Square,
 Bot,
 TrendingUp,
 Loader2,
 AlertTriangle,
 ArrowLeft,
} from "lucide-react";

const TALKING_POINTS = [
 "Introduce yourself and RevRa",
 "Ask about current coverage and carrier",
 "Explain Medicare Advantage key benefits",
 "Discuss any health concerns affecting plan choice",
 "Ask if they have questions about costs or coverage",
 "Schedule a follow-up call or in-person meeting",
];

const OBJECTIONS = [
 "I'm already covered through my spouse",
 "I can't afford the monthly premiums",
 "My doctor doesn't accept Medicare plans",
 "I'm happy with my current coverage",
];

interface LeadInfo {
 id: string;
 name: string;
 phone: string;
 email?: string | null;
 coverageType?: string | null;
 stage?: string | null;
 score?: number | null;
 state?: string | null;
 county?: string | null;
 budget?: string | null;
 lastContact?: string | null;
}

const STATUS_LABEL: Record<TwilioCallStatus, string> = {
 idle: "Idle",
 connecting: "Connecting…",
 ringing: "Ringing…",
 connected: "In Call",
 ended: "Ended",
 error: "Error",
};

function ActiveCallPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callId = searchParams.get("callId");
  const leadId = searchParams.get("leadId");
  const { addToast } = useToast();

  const { status, muted, error, identity, ready, placeCall, hangup, toggleMute } =
  useTwilioDevice();

  const [lead, setLead] = useState<LeadInfo | null>(null);
  const [loadingLead, setLoadingLead] = useState(true);
  const [duration, setDuration] = useState(0);
  const [paused, setPaused] = useState(false);
  const [notes, setNotes] = useState("");
  const [checkedPoints, setCheckedPoints] = useState<Set<number>>(new Set());
  const [showPostCall, setShowPostCall] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [hangupRequested, setHangupRequested] = useState(false);
  const [autoConnectTried, setAutoConnectTried] = useState(false);

  const [retellCallIdState, setRetellCallIdState] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<string>("initiated");
  const [aiTranscript, setAiTranscript] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── 1. Load the call + lead details from the API ─────────────────────────
  useEffect(() => {
  if (!callId) {
  setLoadingLead(false);
  return;
  }
  let cancelled = false;
  (async () => {
  try {
  const res = await fetch(`/api/calls/${callId}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load call");
  const json = await res.json();
  if (cancelled) return;
  const c = json.call;
  const ld = c.lead;
  setLead({
  id: ld?.id || c.lead_id,
  name:
  (c.lead_name && c.lead_name.trim()) ||
  `${ld?.first_name || ""} ${ld?.last_name || ""}`.trim() ||
  "Lead",
  phone: ld?.phone || c.lead_phone || "",
  email: ld?.email,
  coverageType: ld?.coverage_type,
  stage: c.stage,
  score: ld?.score,
  });

  if (c.retell_call_id) {
    setRetellCallIdState(c.retell_call_id);
    setAiStatus(c.status);
    setAiTranscript(c.transcription || c.transcription_text || null);
    if (c.ai_summary) {
      setNotes(c.ai_summary);
    }
    setAutoConnectTried(true);
  }
  } catch (err) {
  console.error(err);
  if (!cancelled) addToast?.({ type: "error", title: "Failed to load call record" });
  } finally {
  if (!cancelled) setLoadingLead(false);
  }
  })();
  return () => { cancelled = true; };
  }, [callId, addToast]);

  // ── Polling effect for Retell AI call updates ────────────────────────────
  useEffect(() => {
    if (!callId || !retellCallIdState) return;

    let cancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/calls/${callId}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const c = json.call;
        
        setAiStatus(c.status);
        setAiTranscript(c.transcription || c.transcription_text || null);
        if (c.ai_summary) {
          setNotes((prev) => prev || c.ai_summary);
        }
        if (c.duration_seconds && c.duration_seconds > 0) {
          setDuration(c.duration_seconds);
        }

        if (
          c.status === "completed" ||
          c.status === "busy" ||
          c.status === "no_answer" ||
          c.status === "failed"
        ) {
          clearInterval(interval);
          setShowPostCall(true);
        }
      } catch (err) {
        console.error("AI call polling error:", err);
      }
    }, 2500);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [callId, retellCallIdState]);

  // ── 2. Auto-place the call when device is ready + lead is loaded ─────────
  useEffect(() => {
  if (
  ready &&
  status === "idle" &&
  !autoConnectTried &&
  lead?.phone &&
  callId &&
  !retellCallIdState
  ) {
  setAutoConnectTried(true);
  placeCall({ to: lead.phone, callId }).then((c) => {
  if (!c) {
  addToast?.({
  type: "error",
  title: "Could not start call",
  description: error || "The voice device failed to place the call.",
  });
  }
  });
  }
  }, [ready, status, autoConnectTried, lead?.phone, callId, placeCall, addToast, error, retellCallIdState]);

  // ── 3. Drive the timer from the SDK's "connected" event or Retell progress ─
  useEffect(() => {
  const activeStatus = retellCallIdState ? aiStatus : status;
  const isConnected = retellCallIdState ? (aiStatus === "in_progress") : (status === "connected");

   if (isConnected && !startedAt) {
  setStartedAt(Date.now());
  }
  if (activeStatus === "completed" || activeStatus === "ended" || activeStatus === "idle") {
  setStartedAt(null);
  if (timerRef.current) {
  clearInterval(timerRef.current);
  timerRef.current = null;
  }
  }
  }, [status, startedAt, aiStatus, retellCallIdState]);

  useEffect(() => {
  if (startedAt && !paused) {
  timerRef.current = setInterval(() => {
  setDuration(Math.floor((Date.now() - startedAt) / 1000));
  }, 1000);
  } else if (timerRef.current) {
  clearInterval(timerRef.current);
  timerRef.current = null;
  }
  return () => {
  if (timerRef.current) clearInterval(timerRef.current);
  };
  }, [startedAt, paused]);

 // ── 4. On "ended" event from the SDK, hang up the call server-side and
 // show the post-call form. ───────────────────────────────────────────────
 useEffect(() => {
 if (status !== "ended" || showPostCall) return;
 (async () => {
 if (callId && !hangupRequested) {
 setHangupRequested(true);
 try {
 await fetch(`/api/calls/${callId}`, { method: "DELETE" });
 } catch (err) {
 console.error(err);
 }
 }
 setShowPostCall(true);
 })();
 }, [status, showPostCall, callId, hangupRequested]);

 // ── 5. Surface device errors to the user ────────────────────────────────
 useEffect(() => {
 if (error && status === "error") {
 addToast?.({ type: "error", title: "Call error", description: error });
 }
 }, [error, status, addToast]);

 // ── Handlers ─────────────────────────────────────────────────────────────
 const handleStartCall = useCallback(async () => {
 if (!lead?.phone || !callId) return;
 const c = await placeCall({ to: lead.phone, callId });
 if (c) addToast?.({ type: "info", title: "Call placed", description: `Calling ${lead.name}…` });
 }, [lead, callId, placeCall, addToast]);

  const handleEndCall = useCallback(async () => {
    if (retellCallIdState) {
      if (callId) {
        try {
          await fetch(`/api/calls/${callId}`, { method: "DELETE" });
        } catch (err) {
          console.error(err);
        }
      }
      setShowPostCall(true);
    } else {
      hangup();
    }
  }, [hangup, retellCallIdState, callId]);

  const formatDuration = (s: number) => {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
  };

  const togglePoint = (i: number) => {
  setCheckedPoints((prev) => {
  const next = new Set(prev);
  next.has(i) ? next.delete(i) : next.add(i);
  return next;
  });
  };

  const handleBack = () => {
    const isCallActive = retellCallIdState
      ? (aiStatus === "in_progress" || aiStatus === "ringing" || aiStatus === "initiated")
      : (status === "connected" || status === "connecting" || status === "ringing");
    if (isCallActive) {
      const ok = window.confirm("A call is in progress. Leave anyway?");
      if (!ok) return;
      if (retellCallIdState) {
        if (callId) {
          fetch(`/api/calls/${callId}`, { method: "DELETE" }).catch(() => {});
        }
      } else {
        try { hangup(); } catch { /* ignore */ }
      }
    }
    router.push("/user/calls");
  };

  if (showPostCall) {
    const STAGE_SLUG_MAP: Record<string, string> = {
      "New Lead": "new_lead",
      "Attempting Contact": "attempting_contact",
      "Contacted": "contacted",
      "Needs Analysis": "needs_analysis",
      "Quote Sent": "quote_sent",
      "Application Submitted": "application_submitted",
      "In Underwriting": "in_underwriting",
      "Bound / Policy Active": "bound_policy_active",
      "Closed Lost": "closed_lost",
    };

    return (
      <PostCallView
        callId={callId}
        duration={duration}
        lead={lead}
        notes={notes}
        onSave={async (outcome, nextStage, updatedNotes) => {
          try {
            // 1. Update call disposition and summary
            await fetch(`/api/calls/${callId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ai_summary: updatedNotes,
                ai_disposition: outcome,
                status: "completed",
                next_stage: nextStage,
              }),
            });

            // 2. Update lead stage in pipeline
            if (lead?.id && nextStage) {
              const stageSlug = STAGE_SLUG_MAP[nextStage] || "needs_analysis";
              await fetch(`/api/leads/${lead.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  pipeline_stage: stageSlug,
                }),
              });
            }
          } catch (err) {
            console.error("Failed to save post call log:", err);
          }
          addToast?.({ type: "success", title: "Call logged", description: `Outcome: ${outcome}` });
          router.push("/user/calls");
        }}
        onDiscard={() => router.push("/user/calls")}
      />
    );
  }

 if (loadingLead) {
 return (
 <Shell role="user">
 <div className="flex h-[60vh] items-center justify-center gap-3 text-sm text-[var(--ink-mute)]">
 <Loader2 className="animate-spin" size={18} />
 Loading call…
 </div>
 </Shell>
 );
 }

 if (!callId) {
 return (
 <Shell role="user">
 <div className="max-w-md mx-auto mt-16 p-6 bg-[var(--surface-2)] border border-[var(--line-2)] rounded-2xl text-center space-y-4">
 <AlertTriangle className="mx-auto text-amber-500" size={32} />
 <h2 className="text-lg font-bold">No active call</h2>
 <p className="text-sm text-[var(--ink-mute)]">Start a call from the Calls Center to use this screen.</p>
 <Button onClick={() => router.push("/user/calls")}>
 <ArrowLeft size={14} className="mr-2" />Back to Calls
 </Button>
 </div>
 </Shell>
 );
 }

  const inCall = retellCallIdState
    ? (aiStatus === "in_progress" || aiStatus === "ringing" || aiStatus === "initiated")
    : (status === "connected" || status === "ringing" || status === "connecting");
  const isError = !retellCallIdState && status === "error";

  const displayStatus = retellCallIdState
    ? (aiStatus === "in_progress"
        ? "connected"
        : (aiStatus === "initiated" || aiStatus === "ringing")
        ? "connecting"
        : (aiStatus === "completed" || aiStatus === "busy" || aiStatus === "no_answer")
        ? "ended"
        : aiStatus === "failed"
        ? "error"
        : "idle")
    : status;

 return (
 <Shell role="user">
 <div className="flex h-[calc(100vh-8rem)] gap-6">
 {/* LEFT: call script / dial pad */}
 <div className="w-1/2 flex flex-col gap-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <button
 onClick={handleBack}
 className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--surface-2)] border border-[var(--line-2)] hover:bg-[var(--surface-3)] transition-colors"
 title="Back to Calls"
 >
 <ArrowLeft size={16} />
 </button>
 <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
 {(lead?.name || "?").split(" ").map((n) => n[0]).slice(0, 2).join("")}
 </div>
 <div>
 <p className="font-semibold" style={{ color: "hsl(var(--on-surface))" }}>{lead?.name || "Lead"}</p>
 <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{lead?.phone}</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <Badge variant={statusVariant(displayStatus)}>
 <Clock size={10} className="mr-1" />
 {inCall ? (paused ? "Paused" : formatDuration(duration)) : STATUS_LABEL[displayStatus]}
 </Badge>
 {inCall && (
 <>
 {!retellCallIdState && (
   <Button variant="ghost" size="sm" onClick={toggleMute} title={muted ? "Unmute" : "Mute"}>
     {muted ? <MicOff size={14} /> : <Mic size={14} />}
     {muted ? "Unmute" : "Mute"}
   </Button>
 )}
 <Button variant="danger" size="sm" onClick={handleEndCall}>
 <PhoneOff size={14} className="mr-1" />End Call
 </Button>
 </>
 )}
 </div>
 </div>

 {/* Status / device banner */}
 <div className="text-xs flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--line-2)] bg-[var(--surface-2)]">
 <span className={`w-2 h-2 rounded-full ${ready ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-pulse"}`} />
 {ready ? (
 <span>Voice device ready{identity ? ` (${identity})` : ""}.</span>
 ) : error ? (
 <span className="text-rose-500">Device error: {error}</span>
 ) : (
 <span>Initializing voice device…</span>
 )}
 </div>

 {/* Pre-call card */}
 {!inCall && !isError && (
 <Card>
 <CardContent className="p-8 flex flex-col items-center text-center gap-3">
 <div className="w-20 h-20 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: "hsl(var(--success)_/_0.12)" }}>
 <Phone size={36} style={{ color: "hsl(var(--success))" }} />
 </div>
 <p className="text-lg font-semibold" style={{ color: "hsl(var(--on-surface))" }}>
 {autoConnectTried ? "Connecting…" : "Ready to Call"}
 </p>
 <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{lead?.phone}</p>
 <Button size="lg" onClick={handleStartCall} disabled={!ready || !lead?.phone || autoConnectTried}>
 <PhoneCall size={18} className="mr-2" />
 {ready ? "Start Call" : "Preparing device…"}
 </Button>
 </CardContent>
 </Card>
 )}

 {isError && (
 <Card>
 <CardContent className="p-6 flex flex-col items-center text-center gap-3">
 <AlertTriangle className="text-rose-500" size={32} />
 <p className="text-sm" style={{ color: "hsl(var(--on-surface))" }}>Could not start the call.</p>
 <p className="text-xs text-[var(--ink-mute)]">{error}</p>
 <Button onClick={handleStartCall} disabled={!ready}>Retry</Button>
 </CardContent>
 </Card>
 )}

 {inCall && (
 <>
 <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "hsl(var(--surface-container-low))" }}>
 <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((duration / 300) * 100, 100)}%`, backgroundColor: "hsl(var(--success))" }} />
 </div>

 <Card className="flex-1 overflow-y-auto">
 <CardContent className="p-6 space-y-4">
 <div className="flex items-center gap-2">
 <Bot size={16} style={{ color: "hsl(var(--primary))" }} />
 <p className="text-sm font-semibold" style={{ color: "hsl(var(--on-surface))" }}>AI Talking Points</p>
 <Badge variant="info" className="ml-auto">{checkedPoints.size}/{TALKING_POINTS.length} covered</Badge>
 </div>
 <div className="space-y-2">
 {TALKING_POINTS.map((point, i) => (
 <button
 key={i}
 onClick={() => togglePoint(i)}
 className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors border"
 style={checkedPoints.has(i)
 ? { backgroundColor: "hsl(var(--success)_/_0.06)", borderColor: "hsl(var(--success)_/_0.3)" }
 : { backgroundColor: "hsl(var(--surface-container-low))", borderColor: "hsl(var(--border)_/_0.5)" }
 }
 >
 {checkedPoints.has(i)
 ? <CheckSquare size={18} className="flex-shrink-0" style={{ color: "hsl(var(--success))" }} />
 : <Square size={18} className="flex-shrink-0" style={{ color: "hsl(var(--muted-foreground))" }} />}
 <span className="text-sm" style={{ color: checkedPoints.has(i) ? "hsl(var(--success))" : "hsl(var(--on-surface-variant))" }}>{point}</span>
 </button>
 ))}
 </div>

 <div className="pt-4" style={{ borderColor: "hsl(var(--border)_/_0.3)", borderTop: "1px solid" }}>
 <p className="text-sm font-semibold mb-2" style={{ color: "hsl(var(--on-surface))" }}>Anticipated Objections</p>
 <div className="space-y-1">
 {OBJECTIONS.map((obj, i) => (
 <p key={i} className="text-xs flex items-start gap-2" style={{ color: "hsl(var(--muted-foreground))" }}>
 <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: "hsl(var(--warning))" }} />
 {obj}
 </p>
 ))}
 </div>
 </div>

  {retellCallIdState && (
  <div className="pt-4" style={{ borderColor: "hsl(var(--border)_/_0.3)", borderTop: "1px solid" }}>
  <p className="text-sm font-semibold mb-2" style={{ color: "hsl(var(--on-surface))" }}>Live AI Transcript</p>
  <div className="w-full max-h-48 overflow-y-auto p-3 rounded-xl text-xs space-y-2 border font-mono" style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--surface-container-low))", color: "hsl(var(--on-surface-variant))" }}>
  {aiTranscript ? <p className="whitespace-pre-wrap">{aiTranscript}</p> : <p className="italic text-[var(--ink-mute)]">Waiting for conversation to start...</p>}
  </div>
  </div>
  )}

 <div className="pt-4" style={{ borderColor: "hsl(var(--border)_/_0.3)", borderTop: "1px solid" }}>
 <p className="text-sm font-semibold mb-2" style={{ color: "hsl(var(--on-surface))" }}>Live Notes</p>
 <textarea
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 placeholder="Take notes during the call..."
 className="w-full h-24 p-3 rounded-xl text-sm resize-none focus:outline-none focus:ring-2"
 style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--surface))", color: "hsl(var(--on-surface))" }}
 />
 </div>
 </CardContent>
 </Card>
 </>
 )}
 </div>

 {/* RIGHT: lead context */}
 <div className="w-1/2 flex flex-col gap-4">
 <Card className="flex-1 overflow-y-auto">
 <CardContent className="p-6 space-y-4">
 <div className="flex items-center gap-2 mb-4">
 <User size={16} style={{ color: "hsl(var(--muted-foreground))" }} />
 <p className="text-sm font-semibold" style={{ color: "hsl(var(--on-surface))" }}>Lead Profile</p>
 {(lead?.score ?? 0) >= 80 && (
 <Badge variant="success" className="ml-auto">
 <TrendingUp size={10} className="mr-1" />Score {lead?.score}
 </Badge>
 )}
 </div>

 <div className="grid grid-cols-2 gap-3">
 {[
 [<Phone size={12} key="p" />, "Phone", lead?.phone || "—"],
 [<Shield size={12} key="s" />, "Coverage", lead?.coverageType || "—"],
 [<DollarSign size={12} key="d" />, "Budget", lead?.budget || "—"],
 [<MapPin size={12} key="m" />, "Location", lead?.state ? `${lead.county || ""}${lead.county ? ", " : ""}${lead.state}` : "—"],
 ].map(([icon, label, value], i) => (
 <div key={i} className="p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--surface-container-low))" }}>
 <p className="text-xs mb-1 flex items-center gap-1" style={{ color: "hsl(var(--muted-foreground))" }}>{icon} {label}</p>
 <p className="text-sm font-medium" style={{ color: "hsl(var(--on-surface))" }}>{value as string}</p>
 </div>
 ))}
 </div>

 <div className="pt-4" style={{ borderColor: "hsl(var(--border)_/_0.3)", borderTop: "1px solid" }}>
 <p className="text-sm font-semibold mb-2" style={{ color: "hsl(var(--on-surface))" }}>Quick Actions</p>
 <div className="flex gap-2">
 <Button size="sm" variant="outline"><MessageSquare size={12} className="mr-1" />SMS</Button>
 <Button size="sm" variant="outline"><Calendar size={12} className="mr-1" />Schedule</Button>
 <Button size="sm" variant="outline"><Bot size={12} className="mr-1" />Emma AI</Button>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 </div>
 </Shell>
 );
}

function statusVariant(s: TwilioCallStatus): "success" | "warning" | "danger" | "default" {
 switch (s) {
 case "connected": return "success";
 case "ringing":
 case "connecting": return "warning";
 case "error": return "danger";
 default: return "default";
 }
}

function PostCallView({
  callId: _callId,
  duration,
  lead,
  notes,
  onSave,
  onDiscard,
}: {
  callId: string | null;
  duration: number;
  lead: LeadInfo | null;
  notes: string;
  onSave: (outcome: string, nextStage: string, updatedNotes: string) => Promise<void> | void;
  onDiscard: () => void;
}) {
  const { addToast } = useToast();
  const [outcome, setOutcome] = useState("");
  const [nextStage, setNextStage] = useState("Needs Analysis");
  const [notesState, setNotesState] = useState(notes || "");
  const [loading, setLoading] = useState(false);

  // Sync initial notes value when props load
  useEffect(() => {
    if (notes) setNotesState(notes);
  }, [notes]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const handleSave = async () => {
    if (!outcome) return;
    setLoading(true);
    try {
      await onSave(outcome, nextStage, notesState);
    } catch (err) {
      console.error(err);
      addToast?.({ type: "error", title: "Failed to save outcome" });
    } finally {
      setLoading(false);
    }
  };

 return (
 <Shell role="user">
 <div className="max-w-xl mx-auto mt-8">
 <Card>
 <CardContent className="p-8 space-y-6">
 <div className="text-center">
 <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "hsl(var(--success)_/_0.12)" }}>
 <Phone size={32} style={{ color: "hsl(var(--success))" }} />
 </div>
 <h2 className="text-xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>Call Ended</h2>
 <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
 {lead?.name ? `${lead.name} · ` : ""}Duration: {formatDuration(duration)}
 </p>
 </div>

 <div>
 <p className="text-sm font-semibold mb-2" style={{ color: "hsl(var(--on-surface))" }}>Call Outcome *</p>
 <select
 value={outcome}
 onChange={(e) => setOutcome(e.target.value)}
 className="w-full h-10 rounded-lg px-3 text-sm focus:outline-none focus:ring-2"
 style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--surface))", color: "hsl(var(--on-surface))" }}
 >
 <option value="">Select outcome...</option>
 <option>Appointment Scheduled</option>
 <option>Callback Requested</option>
 <option>Interested — Follow Up</option>
 <option>Not Interested</option>
 <option>Wrong Number</option>
 <option>No Answer / Voicemail</option>
 <option>DNC / Do Not Call</option>
 </select>
 </div>

 <div>
 <p className="text-sm font-semibold mb-2" style={{ color: "hsl(var(--on-surface))" }}>Move to Stage</p>
 <select
 value={nextStage}
 onChange={(e) => setNextStage(e.target.value)}
 className="w-full h-10 rounded-lg px-3 text-sm focus:outline-none focus:ring-2"
 style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--surface))", color: "hsl(var(--on-surface))" }}
 >
 {["New Lead", "Attempting Contact", "Contacted", "Needs Analysis", "Quote Sent", "Application Submitted", "In Underwriting", "Bound / Policy Active", "Closed Lost"].map((s) => (
 <option key={s}>{s}</option>
 ))}
 </select>
 </div>

  <div>
  <p className="text-sm font-semibold mb-2" style={{ color: "hsl(var(--on-surface))" }}>Call Notes</p>
  <textarea value={notesState} onChange={(e) => setNotesState(e.target.value)} className="w-full h-24 p-3 rounded-xl text-sm resize-none" style={{ backgroundColor: "hsl(var(--surface-container-low))", borderColor: "hsl(var(--border))", color: "hsl(var(--on-surface))" }} />
  </div>

 <div className="flex gap-3">
 <Button variant="outline" className="flex-1" onClick={onDiscard}>Discard Log</Button>
 <Button className="flex-1" onClick={handleSave} loading={loading} disabled={!outcome || loading}>Save & Close</Button>
 </div>
 </CardContent>
 </Card>
 </div>
 </Shell>
 );
}

export default function ActiveCallPage() {
 return (
 <Suspense fallback={
 <Shell role="user">
 <div className="flex h-[60vh] items-center justify-center gap-3 text-sm text-[var(--ink-mute)]">
 <Loader2 className="animate-spin" size={18} />
 Loading call…
 </div>
 </Shell>
 }>
 <ActiveCallPageInner />
 </Suspense>
 );
}
