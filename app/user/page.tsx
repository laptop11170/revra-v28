"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  Mail,
  Send,
  Loader2,
} from "lucide-react";

const quickActions = [
  "Qualify new leads",
  "Follow up with unresponded leads",
  "Book meetings",
  "Re-engage cold leads",
];

type HomeData = {
  conversations: number;
  repliesSent: number;
  meetingsBooked: number;
  opportunities: number;
  sparkData: { label: string; value: number }[];
};

function TodaySummaryCard({ data }: { data: HomeData | null }) {
  const items = [
    { label: "Conversations", value: data?.conversations ?? 0, delta: "+24%" },
    { label: "Replies Sent", value: data?.repliesSent ?? 0, delta: "+31%" },
    { label: "Meetings Booked", value: data?.meetingsBooked ?? 0, delta: "+50%" },
    { label: "Opportunities", value: data?.opportunities ?? 0, delta: "+14%" },
  ];

  function SparklineSvg({ values }: { values: number[] }) {
    if (!values || values.length === 0) return null;
    const max = Math.max(...values, 1);
    const min = Math.min(...values);
    const range = max - min || 1;
    const w = 64, h = 22;
    const pts = values.map((v, i) => [
      (i / (values.length - 1)) * w,
      h - ((v - min) / range) * (h - 4) - 2,
    ]);
    const d = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: 64, height: 22 }}>
        <path d={d} stroke="var(--indi-400)" strokeWidth="1.5" fill="none" />
      </svg>
    );
  }

  return (
    <div className="card" style={{ padding: 16, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Today's Summary</h3>
        <span
          className="badge"
          style={{ background: "var(--surface-4)", border: "1px solid var(--line)", padding: "2px 8px", borderRadius: "var(--radius-md)", fontSize: 11.5, color: "var(--ink-mute)", display: "flex", alignItems: "center", gap: 4 }}
        >
          <Calendar size={11} />
          {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {items.map((item) => {
          const sparkVals = data?.sparkData?.map((d) => d.value) ?? [];
          return (
            <div key={item.label} style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>{item.label}</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", lineHeight: 1.1, letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums" }}>
                  {item.value.toLocaleString()}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11.5, color: "var(--mint)", fontWeight: 500 }}>{item.delta}</span>
                <SparklineSvg values={sparkVals} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function UserHomePage() {
  const [input, setInput] = useState("");
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const fetchHomeData = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await fetch("/api/home");
      if (res.ok) {
        const json = await res.json();
        setHomeData(json);
      }
    } catch { /* silent */ }
    finally { setLoadingData(false); }
  }, []);

  useEffect(() => { fetchHomeData(); }, [fetchHomeData]);

  return (
    <Shell role="user">
      <div className="layout-rail">
        {/* Left sidebar space (empty, nav is in Shell) */}
        <div />

        {/* Main center */}
        <div className="rail-main" style={{ padding: "32px 40px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em", lineHeight: 1.15 }}>
                Emma
              </h1>
              <p style={{ fontSize: 13, color: "var(--ink-mute)", marginTop: 2 }}>AI Sales Agent</p>
            </div>
            <span
              className="badge"
              style={{
                background: "rgba(19,24,38,0.8)",
                border: "1px solid var(--line)",
                padding: "6px 12px",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
                color: "var(--ink-mute)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: 999, background: "var(--mint)", display: "inline-block" }} />
              Active
            </span>
          </div>

          {/* Emma Orb hero */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: "16px 0 24px" }}>
            <div style={{ position: "relative", width: 260, height: 260, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32 }}>
              {/* Orb rings */}
              <span className="orb-ring" style={{ width: 260, height: 260, opacity: 0.4 }} />
              <span className="orb-ring" style={{ width: 210, height: 210, opacity: 0.6 }} />
              <span className="orb-ring" style={{ width: 170, height: 170, opacity: 0.8 }} />
              {/* Orb */}
              <div className="orb" style={{ width: 125, height: 125, fontSize: 15, color: "white", fontWeight: 500 }}>
                Emma
              </div>
            </div>

            {/* Prompt text */}
            <h2 style={{ fontSize: 24, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.01em", marginBottom: 8 }}>
              How can I help you today?
            </h2>
            <p style={{ fontSize: 14, color: "var(--ink-mute)", maxWidth: 540, textAlign: "center", lineHeight: 1.6, marginBottom: 32 }}>
              I can engage leads, qualify opportunities, book meetings, and follow up — so you can focus on closing.
            </p>
          </div>

          {/* Input + chips */}
          <div style={{ maxWidth: 760, width: "100%", margin: "0 auto" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "rgba(19,24,38,0.8)",
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-xl)",
                padding: "12px 16px",
              }}
            >
              <Sparkles size={16} style={{ color: "var(--viol-500)", flexShrink: 0 }} />
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Emma anything…"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 14,
                  color: "var(--ink)",
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && input.trim()) {
                    setActiveAction(null);
                    setInput("");
                  }
                }}
              />
              <button
                className="btn-primary"
                style={{ borderRadius: "var(--radius-lg)", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
              >
                <Send size={15} />
              </button>
            </div>

            {/* Quick action chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {quickActions.map((action) => (
                <button
                  key={action}
                  onClick={() => { setActiveAction(action); setInput(action); }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 999,
                    border: "1px solid var(--line)",
                    background: "rgba(19,24,38,0.6)",
                    color: "var(--ink)",
                    fontSize: 12.5,
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(19,24,38,0.6)")}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className="rail-right" style={{ padding: "32px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Agent Status */}
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 14 }}>Agent Status</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Emma */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="orb" style={{ width: 28, height: 28, flexShrink: 0, boxShadow: "0 0 16px rgba(139,92,246,0.5)" }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>Emma</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>AI Sales Agent</div>
                </div>
                <span style={{ fontSize: 11.5, color: "var(--mint)", fontWeight: 500 }}>Active</span>
              </div>
              {/* Status rows */}
              {[
                { label: "Inbox", sub: "Unread", icon: Mail },
                { label: "Tasks", sub: "Pending", icon: CheckCircle2 },
              ].map((item) => {
                const Icon = item.icon;
                return (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "var(--radius-md)",
                      background: "var(--surface-2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={14} style={{ color: item.label === "Tasks" ? "var(--mint)" : "var(--ink-mute)" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{item.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>{item.sub}</div>
                  </div>
                  <span style={{ fontSize: 13, color: "var(--ink-mute)", fontVariantNumeric: "tabular-nums" }}>0</span>
                </div>
                );
              })}
            </div>
          </div>

          {/* Today's Summary */}
          {loadingData ? (
            <div className="card" style={{ padding: 16, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 180 }}>
              <Loader2 size={16} className="animate-spin" style={{ color: "var(--ink-mute)" }} />
            </div>
          ) : (
            <TodaySummaryCard data={homeData} />
          )}

          {/* Emma callout */}
          <div
            style={{
              background: "rgba(19,24,38,0.5)",
              border: "1px solid rgba(99,102,241,0.3)",
              borderRadius: "var(--radius-xl)",
              padding: 16,
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "var(--radius-md)",
                background: "linear-gradient(180deg, var(--indi-500), var(--indi-600))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Sparkles size={14} style={{ color: "white" }} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 3 }}>
                Emma is always working for you
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-mute)", lineHeight: 1.5 }}>
                Engaging, qualifying, and advancing conversations — 24/7.
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}