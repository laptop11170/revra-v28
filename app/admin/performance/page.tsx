"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { SlideOver } from "@/components/ui/slide-over";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/context/theme-provider";
import { TrendingUp, Target, Phone, DollarSign, Award, Download, Clock, RefreshCw } from "lucide-react";

interface AgentPerformance {
  id: string;
  full_name: string;
  role: string;
  leads_count: number;
  qualified_count: number;
  calls_made: number;
  messages_sent: number;
  avg_score: number;
  last_active: string;
}

function LoadingSpinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "40px" }}>
      <RefreshCw size={24} className="animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
    </div>
  );
}

export default function AdminPerformancePage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [period, setPeriod] = useState("This Month");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchPerformance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/performance");
      if (!res.ok) throw new Error("Failed to load performance data");
      const json = await res.json();
      setAgents(json.agents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const handleExport = () => {
    addToast({ type: "success", title: "Report Exported", description: "Performance report downloaded" });
  };

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  // Compute totals from agents data
  const totalLeads = agents.reduce((sum, a) => sum + a.leads_count, 0);
  const totalCalls = agents.reduce((sum, a) => sum + a.calls_made, 0);
  const avgConversionRate = agents.length > 0
    ? (agents.reduce((sum, a) => sum + (a.leads_count > 0 ? a.qualified_count / a.leads_count : 0), 0) / agents.length * 100).toFixed(1)
    : "0";
  const totalRevenue = agents.reduce((sum, a) => sum + (a.qualified_count * 500), 0); // placeholder calculation

  // Sort by leads_count descending for leaderboard
  const sortedAgents = [...agents].sort((a, b) => b.leads_count - a.leads_count);

  return (
    <Shell role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>Team Performance</h1>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Monitor your team's activity and results</p>
          </div>
          <div className="flex gap-3">
            <div
              className="rounded-lg p-1 flex"
              style={{ backgroundColor: "hsl(var(--surface-container))" }}
            >
              {["This Week", "This Month", "This Quarter", "This Year"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  style={
                    period === p
                      ? { backgroundColor: "hsl(var(--surface))", color: "hsl(var(--on-surface))", boxShadow: "0 1px 2px hsl(var(--shadow))" }
                      : { color: "hsl(var(--muted-foreground))" }
                  }
                >
                  {p}
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={handleExport}><Download size={16} className="mr-2" />Export Report</Button>
          </div>
        </div>

        {/* KPI Row */}
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <Card>
            <CardContent className="p-4 text-center">
              <p style={{ color: "hsl(var(--destructive))" }}>{error}</p>
              <Button variant="outline" className="mt-2" onClick={fetchPerformance}>Retry</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg"><Target size={20} className="text-blue-600" /></div>
                <div><p className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>{totalLeads}</p><p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Total Leads</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg"><Phone size={20} className="text-purple-600" /></div>
                <div><p className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>{totalCalls}</p><p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Total Calls</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg"><TrendingUp size={20} className="text-green-600" /></div>
                <div><p className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>{avgConversionRate}%</p><p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Avg Conversion</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg"><DollarSign size={20} className="text-orange-600" /></div>
                <div><p className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>${(totalRevenue / 1000).toFixed(1)}K</p><p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Est. Revenue</p></div>
              </CardContent></Card>
            </div>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold" style={{ color: "hsl(var(--on-surface))" }}>Agent Leaderboard</h3>
                  <Award size={18} className="text-yellow-500" />
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Leads</TableHead>
                      <TableHead>Qualified</TableHead>
                      <TableHead>Calls</TableHead>
                      <TableHead>Messages</TableHead>
                      <TableHead>Avg Score</TableHead>
                      <TableHead>Last Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAgents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12" style={{ color: "hsl(var(--muted-foreground))" }}>No agent data available</TableCell>
                      </TableRow>
                    ) : (
                      sortedAgents.map((agent, i) => (
                        <TableRow
                          key={agent.id}
                          style={{ cursor: "pointer" }}
                          onClick={() => setSelectedAgentId(agent.id)}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--primary)/0.04)")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                        >
                          <TableCell>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                              i === 0 ? "bg-yellow-100 text-yellow-700" :
                              i === 1 ? "" :
                              i === 2 ? "bg-orange-100 text-orange-700" :
                              ""
                            }`}
                            style={i === 1 ? { backgroundColor: "hsl(var(--surface-container))", color: "hsl(var(--on-surface-variant))" } : i > 2 ? { backgroundColor: "hsl(var(--surface-container))", color: "hsl(var(--muted-foreground))" } : {}}
                            >{i + 1}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                                {agent.full_name.split(" ").map((n) => n[0]).join("")}
                              </div>
                              <div>
                                <span className="font-medium" style={{ color: "hsl(var(--on-surface))" }}>{agent.full_name}</span>
                                <span className="text-xs ml-2" style={{ color: "hsl(var(--muted-foreground))" }}>{agent.role}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{agent.leads_count}</TableCell>
                          <TableCell>{agent.qualified_count}</TableCell>
                          <TableCell>{agent.calls_made}</TableCell>
                          <TableCell>{agent.messages_sent}</TableCell>
                          <TableCell>
                            <Badge variant={agent.avg_score >= 80 ? "success" : agent.avg_score >= 50 ? "default" : "danger"}>
                              {agent.avg_score.toFixed(0)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm flex items-center gap-1" style={{ color: "hsl(var(--muted-foreground))" }}>
                            <Clock size={12} />{agent.last_active}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Agent Detail SlideOver */}
      <SlideOver
        open={!!selectedAgent}
        onClose={() => setSelectedAgentId(null)}
        title={selectedAgent?.full_name || ""}
        description="Agent performance details"
        size="md"
      >
        {selectedAgent && (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                {selectedAgent.full_name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <p className="font-semibold text-lg" style={{ color: "hsl(var(--on-surface))" }}>{selectedAgent.full_name}</p>
                <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{selectedAgent.last_active}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Leads", value: selectedAgent.leads_count.toString(), color: "text-blue-600" },
                { label: "Qualified Leads", value: selectedAgent.qualified_count.toString(), color: "text-purple-600" },
                { label: "Calls Made", value: selectedAgent.calls_made.toString(), color: "text-green-600" },
                { label: "Messages Sent", value: selectedAgent.messages_sent.toString(), color: "text-orange-600" },
                { label: "Avg Score", value: selectedAgent.avg_score.toFixed(0), color: "text-teal-600" },
                { label: "Role", value: selectedAgent.role, color: "text-gray-600" },
              ].map((stat) => (
                <div key={stat.label} className="p-4 rounded-xl" style={{ backgroundColor: "hsl(var(--surface-container-low))" }}>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="pt-4 space-y-2" style={{ borderTop: "1px solid hsl(var(--border))" }}>
              <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Actions</h4>
              <Button variant="outline" className="w-full justify-start">View Assigned Leads</Button>
              <Button variant="outline" className="w-full justify-start">Reassign All Leads</Button>
              <Button variant="outline" className="w-full justify-start text-red-600 hover:bg-red-50">Deactivate Agent</Button>
            </div>
          </div>
        )}
      </SlideOver>
    </Shell>
  );
}