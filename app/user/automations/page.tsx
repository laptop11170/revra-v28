"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/context/theme-provider";
import {
  Plus, Play, Pause, Trash2, Zap, Clock, MessageSquare, Users,
  ChevronRight, Loader2, Mail, ArrowRight, Sparkles, Send,
  X, CheckCircle2, AlertCircle, RefreshCw,
} from "lucide-react";

interface SequenceStep {
  id: string;
  step_number: number;
  name: string;
  channel: string;
  body: string;
  delay_days: number;
  delay_hours: number;
}

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  status: string;
  trigger_type: string;
  steps: SequenceStep[];
  enrollments?: { count: number }[];
}

interface ReEngageSuggestion {
  lead_id: string;
  name: string;
  reason: string;
  message_suggestion: string;
  priority: "high" | "medium" | "low";
}

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "default" | "danger"; icon: React.ReactNode }> = {
  active: { label: "Active", variant: "success", icon: <Play size={12} /> },
  paused: { label: "Paused", variant: "warning", icon: <Pause size={12} /> },
  draft: { label: "Draft", variant: "default", icon: <Clock size={12} /> },
  archived: { label: "Archived", variant: "danger", icon: <X size={12} /> },
};

function SequenceCard({ seq, onToggle, onDelete, onEdit, onEnroll }: {
  seq: Sequence;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
  onEdit: (seq: Sequence) => void;
  onEnroll: (id: string) => void;
}) {
  const sc = STATUS_CONFIG[seq.status] || STATUS_CONFIG.draft;
  const enrollmentCount = seq.enrollments?.[0]?.count ?? 0;

  return (
  <div className="p-5 rounded-xl border transition-all hover:border-[hsl(var(--primary)_/_0.3)]"
  style={{ backgroundColor: "hsl(var(--surface-container-low))", borderColor: "hsl(var(--border)_/_0.5)" }}>
  <div className="flex items-start justify-between mb-3">
  <div>
  <h3 className="font-semibold text-sm" style={{ color: "hsl(var(--on-surface))" }}>{seq.name}</h3>
  {seq.description && <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{seq.description}</p>}
  </div>
  <Badge variant={sc.variant}>{sc.icon} {sc.label}</Badge>
  </div>

  <div className="flex items-center gap-4 text-xs mb-4" style={{ color: "hsl(var(--muted-foreground))" }}>
  <span className="flex items-center gap-1"><MessageSquare size={12} /> {seq.steps?.length ?? 0} steps</span>
  <span className="flex items-center gap-1"><Users size={12} /> {enrollmentCount} enrolled</span>
  <span className="flex items-center gap-1"><Clock size={12} /> {seq.trigger_type}</span>
  </div>

  {/* Step preview */}
  <div className="space-y-2 mb-4">
  {(seq.steps || []).slice(0, 3).map((step, i) => (
  <div key={step.id} className="flex items-center gap-2 text-xs">
  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
  style={{ backgroundColor: "hsl(var(--primary)_/_0.12)", color: "hsl(var(--primary))" }}>
  {i + 1}
  </div>
  <span style={{ color: "hsl(var(--muted-foreground))" }}>{step.name}</span>
  <span className="ml-auto" style={{ color: "hsl(var(--muted-foreground))" }}>
  +{step.delay_days}d {step.delay_hours}h
  </span>
  </div>
  ))}
  {(seq.steps || []).length > 3 && (
  <p className="text-[10px] pl-7" style={{ color: "hsl(var(--muted-foreground))" }}>+{(seq.steps || []).length - 3} more</p>
  )}
  </div>

  <div className="flex gap-2">
  <Button variant="outline" size="sm" className="flex-1" onClick={() => onEnroll(seq.id)}>
  <Users size={12} className="mr-1" /> Enroll
  </Button>
  <Button variant="outline" size="sm" onClick={() => onEdit(seq)}>
  Edit
  </Button>
  <Button variant="outline" size="sm"
  onClick={() => onToggle(seq.id, seq.status !== "active")}
  disabled={seq.status === "archived"}>
  {seq.status === "active" ? <Pause size={12} /> : <Play size={12} />}
  </Button>
  <Button variant="ghost" size="sm" onClick={() => onDelete(seq.id)}>
  <Trash2 size={12} style={{ color: "hsl(var(--danger))" }} />
  </Button>
  </div>
  </div>
  );
}

// Create/Edit Sequence Modal
function SequenceModal({ open, onClose, sequence, onSave }: {
  open: boolean;
  onClose: () => void;
  sequence?: Sequence | null;
  onSave: (data: any) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<Array<{ name: string; body: string; delay_days: number; delay_hours: number }>>([
  { name: "Step 1", body: "", delay_days: 1, delay_hours: 0 },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
  if (sequence) {
  setName(sequence.name);
  setDescription(sequence.description || "");
  setSteps((sequence.steps || []).map((s) => ({
  name: s.name,
  body: s.body,
  delay_days: s.delay_days,
  delay_hours: s.delay_hours,
  })));
  } else {
  setName("");
  setDescription("");
  setSteps([{ name: "Step 1", body: "", delay_days: 1, delay_hours: 0 }]);
  }
  }, [sequence, open]);

  const addStep = () => setSteps((p) => [...p, { name: `Step ${p.length + 1}`, body: "", delay_days: 1, delay_hours: 0 }]);
  const removeStep = (i: number) => setSteps((p) => p.filter((_, idx) => idx !== i));
  const updateStep = (i: number, field: string, value: string | number) =>
  setSteps((p) => p.map((s, idx) => idx === i ? { ...s, [field]: value } : s));

  const handleSave = () => {
  if (!name.trim() || steps.some((s) => !s.body.trim())) return;
  setSaving(true);
  onSave({
  name: name.trim(),
  description: description.trim() || null,
  steps: steps.map((s, i) => ({ ...s, step_number: i + 1 })),
  });
  setSaving(false);
  };

  const canSave = name.trim() && steps.length > 0 && steps.every((s) => s.body.trim());

  return (
  <Modal open={open} onClose={onClose} size="lg" title={sequence ? "Edit Sequence" : "New SMS Sequence"}>
  <div className="p-6 space-y-4">
  <div>
  <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Sequence Name *</label>
  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New Lead Welcome" />
  </div>
  <div>
  <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Description</label>
  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this sequence does" />
  </div>

  <div className="space-y-3">
  <div className="flex items-center justify-between">
  <label className="text-xs font-medium" style={{ color: "hsl(var(--muted-foreground))" }}>Steps</label>
  <Button variant="ghost" size="sm" onClick={addStep}><Plus size={14} /> Add Step</Button>
  </div>
  {steps.map((step, i) => (
  <div key={i} className="p-3 rounded-lg border space-y-2" style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--surface))" }}>
  <div className="flex items-center gap-2">
  <span className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center"
  style={{ backgroundColor: "hsl(var(--primary)_/_0.12)", color: "hsl(var(--primary))" }}>
  {i + 1}
  </span>
  <Input value={step.name} onChange={(e) => updateStep(i, "name", e.target.value)}
  className="flex-1" placeholder="Step name" />
  {steps.length > 1 && (
  <button onClick={() => removeStep(i)} className="p-1"><X size={14} style={{ color: "hsl(var(--danger))" }} /></button>
  )}
  </div>
  <textarea
  value={step.body}
  onChange={(e) => updateStep(i, "body", e.target.value)}
  placeholder="Message body... Use {{first_name}} and {{last_name}} for personalization."
  rows={3}
  className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
  style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--surface-container-low))", color: "hsl(var(--on-surface))" }}
  />
  <div className="flex items-center gap-3 text-xs">
  <span style={{ color: "hsl(var(--muted-foreground))" }}>Wait:</span>
  <div className="flex items-center gap-1">
  <input type="number" min={0} value={step.delay_days}
  onChange={(e) => updateStep(i, "delay_days", parseInt(e.target.value) || 0)}
  className="w-14 h-7 rounded px-2 text-center text-sm"
  style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--surface))", color: "hsl(var(--on-surface))" }}
  />
  <span style={{ color: "hsl(var(--muted-foreground))" }}>days</span>
  </div>
  <div className="flex items-center gap-1">
  <input type="number" min={0} max={23} value={step.delay_hours}
  onChange={(e) => updateStep(i, "delay_hours", parseInt(e.target.value) || 0)}
  className="w-14 h-7 rounded px-2 text-center text-sm"
  style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--surface))", color: "hsl(var(--on-surface))" }}
  />
  <span style={{ color: "hsl(var(--muted-foreground))" }}>hrs</span>
  </div>
  </div>
  </div>
  ))}
  </div>
  </div>
  <div className="flex justify-end gap-2 px-6 py-4" style={{ borderColor: "hsl(var(--border))", borderTop: "1px solid" }}>
  <Button variant="outline" onClick={onClose}>Cancel</Button>
  <Button onClick={handleSave} disabled={!canSave || saving}>
  {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
  {sequence ? "Save Changes" : "Create Sequence"}
  </Button>
  </div>
  </Modal>
  );
}

// Enroll Leads Modal
function EnrollModal({ open, onClose, sequenceId }: {
  open: boolean;
  onClose: () => void;
  sequenceId: string | null;
}) {
  const [leads, setLeads] = useState<Array<{ id: string; name: string; phone: string }>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [search, setSearch] = useState("");
  const { addToast } = useToast();

  useEffect(() => {
  if (!open || !sequenceId) return;
  setLoading(true);
  fetch("/api/leads?limit=200")
  .then((r) => r.json())
  .then((data) => {
  const items = (data.leads || []).map((l: any) => ({
  id: l.id,
  name: `${l.first_name || ""} ${l.last_name || ""}`.trim() || "Unknown",
  phone: l.phone || "",
  }));
  setLeads(items);
  })
  .finally(() => setLoading(false));
  }, [open, sequenceId]);

  const toggleLead = (id: string) => {
  setSelected((prev) => {
  const next = new Set(prev);
  if (next.has(id)) next.delete(id); else next.add(id);
  return next;
  });
  };

  const handleEnroll = async () => {
  if (!sequenceId || selected.size === 0) return;
  setEnrolling(true);
  try {
  const res = await fetch(`/api/sequences/${sequenceId}/enroll`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ lead_ids: Array.from(selected) }),
  });
  const data = await res.json();
  if (res.ok) {
  addToast({ type: "success", title: "Enrolled", description: `${data.enrolled} leads enrolled` });
  onClose();
  } else {
  addToast({ type: "error", title: "Error", description: data.error || "Failed to enroll" });
  }
  } catch {
  addToast({ type: "error", title: "Error", description: "Failed to enroll leads" });
  } finally {
  setEnrolling(false);
  }
  };

  const filtered = leads.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search));

  return (
  <Modal open={open} onClose={onClose} size="md" title="Enroll Leads">
  <div className="p-6 space-y-4">
  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads..." />
  {loading ? (
  <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} /></div>
  ) : (
  <div className="max-h-[300px] overflow-y-auto space-y-1">
  {filtered.map((lead) => (
  <button key={lead.id} onClick={() => toggleLead(lead.id)}
  className="w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors"
  style={{ backgroundColor: selected.has(lead.id) ? "hsl(var(--primary)_/_0.08)" : "transparent" }}>
  <div className="w-5 h-5 rounded border flex items-center justify-center"
  style={{ borderColor: selected.has(lead.id) ? "hsl(var(--primary))" : "hsl(var(--border))",
  backgroundColor: selected.has(lead.id) ? "hsl(var(--primary))" : "transparent" }}>
  {selected.has(lead.id) && <CheckCircle2 size={12} color="white" />}
  </div>
  <div>
  <p className="text-sm font-medium" style={{ color: "hsl(var(--on-surface))" }}>{lead.name}</p>
  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{lead.phone}</p>
  </div>
  </button>
  ))}
  </div>
  )}
  </div>
  <div className="flex justify-between items-center px-6 py-4" style={{ borderColor: "hsl(var(--border))", borderTop: "1px solid" }}>
  <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{selected.size} selected</span>
  <div className="flex gap-2">
  <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
  <Button size="sm" onClick={handleEnroll} disabled={enrolling || selected.size === 0}>
  {enrolling ? <Loader2 size={12} className="animate-spin mr-1" /> : <Users size={12} className="mr-1" />}
  Enroll
  </Button>
  </div>
  </div>
  </Modal>
  );
}

// AI Re-engagement Panel
function ReEngagePanel() {
  const [suggestions, setSuggestions] = useState<ReEngageSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(14);
  const { addToast } = useToast();

  const fetchSuggestions = useCallback(async () => {
  setLoading(true);
  try {
  const res = await fetch(`/api/ai/re-engage?days=${days}&limit=10`);
  const data = await res.json();
  setSuggestions(data.suggestions || []);
  } catch {
  addToast({ type: "error", title: "Error", description: "Failed to load suggestions" });
  } finally {
  setLoading(false);
  }
  }, [days, addToast]);

  useEffect(() => { fetchSuggestions(); }, [fetchSuggestions]);

  const priorityColor = (p: string) => {
  if (p === "high") return "hsl(var(--danger))";
  if (p === "medium") return "hsl(var(--warning))";
  return "hsl(var(--success))";
  };

  return (
  <div className="space-y-4">
  <div className="flex items-center justify-between">
  <div className="flex items-center gap-2">
  <Sparkles size={16} style={{ color: "hsl(var(--primary))" }} />
  <h3 className="font-semibold" style={{ color: "hsl(var(--on-surface))" }}>AI Re-engagement Suggestions</h3>
  </div>
  <div className="flex items-center gap-2">
  <select value={days} onChange={(e) => setDays(parseInt(e.target.value))}
  className="h-8 rounded-lg px-2 text-xs"
  style={{ borderColor: "hsl(var(--border))", backgroundColor: "hsl(var(--surface))", color: "hsl(var(--on-surface))" }}>
  <option value={7}>7 days inactive</option>
  <option value={14}>14 days inactive</option>
  <option value={30}>30 days inactive</option>
  </select>
  <Button variant="ghost" size="sm" onClick={fetchSuggestions} disabled={loading}>
  <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
  </Button>
  </div>
  </div>

  {suggestions.length === 0 ? (
  <p className="text-sm text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>
  {loading ? "Analyzing leads..." : "No cold leads found. Great job staying on top of follow-ups!"}
  </p>
  ) : (
  <div className="space-y-3">
  {suggestions.map((s) => (
  <div key={s.lead_id} className="p-4 rounded-xl border" style={{ borderColor: "hsl(var(--border)_/_0.5)", backgroundColor: "hsl(var(--surface-container-low))" }}>
  <div className="flex items-center justify-between mb-2">
  <div className="flex items-center gap-2">
  <span className="text-sm font-medium" style={{ color: "hsl(var(--on-surface))" }}>{s.name}</span>
  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
  style={{ backgroundColor: `${priorityColor(s.priority)}20`, color: priorityColor(s.priority) }}>
  {s.priority.toUpperCase()}
  </span>
  </div>
  </div>
  <p className="text-xs mb-2" style={{ color: "hsl(var(--muted-foreground))" }}>{s.reason}</p>
  <div className="p-2 rounded-lg text-xs" style={{ backgroundColor: "hsl(var(--surface))", color: "hsl(var(--on-surface-variant))" }}>
  {s.message_suggestion}
  </div>
  </div>
  ))}
  </div>
  )}
  </div>
  );
}

export default function AutomationsPage() {
  const { theme } = useTheme();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"sequences" | "ai">("sequences");
  const [showModal, setShowModal] = useState(false);
  const [editingSequence, setEditingSequence] = useState<Sequence | null>(null);
  const [enrollSequenceId, setEnrollSequenceId] = useState<string | null>(null);
  const { addToast } = useToast();

  const fetchSequences = useCallback(async () => {
  try {
  const res = await fetch("/api/sequences");
  if (!res.ok) throw new Error("Failed");
  const data = await res.json();
  setSequences(data.sequences || []);
  } catch {
  addToast({ type: "error", title: "Error", description: "Failed to load sequences" });
  } finally {
  setLoading(false);
  }
  }, [addToast]);

  useEffect(() => { fetchSequences(); }, [fetchSequences]);

  const handleSave = async (data: any) => {
  try {
  const isEdit = !!editingSequence;
  if (isEdit) {
  // Update sequence metadata
  const metaRes = await fetch(`/api/sequences/${editingSequence!.id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: data.name, description: data.description }),
  });
  if (!metaRes.ok) throw new Error("Failed");
  // Replace steps
  const stepsRes = await fetch(`/api/sequences/${editingSequence!.id}/steps`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ steps: data.steps }),
  });
  if (!stepsRes.ok) throw new Error("Failed");
  } else {
  const res = await fetch("/api/sequences", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed");
  }
  await fetchSequences();
  setShowModal(false);
  setEditingSequence(null);
  addToast({ type: "success", title: isEdit ? "Saved" : "Created", description: `Sequence ${isEdit ? "updated" : "created"} successfully` });
  } catch {
  addToast({ type: "error", title: "Error", description: "Failed to save sequence" });
  }
  };

  const handleToggle = async (id: string, activate: boolean) => {
  try {
  const res = await fetch(`/api/sequences/${id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: activate ? "active" : "paused" }),
  });
  if (!res.ok) throw new Error("Failed");
  await fetchSequences();
  addToast({ type: "success", title: activate ? "Activated" : "Paused", description: `Sequence ${activate ? "activated" : "paused"}` });
  } catch {
  addToast({ type: "error", title: "Error", description: "Failed to update sequence" });
  }
  };

  const handleDelete = async (id: string) => {
  if (!confirm("Delete this sequence? This cannot be undone.")) return;
  try {
  const res = await fetch(`/api/sequences/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed");
  await fetchSequences();
  addToast({ type: "success", title: "Deleted", description: "Sequence deleted" });
  } catch {
  addToast({ type: "error", title: "Error", description: "Failed to delete sequence" });
  }
  };

  const openEdit = (seq: Sequence) => {
  setEditingSequence(seq);
  setShowModal(true);
  };

  const openCreate = () => {
  setEditingSequence(null);
  setShowModal(true);
  };

  const activeCount = sequences.filter((s) => s.status === "active").length;
  const totalEnrolled = sequences.reduce((sum, s) => sum + (s.enrollments?.[0]?.count ?? 0), 0);

  return (
  <Shell role="user">
  <div className="space-y-6">
  {/* Header */}
  <div className="flex items-center justify-between">
  <div>
  <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>Automations</h1>
  <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>
  {activeCount} active sequences &middot; {totalEnrolled} leads enrolled
  </p>
  </div>
  <Button onClick={openCreate}><Plus size={16} className="mr-2" /> New Sequence</Button>
  </div>

  {/* Tabs */}
  <div className="flex gap-2 border-b" style={{ borderColor: "hsl(var(--border))" }}>
  {(["sequences", "ai"] as const).map((t) => (
  <button key={t} onClick={() => setActiveTab(t)}
  className="px-4 py-2 text-sm font-medium transition-colors"
  style={{
  color: activeTab === t ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
  borderBottom: activeTab === t ? "2px solid hsl(var(--primary))" : "2px solid transparent",
  }}>
  {t === "sequences" ? "SMS Sequences" : "AI Re-engage"}
  </button>
  ))}
  </div>

  {activeTab === "sequences" ? (
  <>
  {loading ? (
  <div className="flex items-center justify-center py-20">
  <Loader2 size={32} className="animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
  </div>
  ) : sequences.length === 0 ? (
  <div className="text-center py-16">
  <Zap size={48} className="mx-auto mb-4" style={{ color: "hsl(var(--muted-foreground))" }} />
  <p className="text-lg font-medium mb-2" style={{ color: "hsl(var(--on-surface))" }}>No sequences yet</p>
  <p className="text-sm mb-6" style={{ color: "hsl(var(--muted-foreground))" }}>Create automated SMS follow-up sequences for your leads.</p>
  <Button onClick={openCreate}><Plus size={16} className="mr-2" /> Create Your First Sequence</Button>
  </div>
  ) : (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {sequences.map((seq) => (
  <SequenceCard key={seq.id} seq={seq} onToggle={handleToggle} onDelete={handleDelete} onEdit={openEdit} onEnroll={setEnrollSequenceId} />
  ))}
  </div>
  )}
  </>
  ) : (
  <ReEngagePanel />
  )}
  </div>

  <SequenceModal
  open={showModal}
  onClose={() => { setShowModal(false); setEditingSequence(null); }}
  sequence={editingSequence}
  onSave={handleSave}
  />

  <EnrollModal
  open={!!enrollSequenceId}
  onClose={() => setEnrollSequenceId(null)}
  sequenceId={enrollSequenceId}
  />
  </Shell>
  );
}
