"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { AddWorkspaceModal } from "@/components/features/modals/AddWorkspaceModal";
import { WorkspaceDetailPanel } from "@/components/features/modals/WorkspaceDetailPanel";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/context/theme-provider";
import {
  Search,
  Plus,
  Globe,
  Users,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";

interface Workspace {
  id: string;
  name: string;
  owner_name: string;
  owner_email: string;
  plan: string;
  status: string;
  users_count: number;
  leads_count: number;
  mrr: number;
  created_at: string;
}

interface WorkspacesResponse {
  workspaces: Workspace[];
  total: number;
}

const planConfig: Record<string, { bgVar: string; colorVar: string }> = {
  Enterprise: { bgVar: "primary", colorVar: "primary" },
  Scale: { bgVar: "info", colorVar: "info" },
  Growth: { bgVar: "success", colorVar: "success" },
  Starter: { bgVar: "surface-container-high", colorVar: "on-surface-variant" },
};

const PAGE_SIZE = 50;

const toDetailWs = (ws: Workspace) => ({
  id: ws.id,
  name: ws.name,
  owner: ws.owner_name,
  ownerEmail: ws.owner_email,
  plan: ws.plan as "Starter" | "Growth" | "Scale" | "Enterprise",
  users: ws.users_count,
  leads: ws.leads_count,
  mrr: ws.mrr,
  status: ws.status as "active" | "trial" | "suspended" | "past_due",
  joinedDate: new Date(ws.created_at).toLocaleDateString(),
});

export default function WorkspacesPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [selectedWs, setSelectedWs] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const { addToast } = useToast();

  const fetchWorkspaces = useCallback(async (pageOffset: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/superadmin/workspaces?limit=${PAGE_SIZE}&offset=${pageOffset}`);
      if (!res.ok) throw new Error("Failed to fetch workspaces");
      const json: WorkspacesResponse = await res.json();
      setWorkspaces(json.workspaces);
      setTotal(json.total);
    } catch (err) {
      addToast({ type: "error", title: "Error", description: "Failed to load workspaces" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces(offset);
  }, [offset, fetchWorkspaces]);

  const filtered = workspaces.filter((ws) => {
    if (search && !ws.name.toLowerCase().includes(search.toLowerCase()) && !ws.owner_name.toLowerCase().includes(search)) return false;
    if (statusFilter !== "all" && ws.status !== statusFilter) return false;
    if (planFilter !== "all" && ws.plan !== planFilter) return false;
    return true;
  });

  const handleAddWorkspace = (data: any) => {
    const newWs: Workspace = {
      id: `w${Date.now()}`,
      name: data.name,
      owner_name: data.owner,
      owner_email: data.ownerEmail,
      plan: data.plan as Workspace["plan"],
      users_count: 0,
      leads_count: 0,
      mrr: data.plan === "Starter" ? 250 : data.plan === "Growth" ? 450 : data.plan === "Scale" ? 799 : 0,
      status: data.trial ? "trial" : "active",
      created_at: new Date().toISOString(),
    };
    setWorkspaces((p) => [newWs, ...p]);
    addToast({ type: "success", title: "Workspace Created", description: `${data.name} has been created` });
  };

  const handlePrev = () => setOffset((o) => Math.max(0, o - PAGE_SIZE));
  const handleNext = () => setOffset((o) => o + PAGE_SIZE);

  return (
    <Shell role="superadmin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>Workspaces</h1>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Manage all workspaces on the platform</p>
          </div>
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={16} className="mr-2" />Add Workspace
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "hsl(var(--info)_/_0.15)" }}><Globe size={20} style={{ color: "hsl(var(--info))" }} /></div>
            <div><p className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>{total}</p><p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Total Workspaces</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "hsl(var(--success)_/_0.15)" }}><Users size={20} style={{ color: "hsl(var(--success))" }} /></div>
            <div><p className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>{workspaces.reduce((s, w) => s + w.users_count, 0)}</p><p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Total Users</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "hsl(var(--primary)_/_0.15)" }}><TrendingUp size={20} style={{ color: "hsl(var(--primary))" }} /></div>
            <div><p className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>{workspaces.filter((w) => w.status === "active").length}</p><p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Active</p></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "hsl(var(--success)_/_0.15)" }}><DollarSign size={20} style={{ color: "hsl(var(--success))" }} /></div>
            <div><p className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>${Math.round(workspaces.reduce((s, w) => s + w.mrr, 0) / 1000)}K</p><p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Monthly Revenue</p></div>
          </CardContent></Card>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground))" }} />
            <Input placeholder="Search workspaces..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface-container-low))", color: "hsl(var(--on-surface))", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem", outline: "none" }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
            <option value="past_due">Past Due</option>
          </select>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            style={{ border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface-container-low))", color: "hsl(var(--on-surface))", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem", outline: "none" }}
          >
            <option value="all">All Plans</option>
            <option value="Starter">Starter</option>
            <option value="Growth">Growth</option>
            <option value="Scale">Scale</option>
            <option value="Enterprise">Enterprise</option>
          </select>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-12 flex items-center justify-center">
              <div style={{ textAlign: "center" }}>
                <div className="animate-spin" style={{ width: 32, height: 32, border: "3px solid hsl(var(--border))", borderTopColor: "hsl(var(--primary))", borderRadius: "50%", margin: "0 auto 16px" }} />
                <p style={{ color: "hsl(var(--muted-foreground))" }}>Loading workspaces...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>MRR</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12" style={{ color: "hsl(var(--muted-foreground))" }}>No workspaces found</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((ws) => (
                    <TableRow key={ws.id}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--primary)_/_0.04)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ background: "linear-gradient(135deg, hsl(var(--info)), hsl(var(--primary))" }}>
                            {ws.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium" style={{ color: "hsl(var(--on-surface))" }}>{ws.name}</p>
                            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{ws.owner_email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-md text-xs font-medium" style={{ backgroundColor: `hsl(var(--${planConfig[ws.plan]?.bgVar || "surface-container-high"})_/_0.15)`, color: `hsl(var(--${planConfig[ws.plan]?.colorVar || "on-surface-variant"}))` }}>{ws.plan}</span>
                      </TableCell>
                      <TableCell>{ws.users_count}</TableCell>
                      <TableCell>{ws.leads_count}</TableCell>
                      <TableCell className="font-medium" style={{ color: "hsl(var(--on-surface))" }}>${ws.mrr}</TableCell>
                      <TableCell>
                        <Badge variant={
                          ws.status === "active" ? "success" :
                          ws.status === "trial" ? "info" :
                          ws.status === "past_due" ? "danger" : "default"
                        }>{ws.status.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{ws.created_at ? new Date(ws.created_at).toLocaleDateString() : "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedWs(ws)}>
                          <ArrowUpRight size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between p-4" style={{ borderTop: "1px solid hsl(var(--border))" }}>
              <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>
                Showing {offset + 1}-{Math.min(offset + PAGE_SIZE, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handlePrev} disabled={offset === 0}>Previous</Button>
                <Button variant="outline" size="sm" onClick={handleNext} disabled={offset + PAGE_SIZE >= total}>Next</Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      <AddWorkspaceModal open={showAdd} onClose={() => setShowAdd(false)} onSave={handleAddWorkspace} />
      <WorkspaceDetailPanel open={!!selectedWs} onClose={() => setSelectedWs(null)} workspace={selectedWs ? toDetailWs(selectedWs) : null} />
    </Shell>
  );
}
