"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { getInitials } from "@/lib/constants";
import { useTheme } from "@/context/theme-provider";
import {
  CheckSquare,
  Plus,
  Search,
  Phone,
  MessageSquare,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";

type ApiTask = {
  id: string;
  lead_id: string;
  lead_name: string;
  type: string;
  priority: string;
  due_date: string;
  status: string;
  source: string;
  note: string | null;
  created_at: string;
};

const PRIORITY_CONFIG: Record<string, { colorVar: string; bgVar: string; label: string }> = {
  urgent: { colorVar: "danger", bgVar: "danger", label: "Urgent" },
  high: { colorVar: "warning", bgVar: "warning", label: "High" },
  medium: { colorVar: "info", bgVar: "info", label: "Medium" },
  low: { colorVar: "on-surface-variant", bgVar: "surface-container-high", label: "Low" },
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; colorVar: string }> = {
  open: { icon: <Clock size={14} />, colorVar: "primary" },
  completed: { icon: <CheckCircle2 size={14} />, colorVar: "success" },
  overdue: { icon: <AlertTriangle size={14} />, colorVar: "danger" },
};

// Add/Edit task modal
type LocalTask = {
  leadName: string;
  type: string;
  priority: string;
  dueDate: string;
  note: string;
};

function TaskModal({ open, onClose, task, onSave }: {
  open: boolean;
  onClose: () => void;
  task?: LocalTask | null;
  onSave?: (data: LocalTask) => void;
}) {
  const [form, setForm] = useState<LocalTask>({
    leadName: task?.leadName ?? "",
    type: task?.type ?? "Follow-up",
    priority: task?.priority ?? "medium",
    dueDate: task?.dueDate ?? "",
    note: task?.note ?? "",
  });

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = () => {
    onSave?.(form);
    onClose();
  };

  const types = ["Follow-up", "Callback", "Send Info", "Reactivation", "Custom"];
  const priorities = ["low", "medium", "high", "urgent"];

  return (
    <Modal open={open} onClose={onClose} size="md" title={task ? "Edit Task" : "New Task"}>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Lead Name</label>
          <Input
            value={form.leadName}
            onChange={(e) => update("leadName", e.target.value)}
            placeholder="Michael Torres"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Task Type</label>
            <select
              value={form.type}
              onChange={(e) => update("type", e.target.value)}
              className="w-full h-10 rounded-lg px-3 text-sm focus:outline-none focus:ring-2"
              style={{ border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface))", color: "hsl(var(--on-surface))" }}
            >
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Priority</label>
            <div className="flex gap-2">
              {priorities.map((p) => {
                const pc = PRIORITY_CONFIG[p];
                const isSelected = form.priority === p;
                return (
                  <button
                    key={p}
                    onClick={() => update("priority", p)}
                    className="flex-1 py-2 rounded-lg text-xs font-medium border transition-colors"
                    style={
                      isSelected
                        ? { backgroundColor: `hsl(var(--${pc.bgVar})_/_0.15)`, color: `hsl(var(--${pc.colorVar}))`, borderColor: "transparent" }
                        : { backgroundColor: "hsl(var(--surface))", color: "hsl(var(--on-surface-variant))", borderColor: "hsl(var(--border))" }
                    }
                  >
                    {pc.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Due Date</label>
          <Input
            type="date"
            value={form.dueDate}
            onChange={(e) => update("dueDate", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Note</label>
          <Textarea
            value={form.note}
            onChange={(e) => update("note", e.target.value)}
            placeholder="Add task details..."
            className="h-20"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 px-6 py-4" style={{ borderTop: "1px solid hsl(var(--border))" }}>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave}>{task ? "Update Task" : "Create Task"}</Button>
      </div>
    </Modal>
  );
}

export default function TasksPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [counts, setCounts] = useState({ all: 0, open: 0, completed: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "completed" | "overdue">("all");
  const [search, setSearch] = useState("");
  const [showNewTask, setShowNewTask] = useState(false);
  const [editingTask, setEditingTask] = useState<ApiTask | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      setTasks(data.tasks ?? []);
      if (data.counts) {
        setCounts(data.counts);
      } else {
        setCounts({
          all: (data.tasks ?? []).length,
          open: (data.tasks ?? []).filter((t: ApiTask) => t.status === "open").length,
          completed: (data.tasks ?? []).filter((t: ApiTask) => t.status === "completed").length,
          overdue: (data.tasks ?? []).filter((t: ApiTask) => t.status === "overdue").length,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filtered = tasks.filter((t) => {
    if (filter !== "all" && t.status !== filter) return false;
    if (search && !t.lead_name.toLowerCase().includes(search.toLowerCase()) &&
        !t.type.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleSaveTask = async (data: LocalTask) => {
    if (editingTask) {
      setTasks((prev) => prev.map((t) => t.id === editingTask.id ? { ...t, ...data } : t));
      setEditingTask(null);
    } else {
      const body = {
        lead_id: "",
        lead_name: data.leadName,
        type: data.type,
        priority: data.priority,
        due_date: data.dueDate,
        source: "manual",
        status: "open",
        note: data.note,
      };
      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          await fetchTasks();
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const toggleComplete = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newStatus = task.status === "completed" ? "open" : "completed";
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus } : t));
        setCounts((prev) => ({
          ...prev,
          open: newStatus === "open" ? prev.open + 1 : prev.open - 1,
          completed: newStatus === "completed" ? prev.completed + 1 : prev.completed - 1,
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        setCounts((prev) => ({ ...prev, all: prev.all - 1 }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filterTabs = [
    { key: "all" as const, label: "All", count: counts.all },
    { key: "open" as const, label: "Open", count: counts.open },
    { key: "completed" as const, label: "Completed", count: counts.completed },
    { key: "overdue" as const, label: "Overdue", count: counts.overdue },
  ];

  return (
    <Shell role="user">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>Tasks</h1>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{counts.open} open tasks · {counts.overdue} overdue</p>
          </div>
          <Button onClick={() => setShowNewTask(true)}>
            <Plus size={16} className="mr-2" />New Task
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground))" }} />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
            {filterTabs.map((tab) => {
              const isActive = filter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className="px-4 py-2 text-sm font-medium transition-colors"
                  style={{
                    color: isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                    borderBottom: isActive ? "2px solid hsl(var(--primary))" : "2px solid transparent",
                    marginBottom: "-1px",
                  }}
                >
                  {tab.label}
                  <span
                    className="ml-2 px-2 py-0.5 rounded-full text-xs"
                    style={{
                      backgroundColor: isActive ? "hsl(var(--primary)_/_0.12)" : "hsl(var(--surface-container-low))",
                      color: isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Task list */}
        <div className="space-y-3">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center" style={{ color: "hsl(var(--muted-foreground))" }}>
                <Loader2 size={32} className="mx-auto mb-2 animate-spin" />
                <p className="text-sm">Loading tasks...</p>
              </CardContent>
            </Card>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center" style={{ color: "hsl(var(--muted-foreground))" }}>
                <CheckSquare size={32} className="mx-auto mb-2" />
                <p className="text-sm">No tasks found</p>
              </CardContent>
            </Card>
          ) : (
            filtered.map((task) => {
              const pc = PRIORITY_CONFIG[task.priority];
              const sc = STATUS_CONFIG[task.status];
              return (
                <Card key={task.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleComplete(task.id)}
                      className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                      style={
                        task.status === "completed"
                          ? { backgroundColor: "hsl(var(--success))", borderColor: "hsl(var(--success))", color: "white" }
                          : task.status === "overdue"
                          ? { borderColor: "hsl(var(--danger)_/_0.4)", backgroundColor: "transparent", color: "transparent" }
                          : { borderColor: "hsl(var(--border))", backgroundColor: "transparent", color: "transparent" }
                      }
                      onMouseEnter={(e) => { if (task.status !== "completed") e.currentTarget.style.borderColor = "hsl(var(--primary))"; }}
                      onMouseLeave={(e) => { if (task.status !== "completed") e.currentTarget.style.borderColor = "hsl(var(--border))"; }}
                    >
                      {task.status === "completed" && <CheckCircle2 size={14} />}
                    </button>

                    {/* Lead avatar */}
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {getInitials(task.lead_name)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-sm font-medium"
                          style={task.status === "completed" ? { color: "hsl(var(--muted-foreground))", textDecoration: "line-through" } : { color: "hsl(var(--on-surface))" }}
                        >
                          {task.lead_name}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: `hsl(var(--${pc.bgVar})_/_0.15)`, color: `hsl(var(--${pc.colorVar}))` }}
                        >
                          {pc.label}
                        </span>
                        {task.status === "overdue" && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: "hsl(var(--danger)_/_0.15)", color: "hsl(var(--danger))" }}>Overdue</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{task.type}</span>
                        <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.5 }}>·</span>
                        <span className="text-xs flex items-center gap-1" style={{ color: `hsl(var(--${sc.colorVar}))` }}>
                          {sc.icon} {task.due_date}
                        </span>
                        {task.note && (
                          <>
                            <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.5 }}>·</span>
                            <span className="text-xs truncate" style={{ color: "hsl(var(--muted-foreground))" }}>{task.note}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="ghost" size="sm" title="Call lead"><Phone size={14} /></Button>
                      <Button variant="ghost" size="sm" title="SMS lead"><MessageSquare size={14} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingTask(task)}><MoreHorizontal size={14} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteTask(task.id)}><X size={14} /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* New Task Modal */}
      <TaskModal
        open={showNewTask}
        onClose={() => setShowNewTask(false)}
        onSave={handleSaveTask}
      />

      {/* Edit Task Modal */}
      {editingTask && (
        <TaskModal
          open={true}
          onClose={() => setEditingTask(null)}
          task={{
            leadName: editingTask.lead_name,
            type: editingTask.type,
            priority: editingTask.priority,
            dueDate: editingTask.due_date,
            note: editingTask.note ?? "",
          }}
          onSave={handleSaveTask}
        />
      )}
    </Shell>
  );
}