"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AddLeadModal } from "@/components/features/communications/AddLeadModal";
import { CSVImportModal } from "@/components/features/csv/CSVImportModal";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/context/theme-provider";
import { Search, Filter, Plus, UserPlus, RefreshCw, Download, ChevronLeft, ChevronRight } from "lucide-react";

interface PoolLead {
  id: string;
  first_name: string;
  last_name: string;
  phone_primary: string;
  email: string;
  coverage_type: string;
  lead_source: string;
  score: number;
  pipeline_stage: string;
  assigned_agent_name: string;
  status: string;
  created_at: string;
}

function LoadingSpinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "40px" }}>
      <RefreshCw size={24} className="animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
    </div>
  );
}

export default function LeadPoolPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [poolLeads, setPoolLeads] = useState<PoolLead[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(50);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddLead, setShowAddLead] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkAgent, setBulkAgent] = useState("");
  const [agents, setAgents] = useState<string[]>([]);
  const { addToast } = useToast();

  const fetchLeadPool = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/lead-pool?limit=${limit}&offset=${offset}`);
      if (!res.ok) throw new Error("Failed to load leads");
      const json = await res.json();
      setPoolLeads(json.leads || []);
      setTotalLeads(json.total || 0);
    } catch (err) {
      addToast({ type: "error", title: "Error", description: "Failed to load lead pool" });
    } finally {
      setLoading(false);
    }
  }, [limit, offset, addToast]);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/team");
      if (res.ok) {
        const json = await res.json();
        setAgents(json.members?.map((m: { full_name: string }) => m.full_name) || []);
      }
    } catch {
      // silently fail for agents
    }
  }, []);

  useEffect(() => {
    fetchLeadPool();
    fetchAgents();
  }, [fetchLeadPool, fetchAgents]);

  // Client-side search filter
  const filtered = poolLeads.filter((l) => {
    const fullName = `${l.first_name} ${l.last_name}`.toLowerCase();
    if (search && !fullName.includes(search.toLowerCase()) && !l.email.toLowerCase().includes(search.toLowerCase()) && !l.phone_primary.includes(search)) return false;
    if (typeFilter !== "all" && l.coverage_type !== typeFilter) return false;
    if (sourceFilter !== "all" && l.lead_source !== sourceFilter) return false;
    return true;
  });

  const handleAssign = (leadId: string, agent: string) => {
    setPoolLeads((p) => p.filter((l) => l.id !== leadId));
    addToast({ type: "success", title: "Lead Assigned", description: `Assigned to ${agent}` });
  };

  const handleBulkAssign = () => {
    if (!bulkAgent) return;
    setPoolLeads((p) => p.filter((l) => !selectedIds.has(l.id)));
    addToast({ type: "success", title: "Bulk Assign Complete", description: `${selectedIds.size} leads assigned to ${bulkAgent}` });
    setSelectedIds(new Set());
    setShowBulkAssign(false);
    setBulkAgent("");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddLead = (lead: any) => {
    fetchLeadPool();
    addToast({ type: "success", title: "Lead Created", description: `${lead.first_name} ${lead.last_name || ""} added to pool successfully` });
  };

  const handleCSVImport = (data: { leads: any[] }) => {
    fetchLeadPool();
    addToast({ type: "success", title: "CSV Imported", description: `${data.leads.length} leads successfully imported to database` });
  };

  const handlePrevPage = () => {
    setOffset(Math.max(0, offset - limit));
  };

  const handleNextPage = () => {
    if (offset + limit < totalLeads) {
      setOffset(offset + limit);
    }
  };

  return (
    <Shell role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>Lead Pool</h1>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
              {totalLeads} unassigned · {selectedIds.size > 0 ? `${selectedIds.size} selected` : "none selected"}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowCSVImport(true)}><Download size={16} className="mr-2" />Export</Button>
            <Button onClick={() => setShowAddLead(true)}><Plus size={16} className="mr-2" />Add Lead</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4">
            <p className="text-3xl font-bold text-blue-600">{totalLeads}</p>
            <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>In Pool</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-3xl font-bold text-green-600">0</p>
            <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Auto-Distributed Today</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-3xl font-bold text-purple-600">{agents.length}</p>
            <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Active Agents</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-3xl font-bold text-orange-600">{poolLeads.filter((l) => l.score >= 80).length}</p>
            <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Hot Leads in Pool</p>
          </CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground))" }} />
            <Input placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option>Medicare Advantage</option>
            <option>ACA (Individual & Family)</option>
            <option>Final Expense</option>
            <option>Life Insurance</option>
          </Select>
          <Select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option value="all">All Sources</option>
            <option>Meta Ads</option>
            <option>Manual Entry</option>
            <option>CSV Import</option>
            <option>Referral</option>
          </Select>
          <Button variant="outline"><Filter size={16} className="mr-2" />More Filters</Button>
          <Button variant="ghost" onClick={fetchLeadPool}><RefreshCw size={16} /></Button>
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ backgroundColor: "hsl(var(--primary)/0.08)", border: "1px solid hsl(var(--primary)/0.3)" }}
          >
            <span className="text-sm font-medium" style={{ color: "hsl(var(--primary))" }}>{selectedIds.size} leads selected</span>
            <Button size="sm" onClick={() => setShowBulkAssign(true)}>
              <UserPlus size={14} className="mr-1" />Bulk Assign
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
          </div>
        )}

        {/* Table */}
        <Card>
          {loading ? (
            <LoadingSpinner />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Assign To</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12" style={{ color: "hsl(var(--muted-foreground))" }}>
                      {poolLeads.length === 0 ? "All leads have been assigned!" : "No leads match your filters"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((lead) => (
                    <TableRow
                      key={lead.id}
                      style={selectedIds.has(lead.id) ? { backgroundColor: "hsl(var(--primary)/0.04)" } : {}}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(lead.id)}
                          onChange={() => toggleSelect(lead.id)}
                          className="w-4 h-4 rounded"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {lead.score >= 80 && <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" title="Hot Lead" />}
                          <div>
                            <p className="font-medium" style={{ color: "hsl(var(--on-surface))" }}>{lead.first_name} {lead.last_name}</p>
                            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{lead.phone_primary}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="info">{lead.coverage_type.split(" ")[0]}</Badge></TableCell>
                      <TableCell className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{lead.lead_source}</TableCell>
                      <TableCell>
                        <span className={`font-semibold ${lead.score >= 80 ? "text-green-600" : lead.score >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                          {lead.score}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{lead.pipeline_stage}</TableCell>
                      <TableCell>
                        <select
                          className="rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2"
                          style={{ border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface-container-low))" }}
                          value={lead.assigned_agent_name}
                          onChange={(e) => handleAssign(lead.id, e.target.value)}
                        >
                          <option>Unassigned</option>
                          {agents.map((a) => <option key={a}>{a}</option>)}
                        </select>
                      </TableCell>
                      <TableCell className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                        {new Date(lead.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => handleAssign(lead.id, agents[0] || "Unassigned")}>
                          <UserPlus size={14} className="mr-1" />Assign
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </Card>

        {/* Pagination */}
        {!loading && totalLeads > limit && (
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
              Showing {offset + 1}–{Math.min(offset + limit, totalLeads)} of {totalLeads}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={offset === 0}>
                <ChevronLeft size={16} />Prev
              </Button>
              <Button variant="outline" size="sm" onClick={handleNextPage} disabled={offset + limit >= totalLeads}>
                Next<ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AddLeadModal open={showAddLead} onClose={() => setShowAddLead(false)} onSuccess={handleAddLead} />
      <CSVImportModal open={showCSVImport} onClose={() => setShowCSVImport(false)} onImport={handleCSVImport} />

      {/* Bulk assign modal */}
      {showBulkAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowBulkAssign(false)} />
          <div
            className="relative rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6"
            style={{ backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))" }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: "hsl(var(--on-surface))" }}>Bulk Assign {selectedIds.size} Leads</h3>
            <p className="text-sm mb-4" style={{ color: "hsl(var(--muted-foreground))" }}>Select an agent to assign all selected leads:</p>
            <select
              value={bulkAgent}
              onChange={(e) => setBulkAgent(e.target.value)}
              className="w-full h-10 rounded-lg px-3 text-sm mb-4"
              style={{ border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface-container-low))", color: "hsl(var(--on-surface))" }}
            >
              <option value="">Select agent...</option>
              {agents.map((a) => <option key={a}>{a}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBulkAssign(false)}>Cancel</Button>
              <Button onClick={handleBulkAssign} disabled={!bulkAgent}>Assign All</Button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}