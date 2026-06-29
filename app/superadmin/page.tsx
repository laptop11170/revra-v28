"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Globe, Users, DollarSign, Zap, TrendingUp, Activity, ArrowUpRight, Shield, AlertCircle } from "lucide-react";

interface OverviewStats {
  totalWorkspaces: number;
  activeWorkspaces: number;
  totalUsers: number;
  totalLeads: number;
  mrr: number;
  seats: number;
}

interface ActivityItem {
  user: string;
  action: string;
  target: string;
  time: string;
  color: string;
}

interface WorkspaceItem {
  name: string;
  users_count: number;
  leads_count: number;
  mrr: number;
  status: string;
}

interface OverviewData {
  stats: OverviewStats;
  recentActivity: ActivityItem[];
  topWorkspaces: WorkspaceItem[];
}

const quickActions = [
  { label: "Add Workspace", sub: "Create a new workspace", icon: Globe, color: "var(--indi-400)" },
  { label: "Platform Settings", sub: "Configure global settings", icon: Shield, color: "var(--indi-400)" },
  { label: "View Alerts", sub: "Check system health", icon: AlertCircle, color: "var(--amber)" },
];

export default function SuperAdminOverview() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/superadmin/overview");
      if (!res.ok) throw new Error("Failed to fetch overview data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const stats = data?.stats;
  const recentActivity = data?.recentActivity || [];
  const topWorkspaces = data?.topWorkspaces || [];

  if (loading) {
    return (
      <Shell role="superadmin">
        <div style={{ padding: "32px 40px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
          <div style={{ textAlign: "center" }}>
            <div className="animate-spin" style={{ width: 32, height: 32, border: "3px solid var(--line)", borderTopColor: "var(--primary)", borderRadius: "50%", margin: "0 auto 16px" }} />
            <p style={{ color: "var(--ink-mute)", fontSize: 14 }}>Loading overview data...</p>
          </div>
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell role="superadmin">
        <div style={{ padding: "32px 40px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
          <div style={{ textAlign: "center" }}>
            <p style={{ color: "var(--danger)", fontSize: 14, marginBottom: 8 }}>Error: {error}</p>
            <button onClick={fetchOverview} style={{ padding: "8px 16px", background: "var(--primary)", color: "white", border: "none", borderRadius: "var(--radius-md)", cursor: "pointer" }}>Retry</button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell role="superadmin">
      <div style={{ padding: "32px 40px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.005em" }}>
              Platform Overview
            </h1>
            <p style={{ fontSize: 13, color: "var(--ink-mute)", marginTop: 4 }}>
              Real-time monitoring across all workspaces
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: 999, background: "var(--mint)", display: "inline-block" }} />
            <span
              style={{
                padding: "5px 10px",
                borderRadius: "var(--radius-md)",
                background: "rgba(16,185,129,0.15)",
                color: "var(--mint)",
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              All Systems Operational
            </span>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
          <div key="totalWorkspaces" className="kpi-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div className="label">Total Workspaces</div>
                <div className="value" style={{ marginTop: 4 }}>{stats?.totalWorkspaces ?? 0}</div>
                <div className="delta" style={{ marginTop: 2, fontSize: 11.5 }}>+{stats?.activeWorkspaces ?? 0} active</div>
              </div>
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
                <Globe size={16} style={{ color: "var(--ink-dim)" }} />
              </div>
            </div>
          </div>
          <div key="activeUsers" className="kpi-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div className="label">Active Users</div>
                <div className="value" style={{ marginTop: 4 }}>{stats?.totalUsers ?? 0}</div>
                <div className="delta" style={{ marginTop: 2, fontSize: 11.5 }}>{stats?.seats ?? 0} seats</div>
              </div>
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
                <Users size={16} style={{ color: "var(--ink-dim)" }} />
              </div>
            </div>
          </div>
          <div key="mrr" className="kpi-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div className="label">Monthly Revenue</div>
                <div className="value" style={{ marginTop: 4 }}>${((stats?.mrr ?? 0) / 100).toFixed(2)}</div>
                <div className="delta" style={{ marginTop: 2, fontSize: 11.5 }}>{stats?.seats ?? 0} seats</div>
              </div>
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
                <DollarSign size={16} style={{ color: "var(--ink-dim)" }} />
              </div>
            </div>
          </div>
          <div key="totalLeads" className="kpi-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div className="label">Total Leads</div>
                <div className="value" style={{ marginTop: 4 }}>{stats?.totalLeads ?? 0}</div>
                <div className="delta" style={{ marginTop: 2, fontSize: 11.5 }}>All time</div>
              </div>
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
                <Zap size={16} style={{ color: "var(--ink-dim)" }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, marginBottom: 24 }}>
          {/* Top Workspaces */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Top Workspaces</h3>
              <button className="filter-btn" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                View All <ArrowUpRight size={12} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {topWorkspaces.map((ws, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 16px",
                    borderRadius: "var(--radius-lg)",
                    background: "rgba(22,27,44,0.5)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div
                      className="avatar"
                      style={{
                        width: 40,
                        height: 40,
                        background: "linear-gradient(135deg, var(--indi-500), var(--viol-500))",
                        color: "white",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {ws.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{ws.name}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 2 }}>{ws.users_count} users · {ws.leads_count} leads</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
                      ${ws.mrr}/mo
                    </div>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "3px 8px",
                        borderRadius: "var(--radius-md)",
                        background: "rgba(16,185,129,0.15)",
                        color: "var(--mint)",
                        fontSize: 11,
                        fontWeight: 500,
                        marginTop: 4,
                      }}
                    >
                      {ws.status === "active" ? "Active" : ws.status}
                    </span>
                  </div>
                </div>
              ))}
              {topWorkspaces.length === 0 && (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--ink-mute)" }}>No workspaces found</div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 20 }}>Recent Activity</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {recentActivity.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 10 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: item.color,
                      marginTop: 6,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 13, color: "var(--ink)" }}>
                      <span style={{ fontWeight: 600 }}>{item.user}</span>{" "}
                      <span style={{ color: "var(--ink-mute)" }}>{item.action}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 1 }}>{item.target}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-faint)", marginTop: 2 }}>{item.time}</div>
                  </div>
                </div>
              ))}
              {recentActivity.length === 0 && (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--ink-mute)" }}>No recent activity</div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {quickActions.map((a, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "16px 18px",
                borderRadius: "var(--radius-xl)",
                border: "1px solid var(--line)",
                background: "rgba(19,24,38,0.5)",
                cursor: "pointer",
                transition: "border-color 0.12s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--line-2)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = "var(--line)")}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--surface-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <a.icon size={18} style={{ color: a.color }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{a.label}</div>
                <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 2 }}>{a.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
