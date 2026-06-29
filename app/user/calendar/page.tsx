"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
 Calendar as CalendarIcon,
 ChevronLeft,
 ChevronRight,
 Clock,
 Video,
 Phone,
 MapPin,
 Plus,
 ExternalLink,
 RefreshCw,
 Link as LinkIcon,
 Unlink,
 List,
 LayoutGrid,
 ArrowLeft,
 Sparkles,
 CheckCircle2,
 AlertCircle,
 CalendarPlus,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
interface ApiAppointment {
 id: string;
 lead_id: string | null;
 title: string;
 date: string;
 time: string;
 duration: number;
 type: string;
 status: string;
 meeting_link: string | null;
 google_event_id: string | null;
 sync_status: string | null;
 lead?: {
 id: string;
 first_name: string | null;
 last_name: string | null;
 phone: string | null;
 email: string | null;
 } | null;
}

interface LeadOption {
 id: string;
 first_name: string | null;
 last_name: string | null;
 phone: string | null;
 email: string | null;
}

interface AppointmentFormData {
 leadId: string;
 title: string;
 date: string;
 time: string;
 duration: number;
 type: string;
 meetingLink: string;
 lead_email: string | null;
}

type ViewMode = "month" | "day";

// ─── Constants ───────────────────────────────────────────────────────────────
const MONTHS = [
 "January","February","March","April","May","June",
 "July","August","September","October","November","December",
];
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAY_NAMES_FULL = [
 "Sunday","Monday","Tuesday","Wednesday",
 "Thursday","Friday","Saturday",
];

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; bgVar: string; colorVar: string }> = {
 Phone: { icon: <Phone size={13} />, bgVar: "primary", colorVar: "primary" },
 Video: { icon: <Video size={13} />, bgVar: "secondary", colorVar: "secondary" },
 "In-Person":{ icon: <MapPin size={13} />, bgVar: "success", colorVar: "success" },
};

const STATUS_CONFIG: Record<string, { variant: "success"|"warning"|"danger"|"default"; label: string }> = {
 confirmed: { variant: "success", label: "Confirmed" },
 pending: { variant: "warning", label: "Pending" },
 completed: { variant: "default", label: "Completed" },
 no_show: { variant: "danger", label: "No Show" },
 cancelled: { variant: "danger", label: "Cancelled" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function leadName(apt: ApiAppointment): string {
 if (!apt.lead) return "No Lead";
 return `${apt.lead.first_name || ""} ${apt.lead.last_name || ""}`.trim() || "Unknown Lead";
}

function getGoogleUrl(googleEventId: string | null): string | null {
 if (!googleEventId) return null;
 return `https://calendar.google.com/calendar/r/event/${googleEventId}`;
}

function dateStr(d: Date): string {
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function formatTime12h(time: string): string {
 if (!time) return "";
 const [hStr, mStr = "00"] = time.split(":");
 const hour = parseInt(hStr, 10);
 if (Number.isNaN(hour)) return time;
 const period = hour >= 12 ? "PM" : "AM";
 const displayHour = hour % 12 === 0 ? 12 : hour % 12;
 return `${displayHour}:${mStr.padStart(2, "0")} ${period}`;
}

function formatCompactDate(value: string): string {
 const [year, month, day] = value.split("-").map((part) => parseInt(part, 10));
 if (!year || !month || !day) return value;
 return new Date(year, month - 1, day).toLocaleDateString("en-US", {
 month: "short",
 day: "numeric",
 });
}

function typeClasses(type: string) {
 const map: Record<string, { accent: string; chip: string; dot: string; gradient: string }> = {
 Phone: {
 accent: "text-violet-300",
 chip: "bg-violet-500/10 text-violet-300 border-violet-400/20",
 dot: "bg-violet-400",
 gradient: "from-violet-500 to-indigo-500",
 },
 Video: {
 accent: "text-cyan-300",
 chip: "bg-cyan-500/10 text-cyan-300 border-cyan-400/20",
 dot: "bg-cyan-400",
 gradient: "from-cyan-500 to-blue-500",
 },
 "In-Person": {
 accent: "text-emerald-300",
 chip: "bg-emerald-500/10 text-emerald-300 border-emerald-400/20",
 dot: "bg-emerald-400",
 gradient: "from-emerald-500 to-teal-500",
 },
 };
 return map[type] || map.Phone;
}

// ─── New Appointment Modal ────────────────────────────────────────────────────
function NewAppointmentModal({ open, onClose, onSave }: {
 open: boolean;
 onClose: () => void;
 onSave?: (data: AppointmentFormData) => void;
}) {
 const [leads, setLeads] = useState<LeadOption[]>([]);
 const [loadingLeads, setLoadingLeads] = useState(false);
 const [form, setForm] = useState({
 leadId: "", title: "", date: "", time: "",
 duration: "30", type: "Phone", meetingLink: "",
 });

 useEffect(() => {
 if (!open) return;
 let alive = true;
 queueMicrotask(() => {
 if (!alive) return;
 setLoadingLeads(true);
 fetch("/api/leads?limit=200")
 .then((r) => r.json())
 .then((data) => { if (alive) setLeads(data.leads || []); })
 .catch(() => { if (alive) setLeads([]); })
 .finally(() => { if (alive) setLoadingLeads(false); });
 });
 return () => { alive = false; };
 }, [open]);

 const set = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

 const save = () => {
 const sel = leads.find((l) => l.id === form.leadId);
 onSave?.({ ...form, duration: parseInt(form.duration), lead_email: sel?.email || null });
 onClose();
 setForm({ leadId:"", title:"", date:"", time:"", duration:"30", type:"Phone", meetingLink:"" });
 };

 const canSave = form.title.trim() && form.date && form.time;

 return (
 <Modal open={open} onClose={onClose} size="md" title="New Appointment">
 <div className="p-6 space-y-4">
 <div>
 <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Lead</label>
 <select value={form.leadId} onChange={(e) => set("leadId", e.target.value)}
 className="w-full h-10 rounded-lg px-3 text-sm focus:outline-none focus:ring-2"
 style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--surface))", color: "hsl(var(--on-surface))" }}>
 <option value="">{loadingLeads ? "Loading..." : "Select lead (optional)"}</option>
 {leads.map((l) => (
 <option key={l.id} value={l.id}>{`${l.first_name||""} ${l.last_name||""}`.trim() || l.phone || l.id}</option>
 ))}
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Appointment Title *</label>
 <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Medicare Quote Review" />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Date *</label>
 <Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
 </div>
 <div>
 <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Time *</label>
 <Input type="time" value={form.time} onChange={(e) => set("time", e.target.value)} />
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Duration</label>
 <select value={form.duration} onChange={(e) => set("duration", e.target.value)}
 className="w-full h-10 rounded-lg px-3 text-sm focus:outline-none focus:ring-2"
 style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--surface))", color: "hsl(var(--on-surface))" }}>
 {["15","30","45","60"].map((m) => <option key={m} value={m}>{m} min</option>)}
 </select>
 </div>
 <div>
 <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Type</label>
 <select value={form.type} onChange={(e) => set("type", e.target.value)}
 className="w-full h-10 rounded-lg px-3 text-sm focus:outline-none focus:ring-2"
 style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--surface))", color: "hsl(var(--on-surface))" }}>
 {["Phone","Video","In-Person"].map((t) => <option key={t}>{t}</option>)}
 </select>
 </div>
 </div>
 {form.type === "Video" && (
 <div>
 <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Meeting Link</label>
 <Input value={form.meetingLink} onChange={(e) => set("meetingLink", e.target.value)} placeholder="https://meet.google.com/..." />
 </div>
 )}
 </div>
 <div className="flex justify-end gap-2 px-6 py-4" style={{ borderTop: "1px solid hsl(var(--border))" }}>
 <Button variant="outline" onClick={onClose}>Cancel</Button>
 <Button onClick={save} disabled={!canSave}>Create Appointment</Button>
 </div>
 </Modal>
 );
}

// ─── Appointment Detail Modal ────────────────────────────────────────────────
function AppointmentDetailModal({ open, onClose, appointment }: {
 open: boolean;
 onClose: () => void;
 appointment: ApiAppointment;
}) {
 const sc = STATUS_CONFIG[appointment.status] || STATUS_CONFIG.pending;
 const lName = leadName(appointment);
 const gUrl = getGoogleUrl(appointment.google_event_id);

 return (
 <Modal open={open} onClose={onClose} size="md" title="Appointment Details">
 <div className="p-6 space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="text-lg font-semibold" style={{ color: "hsl(var(--on-surface))" }}>{appointment.title}</h3>
 <div className="flex gap-2">
 {appointment.google_event_id && <Badge variant="success">Synced</Badge>}
 <Badge variant={sc.variant}>{sc.label}</Badge>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-3">
 {[
 ["Lead", lName],
 ["Type", appointment.type],
 ["Date & Time", `${appointment.date} at ${appointment.time}`],
 ["Duration", `${appointment.duration} min`],
 ].map(([label, value]) => (
 <div key={label} className="p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--surface-container-low))" }}>
 <p className="text-xs mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>{label}</p>
 <p className="text-sm font-medium" style={{ color: "hsl(var(--on-surface))" }}>{value}</p>
 </div>
 ))}
 </div>

 {appointment.meeting_link && (
 <div className="p-3 rounded-lg border" style={{ backgroundColor: "hsl(var(--primary)_/_0.06)", borderColor: "hsl(var(--primary)_/_0.2)" }}>
 <p className="text-xs mb-1" style={{ color: "hsl(var(--primary))" }}>Meeting Link</p>
 <a href={appointment.meeting_link} target="_blank" rel="noopener noreferrer"
 className="text-sm flex items-center gap-1 hover:underline" style={{ color: "hsl(var(--primary))" }}>
 {appointment.meeting_link} <ExternalLink size={12} />
 </a>
 </div>
 )}

 {appointment.google_event_id && (
 <div className="p-3 rounded-lg border flex items-center gap-2" style={{ backgroundColor: "hsl(var(--success)_/_0.06)", borderColor: "hsl(var(--success)_/_0.2)" }}>
 <LinkIcon size={14} style={{ color: "hsl(var(--success))" }} />
 <span className="text-xs" style={{ color: "hsl(var(--success))" }}>Synced with Google Calendar</span>
 </div>
 )}
 </div>

 <div className="flex gap-2 justify-end px-6 py-4" style={{ borderTop: "1px solid hsl(var(--border))" }}>
 <Button variant="outline" onClick={onClose}>Close</Button>
 {gUrl && (
 <a href={gUrl} target="_blank" rel="noopener noreferrer"
 className="inline-flex items-center justify-center rounded-lg font-medium px-4 py-2 text-sm gap-2 bg-gradient-primary text-white shadow-md hover:shadow-lg hover:brightness-110">
 View in Google Calendar <ExternalLink size={14} />
 </a>
 )}
 {appointment.meeting_link && !gUrl && (
 <a href={appointment.meeting_link} target="_blank" rel="noopener noreferrer"
 className="inline-flex items-center justify-center rounded-lg font-medium px-4 py-2 text-sm gap-2 bg-gradient-primary text-white shadow-md hover:shadow-lg hover:brightness-110">
 {appointment.type === "Video" ? "Join" : "Open"} <ExternalLink size={14} />
 </a>
 )}
 </div>
 </Modal>
 );
}

// ─── Day View ────────────────────────────────────────────────────────────────
function DayView({ date, appointments, onOpenDetail, onBack }: {
 date: Date;
 appointments: ApiAppointment[];
 onOpenDetail: (apt: ApiAppointment) => void;
 onBack: () => void;
}) {
 const dayStr = dateStr(date);
 const sorted = appointments
 .filter((a) => a.date === dayStr)
 .sort((a, b) => a.time.localeCompare(b.time));
 const todayStr = dateStr(new Date());
 const isToday = dayStr === todayStr;

 const hourSlots: { h: number; label: string }[] = [];
 for (let h = 6; h <= 22; h++) {
 const p = h < 12 ? "AM" : "PM";
 const dh = h <= 12 ? h : h - 12;
 hourSlots.push({ h, label: `${dh}:00 ${p}` });
 }

 const byHour = new Map<number, ApiAppointment[]>();
 for (const a of sorted) {
 const h = parseInt(a.time.split(":")[0], 10);
 const arr = byHour.get(h) || [];
 arr.push(a);
 byHour.set(h, arr);
 }

 return (
 <div className="rounded-3xl border border-[var(--line-2)] bg-[var(--surface-2)]/70 p-4 shadow-xl sm:p-6">
 <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
 <div className="flex items-center gap-3">
 <button onClick={onBack} className="btn-icon h-10 w-10 border border-[var(--line-2)] bg-[var(--surface-3)]" title="Back to month">
 <ArrowLeft size={16} />
 </button>
 <div>
 <div className="flex flex-wrap items-center gap-2">
 <h2 className="text-xl font-extrabold tracking-tight text-[var(--ink)]">
 {DAY_NAMES_FULL[date.getDay()]}, {MONTHS[date.getMonth()]} {date.getDate()}
 </h2>
 {isToday && <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-violet-200">Today</span>}
 </div>
 <p className="mt-1 text-xs font-semibold text-[var(--ink-mute)]">
 {sorted.length} appointment{sorted.length !== 1 ? "s" : ""} scheduled for {date.getFullYear()}
 </p>
 </div>
 </div>
 <button
 onClick={() => onOpenDetail(sorted[0])}
 disabled={sorted.length === 0}
 className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--line-2)] bg-[var(--surface-3)] px-4 py-2 text-xs font-bold text-[var(--ink-mute)] transition hover:text-[var(--ink)] disabled:cursor-not-allowed disabled:opacity-40"
 >
 <ExternalLink size={13} /> First appointment
 </button>
 </div>

 {sorted.length === 0 ? (
 <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-[var(--line)] bg-[var(--surface-4)]/70 p-8 text-center">
 <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-violet-400/15 bg-violet-500/10 text-violet-200">
 <CalendarIcon size={28} />
 </div>
 <p className="text-base font-extrabold text-[var(--ink)]">No appointments scheduled</p>
 <p className="mt-2 max-w-sm text-sm font-medium text-[var(--ink-mute)]">
 Nothing booked for {MONTHS[date.getMonth()]} {date.getDate()}. Use New Appointment to add something to this day.
 </p>
 </div>
 ) : (
 <div className="relative overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface-4)]/60 p-4">
 <div className="absolute bottom-4 left-[80px] top-4 w-px bg-gradient-to-b from-violet-400/60 via-[var(--line-2)] to-transparent" />
 <div className="space-y-1">
 {hourSlots.map((slot) => {
 const apts = byHour.get(slot.h);
 if (!apts || apts.length === 0) return null;

 return (
 <div key={slot.h} className="relative grid grid-cols-[58px_1fr] gap-5 py-3">
 <div className="pt-3 text-right text-[11px] font-bold text-[var(--ink-faint)]">{slot.label}</div>
 <div className="relative space-y-3">
 <div className="absolute -left-[25px] top-5 h-3 w-3 rounded-full border-2 border-[var(--surface-4)] bg-violet-400 shadow-[0_0_0_5px_rgba(167,139,250,0.14)]" />
 {apts.map((apt) => {
 const meta = typeClasses(apt.type);
 const sc = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
 const ln = leadName(apt);
 const ini = ln.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
 const gUrl = getGoogleUrl(apt.google_event_id);

 return (
 <div key={apt.id} className="group rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]/80 p-4 transition hover:border-violet-400/30 hover:bg-[var(--surface-3)] hover:shadow-xl">
 <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
 <div className="flex items-center gap-2">
 <span className="text-sm font-extrabold text-[var(--ink)]">{formatTime12h(apt.time)}</span>
 <span className="text-xs font-semibold text-[var(--ink-mute)]">{apt.duration} min</span>
 {apt.google_event_id && <LinkIcon size={12} className="text-emerald-300" />}
 </div>
 <Badge variant={sc.variant} className="text-[10px]">{sc.label}</Badge>
 </div>

 <h3 className="text-sm font-extrabold leading-snug text-[var(--ink)]">{apt.title}</h3>

 <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
 <div className="flex min-w-0 items-center gap-2">
 <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.gradient} text-[9px] font-extrabold text-white`}>
 {ini || "A"}
 </div>
 <div className="min-w-0">
 <p className="truncate text-xs font-bold text-[var(--ink)]">{ln}</p>
 <span className={`mt-1 inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[9px] font-bold ${meta.chip}`}>
 {TYPE_CONFIG[apt.type]?.icon || TYPE_CONFIG.Phone.icon}
 {apt.type}
 </span>
 </div>
 </div>
 <div className="flex gap-2">
 <button onClick={() => onOpenDetail(apt)} className="rounded-xl border border-[var(--line-2)] bg-[var(--surface-4)] px-3 py-2 text-xs font-bold text-[var(--ink-mute)] transition hover:text-[var(--ink)]">Details</button>
 {apt.meeting_link && (
 <a href={apt.meeting_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/15">
 Open <ExternalLink size={12} />
 </a>
 )}
 {gUrl && (
 <a href={gUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-3 py-2 text-xs font-extrabold text-white transition hover:brightness-110">
 Google <ExternalLink size={12} />
 </a>
 )}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 )}
 </div>
 );
}
export default function CalendarPage() {
 const [appointments, setAppointments] = useState<ApiAppointment[]>([]);
 const [loading, setLoading] = useState(true);
 const [viewMode, setViewMode] = useState<ViewMode>("month");
 const [selectedDate, setSelectedDate] = useState(new Date());
 const [calendarMonth, setCalendarMonth] = useState(new Date());
 const [showNewAppt, setShowNewAppt] = useState(false);
 const [showApptDetail, setShowApptDetail] = useState(false);
 const [selectedAppt, setSelectedAppt] = useState<ApiAppointment | null>(null);
 const [syncing, setSyncing] = useState(false);
 const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
 const [connecting, setConnecting] = useState(false);
 const [disconnecting, setDisconnecting] = useState(false);
 const { addToast } = useToast();

 // ─── Data fetching ────────────────────────────────────────────────────────
 const fetchAppointments = useCallback(async () => {
 try {
 const res = await fetch("/api/appointments");
 if (!res.ok) throw new Error("Failed");
 const data = await res.json();
 setAppointments(data.appointments || []);
 } catch {
 addToast({ type: "error", title: "Error", description: "Failed to load appointments" });
 } finally {
 setLoading(false);
 }
 }, [addToast]);

 const fetchCalendarStatus = useCallback(async () => {
 try {
 const res = await fetch("/api/calendar/status");
 if (res.ok) {
 const data = await res.json();
 setGoogleConnected(data.connected);
 }
 } catch {
 setGoogleConnected(false);
 }
 }, []);

 useEffect(() => {
 queueMicrotask(() => {
 fetchAppointments();
 fetchCalendarStatus();
 });
 }, [fetchAppointments, fetchCalendarStatus]);

 // ─── OAuth callback handling ──────────────────────────────────────────────
 useEffect(() => {
 const params = new URLSearchParams(window.location.search);
 if (params.get("connected") === "1") {
 queueMicrotask(() => {
 setGoogleConnected(true);
 addToast({ type: "success", title: "Connected", description: "Google Calendar connected" });
 window.history.replaceState({}, "", window.location.pathname);
 });
 }
 if (params.get("error")) {
 const err = params.get("error");
 const errDesc = {
 permission_denied: "You need to grant permission",
 no_code: "No authorization code received",
 no_workspace: "No workspace found",
 exchange_failed: "Token exchange failed",
 no_token: "No access token received",
 save_failed: "Failed to save credentials",
 server_error: "Server error occurred"
 }[String(err)] || String(err) || "Unknown error";
 queueMicrotask(() => {
 addToast({ type: "error", title: "Connection Failed", description: errDesc });
 window.history.replaceState({}, "", window.location.pathname);
 });
 }
 }, [addToast]);

 // ─── Sync Google Calendar events ──────────────────────────────────────────
 const handleSync = useCallback(async (isAuto = false) => {
 if (googleConnected !== true) {
 if (!isAuto) addToast({ type: "warning", title: "Not Connected", description: "Connect Google Calendar first" });
 return;
 }
 setSyncing(true);
 try {
 const res = await fetch("/api/calendar/sync", { method: "POST" });
 const data = await res.json();
 if (res.ok) {
 await fetchAppointments();
 addToast({
 type: "success",
 title: isAuto ? "Synced with Google Calendar" : "Calendar Synced",
 description: `${data.created||0} new, ${data.updated||0} updated`,
 });
 } else if (data.code === "NOT_CONNECTED") {
 setGoogleConnected(false);
 addToast({ type: "warning", title: "Not Connected", description: "Please connect Google Calendar first" });
 } else {
 addToast({ type: "error", title: "Sync Failed", description: data.error || "Unknown error" });
 }
 } catch {
 addToast({ type: "error", title: "Error", description: "Failed to sync calendar" });
 } finally {
 setSyncing(false);
 }
 }, [addToast, fetchAppointments, googleConnected]);

 // ─── Connect to Google ────────────────────────────────────────────────────
 const handleConnect = async () => {
 setConnecting(true);
 try {
 const res = await fetch("/api/calendar/connect?redirect=/user/calendar");
 const data = await res.json();
 if (data.url) {
 window.location.href = data.url;
 } else {
 addToast({ type: "error", title: "Error", description: data.error || "Failed to start OAuth" });
 }
 } catch {
 addToast({ type: "error", title: "Error", description: "Failed to connect Google Calendar" });
 } finally {
 setConnecting(false);
 }
 };

 // ─── Disconnect Google Calendar ────────────────────────────────────────────────
 const handleDisconnect = useCallback(async () => {
 if (googleConnected !== true) return;
 if (!confirm("Disconnect Google Calendar?")) return;
 setDisconnecting(true);
 try {
 const res = await fetch("/api/calendar/disconnect", { method: "POST" });
 if (res.ok) {
 setGoogleConnected(false);
 // Filter out synced appointments (keep only local ones without google_event_id)
 setAppointments((prev) => prev.filter((a) => !a.google_event_id));
 addToast({ type: "info", title: "Disconnected", description: "Google Calendar has been disconnected" });
 } else {
 const data = await res.json();
 addToast({ type: "error", title: "Disconnect Failed", description: data.error || "Failed to disconnect" });
 }
 } catch {
 addToast({ type: "error", title: "Error", description: "Failed to disconnect" });
 } finally {
 setDisconnecting(false);
 }
 }, [addToast, googleConnected]);

 const openDetail = (apt: ApiAppointment) => {
 setSelectedAppt(apt);
 setShowApptDetail(true);
 };

 const handleNewAppointment = async (data: AppointmentFormData) => {
 try {
 const res = await fetch("/api/appointments", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 lead_id: data.leadId || null,
 title: data.title,
 date: data.date,
 time: data.time,
 duration: data.duration,
 type: data.type,
 meeting_link: data.meetingLink || null,
 lead_email: data.lead_email,
 }),
 });
 if (!res.ok) throw new Error("Failed");
 const result = await res.json();
 setAppointments((prev) => [...prev, result.appointment]);
 addToast({ type: "success", title: "Appointment Created", description: `${data.title} has been scheduled.` });
 } catch {
 addToast({ type: "error", title: "Error", description: "Failed to create appointment" });
 }
 };

 const today = new Date();
 const todayKey = dateStr(today);
 const activeApts = appointments.filter((a) => a.status !== "cancelled");
 const upcomingApts = activeApts
 .filter((a) => a.date >= todayKey)
 .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
 const nextAppointment = upcomingApts[0] || null;
 const todayAptCount = activeApts.filter((a) => a.date === todayKey).length;
 const syncedCount = appointments.filter((a) => a.google_event_id).length;

 // ─── Month view helpers ───────────────────────────────────────────────────
 const cy = calendarMonth.getFullYear();
 const cm = calendarMonth.getMonth();
 const visibleMonthKey = `${cy}-${String(cm+1).padStart(2,"0")}`;
 const visibleMonthApts = activeApts.filter((a) => a.date.startsWith(visibleMonthKey));
 const daysInMonth = new Date(cy, cm + 1, 0).getDate();
 const firstDow = new Date(cy, cm, 1).getDay();

 const cells: (number | null)[] = [];
 for (let i = 0; i < firstDow; i++) cells.push(null);
 for (let d = 1; d <= daysInMonth; d++) cells.push(d);

 const aptsForDay = (day: number) => {
 const ds = `${cy}-${String(cm+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
 return appointments.filter((a) => a.date === ds);
 };

 const goToDay = (day: number) => {
 setSelectedDate(new Date(cy, cm, day));
 setViewMode("day");
 };

 // ─── Render ───────────────────────────────────────────────────────────────
 return (
 <Shell role="user">
 <div className="max-w-[1600px] mx-auto p-3 sm:p-6 space-y-6">
 <div className="relative overflow-hidden rounded-3xl border border-[var(--line-2)] bg-[linear-gradient(135deg,rgba(32,39,64,0.94),rgba(19,24,38,0.78))] p-5 sm:p-6 shadow-2xl">
 <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(167,139,250,0.18),transparent_30%),radial-gradient(circle_at_92%_0%,rgba(6,182,212,0.12),transparent_28%)]" />
 <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
 <div className="min-w-0">
 <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-200">
 <Sparkles size={13} className="text-yellow-300" />
 Smart Schedule
 </div>
 <h1 className="text-3xl font-extrabold tracking-tight text-[var(--ink)] sm:text-4xl">Calendar</h1>
 <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--ink-mute)]">
 {upcomingApts.length} upcoming appointment{upcomingApts.length !== 1 ? "s" : ""} across your active schedule
 {viewMode === "day" && (
 <span> - {DAY_NAMES_FULL[selectedDate.getDay()]}, {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}</span>
 )}
 </p>
 </div>
 <div className="flex flex-wrap items-center gap-2">
 {googleConnected === false && (
 <button
 onClick={handleConnect}
 disabled={connecting}
 className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-500/10 px-4 py-2.5 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/15 disabled:opacity-50"
 >
 <LinkIcon size={15} />
 {connecting ? "Connecting..." : "Connect Google"}
 </button>
 )}
 {googleConnected === true && (
 <>
 <button
 onClick={() => handleSync(false)}
 disabled={syncing}
 className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/15 disabled:opacity-50"
 >
 <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
 {syncing ? "Syncing..." : "Sync"}
 </button>
 <button
 onClick={handleDisconnect}
 disabled={disconnecting}
 title="Disconnect Google Calendar"
 className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line-2)] bg-[var(--surface-3)] text-[var(--ink-mute)] transition hover:text-[var(--ink)] disabled:opacity-50"
 >
 <Unlink size={15} />
 </button>
 </>
 )}
 <button
 onClick={() => setShowNewAppt(true)}
 className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-violet-500/20 transition hover:brightness-110 active:scale-95"
 >
 <Plus size={15} /> New Appointment
 </button>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
 {[
 { label: "Today", value: todayAptCount, sub: "meetings scheduled", icon: <Clock size={18} />, tone: "text-cyan-300 bg-cyan-500/10 border-cyan-400/15" },
 { label: "This Month", value: visibleMonthApts.length, sub: `${MONTHS[cm]} workload`, icon: <CalendarIcon size={18} />, tone: "text-violet-300 bg-violet-500/10 border-violet-400/15" },
 { label: "Synced", value: syncedCount, sub: googleConnected ? "Google connected" : "Google not connected", icon: googleConnected ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />, tone: googleConnected ? "text-emerald-300 bg-emerald-500/10 border-emerald-400/15" : "text-amber-300 bg-amber-500/10 border-amber-400/15" },
 { label: "Upcoming", value: upcomingApts.length, sub: "active appointments", icon: <CalendarPlus size={18} />, tone: "text-pink-300 bg-pink-500/10 border-pink-400/15" },
 ].map((stat) => (
 <div key={stat.label} className="rounded-2xl border border-[var(--line-2)] bg-[var(--surface-2)]/70 p-5 shadow-xl transition hover:-translate-y-0.5 hover:border-violet-400/25">
 <div className="flex items-start justify-between gap-4">
 <div>
 <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--ink-mute)]">{stat.label}</p>
 <p className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--ink)]">{stat.value}</p>
 <p className="mt-1 text-[11px] font-semibold text-[var(--ink-mute)]">{stat.sub}</p>
 </div>
 <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${stat.tone}`}>
 {stat.icon}
 </div>
 </div>
 </div>
 ))}
 </div>

 <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line-2)] bg-[var(--surface-2)]/50 p-2 sm:flex-row sm:items-center sm:justify-between">
 <div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--surface-4)] p-1">
 <button
 onClick={() => setViewMode("month")}
 className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${viewMode === "month" ? "bg-[var(--surface-3)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-mute)] hover:text-[var(--ink)]"}`}
 >
 <LayoutGrid size={14} /> Month
 </button>
 <button
 onClick={() => { setSelectedDate(new Date()); setViewMode("day"); }}
 className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition ${viewMode === "day" ? "bg-[var(--surface-3)] text-[var(--ink)] shadow-sm" : "text-[var(--ink-mute)] hover:text-[var(--ink)]"}`}
 >
 <List size={14} /> Today
 </button>
 </div>
 <div className="flex flex-wrap items-center gap-2 px-1">
 {["Phone", "Video", "In-Person"].map((type) => {
 const meta = typeClasses(type);
 return (
 <span key={type} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${meta.chip}`}>
 <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
 {type}
 </span>
 );
 })}
 </div>
 </div>

 <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
 {loading ? (
 <div className="xl:col-span-12 flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-[var(--line-2)] bg-[var(--surface-2)]/60 text-[var(--ink-mute)]">
 <RefreshCw size={34} className="mb-3 animate-spin" />
 <p className="text-sm font-semibold">Loading your calendar...</p>
 </div>
 ) : (
 <>
 {viewMode === "month" && (
 <div className="xl:col-span-8 rounded-3xl border border-[var(--line-2)] bg-[var(--surface-2)]/70 p-4 shadow-xl sm:p-6">
 <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
 <div>
 <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--ink-mute)]">Month View</p>
 <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--ink)]">{MONTHS[cm]} {cy}</h2>
 </div>
 <div className="flex items-center gap-2">
 <button className="btn-icon h-10 w-10 border border-[var(--line-2)] bg-[var(--surface-3)]" onClick={() => setCalendarMonth(new Date(cy, cm - 1, 1))} title="Previous month">
 <ChevronLeft size={17} />
 </button>
 <button className="rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 py-2 text-xs font-bold text-violet-200 transition hover:bg-violet-500/15" onClick={() => { setCalendarMonth(new Date()); setSelectedDate(new Date()); }}>
 Today
 </button>
 <button className="btn-icon h-10 w-10 border border-[var(--line-2)] bg-[var(--surface-3)]" onClick={() => setCalendarMonth(new Date(cy, cm + 1, 1))} title="Next month">
 <ChevronRight size={17} />
 </button>
 </div>
 </div>

 <div className="grid grid-cols-7 gap-2">
 {DAY_NAMES.map((d) => (
 <div key={d} className="py-2 text-center text-[10px] font-extrabold uppercase tracking-wider text-[var(--ink-mute)]">{d}</div>
 ))}
 {cells.map((day, i) => {
 if (!day) return <div key={i} className="min-h-[106px] rounded-2xl bg-[var(--surface-4)]/35" />;

 const isToday = day === today.getDate() && cm === today.getMonth() && cy === today.getFullYear();
 const isPast = new Date(cy, cm, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
 const dayApts = aptsForDay(day).sort((a, b) => a.time.localeCompare(b.time));

 return (
 <button
 key={i}
 onClick={() => goToDay(day)}
 className={`group min-h-[106px] rounded-2xl border p-2 text-left transition hover:-translate-y-0.5 hover:border-violet-400/35 hover:bg-[var(--surface-3)] hover:shadow-lg ${isToday ? "border-violet-400/60 bg-violet-500/10 shadow-lg shadow-violet-500/10" : "border-[var(--line)] bg-[var(--surface-4)]/55"} ${isPast && !isToday ? "opacity-60" : ""}`}
 >
 <div className="mb-2 flex items-center justify-between">
 <span className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-extrabold ${isToday ? "bg-violet-500 text-white" : "text-[var(--ink-mute)] group-hover:text-[var(--ink)]"}`}>
 {day}
 </span>
 {dayApts.length > 0 && <span className="text-[10px] font-bold text-[var(--ink-faint)]">{dayApts.length}</span>}
 </div>
 <div className="space-y-1">
 {dayApts.slice(0, 3).map((apt) => {
 const meta = typeClasses(apt.type);
 const cancelled = apt.status === "cancelled";
 return (
 <div
 key={apt.id}
 title={`${formatTime12h(apt.time)} ${apt.title}`}
 className={`flex items-center gap-1.5 truncate rounded-lg border px-1.5 py-1 text-[10px] font-bold ${cancelled ? "border-red-400/15 bg-red-500/10 text-red-300 line-through" : meta.chip}`}
 >
 {apt.google_event_id ? <LinkIcon size={9} /> : <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />}
 <span className="shrink-0">{formatTime12h(apt.time).replace(":00", "")}</span>
 <span className="truncate">{apt.title}</span>
 </div>
 );
 })}
 {dayApts.length > 3 && (
 <div className="rounded-lg bg-[var(--surface-3)] px-2 py-1 text-center text-[10px] font-bold text-[var(--ink-mute)]">+{dayApts.length - 3} more</div>
 )}
 </div>
 </button>
 );
 })}
 </div>
 </div>
 )}

 {viewMode === "day" && (
 <div className="xl:col-span-8">
 <DayView date={selectedDate} appointments={appointments} onOpenDetail={openDetail} onBack={() => setViewMode("month")} />
 </div>
 )}

 {viewMode === "month" && (
 <aside className="xl:col-span-4 space-y-6">
 <div className="rounded-3xl border border-[var(--line-2)] bg-[var(--surface-2)]/70 p-5 shadow-xl">
 <div className="mb-4 flex items-center justify-between">
 <div>
 <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--ink-mute)]">Next Up</p>
 <h3 className="mt-1 text-lg font-extrabold text-[var(--ink)]">Upcoming Schedule</h3>
 </div>
 <span className="rounded-full border border-[var(--line-2)] bg-[var(--surface-3)] px-2.5 py-1 text-[10px] font-bold text-[var(--ink-mute)]">{upcomingApts.length} active</span>
 </div>

 {nextAppointment ? (
 <div className="mb-5 overflow-hidden rounded-2xl border border-violet-400/25 bg-[linear-gradient(135deg,rgba(139,92,246,0.16),rgba(6,182,212,0.08))] p-4">
 <div className="mb-3 flex items-center justify-between gap-3">
 <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white/80">Next meeting</span>
 <Badge variant={(STATUS_CONFIG[nextAppointment.status] || STATUS_CONFIG.pending).variant} className="text-[10px]">{(STATUS_CONFIG[nextAppointment.status] || STATUS_CONFIG.pending).label}</Badge>
 </div>
 <h4 className="text-base font-extrabold leading-snug text-[var(--ink)]">{nextAppointment.title}</h4>
 <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-[var(--ink-mute)]">
 <Clock size={13} />
 {formatCompactDate(nextAppointment.date)} at {formatTime12h(nextAppointment.time)} - {nextAppointment.duration}m
 </p>
 <p className="mt-2 text-xs font-semibold text-[var(--ink-mute)]">{leadName(nextAppointment)}</p>
 <div className="mt-4 flex gap-2">
 <button onClick={() => openDetail(nextAppointment)} className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/15">Details</button>
 {nextAppointment.meeting_link && (
 <a href={nextAppointment.meeting_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-slate-950 transition hover:opacity-90">
 Open <ExternalLink size={12} />
 </a>
 )}
 </div>
 </div>
 ) : (
 <div className="mb-5 rounded-2xl border border-[var(--line)] bg-[var(--surface-4)] p-8 text-center">
 <CalendarPlus size={28} className="mx-auto mb-3 text-[var(--ink-faint)]" />
 <p className="text-sm font-bold text-[var(--ink)]">Your schedule is clear</p>
 <p className="mt-1 text-xs font-medium text-[var(--ink-mute)]">No upcoming appointments yet.</p>
 </div>
 )}

 <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
 {upcomingApts.slice(0, 12).map((apt) => {
 const sc = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
 const ln = leadName(apt);
 const ini = ln.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
 const meta = typeClasses(apt.type);
 return (
 <button key={apt.id} onClick={() => openDetail(apt)} className="group w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-4)] p-3 text-left transition hover:border-violet-400/30 hover:bg-[var(--surface-3)]">
 <div className="flex items-start gap-3">
 <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.gradient} text-[10px] font-extrabold text-white shadow-lg`}>
 {ini || "A"}
 </div>
 <div className="min-w-0 flex-1">
 <div className="flex items-start justify-between gap-2">
 <p className="truncate text-xs font-extrabold text-[var(--ink)]">{apt.title}</p>
 {apt.google_event_id && <LinkIcon size={11} className="shrink-0 text-emerald-300" />}
 </div>
 <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--ink-mute)]">
 <Clock size={11} />
 {formatCompactDate(apt.date)} - {formatTime12h(apt.time)}
 </p>
 <div className="mt-2 flex flex-wrap items-center gap-1.5">
 <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[9px] font-bold ${meta.chip}`}>
 {TYPE_CONFIG[apt.type]?.icon || TYPE_CONFIG.Phone.icon}
 {apt.type}
 </span>
 <Badge variant={sc.variant} className="text-[9px]">{sc.label}</Badge>
 </div>
 </div>
 </div>
 </button>
 );
 })}
 </div>
 </div>
 </aside>
 )}
 </>
 )}
 </div>
 </div>
 <NewAppointmentModal open={showNewAppt} onClose={() => setShowNewAppt(false)} onSave={handleNewAppointment} />
 {selectedAppt && (
 <AppointmentDetailModal
 open={showApptDetail}
 onClose={() => { setShowApptDetail(false); setSelectedAppt(null); }}
 appointment={selectedAppt}
 />
 )}
 </Shell>
 );
}
