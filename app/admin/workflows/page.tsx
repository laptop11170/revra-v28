"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { WorkflowCanvas, DEFAULT_WORKFLOWS } from "@/components/features/workflow/WorkflowCanvas";
import type { Workflow } from "@/components/features/workflow/WorkflowCanvas";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/context/theme-provider";
import { Plus, Play, Pause, Zap, RefreshCw } from "lucide-react";

type ApiWorkflow = {
  id: string;
  name: string;
  trigger: string;
  effectiveness: number;
  lastRun: string;
  status: string;
  runs: number;
  nodes?: any[];
  description?: string;
};

export default function AdminWorkflowsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [workflows, setWorkflows] = useState<ApiWorkflow[]>(DEFAULT_WORKFLOWS);
  const [loading, setLoading] = useState(true);
  const [showCanvas, setShowCanvas] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/workflows");
      if (res.ok) {
        const json = await res.json();
        if (json.workflows && json.workflows.length > 0) {
          setWorkflows(json.workflows.map((w: any) => ({
            id: w.id,
            name: w.name,
            trigger: w.trigger || "Custom",
            effectiveness: w.effectiveness || 0,
            lastRun: w.lastRun || "Never",
            status: w.status || "draft",
            runs: w.runs || 0,
            nodes: w.nodes,
            description: w.description,
          })));
        }
      }
    } catch {
      // fallback to defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const toggleStatus = async (id: string) => {
    const wf = workflows.find((w) => w.id === id);
    if (!wf) return;
    const newStatus = wf.status === "active" ? "paused" : "active";
    try {
      await fetch(`/api/admin/workflows?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      // silent
    }
    setWorkflows((p) => p.map((w) => w.id === id ? { ...w, status: newStatus } : w));
    addToast({ type: "success", title: newStatus === "active" ? "Workflow Activated" : "Workflow Paused" });
  };

  const handleSaveWorkflow = async (data: { name: string; nodes: any[] }) => {
    if (editingWorkflow) {
      setWorkflows((p) => p.map((w) => w.id === editingWorkflow ? { ...w, name: data.name } : w));
    } else {
      const newWorkflow: ApiWorkflow = {
        id: `wf${Date.now()}`,
        name: data.name,
        trigger: "Custom",
        effectiveness: 0,
        lastRun: "Never",
        status: "paused",
        runs: 0,
      };
      setWorkflows((p) => [...p, newWorkflow]);
    }
    addToast({ type: "success", title: "Workflow Saved", description: data.name });
    setShowCanvas(false);
    setEditingWorkflow(null);
  };

  return (
    <Shell role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>Workflows</h1>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{workflows.length} workflows · {workflows.filter((w) => w.status === "active").length} active</p>
          </div>
          <Button onClick={() => { setEditingWorkflow(null); setShowCanvas(true); }}>
            <Plus size={16} className="mr-2" />Create Workflow
          </Button>
        </div>

        <Card>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "40px" }}>
              <RefreshCw size={20} className="animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Effectiveness</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Runs</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.map((wf) => (
                <TableRow key={wf.id}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--primary)_/_0.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Zap size={14} style={{ color: wf.status === "active" ? "hsl(var(--success))" : "hsl(var(--border))" }} />
                      <span className="font-medium" style={{ color: "hsl(var(--on-surface))" }}>{wf.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{wf.trigger}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 rounded-full overflow-hidden" style={{ backgroundColor: "hsl(var(--surface-container-low))" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${wf.effectiveness}%`, backgroundColor: "hsl(var(--success))" }}
                        />
                      </div>
                      <span className="text-sm font-medium" style={{ color: "hsl(var(--on-surface-variant))" }}>{wf.effectiveness}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{wf.lastRun}</TableCell>
                  <TableCell>
                    <Badge variant={wf.status === "active" ? "success" : "default"}>
                      {wf.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{wf.runs}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatus(wf.id)}
                        title={wf.status === "active" ? "Pause" : "Activate"}
                      >
                        {wf.status === "active" ? <Pause size={14} /> : <Play size={14} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingWorkflow(wf.id); setShowCanvas(true); }}
                      >
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </Card>
      </div>

      <WorkflowCanvas
        open={showCanvas}
        onClose={() => { setShowCanvas(false); setEditingWorkflow(null); }}
        onSave={handleSaveWorkflow}
        workflowName={editingWorkflow ? workflows.find((w) => w.id === editingWorkflow)?.name : undefined}
      />
    </Shell>
  );
}
