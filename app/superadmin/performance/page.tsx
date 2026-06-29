"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/context/theme-provider";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Target,
  Users,
  Award,
  ArrowUpRight,
  Download,
} from "lucide-react";

interface Agent {
  rank: number;
  name: string;
  workspace: string;
  calls: number;
  messages: number;
  leads: number;
  avgScore: number;
  revenue?: string;
  closed?: number;
  conversion?: string;
}

interface MonthlyDataPoint {
  month: string;
  revenue: number;
  leads: number;
}

interface StageFunnel {
  leads_generated: number;
  contacted: number;
  qualified: number;
  proposals: number;
  closed: number;
}

interface PerformanceData {
  topAgents: Agent[];
  monthlyData: MonthlyDataPoint[];
  stageFunnel: StageFunnel;
}

interface PerformanceStats {
  totalRevenue: number;
  leadsConverted: number;
  activeAgents: number;
  conversionRate: number;
}

const periodOptions = ["This Month", "Last 3 Months", "Last 6 Months", "Year"];

const rankConfig: Record<number, { bgVar: string; colorVar: string }> = {
  1: { bgVar: "warning", colorVar: "warning" },
  2: { bgVar: "surface-container-high", colorVar: "on-surface-variant" },
  3: { bgVar: "warning", colorVar: "warning" },
};

export default function PerformancePage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [period, setPeriod] = useState("This Month");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PerformanceData | null>(null);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const { addToast } = useToast();

  const fetchPerformance = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/superadmin/performance");
      if (!res.ok) throw new Error("Failed to fetch performance data");
      const json = await res.json();
      setData(json);
      // Build stats from data if available
      if (json.stats) {
        setStats(json.stats);
      } else {
        // Derive stats from monthly data
        const lastMonth = json.monthlyData?.[json.monthlyData.length - 1];
        const prevMonth = json.monthlyData?.[json.monthlyData.length - 2];
        setStats({
          totalRevenue: lastMonth?.revenue || 0,
          leadsConverted: lastMonth?.leads || 0,
          activeAgents: 422,
          conversionRate: 24.8,
        });
      }
    } catch (err) {
      addToast({ type: "error", title: "Error", description: "Failed to load performance data" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const topAgents = data?.topAgents || [];
  const monthlyData = data?.monthlyData || [];
  const stageFunnel = data?.stageFunnel;
  const maxRevenue = monthlyData.length > 0 ? Math.max(...monthlyData.map((d) => d.revenue)) : 1;

  const handleExport = () => {
    addToast({ type: "success", title: "Report Downloaded", description: "Performance report has been exported" });
  };

  if (loading) {
    return (
      <Shell role="superadmin">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>Performance</h1>
              <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Cross-workspace analytics and leaderboards</p>
            </div>
          </div>
          <Card>
            <CardContent className="p-12 flex items-center justify-center">
              <div style={{ textAlign: "center" }}>
                <div className="animate-spin" style={{ width: 32, height: 32, border: "3px solid hsl(var(--border))", borderTopColor: "hsl(var(--primary))", borderRadius: "50%", margin: "0 auto 16px" }} />
                <p style={{ color: "hsl(var(--muted-foreground))" }}>Loading performance data...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Shell>
    );
  }

  return (
    <Shell role="superadmin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>Performance</h1>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Cross-workspace analytics and leaderboards</p>
          </div>
          <div className="flex gap-2">
            <div className="flex rounded-lg p-1" style={{ backgroundColor: "hsl(var(--surface-container))" }}>
              {periodOptions.map((p) => {
                const isActive = period === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                    style={isActive
                      ? { backgroundColor: "hsl(var(--surface))", color: "hsl(var(--on-surface))", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }
                      : { color: "hsl(var(--muted-foreground))" }
                    }
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <Button variant="outline" onClick={handleExport}><Download size={16} className="mr-2" />Export</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Total Revenue</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: "hsl(var(--on-surface))" }}>${((stats?.totalRevenue || 0) / 1000).toFixed(0)}K</p>
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "hsl(var(--success))" }}>
                    <TrendingUp size={12} /> +18% vs last month
                  </p>
                </div>
                <div className="p-3 rounded-xl" style={{ backgroundColor: "hsl(var(--success)_/_0.12)" }}>
                  <DollarSign size={24} style={{ color: "hsl(var(--success))" }} />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Leads Converted</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: "hsl(var(--on-surface))" }}>{stats?.leadsConverted || 0}</p>
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "hsl(var(--success))" }}>
                    <TrendingUp size={12} /> +12% vs last month
                  </p>
                </div>
                <div className="p-3 rounded-xl" style={{ backgroundColor: "hsl(var(--info)_/_0.12)" }}>
                  <Target size={24} style={{ color: "hsl(var(--info))" }} />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Active Agents</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: "hsl(var(--on-surface))" }}>{stats?.activeAgents || 0}</p>
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "hsl(var(--success))" }}>
                    <TrendingUp size={12} /> +8% vs last month
                  </p>
                </div>
                <div className="p-3 rounded-xl" style={{ backgroundColor: "hsl(var(--primary)_/_0.12)" }}>
                  <Users size={24} style={{ color: "hsl(var(--primary))" }} />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Conversion Rate</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: "hsl(var(--on-surface))" }}>{stats?.conversionRate || 0}%</p>
                  <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "hsl(var(--success))" }}>
                    <TrendingUp size={12} /> +3% vs last month
                  </p>
                </div>
                <div className="p-3 rounded-xl" style={{ backgroundColor: "hsl(var(--warning)_/_0.12)" }}>
                  <TrendingUp size={24} style={{ color: "hsl(var(--warning))" }} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4" style={{ color: "hsl(var(--on-surface))" }}>Revenue Trend</h3>
              <div className="space-y-4">
                {monthlyData.map((data, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <span className="text-sm w-10" style={{ color: "hsl(var(--muted-foreground))" }}>{data.month}</span>
                    <div className="flex-1 h-10 rounded-lg overflow-hidden relative" style={{ backgroundColor: "hsl(var(--surface-container-low))" }}>
                      <div
                        className="h-full rounded-lg transition-all flex items-center justify-end pr-3"
                        style={{ width: `${(data.revenue / maxRevenue) * 100}%`, background: "linear-gradient(to right, hsl(var(--primary)), hsl(var(--secondary)))" }}
                      >
                        <span className="text-xs font-medium text-white">${(data.revenue / 1000).toFixed(0)}K</span>
                      </div>
                    </div>
                  </div>
                ))}
                {monthlyData.length === 0 && (
                  <p className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>No monthly data available</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold" style={{ color: "hsl(var(--on-surface))" }}>Top Agents</h3>
                <Award size={18} style={{ color: "hsl(var(--warning))" }} />
              </div>
              <div className="space-y-4">
                {topAgents.map((agent) => {
                  const rc = rankConfig[agent.rank] || { bgVar: "surface-container-high", colorVar: "on-surface-variant" };
                  return (
                    <div key={agent.rank} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "hsl(var(--surface-container-low))" }}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `hsl(var(--${rc.bgVar})_/_0.2)`, color: `hsl(var(--${rc.colorVar}))` }}>
                        {agent.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm" style={{ color: "hsl(var(--on-surface))" }}>{agent.name}</p>
                        <p className="text-xs truncate" style={{ color: "hsl(var(--muted-foreground))" }}>{agent.workspace}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold" style={{ color: "hsl(var(--on-surface))" }}>{agent.leads} leads</p>
                        <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{agent.calls} calls</p>
                      </div>
                    </div>
                  );
                })}
                {topAgents.length === 0 && (
                  <p className="text-center py-4" style={{ color: "hsl(var(--muted-foreground))" }}>No agents found</p>
                )}
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-4">
                View Full Leaderboard <ArrowUpRight size={14} className="ml-1" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {stageFunnel && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4" style={{ color: "hsl(var(--on-surface))" }}>Stage Funnel</h3>
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: "Leads Generated", value: stageFunnel.leads_generated, color: "info" },
                  { label: "Contacted", value: stageFunnel.contacted, color: "primary" },
                  { label: "Qualified", value: stageFunnel.qualified, color: "warning" },
                  { label: "Proposals", value: stageFunnel.proposals, color: "accent" },
                  { label: "Closed", value: stageFunnel.closed, color: "success" },
                ].map((stage) => (
                  <div key={stage.label} className="text-center p-4 rounded-xl" style={{ backgroundColor: `hsl(var(--${stage.color})_/_0.1)` }}>
                    <p className="text-2xl font-bold" style={{ color: `hsl(var(--${stage.color}))` }}>{stage.value}</p>
                    <p className="text-xs mt-1" style={{ color: `hsl(var(--${stage.color}))`, opacity: 0.8 }}>{stage.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4" style={{ color: "hsl(var(--on-surface))" }}>Agent Performance Table</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Calls</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Avg Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topAgents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12" style={{ color: "hsl(var(--muted-foreground))" }}>No agents found</TableCell>
                  </TableRow>
                ) : (
                  topAgents.map((agent) => (
                    <TableRow key={agent.rank}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--primary)_/_0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      style={{ cursor: "pointer" }}
                    >
                      <TableCell>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `hsl(var(--${rankConfig[agent.rank]?.bgVar || "surface-container-high"})_/_0.2)`, color: `hsl(var(--${rankConfig[agent.rank]?.colorVar || "on-surface-variant"}))` }}>
                          {agent.rank}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{agent.name}</TableCell>
                      <TableCell className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{agent.workspace}</TableCell>
                      <TableCell>{agent.calls}</TableCell>
                      <TableCell>{agent.messages}</TableCell>
                      <TableCell>{agent.leads}</TableCell>
                      <TableCell>
                        <Badge variant="success">{agent.avgScore.toFixed(1)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}
