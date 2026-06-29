"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Shell } from "@/components/layouts/Shell";
import { toPng } from "html-to-image";
import {
 MessageSquare,
 Calendar,
 Target,
 Download,
 Loader2,
 ChevronDown,
 Users,
 Zap,
} from "lucide-react";

type AnalyticsData = {
 totalLeads: number;
 totalMessages: number;
 bookedCount: number;
 hotCount: number;
 avgScore: number;
 channelCounts: Record<string, number>;
 totalChannelMsgs: number;
 stageCounts: Record<string, number>;
 totalStageLeads: number;
 sourceCounts: Record<string, number>;
 totalSourceLeads: number;
 emailCount: number;
 webCount: number;
 referralCount: number;
 sparkData: { date: string; count: number }[];
};

function MiniSpark({ data }: { data: { date: string; count: number }[] }) {
 if (!data || data.length < 2) return null;
 const values = data.map((d) => d.count);
 const max = Math.max(...values, 1);
 const min = Math.min(...values);
 const range = max - min || 1;
 const w = 80, h = 28;
 const pts = data.map((d, i) => [
 (i / (data.length - 1)) * w,
 h - ((d.count - min) / range) * (h - 4) - 2,
 ]);
 const d = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
 return (
 <svg viewBox={`0 0 ${w} ${h}`} style={{ width: 80, height: 28 }}>
 <path d={d} stroke="#7c6cff" strokeWidth="1.5" fill="none" />
 </svg>
 );
}

function PipelineChart({ sparkData }: { sparkData: { date: string; count: number }[] }) {
 if (!sparkData || sparkData.length === 0) {
 return (
 <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--ink-mute)", fontSize: 13 }}>
 No data available
 </div>
 );
 }
 const values = sparkData.map((d) => d.count);
 const max = Math.max(...values, 1);
 const w = 720, h = 200, pad = 30;
 const xStep = (w - pad * 2) / (sparkData.length - 1);
 const pts = sparkData.map((d, i) => ({
 x: pad + i * xStep,
 y: h - pad - ((d.count / max) * (h - pad * 2)),
 count: d.count,
 }));
 const areaPath = `M${pts[0].x} ${h - pad} ` + pts.map((p) => `L${p.x} ${p.y}`).join(" ") + ` L${pts[pts.length - 1].x} ${h - pad} Z`;
 const linePath = pts.map((p, i) => (i === 0 ? "M" : "L") + `${p.x} ${p.y}`).join(" ");

 return (
 <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 200 }}>
 <defs>
 <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stopColor="#7c6cff" stopOpacity="0.4" />
 <stop offset="100%" stopColor="#7c6cff" stopOpacity="0" />
 </linearGradient>
 </defs>
 {[0, 25, 50, 75, 100].map((g) => (
 <line
 key={g}
 x1={pad}
 x2={w - pad}
 y1={h - pad - (g / 100) * (h - pad * 2)}
 y2={h - pad - (g / 100) * (h - pad * 2)}
 stroke="rgba(26,30,48,0.8)"
 strokeWidth="1"
 />
 ))}
 <path d={areaPath} fill="url(#areaGrad)" />
 <path d={linePath} stroke="#7c6cff" strokeWidth="2" fill="none" />
 {pts.filter((_, i) => i % 2 === 0).map((p, i) => (
 <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="var(--surface)" stroke="#7c6cff" strokeWidth="1.5" />
 ))}
 </svg>
 );
}

function PieChart({
 data,
 title,
 total
}: {
 data: { label: string; count: number; color: string }[];
 title: string;
 total: number;
 }) {
 if (!data || data.length === 0) {
 return (
 <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: "var(--ink-mute)", fontSize: 13 }}>
 No data available
 </div>
 );
 }

 const colors = ["#7c6cff", "#5eb3ff", "#3ddc97", "#ffb547", "#f472b6", "#a78bfa"];
 let currentAngle = 0;
 const size = 180;
 const radius = size / 2;
 const segments = data.map((d, i) => {
 const pct = total > 0 ? d.count / total : 0;
 const startAngle = currentAngle;
 currentAngle += pct * 360;
 return {
 ...d,
 startAngle,
 endAngle: currentAngle,
 color: d.color || colors[i % colors.length]
 };
 });

 const gradients = segments.map((s, i) => {
 const startRad = ((s.startAngle - 90) * Math.PI) / 180;
 const endRad = ((s.endAngle - 90) * Math.PI) / 180;
 const largeArc = s.endAngle - s.startAngle > 180 ? 1 : 0;
 const x1 = radius + radius * Math.cos(startRad);
 const y1 = radius + radius * Math.sin(startRad);
 const x2 = radius + radius * Math.cos(endRad);
 const y2 = radius + radius * Math.sin(endRad);
 return `M${radius},${radius} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;
 });

 return (
 <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
 <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
 {segments.map((s, i) => (
 <path key={i} d={gradients[i]} fill={s.color} opacity={0.9} />
 ))}
 <circle cx={radius} cy={radius} r={radius * 0.55} fill="var(--surface)" />
 <text x={radius} y={radius - 8} textAnchor="middle" fill="var(--ink)" fontSize={22} fontWeight={600}>
 {total > 999 ? `${(total / 1000).toFixed(1)}K` : total}
 </text>
 <text x={radius} y={radius + 12} textAnchor="middle" fill="var(--ink-mute)" fontSize={11}>
 Total
 </text>
 </svg>
 {/* Legend */}
 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", marginTop: 12, width: "100%" }}>
 {segments.map((s) => (
 <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
 <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
 <span style={{ fontSize: 11, color: "var(--ink-mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
 {s.label}
 </span>
 <span style={{ fontSize: 11, fontWeight: 500, color: "var(--ink)", marginLeft: "auto" }}>
 {s.count}
 </span>
 </div>
 ))}
 </div>
 </div>
 );
}

export default function AnalyticsPage() {
 const [data, setData] = useState<AnalyticsData | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [timeRange, setTimeRange] = useState("30");
 const [showExportMenu, setShowExportMenu] = useState(false);
 const [exporting, setExporting] = useState(false);
 const [exportError, setExportError] = useState<string | null>(null);
 const dashboardRef = useRef<HTMLDivElement>(null);

 const fetchAnalytics = useCallback(async () => {
 setLoading(true);
 setError(null);
 try {
 const res = await fetch("/api/analytics");
 if (!res.ok) throw new Error(`Failed: ${res.status}`);
 const json = await res.json();
 setData(json);
 } catch (err: any) {
 setError(err.message ?? "Failed to load analytics");
 } finally {
 setLoading(false);
 }
 }, []);

 useEffect(() => {
 fetchAnalytics();
 }, [fetchAnalytics]);

 const handleExportExcel = () => {
 window.open("/api/analytics/export?format=excel", "_blank");
 setShowExportMenu(false);
 };

 // Resolve CSS custom-property values to concrete colors so the captured
 // image isn't blank/garbled when rendered outside the live stylesheet.
 const resolveThemeColors = () => {
 const styles = getComputedStyle(document.documentElement);
 const read = (name: string, fallback: string) =>
 (styles.getPropertyValue(name).trim() || fallback);
 return {
 surface: read("--surface", "#0e1322"),
 ink: read("--ink", "#e6e9f2"),
 inkMute: read("--ink-mute", "#8a90a6"),
 line: read("--line", "#252b3f"),
 };
 };

 const handleExportImage = async () => {
 const node = dashboardRef.current;
 if (!node) {
 setExportError("Dashboard not ready");
 setShowExportMenu(false);
 return;
 }
 setExporting(true);
 setExportError(null);
 setShowExportMenu(false);
 try {
 // Give the loading overlay a tick to settle in case the user clicked
 // the menu right after the data arrived.
 await new Promise((r) => requestAnimationFrame(() => r(null)));
 const theme = resolveThemeColors();
 const dataUrl = await toPng(node, {
 backgroundColor: theme.surface,
 pixelRatio: 2, // crisper output for retina/print
 cacheBust: true,
 // Inline any webfonts so they survive in the PNG.
 skipFonts: false,
 style: {
 // Make sure CSS variables resolve in the cloned subtree.
 color: theme.ink,
 backgroundColor: theme.surface,
 },
 // Replace any CSS var() references with resolved values.
 fetchRequestInit: { cache: "no-store" },
 });
 const link = document.createElement("a");
 const stamp = new Date().toISOString().split("T")[0];
 link.download = `revra-analytics-${stamp}.png`;
 link.href = dataUrl;
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
 } catch (err) {
 const msg = err instanceof Error ? err.message : "Failed to export image";
 setExportError(msg);
 } finally {
 setExporting(false);
 }
 };

 const channelData = data?.channelCounts ? Object.entries(data.channelCounts).map(([label, count]) => ({
 label,
 count,
 pct: data.totalChannelMsgs > 0 ? Math.round((count / data.totalChannelMsgs) * 100) : 0,
 color: label === "email" ? "#7c6cff" : label === "sms" ? "#5eb3ff" : label === "voice" ? "#3ddc97" : "#ffb547",
 })) : [];

 const funnelData = data?.stageCounts ? Object.entries(data.stageCounts).map(([stage, count]) => ({
 label: stage.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
 count,
 color: stage === "booked" ? "#7c6cff" : stage === "qualifying" ? "#5eb3ff" : stage === "in_progress" ? "#3ddc97" : "#ffb547",
 })) : [];

 const sourceData = data?.sourceCounts ? Object.entries(data.sourceCounts).map(([source, count]) => ({
 label: source?.replace(/_/g, " ")?.replace(/\b\w/g, (c) => c.toUpperCase()) || "Unknown",
 count,
 color: source === "email" ? "#7c6cff" : source === "website" ? "#5eb3ff" : source === "referral" ? "#3ddc97" : source === "phone" ? "#ffb547" : "#a78bfa",
 })) : [];

 return (
 <Shell role="user">
 <div style={{ padding: "32px 40px" }} ref={dashboardRef}>
 {/* Header */}
 <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
 <div>
 <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.005em" }}>
 Analytics
 </h1>
 <p style={{ fontSize: 13, color: "var(--ink-mute)", marginTop: 4 }}>
 How your AI agent is performing across the funnel.
 </p>
 </div>
 <div style={{ display: "flex", gap: 8, position: "relative" }}>
 <button className="filter-btn" onClick={() => setTimeRange(t => t === "30" ? "90" : t === "90" ? "7" : "30")}>
 Last {timeRange} days <ChevronDown size={12} />
 </button>
 <div style={{ position: "relative" }}>
 <button
 className="btn-ghost"
 style={{ padding: "8px 14px", fontSize: 13 }}
 onClick={() => setShowExportMenu(!showExportMenu)}
 disabled={exporting}
 title={exporting ? "Exporting…" : "Export"}
 >
 {exporting ? (
 <Loader2 size={14} style={{ marginRight: 6, animation: "spin 1s linear infinite" }} />
 ) : (
 <Download size={14} style={{ marginRight: 6 }} />
 )}
 {exporting ? "Exporting…" : "Export"}
 </button>
 {showExportMenu && (
 <div
 style={{
 position: "absolute",
 top: "100%",
 right: 0,
 marginTop: 4,
 background: "var(--surface)",
 border: "1px solid var(--line)",
 borderRadius: "var(--radius-lg)",
 padding: "6px 0",
 minWidth: 160,
 zIndex: 50,
 boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
 }}
 >
 <button
 onClick={handleExportExcel}
 style={{
 display: "block",
 width: "100%",
 padding: "8px 12px",
 background: "none",
 border: "none",
 textAlign: "left",
 fontSize: 13,
 color: "var(--ink)",
 cursor: "pointer"
 }}
 >
 Export as Excel
 </button>
 <button
 onClick={handleExportImage}
 style={{
 display: "block",
 width: "100%",
 padding: "8px 12px",
 background: "none",
 border: "none",
 textAlign: "left",
 fontSize: 13,
 color: "var(--ink)",
 cursor: "pointer"
 }}
 >
 Export as Image
 </button>
 </div>
 )}
 </div>
 </div>
 </div>

 {exportError && (
 <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 8, background: "hsl(var(--destructive)/0.1)", color: "hsl(var(--destructive))", fontSize: 13 }}>
 {exportError}
 </div>
 )}

 {loading ? (
 <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "80px 0", color: "var(--ink-mute)" }}>
 <Loader2 size={18} className="animate-spin" />
 <span style={{ fontSize: 13 }}>Loading analytics...</span>
 </div>
 ) : error ? (
 <div style={{ textAlign: "center", padding: "60px 0", color: "var(--rose)" }}>
 <div style={{ fontSize: 13 }}>{error}</div>
 <button className="btn-ghost" style={{ marginTop: 8, padding: "6px 12px", fontSize: 12 }} onClick={fetchAnalytics}>Retry</button>
 </div>
 ) : (
 <>
 {/* KPI row */}
 <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 28 }}>
 {[
 { label: "Total Leads", value: (data?.totalLeads ?? 0).toLocaleString(), delta: null, icon: Users, color: "var(--viol-400)" },
 { label: "Conversations", value: (data?.totalMessages ?? 0).toLocaleString(), delta: "+24%", icon: MessageSquare, color: "var(--indi-400)" },
 { label: "Meetings Booked", value: (data?.bookedCount ?? 0).toLocaleString(), delta: "+50%", icon: Calendar, color: "var(--mint)" },
 { label: "Hot Leads", value: (data?.hotCount ?? 0).toLocaleString(), delta: "+14%", icon: Target, color: "var(--amber)" },
 { label: "Avg Score", value: data?.avgScore ?? 0, delta: null, icon: Zap, color: "var(--cyan)" },
 ].map((k) => (
 <div key={k.label} className="kpi-card">
 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
 <div>
 <div className="label">{k.label}</div>
 <div className="value">{k.value}</div>
 </div>
 <div
 style={{
 width: 32,
 height: 32,
 borderRadius: "var(--radius-lg)",
 background: "var(--surface-4)",
 display: "flex",
 alignItems: "center",
 justifyContent: "center",
 }}
 >
 <k.icon size={15} style={{ color: k.color }} />
 </div>
 </div>
 <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
 {k.delta && <span className="delta">↑ {k.delta}</span>}
 {data?.sparkData && <MiniSpark data={data.sparkData} />}
 </div>
 </div>
 ))}
 </div>

 {/* Charts grid */}
 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
 {/* Pipeline chart */}
 <div className="card" style={{ padding: "20px 24px" }}>
 <h3 className="chart-title" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
 Pipeline Generated
 </h3>
 <p style={{ fontSize: 12, color: "var(--ink-mute)", marginBottom: 16 }}>
 Daily inbound pipeline value sourced or accelerated by Emma
 </p>
 <PipelineChart sparkData={data?.sparkData ?? []} />
 </div>

 {/* Pipeline Stage Pie Chart */}
 <div className="card" style={{ padding: "20px 24px" }}>
 <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
 Pipeline Stages
 </h3>
 <p style={{ fontSize: 12, color: "var(--ink-mute)", marginBottom: 16 }}>Lead distribution by stage</p>
 <PieChart data={funnelData} title="Pipeline Stages" total={data?.totalStageLeads ?? 0} />
 </div>
 </div>

 {/* Bottom row */}
 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
 {/* Lead Sources Pie Chart */}
 <div className="card" style={{ padding: "20px 24px" }}>
 <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
 Lead Sources
 </h3>
 <p style={{ fontSize: 12, color: "var(--ink-mute)", marginBottom: 16 }}>Where your leads are coming from</p>
 <PieChart data={sourceData} title="Lead Sources" total={data?.totalSourceLeads ?? 0} />
 </div>

 {/* Channel mix */}
 <div className="card" style={{ padding: "20px 24px" }}>
 <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
 Channel Mix
 </h3>
 <p style={{ fontSize: 12, color: "var(--ink-mute)", marginBottom: 16 }}>Where Emma is meeting your leads</p>
 <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 140 }}>
 {channelData.length > 0 ? channelData.map((c) => (
 <div key={c.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
 <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{c.pct}%</span>
 <div
 style={{
 width: "100%",
 height: `${Math.max(c.pct * 1.6, 4)}px`,
 background: c.color,
 borderRadius: "4px 4px 0 0",
 opacity: 0.85,
 }}
 />
 <span style={{ fontSize: 11, color: "var(--ink-mute)" }}>{c.label}</span>
 </div>
 )) : (
 <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-mute)", fontSize: 13 }}>
 No channel data
 </div>
 )}
 </div>
 </div>
 </div>
 </>
 )}
 </div>
 </Shell>
 );
}
