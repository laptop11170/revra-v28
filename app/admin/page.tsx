"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import {
  Target,
  Phone,
  PhoneCall,
  TrendingUp,
  ArrowUpRight,
  Plus,
  Upload,
  RefreshCw,
} from "lucide-react";

interface DashboardStats {
  totalLeads: number;
  hotLeads: number;
  newToday: number;
  activeAgents: number;
  appointmentsToday: number;
  callsToday: number;
}

interface StageCount {
  stage: string;
  count: number;
  color: string;
  pct: number;
}

interface RecentLead {
  id: string;
  first_name: string;
  last_name: string;
  phone_primary: string;
  coverage_type: string;
  score: number;
  pipeline_stage: string;
  lead_source: string;
  status: string;
  created_at: string;
}

interface DashboardData {
  stats: DashboardStats;
  stageCounts: Record<string, number>;
  recentLeads: RecentLead[];
}

const stageColors: Record<string, string> = {
  "New Lead": "var(--indi-500)",
  "Attempting Contact": "var(--cyan)",
  "Contacted": "var(--cyan)",
  "Needs Analysis": "var(--teal)",
  "Quote Sent": "var(--amber)",
  "Application Submitted": "var(--orange)",
  "In Underwriting": "var(--amber)",
  "Bound / Policy Active": "var(--mint)",
  "Closed Lost": "var(--ink-dim)",
  "Renewal Due": "var(--amber)",
  "Lapsed": "var(--danger)",
};

function LoadingSpinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "40px" }}>
      <RefreshCw size={24} className="animate-spin" style={{ color: "var(--ink-mute)" }} />
    </div>
  );
}

function ErrorMessage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px", gap: "12px" }}>
      <p style={{ color: "var(--danger)", fontSize: "14px" }}>{message}</p>
      <button
        onClick={onRetry}
        style={{
          padding: "8px 16px",
          background: "var(--primary)",
          color: "white",
          borderRadius: "var(--radius-md)",
          fontSize: "13px",
          cursor: "pointer",
        }}
      >
        Retry
      </button>
    </div>
  );
}

export default function AdminDashboard() {
  const [activeFilter, setActiveFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <Shell role="admin">
        <div style={{ padding: "32px 40px" }}>
          <LoadingSpinner />
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell role="admin">
        <div style={{ padding: "32px 40px" }}>
          <ErrorMessage message={error} onRetry={fetchDashboard} />
        </div>
      </Shell>
    );
  }

  const stats = data?.stats;
  const stageCounts = data?.stageCounts || {};
  const recentLeads = data?.recentLeads || [];

  // Build pipeline stages from API stage counts
  const stageEntries = Object.entries(stageCounts);
  const maxCount = Math.max(...stageEntries.map(([, c]) => c), 1);
  const pipelineStages: StageCount[] = stageEntries.map(([stage, count]) => ({
    stage,
    count,
    color: stageColors[stage] || "var(--ink-dim)",
    pct: Math.round((count / maxCount) * 100),
  }));

  // Compute team activity from recent leads (placeholder for now)
  const teamActivity: Array<{ name: string; action: string; status: string; time: string }> = [];

  // KPI data from stats
  const kpiStats = stats ? [
    { label: "Total Leads", value: stats.totalLeads.toLocaleString(), change: "All time", icon: Target },
    { label: "Hot Leads", value: stats.hotLeads.toString(), change: "High priority", icon: TrendingUp },
    { label: "Calls Today", value: stats.callsToday.toString(), change: "Today's activity", icon: PhoneCall },
    { label: "New Leads Today", value: stats.newToday.toString(), change: "Added today", icon: Plus },
  ] : [];

  return (
    <Shell role="admin">
      <div style={{ padding: "32px 40px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.005em" }}>
              Dashboard
            </h1>
            <p style={{ fontSize: 13, color: "var(--ink-mute)", marginTop: 4 }}>
              Your workspace overview
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }}>
              <Upload size={13} style={{ marginRight: 6 }} />
              Import CSV
            </button>
            <button className="btn-primary" style={{ padding: "8px 14px", fontSize: 13 }}>
              <Plus size={13} style={{ marginRight: 6 }} />
              Add Lead
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
          {kpiStats.map((s) => (
            <div key={s.label} className="kpi-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div className="label">{s.label}</div>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "var(--radius-lg)",
                    background: "var(--surface-4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <s.icon size={16} style={{ color: "var(--ink-dim)" }} />
                </div>
              </div>
              <div className="value" style={{ marginTop: 4 }}>{s.value}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-mute)", marginTop: 2 }}>{s.change}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, marginBottom: 24 }}>
          {/* Pipeline Overview */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Pipeline Overview</h3>
              <button
                className="filter-btn"
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
              >
                View Pipeline <ArrowUpRight size={12} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pipelineStages.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--ink-mute)", textAlign: "center", padding: "20px" }}>No pipeline data available</p>
              ) : (
                pipelineStages.map((s) => (
                  <div key={s.stage} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: s.color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 13, color: "var(--ink-mute)", width: 140 }}>{s.stage}</span>
                    <div
                      style={{
                        flex: 1,
                        height: 28,
                        borderRadius: "var(--radius-md)",
                        overflow: "hidden",
                        background: "var(--surface-4)",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${s.pct}%`,
                          background: s.color,
                          borderRadius: "var(--radius-md)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          paddingRight: 10,
                          minWidth: s.count > 0 ? 28 : 0,
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 600, color: "white" }}>{s.count}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Team Activity */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Team Activity</h3>
              {teamActivity.length > 0 && (
                <span
                  style={{
                    padding: "3px 8px",
                    borderRadius: "var(--radius-md)",
                    background: "rgba(16,185,129,0.15)",
                    color: "var(--mint)",
                    fontSize: 11,
                    fontWeight: 500,
                  }}
                >
                  {teamActivity.length} online
                </span>
              )}
            </div>
            {teamActivity.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--ink-mute)", textAlign: "center", padding: "20px 0" }}>No recent activity</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {teamActivity.map((m, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: m.status === "active" ? "var(--mint)" : "var(--ink-faint)",
                        marginTop: 6,
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 1 }}>{m.action}</div>
                      <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>{m.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="card" style={{ padding: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid rgba(37,43,63,0.5)",
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Recent Leads</h3>
            <button className="filter-btn" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
              View All <ArrowUpRight size={12} />
            </button>
          </div>
          {recentLeads.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--ink-mute)", fontSize: "13px" }}>No leads found</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Type</th>
                  <th>Score</th>
                  <th>Stage</th>
                  <th>Status</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((l) => {
                  const fullName = `${l.first_name} ${l.last_name}`;
                  return (
                    <tr key={l.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            className="avatar"
                            style={{
                              width: 32,
                              height: 32,
                              background: l.status === "hot" ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)",
                              color: l.status === "hot" ? "var(--mint)" : "var(--amber)",
                              fontSize: 11,
                              fontWeight: 600,
                            }}
                          >
                            {fullName.split(" ").map((s) => s[0]).join("").slice(0, 2)}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{fullName}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 13, color: "var(--ink-mute)" }}>{l.phone_primary}</td>
                      <td>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "var(--radius-md)",
                            background: "rgba(99,102,241,0.15)",
                            color: "var(--indi-400)",
                            fontSize: 11,
                            fontWeight: 500,
                          }}
                        >
                          {l.coverage_type}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: l.score >= 80 ? "var(--mint)" : l.score >= 50 ? "var(--amber)" : "var(--ink-dim)",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {l.score}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--ink-mute)" }}>{l.pipeline_stage}</td>
                      <td>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "var(--radius-md)",
                            background: l.status === "hot" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
                            color: l.status === "hot" ? "var(--mint)" : "var(--amber)",
                            fontSize: 11,
                            fontWeight: 500,
                            textTransform: "capitalize",
                          }}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--ink-dim)" }}>
                        {new Date(l.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Shell>
  );
}