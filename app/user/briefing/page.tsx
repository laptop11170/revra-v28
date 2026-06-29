"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Target,
  TrendingUp,
  TrendingDown,
  PhoneCall,
  Calendar,
  Star,
  ArrowRight,
  Bot,
  CheckCircle2,
  AlertCircle,
  Zap,
  ChevronRight,
  Loader2,
  Flame,
  MessageSquare,
  Sparkles,
 Clock,
 Phone,
 Video,
 MapPin,
 CalendarPlus,
 ExternalLink,
 Link as LinkIcon,
 CheckSquare,
 Mic,
} from "lucide-react";

type BriefingData = {
  stages: Array<{
    name: string;
    slug: string;
    position: number;
    color: string | null;
  }>;
  todayMessages: number;
  todayLeads: number;
  hotLeads: number;
  todayAppointments: number;
  stageCounts: Record<string, number>;
  totalStageLeads: number;
  recentLeads: Array<{
    id: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
    score: number;
    pipeline_stage: string;
    created_at: string;
    last_message_at?: string | null;
  }>;
  recommendedLead: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    score: number;
    pipeline_stage: string;
    last_message_at: string | null;
  } | null;
  recentMessages: Array<{
    id: string;
    body: string;
    direction: string;
    created_at: string;
  }>;
  sparkData: { date: string; count: number }[];
  upcomingAppointments: Array<{
  id: string;
  kind: "appointment" | "task";
  title: string;
  date: string;
  time: string;
  duration: number | null;
  type: string;
  status: string;
  lead_id: string | null;
  lead_name: string | null;
  meeting_link: string | null;
  google_event_id: string | null;
  priority?: string | null;
  }>;
  lastCall: {
    id: string;
    status: string | null;
    duration_seconds: number | null;
    started_at: string | null;
    direction: string | null;
    phone: string | null;
    lead_name: string | null;
  } | null;
  lastSms: {
    id: string;
    body: string | null;
    direction: string | null;
    created_at: string | null;
    phone: string | null;
    lead_name: string | null;
  } | null;
  lastRecording: {
    id: string;
    status: string | null;
    duration_seconds: number | null;
    started_at: string | null;
    recording_sid: string | null;
    recording_url: string | null;
    transcription: string | null;
    ai_summary: string | null;
    ai_disposition: string | null;
    lead_name: string | null;
  } | null;
};

function PipelineFunnel({ stages = [], stageCounts, totalLeads }: {
  stages: Array<{ name: string; slug: string; color: string | null }>;
  stageCounts: Record<string, number>;
  totalLeads: number;
}) {
  const max = Math.max(...stages.map((s) => stageCounts[s.slug] ?? 0), 1);

  const getDefaultGradient = (slug: string) => {
    const defaultColors: Record<string, string> = {
      new_lead: "from-blue-500 to-indigo-600",
      contacted: "from-indigo-500 to-purple-600",
      qualified: "from-purple-500 to-pink-600",
      quote_sent: "from-pink-500 to-rose-600",
      won: "from-emerald-400 to-teal-600",
      lost: "from-red-400 to-orange-500",
    };
    return defaultColors[slug] || "from-slate-400 to-slate-600";
  };

  const wonStage = stages.find((s) => s.slug === "won" || s.slug.includes("won")) || stages[stages.length - 1];
  const wonSlug = wonStage?.slug ?? "won";
  const wonName = wonStage?.name ?? "Won";
  const wonCount = stageCounts[wonSlug] ?? 0;

  return (
    <Card className="bg-[var(--surface-2)]/60 backdrop-blur-md border border-[var(--line-2)] shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300">
      <CardContent className="p-6">
        <h3 className="text-base font-bold text-[var(--ink)] mb-4 tracking-tight">Pipeline Funnel</h3>
        <div className="space-y-3.5">
          {stages.map((s) => {
            const count = stageCounts[s.slug] ?? 0;
            const percentage = (count / max) * 100;
            const gradient = getDefaultGradient(s.slug);
            return (
              <div key={s.slug} className="flex items-center gap-4">
                <span className="text-xs font-semibold w-24 truncate text-[var(--ink-mute)]">{s.name}</span>
                <div className="flex-1 rounded-xl h-5 overflow-hidden bg-[var(--surface-3)] border border-[var(--line)] shadow-inner relative">
                  <div
                    className={`h-full rounded-xl flex items-center justify-end pr-2 bg-gradient-to-r ${gradient} transition-all duration-500 shadow-md`}
                    style={{ width: `${Math.max(percentage, 8)}%` }}
                  >
                    <span className="text-[10px] text-white font-extrabold">{count}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-5 pt-4 flex justify-between items-center border-t border-[var(--line-2)]">
          <span className="text-xs font-medium text-[var(--ink-mute)]">{totalLeads} total leads</span>
          <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
            {wonCount} {wonName.toLowerCase()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function HotLeads({ leads }: {
  leads: Array<{ id: string; first_name: string; last_name: string; score: number; pipeline_stage: string }>
}) {
  const hot = leads.filter((l) => l.score >= 80).slice(0, 4);
  return (
    <Card className="bg-[var(--surface-2)]/60 backdrop-blur-md border border-[var(--line-2)] shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[var(--ink)] tracking-tight flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-orange-500 animate-pulse fill-orange-500" />
            Hot Leads
          </h3>
          <Badge className="bg-orange-500/10 text-orange-500 border border-orange-500/20 font-bold px-2 py-0.5 text-[10px] uppercase">{hot.length} priority</Badge>
        </div>
        <div className="space-y-3">
          {hot.map((lead) => (
            <div key={lead.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-3)] border border-[var(--line)] hover:border-[var(--viol-400)]/30 hover:scale-[1.01] transition-all">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-white text-[10px] font-extrabold shadow-sm">
                {`${lead.first_name?.[0] ?? ""}${lead.last_name?.[0] ?? ""}`}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[var(--ink)] truncate">{lead.first_name} {lead.last_name}</p>
                <p className="text-[10px] text-[var(--ink-mute)] truncate capitalize mt-0.5">{lead.pipeline_stage.replace("_", " ")}</p>
              </div>
              <div className="text-right">
                <span className="text-sm font-extrabold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg shadow-sm">
                  {lead.score}
                </span>
              </div>
            </div>
          ))}
          {hot.length === 0 && (
            <div className="text-[var(--ink-faint)] text-xs text-center py-8">
              No hot leads yet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Upcoming Appointments (Timeline) ────────────────────────────────────────
function EmmaRecommendation({ lead }: {
  lead: BriefingData["recommendedLead"];
}) {
  if (!lead) {
    return (
      <Card className="bg-[var(--surface-2)]/60 backdrop-blur-md border border-[var(--line-2)] shadow-xl rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--surface-3)] border border-[var(--line)] flex items-center justify-center">
              <Bot size={18} className="text-[var(--ink-faint)]" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[var(--ink)]">Emma&apos;s Next Best Action</h3>
              <p className="text-xs text-[var(--ink-mute)] mt-1">No scored leads are ready yet.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const leadName = `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "this lead";
  const stage = (lead.pipeline_stage || "new_lead").replace(/_/g, " ");

  return (
    <Card className="bg-[var(--surface-2)]/60 backdrop-blur-md border border-[var(--viol-400)]/25 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
      <div className="absolute -right-14 -top-14 w-36 h-36 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <CardContent className="p-6 relative">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--viol-400)] to-emerald-500 flex items-center justify-center shadow-md shadow-[var(--viol-400)]/20 shrink-0">
            <Sparkles size={18} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="text-base font-extrabold text-[var(--ink)] tracking-tight">Emma&apos;s Next Best Action</h3>
              <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-extrabold uppercase tracking-wider">
                Highest chance
              </Badge>
            </div>
            <p className="text-sm font-semibold text-[var(--ink)] leading-snug">
              Emma suggests you outreach <span className="text-[var(--viol-400)]">{leadName}</span> today.
            </p>
            <p className="text-xs text-[var(--ink-mute)] mt-1.5 leading-relaxed">
              This lead has the highest score in your workspace, so they have a higher chance of converting.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-extrabold text-emerald-500">
                <Zap size={12} />
                Score {lead.score}
              </span>
              <span className="inline-flex items-center rounded-lg border border-[var(--line)] bg-[var(--surface-3)] px-2.5 py-1 text-[11px] font-bold text-[var(--ink-mute)] capitalize">
                {stage}
              </span>
              {lead.phone && (
                <span className="inline-flex items-center rounded-lg border border-[var(--line)] bg-[var(--surface-3)] px-2.5 py-1 text-[11px] font-bold text-[var(--ink-mute)]">
                  {lead.phone}
                </span>
              )}
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => (window.location.href = "/user/leads")}
            className="shrink-0 h-9 px-3 text-xs font-bold self-start sm:self-auto"
          >
            Outreach
            <ArrowRight size={14} className="ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const APT_TYPE_META: Record<string, { icon: React.ReactNode; gradient: string; ring: string; chip: string }> = {
 Phone: { icon: <Phone size={12} />, gradient: "from-violet-500 to-indigo-600", ring: "ring-violet-500/30", chip: "bg-violet-500/10 text-violet-500 border-violet-500/20" },
 Video: { icon: <Video size={12} />, gradient: "from-blue-500 to-cyan-500", ring: "ring-blue-500/30", chip: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
 "In-Person": { icon: <MapPin size={12} />, gradient: "from-rose-500 to-orange-500", ring: "ring-rose-500/30", chip: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
};

const APT_STATUS_META: Record<string, { label: string; cls: string }> = {
 confirmed: { label: "Confirmed", cls: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
 pending: { label: "Pending", cls: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
 completed: { label: "Completed", cls: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
 no_show: { label: "No-show", cls: "bg-red-500/10 text-red-500 border-red-500/20" },
};

function formatTime12h(time24: string) {
 if (!time24) return "";
 const [hStr, mStr] = time24.split(":");
 const h = parseInt(hStr, 10);
 const period = h >= 12 ? "PM" : "AM";
 const h12 = h % 12 === 0 ? 12 : h % 12;
 return `${h12}:${mStr} ${period}`;
}

function formatDayLabel(dateStr: string, todayStr: string, tomorrowStr: string) {
 if (dateStr === todayStr) return "Today";
 if (dateStr === tomorrowStr) return "Tomorrow";
 const [, mm, dd] = dateStr.split("-");
 const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
 return `${months[parseInt(mm, 10) - 1]} ${parseInt(dd, 10)}`;
}

function googleEventUrl(meetingLink: string | null) {
 if (!meetingLink) return null;
 if (meetingLink.includes("calendar.google.com")) return meetingLink;
 return null;
}

function UpcomingAppointments({ appointments }: {
 appointments: BriefingData["upcomingAppointments"];
}) {
 const now = new Date();
 const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
 const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
 const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

 // Group by day for a small day header inside the timeline
 const grouped: { date: string; items: typeof appointments }[] = [];
 for (const apt of appointments) {
 const last = grouped[grouped.length - 1];
 if (last && last.date === (apt.date ? apt.date.split('T')[0] : '')) {
 last.items.push(apt);
 } else {
 grouped.push({ date: apt.date ? apt.date.split('T')[0] : '', items: [apt] });
 }
 }

 const nextId = appointments[0]?.id;

 return (
 <Card className="bg-[var(--surface-2)]/60 backdrop-blur-md border border-[var(--line-2)] shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden">
 {/* Soft violet glow accent */}
 <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-[var(--viol-400)]/10 blur-3xl pointer-events-none" />

 <CardContent className="p-6 relative">
 <div className="flex items-center justify-between mb-5">
 <div className="flex items-center gap-2">
 <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--viol-400)] to-indigo-600 flex items-center justify-center shadow-md shadow-[var(--viol-400)]/20">
 <Calendar size={15} className="text-white" />
 </div>
 <div>
 <h3 className="text-base font-bold text-[var(--ink)] tracking-tight leading-tight flex items-center gap-2">Upcoming{appointments.length > 0 && <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-extrabold bg-[var(--viol-400)] text-white rounded-full shadow-sm">{appointments.length}</span>}</h3>
 <p className="text-[10px] text-[var(--ink-mute)] font-semibold uppercase tracking-wider">Next 14 days</p>
 </div>
 </div>
 <button
 onClick={() => (window.location.href = "/user/calendar")}
 className="text-xs font-semibold text-[var(--viol-400)] hover:underline flex items-center gap-0.5 transition-colors"
 >
 Calendar <ChevronRight size={12} />
 </button>
 </div>

 {appointments.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-8 text-center">
 <div className="w-14 h-14 rounded-2xl bg-[var(--surface-3)] border border-[var(--line)] flex items-center justify-center mb-3">
 <CalendarPlus size={22} className="text-[var(--ink-faint)]" />
 </div>
 <p className="text-sm font-bold text-[var(--ink)]">Your schedule is clear</p>
 <p className="text-[11px] text-[var(--ink-mute)] mt-1 max-w-[220px] font-medium">
 No appointments or tasks scheduled in the next 14 days.
 </p>
 <button
 onClick={() => (window.location.href = "/user/calendar")}
 className="mt-3 px-3.5 py-1.5 text-[11px] font-bold rounded-lg bg-gradient-to-r from-[var(--viol-400)] to-indigo-600 text-white shadow-md shadow-[var(--viol-400)]/20 hover:opacity-95 active:scale-95 transition-all flex items-center gap-1.5"
 >
 <CalendarPlus size={12} /> Open calendar
 </button>
 </div>
 ) : (
 <div className="relative">
 {/* Timeline spine */}
 <div className="absolute left-[19px] top-1.5 bottom-1.5 w-px bg-gradient-to-b from-[var(--viol-400)]/40 via-[var(--line-2)] to-transparent" />

 <div className="space-y-4">
 {grouped.map((group) => (
 <div key={group.date}>
 {/* Day label */}
 <div className="flex items-center gap-2 pl-[42px] mb-1.5">
 <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--ink-mute)]">
 {formatDayLabel(group.date, todayStr, tomorrowStr)}
 </span>
 <span className="text-[10px] text-[var(--ink-faint)] font-medium">
 {group.items.length} {group.items.length === 1 ? "event" : "events"}
 </span>
 </div>

 <div className="space-y-2.5">
 {group.items.map((apt) => {
 const isTask = apt.kind === "task";
 // Appointment metadata (phone/video/in-person). Tasks fall back to a
 // neutral indigo gradient so they read as "work", not "meeting".
 const typeMeta = isTask
  ? { icon: null, gradient: "from-indigo-500 to-violet-600", ring: "ring-indigo-500/30", chip: "bg-indigo-500/10 text-indigo-300 border-indigo-400/20" }
  : (APT_TYPE_META[apt.type] || APT_TYPE_META.Phone);
 const statusMeta = APT_STATUS_META[apt.status] || APT_STATUS_META.pending;
 const leadName = (apt.lead_name && apt.lead_name.trim()) || (isTask ? "Unassigned" : "No lead");
 const initials = (leadName || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
 // Tasks navigate to /user/tasks; appointments go to the calendar page.
 const itemHref = isTask ? "/user/tasks" : "/user/calendar";
 const gUrl = googleEventUrl(apt.meeting_link);
 const isNext = apt.id === nextId;

 return (
 <div
 key={apt.id}
 onClick={() => (window.location.href = itemHref)}
 className="group relative pl-[42px] cursor-pointer transition-all"
 >
 {/* Node */}
 <div className="absolute left-0 top-2.5 w-[38px] flex justify-center">
 <div
 className={`w-[14px] h-[14px] rounded-full bg-gradient-to-br ${typeMeta.gradient} ring-4 ${typeMeta.ring} shadow-md group-hover:scale-110 transition-transform`}
 />
 </div>

 {/* Card */}
 <div
 className={`relative rounded-xl border bg-[var(--surface-3)]/70 hover:bg-[var(--surface-3)] hover:border-[var(--viol-400)]/30 hover:shadow-md transition-all p-3 ${
 isNext ? "border-[var(--viol-400)]/30 shadow-md shadow-[var(--viol-400)]/5" : "border-[var(--line)]"
 }`}
 >
 {isNext && (
 <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-[var(--viol-400)] to-indigo-600 text-white shadow-sm">
 Next
 </span>
 )}

 {/* Top row: time + status */}
 <div className="flex items-center justify-between gap-2 mb-1.5">
 <div className="flex items-center gap-1.5 text-[var(--ink)]">
 <Clock size={11} className="text-[var(--ink-mute)]" />
 <span className="text-xs font-extrabold tracking-tight">{formatTime12h(apt.time)}</span>
 {apt.duration != null && (<span className="text-[10px] text-[var(--ink-faint)] font-medium">· {apt.duration}m</span>)}
 </div>
 <span
 className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-extrabold uppercase tracking-wider ${statusMeta.cls}`}
 >
 {statusMeta.label}
 </span>
 </div>

 {/* Title */}
 <p className="text-xs font-bold text-[var(--ink)] leading-snug mb-2 line-clamp-1">
 {apt.title}
 </p>

 {/* Footer row: lead avatar + type chip + link icon */}
 <div className="flex items-center justify-between gap-2">
 <div className="flex items-center gap-1.5 min-w-0">
 <div
 className={`w-5 h-5 rounded-full bg-gradient-to-br ${typeMeta.gradient} flex items-center justify-center text-white text-[8px] font-extrabold flex-shrink-0`}
 >
 {initials}
 </div>
 <span className="text-[10px] text-[var(--ink-mute)] font-semibold truncate">
 {leadName}
 </span>
 </div>
 <div className="flex items-center gap-1 flex-shrink-0">
 <span
 className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-bold ${typeMeta.chip}`}
 >
 {isTask ? <CheckSquare size={11} /> : typeMeta.icon}
 {isTask ? "Task" : apt.type}
 </span>
 {gUrl && <LinkIcon size={10} className="text-emerald-500" />}
 </div>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 );
}

export default function MorningBriefingPage() {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBriefing = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/briefing");
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load briefing");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBriefing();
  }, [fetchBriefing]);

  const stagesList = data?.stages ?? [];
  const firstStageSlug = stagesList[0]?.slug ?? "new_lead";
  const secondStageSlug = stagesList[1]?.slug ?? "contacted";
  const firstStageName = stagesList[0]?.name ?? "New Lead";
  const secondStageName = stagesList[1]?.name ?? "Contacted";
  const followUpCount = (data?.stageCounts?.[firstStageSlug] ?? 0) + (data?.stageCounts?.[secondStageSlug] ?? 0);

  return (
    <Shell role="user">
      <div className="max-w-[1600px] mx-auto p-3 sm:p-6 space-y-8">

        {/* Top Header Card */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[var(--surface-2)]/60 backdrop-blur-md border border-[var(--line-2)] rounded-3xl p-6 gap-6 shadow-xl relative overflow-hidden">
          {/* Subtle Background Glow Accent */}
          <div className="absolute -right-20 -top-20 w-44 h-44 rounded-full bg-[var(--viol-400)]/10 blur-3xl pointer-events-none" />

          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--ink)] tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-500 fill-yellow-500/15" />
              Good Morning, Agent
            </h1>
            <p className="text-xs sm:text-sm text-[var(--ink-mute)] mt-1.5 font-medium">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} — Here&apos;s your day at a glance
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 size={32} className="animate-spin text-[var(--ink-mute)]" />
            <span className="text-sm text-[var(--ink-mute)] font-medium">Assembling briefing details...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-[var(--surface-2)]/60 border border-[var(--line-2)] rounded-2xl shadow-md">
            <p className="text-sm text-red-500 font-semibold">{error}</p>
            <button
              className="mt-4 px-4 py-2 text-xs font-bold rounded-lg bg-[var(--surface-3)] border border-[var(--line-2)] text-[var(--ink)] hover:bg-[var(--surface-4)] active:scale-95 transition-all"
              onClick={fetchBriefing}
            >
              Retry Load
            </button>
          </div>
        ) : (
          <>
            {/* Today's KPI Counters (Grid of 4) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: "Conversations", value: data?.todayMessages ?? 0, sub: "Exchanged today", color: "text-[var(--viol-400)]", bg: "bg-[var(--viol-400)]/5 border-[var(--viol-400)]/10", icon: <MessageSquare size={18} /> },
                { label: "Hot Leads", value: data?.hotLeads ?? 0, sub: "Ready for calls", color: "text-orange-500", bg: "bg-orange-500/5 border-orange-500/10", icon: <Flame size={18} /> },
                { label: "New Leads", value: data?.todayLeads ?? 0, sub: "Added this morning", color: "text-blue-500", bg: "bg-blue-500/5 border-blue-500/10", icon: <Target size={18} /> },
                { label: "Appointments", value: data?.upcomingAppointments?.length ?? 0, sub: "Upcoming (14 days)", color: "text-emerald-500", bg: "bg-emerald-500/5 border-emerald-500/10", icon: <Calendar size={18} /> },
              ].map((k) => (
                <Card key={k.label} className="bg-[var(--surface-2)]/60 border border-[var(--line-2)] shadow-xl rounded-2xl hover:scale-[1.02] transition-all duration-300">
                  <CardContent className="p-5 flex items-start justify-between">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-mute)]">{k.label}</span>
                      <p className="text-3xl font-extrabold text-[var(--ink)] mt-1.5 tracking-tight">{k.value.toLocaleString()}</p>
                      <span className="text-[10px] text-[var(--ink-mute)] mt-1 block font-medium">{k.sub}</span>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.color} ${k.bg} border`}>
                      {k.icon}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Funnel Funnel, Insights & Leads Panels */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

              {/* Funnel & AI Column (8 Cols) */}
              <div className="xl:col-span-8 flex flex-col gap-6">
                <EmmaRecommendation lead={data?.recommendedLead ?? null} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  <PipelineFunnel stages={data?.stages ?? []} stageCounts={data?.stageCounts ?? {}} totalLeads={data?.totalStageLeads ?? 0} />

                  {/* Recent Activity Cards: Last Call, Last SMS, Last Recording */}
                  {data?.lastCall ? (
                  <Card className="bg-[var(--surface-2)]/60 backdrop-blur-md border border-[var(--line-2)] shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                          <PhoneCall size={16} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--ink-mute)]">Last Call</p>
                          <p className="text-xs font-bold text-[var(--ink)] truncate">Lead: {data?.lastCall?.lead_name ?? "Unknown Lead"}</p>
                          <p className="text-[10px] text-[var(--ink-faint)]">{data?.lastCall?.phone ?? "No number"}</p>
                        </div>
                        <Badge variant={data?.lastCall?.status === "completed" ? "success" : "warning"} className="text-[9px] shrink-0">
                          {data?.lastCall?.status ?? "n/a"}
                        </Badge>
                      </div>
                      <div className="mt-1">
                        {data?.lastCall?.duration_seconds ? (
                          <p className="text-lg font-extrabold text-[var(--ink)]">{Math.floor(data.lastCall.duration_seconds / 60)}m {data.lastCall.duration_seconds % 60}s</p>
                        ) : (
                          <p className="text-sm font-medium text-[var(--ink-mute)]">No duration</p>
                        )}
                        <p className="text-[10px] text-[var(--ink-faint)]">{data?.lastCall?.started_at ? new Date(data.lastCall.started_at).toLocaleString() : ""}</p>
                      </div>
                    </CardContent>
                  </Card>
                  ) : (
                  <Card className="bg-[var(--surface-2)]/60 backdrop-blur-md border border-[var(--line-2)] shadow-xl rounded-2xl">
                    <CardContent className="p-5 flex flex-col items-center justify-center py-6">
                      <PhoneCall size={22} className="text-[var(--ink-faint)] mb-2" />
                      <p className="text-xs font-bold text-[var(--ink-mute)]">No calls yet</p>
                    </CardContent>
                  </Card>
                  )}

                  {data?.lastSms ? (
                  <Card className="bg-[var(--surface-2)]/60 backdrop-blur-md border border-[var(--line-2)] shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                          <MessageSquare size={16} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--ink-mute)]">Last SMS</p>
                          <p className="text-xs font-bold text-[var(--ink)] truncate">Lead: {data?.lastSms?.lead_name ?? "Unknown Lead"}</p>
                          <p className="text-[10px] text-[var(--ink-faint)]">{data?.lastSms?.phone ?? "No number"}</p>
                        </div>
                        <Badge variant={data?.lastSms?.direction === "inbound" ? "success" : "default"} className="text-[9px] shrink-0">
                          {data?.lastSms?.direction ?? "n/a"}
                        </Badge>
                      </div>
                      <p className="text-xs text-[var(--ink-mute)] line-clamp-2">{data?.lastSms?.body ?? ""}</p>
                      <p className="text-[10px] text-[var(--ink-faint)] mt-2">{data?.lastSms?.created_at ? new Date(data.lastSms.created_at).toLocaleString() : ""}</p>
                    </CardContent>
                  </Card>
                  ) : (
                  <Card className="bg-[var(--surface-2)]/60 backdrop-blur-md border border-[var(--line-2)] shadow-xl rounded-2xl">
                    <CardContent className="p-5 flex flex-col items-center justify-center py-6">
                      <MessageSquare size={22} className="text-[var(--ink-faint)] mb-2" />
                      <p className="text-xs font-bold text-[var(--ink-mute)]">No SMS yet</p>
                    </CardContent>
                  </Card>
                  )}

                  {data?.lastRecording ? (
                  <Card className="bg-[var(--surface-2)]/60 backdrop-blur-md border border-[var(--line-2)] shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shrink-0">
                          <Mic size={16} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--ink-mute)]">Last Recording</p>
                          <p className="text-xs font-bold text-[var(--ink)] truncate">Lead: {data?.lastRecording?.lead_name ?? "Unknown Lead"}</p>
                        </div>
                        <Badge variant={data?.lastRecording?.ai_disposition ? "success" : "default"} className="text-[9px] shrink-0">
                          {data?.lastRecording?.ai_disposition ?? "n/a"}
                        </Badge>
                      </div>
                      {data?.lastRecording?.ai_summary ? (
                        <p className="text-xs text-[var(--ink-mute)] line-clamp-2 italic">{data.lastRecording.ai_summary}</p>
                      ) : (
                        <p className="text-xs text-[var(--ink-faint)] italic">No AI summary</p>
                      )}
                      {data?.lastRecording?.recording_url ? (
                        <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface-3)] p-3 space-y-2">
                          <audio controls preload="none" className="w-full h-9">
                            <source src={data.lastRecording.recording_url} type="audio/mpeg" />
                          </audio>
                          <div className="flex flex-wrap items-center gap-2">
                            <a
                              href={data.lastRecording.recording_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1 text-[10px] font-bold text-[var(--viol-400)] hover:border-[var(--viol-400)]/30 transition-colors"
                            >
                              <ExternalLink size={11} />
                              Open MP3
                            </a>
                            <a
                              href={data.lastRecording.recording_url}
                              download
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1 text-[10px] font-bold text-[var(--ink-mute)] hover:text-[var(--ink)] transition-colors"
                            >
                              Download MP3
                            </a>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 text-[10px] text-[var(--ink-faint)]">MP3 recording URL is not available yet.</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {data?.lastRecording?.duration_seconds && (
                          <span className="text-[10px] text-[var(--ink-faint)]">{Math.floor(data.lastRecording.duration_seconds / 60)}m {data.lastRecording.duration_seconds % 60}s</span>
                        )}
                        <span className="text-[10px] text-[var(--ink-faint)]">{data?.lastRecording?.started_at ? new Date(data.lastRecording.started_at).toLocaleString() : ""}</span>
                      </div>
                    </CardContent>
                  </Card>
                  ) : (
                  <Card className="bg-[var(--surface-2)]/60 backdrop-blur-md border border-[var(--line-2)] shadow-xl rounded-2xl">
                    <CardContent className="p-5 flex flex-col items-center justify-center py-6">
                      <Mic size={22} className="text-[var(--ink-faint)] mb-2" />
                      <p className="text-xs font-bold text-[var(--ink-mute)]">No recordings yet</p>
                    </CardContent>
                  </Card>
                  )}
                </div>
              </div>

              {/* Sidebar Hot Leads & Appointments Column (4 Cols) */}
              <div className="xl:col-span-4 flex flex-col gap-6">

                <HotLeads leads={data?.recentLeads ?? []} />

                {/* Upcoming Appointments Card */}
                <UpcomingAppointments appointments={data?.upcomingAppointments ?? []} />

              </div>
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
