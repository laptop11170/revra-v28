"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Button } from "@/components/ui/button";
import { Filter, Plus, Building, ChevronDown, Sparkles, Loader2, LayoutGrid, List, UserCircle, ExternalLink, Search, X, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLeadProfile, LeadData } from "@/context/lead-profile-context";
import { AddLeadModal } from "@/components/leads/AddLeadModal";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

type ApiLead = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  score: number;
  pipeline_stage: string;
  lead_type: string | null;
  source: string | null;
  last_message_at: string | null;
  last_contacted_at: string | null;
  created_at: string;
  is_admin_lead: boolean;
  is_marketplace_lead: boolean;
};

type StageKey = "new_lead" | "contacted" | "qualified" | "quote_sent" | "won" | "lost";

const colMeta: Record<StageKey, { title: string; color: string }> = {
  new_lead: { title: "New Leads", color: "#a078ff" },
  contacted: { title: "Contacted", color: "#00cbe6" },
  qualified: { title: "Qualified", color: "#16a34a" },
  quote_sent: { title: "Quote Sent", color: "#d97706" },
  won: { title: "Won", color: "#22c55e" },
  lost: { title: "Lost", color: "#dc2626" },
};

const stageOrder: StageKey[] = ["new_lead", "contacted", "qualified", "quote_sent", "won", "lost"];

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHrs / 24);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getHotLevel(score: number): "hot" | "warm" | null {
  if (score >= 80) return "hot";
  if (score >= 60) return "warm";
  return null;
}

function SparklineSVG() {
  const d = "M0 22 Q15 6 30 14 T60 10 T80 4";
  return (
    <svg viewBox="0 0 80 30" style={{ width: 80, height: 28 }}>
      <path d={d} stroke="#7c6cff" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

// ── Draggable Lead Card ─────────────────────────────────────────────────────
function LeadBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        padding: "1px 6px",
        borderRadius: 999,
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        background: color + "20",
        color: color,
        lineHeight: "16px",
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

function DraggableCard({ lead, onOpen }: { lead: ApiLead; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: lead,
  });

  const hot = getHotLevel(lead.score);
  const fullName = `${lead.first_name} ${lead.last_name || ""}`.trim();

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: "grab",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn("kanban-card", hot === "hot" && "live")}
      onClick={onOpen}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "var(--radius-md)",
            background: hot === "hot" ? "rgba(16,185,129,0.2)" : "var(--surface-3)",
            color: hot === "hot" ? "var(--mint)" : "var(--ink-mute)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          {fullName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>
              {fullName}
            </span>
            {lead.is_admin_lead && <LeadBadge label="Admin Lead" color="#7c6cff" />}
            {lead.is_marketplace_lead && <LeadBadge label="Revra Lead" color="#06b6d4" />}
          </div>
          {lead.lead_type && (
            <div style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>
              {lead.lead_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </div>
          )}
          {(lead.pipeline_stage === "won" || lead.pipeline_stage === "lost") && (
            <div
              style={{
                marginTop: 4,
                fontSize: 11,
                fontWeight: 600,
                color: lead.pipeline_stage === "won" ? "#22c55e" : "#dc2626",
              }}
            >
              {lead.pipeline_stage === "won" ? "✓ Won" : "✗ Lost"}
            </div>
          )}
        </div>
        {hot === "hot" && (
          <Sparkles size={13} style={{ color: "#7c6cff", flexShrink: 0, marginTop: 2 }} />
        )}
      </div>

      {(lead.source || lead.last_message_at) && (
        <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 6 }}>
          {lead.source ? lead.source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : ""}
          {lead.source && lead.last_message_at ? " · " : ""}
          {lead.last_message_at ? timeAgo(lead.last_message_at) : ""}
        </div>
      )}
      {lead.score > 0 && lead.pipeline_stage !== "won" && lead.pipeline_stage !== "lost" && (
        <div style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 4 }}>
          Score: {lead.score}
        </div>
      )}
    </div>
  );
}

// ── Droppable Column ────────────────────────────────────────────────────────
function DroppableColumn({
  stage,
  leads,
  onAddLead,
  onOpenLead,
}: {
  stage: StageKey;
  leads: ApiLead[];
  onAddLead: (stage: StageKey) => void;
  onOpenLead: (lead: ApiLead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const meta = colMeta[stage];

  return (
    <div style={{ minWidth: 260, maxWidth: 300, flex: 1 }}>
      {/* Column header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
          background: "rgba(19,24,38,0.8)",
          border: "1px solid var(--line)",
          borderBottom: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: meta.color, display: "inline-block" }} />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{meta.title}</span>
        </div>
        <span style={{ fontSize: 12, color: "var(--ink-mute)", fontVariantNumeric: "tabular-nums" }}>
          {leads.length}
        </span>
      </div>

      {/* Column body — droppable zone */}
      <div
        ref={setNodeRef}
        style={{
          padding: 10,
          borderRadius: "0 0 var(--radius-lg) var(--radius-lg)",
          background: isOver ? "rgba(124,108,255,0.1)" : "rgba(19,24,38,0.4)",
          border: "1px solid var(--line)",
          borderTop: "none",
          minHeight: 200,
          transition: "background 0.15s",
        }}
      >
        {leads.map((lead) => {
          return (
            <div key={lead.id} style={{ marginBottom: 8 }}>
              <DraggableCard
                lead={lead}
                onOpen={() => onOpenLead(lead)}
              />
            </div>
          );
        })}

        {/* Add lead button */}
        <button
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "var(--radius-md)",
            border: "1px dashed var(--line)",
            background: "transparent",
            color: "var(--ink-dim)",
            fontSize: 12,
            cursor: "pointer",
            marginTop: 4,
            transition: "border-color 0.12s, color 0.12s",
          }}
          onClick={() => onAddLead(stage)}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--line-2)";
            (e.currentTarget as HTMLElement).style.color = "var(--ink-mute)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--line)";
            (e.currentTarget as HTMLElement).style.color = "var(--ink-dim)";
          }}
        >
          + Add Lead
        </button>
      </div>
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────
type FilterState = {
  search: string;
  leadType: string;
  source: string;
  minScore: number;
  stage: string;
};

const LEAD_TYPE_OPTIONS = ["All Types", "Medicare", "ACA", "Final Expense", "Life", "Other"];
const SOURCE_OPTIONS = ["All Sources", "Google Ads", "Facebook", "Referral", "Website", "Inbound Call", "Marketplace"];
const STAGE_OPTIONS = ["All Stages", "New Leads", "Contacted", "Qualified", "Quote Sent", "Won", "Lost"];

function ListView({ leads, onOpenLead, hasActiveFilters }: { leads: ApiLead[]; onOpenLead: (lead: ApiLead) => void; hasActiveFilters: boolean }) {
  const stageMeta: Record<StageKey, { label: string; color: string }> = {
    new_lead: { label: "New Leads", color: "#a078ff" },
    contacted: { label: "Contacted", color: "#00cbe6" },
    qualified: { label: "Qualified", color: "#16a34a" },
    quote_sent: { label: "Quote Sent", color: "#d97706" },
    won: { label: "Won", color: "#22c55e" },
    lost: { label: "Lost", color: "#dc2626" },
  };

  // Group by stage
  const grouped = stageOrder.reduce<Record<StageKey, ApiLead[]>>((acc, key) => {
    acc[key] = leads.filter((l) => l.pipeline_stage === key);
    return acc;
  }, {} as Record<StageKey, ApiLead[]>);

  const renderLeadRow = (lead: ApiLead) => {
    const hot = getHotLevel(lead.score);
    const fullName = `${lead.first_name} ${lead.last_name || ""}`.trim();
    const stage = lead.pipeline_stage as StageKey;
    const meta = stageMeta[stage];

    return (
      <div
        key={lead.id}
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1.5fr 1fr 1fr 70px 110px",
          gap: 0,
          padding: "11px 16px",
          borderBottom: "1px solid rgba(37,43,63,0.35)",
          alignItems: "center",
          cursor: "pointer",
          transition: "background 0.1s",
        }}
        onClick={() => onOpenLead(lead)}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        {/* Name */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "var(--radius-sm)",
            background: hot === "hot" ? "rgba(16,185,129,0.2)" : "var(--surface-3)",
            color: hot === "hot" ? "var(--mint)" : "var(--ink-mute)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9.5, fontWeight: 700, flexShrink: 0,
            fontFamily: "var(--font-mono)",
          }}>
            {fullName.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {fullName}
            </div>
            {lead.email && (
              <div style={{ fontSize: 11, color: "var(--ink-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {lead.email}
              </div>
            )}
          </div>
          {lead.is_admin_lead && <span style={{ padding: "1px 6px", borderRadius: 999, fontSize: 9, fontWeight: 600, background: "#7c6cff20", color: "#7c6cff", flexShrink: 0 }}>Admin</span>}
          {lead.is_marketplace_lead && <span style={{ padding: "1px 6px", borderRadius: 999, fontSize: 9, fontWeight: 600, background: "#06b6d420", color: "#06b6d4", flexShrink: 0 }}>Market</span>}
        </div>

        {/* Phone */}
        <div style={{ fontSize: 12, color: "var(--ink-mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 12 }}>
          {lead.phone}
        </div>

        {/* Lead Type */}
        <div style={{ fontSize: 12, color: "var(--ink-mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lead.lead_type ? lead.lead_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—"}
        </div>

        {/* Source */}
        <div style={{ fontSize: 12, color: "var(--ink-mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lead.source ? lead.source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—"}
        </div>

        {/* Score */}
        <div style={{ fontSize: 12, display: "flex", justifyContent: "center" }}>
          {lead.score > 0 && (
            <span style={{
              padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600,
              background: hot === "hot" ? "rgba(16,185,129,0.15)" : hot === "warm" ? "rgba(245,158,11,0.15)" : "var(--surface-2)",
              color: hot === "hot" ? "var(--mint)" : hot === "warm" ? "var(--amber)" : "var(--ink-mute)",
            }}>
              {lead.score}
            </span>
          )}
        </div>

        {/* Stage */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: meta.color, display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: "var(--ink)" }}>{meta.label}</span>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Grouped table by stage */}
      {leads.length === 0 ? (
        <div style={{ padding: "48px", textAlign: "center", color: "var(--ink-mute)", fontSize: 13 }}>
          {hasActiveFilters ? "No leads match your filters." : "No leads yet."}
        </div>
      ) : (
        stageOrder.map((stage) => {
          const stageLeads = grouped[stage];
          if (stageLeads.length === 0) return null;
          const meta = stageMeta[stage];

          return (
            <div key={stage} style={{ marginBottom: 16 }}>
              {/* Stage section header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "rgba(19,24,38,0.5)", borderRadius: "var(--radius-md) var(--radius-md) 0 0", border: "1px solid var(--line)", borderBottom: "none" }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: meta.color, display: "inline-block" }} />
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{meta.label}</span>
                <span style={{ fontSize: 11, color: "var(--ink-mute)", marginLeft: 4 }}>({stageLeads.length})</span>
              </div>

              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 70px 110px", gap: 0, padding: "8px 16px", background: "rgba(19,24,38,0.3)", border: "1px solid var(--line)", borderTop: "none", borderBottom: "1px solid rgba(37,43,63,0.5)" }}>
                {["Name", "Phone", "Lead Type", "Source", "Score", "Stage"].map((h) => (
                  <div key={h} style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
                ))}
              </div>

              {/* Rows */}
              <div style={{ borderRadius: "0 0 var(--radius-md) var(--radius-md)", overflow: "hidden", border: "1px solid var(--line)", borderTop: "none" }}>
                {stageLeads.map(renderLeadRow)}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const { openLead } = useLeadProfile();
  const [leads, setLeads] = useState<ApiLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLead, setActiveLead] = useState<ApiLead | null>(null);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [addLeadStage, setAddLeadStage] = useState<StageKey>("new_lead");
  const [emmaNewCount, setEmmaNewCount] = useState(0);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  const [filters, setFilters] = useState<FilterState>({
    search: "", leadType: "All Types", source: "All Sources", minScore: 0, stage: "All Stages",
  });
  const [showFilters, setShowFilters] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error(`Failed to fetch leads: ${res.status}`);
      const data = await res.json();
      setLeads(data.leads || []);

      // Calculate Emma-style count: leads added in last 7 days
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const newCount = (data.leads || []).filter((l: ApiLead) =>
        new Date(l.created_at) > weekAgo
      ).length;
      setEmmaNewCount(newCount);
    } catch (err: any) {
      setError(err.message ?? "Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const fullName = `${lead.first_name} ${lead.last_name || ""}`.toLowerCase();
        if (!fullName.includes(q) && !lead.phone.includes(q) && !(lead.email || "").toLowerCase().includes(q)) return false;
      }
      if (filters.leadType !== "All Types") {
        const lt = lead.lead_type || "";
        const match = (filters.leadType === "Medicare" && lt.includes("medicare")) ||
          (filters.leadType === "ACA" && lt.includes("aca")) ||
          (filters.leadType === "Final Expense" && lt.includes("final")) ||
          (filters.leadType === "Life" && lt.includes("life")) ||
          (filters.leadType === "Other" && lt !== "medicare" && lt !== "aca" && lt !== "final_expense" && lt !== "life" && lt !== "");
        if (!match) return false;
      }
      if (filters.source !== "All Sources") {
        const src = (lead.source || "").toLowerCase();
        const fSrc = filters.source.toLowerCase().replace(/ /g, "_");
        if (!src.includes(fSrc)) return false;
      }
      if (filters.minScore > 0 && lead.score < filters.minScore) return false;
      if (filters.stage !== "All Stages") {
        const s = lead.pipeline_stage || "";
        const fStage = filters.stage.toLowerCase().replace(/ /g, "_");
        const targetStage = fStage === "new_leads" ? "new_lead" : fStage;
        if (s !== targetStage) return false;
      }
      return true;
    });
  }, [leads, filters]);

  const activeFilterCount = (filters.leadType !== "All Types" ? 1 : 0) +
    (filters.source !== "All Sources" ? 1 : 0) +
    (filters.minScore > 0 ? 1 : 0) +
    (filters.stage !== "All Stages" ? 1 : 0);

  const hasActiveFilters = filters.search !== "" || activeFilterCount > 0;

  const grouped = useMemo(() => {
    return stageOrder.reduce<Record<StageKey, ApiLead[]>>((acc, key) => {
      acc[key] = filteredLeads.filter((l) => l.pipeline_stage === key);
      return acc;
    }, {} as Record<StageKey, ApiLead[]>);
  }, [filteredLeads]);

  const totalPipeline = leads.filter((l) => l.pipeline_stage !== "won" && l.pipeline_stage !== "lost").length;
  const hotCount = leads.filter((l) => getHotLevel(l.score) === "hot").length;
  const wonCount = leads.filter((l) => l.pipeline_stage === "won").length;
  const qualifiedCount = (grouped.qualified?.length ?? 0) + (grouped.quote_sent?.length ?? 0);
  const contactedCount = grouped.contacted?.length ?? 0;

  const handleDragStart = (event: DragStartEvent) => {
    const lead = event.active.data.current as ApiLead;
    setActiveLead(lead);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const newStage = over.id as StageKey;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.pipeline_stage === newStage) return;

    // Optimistic UI update
    setLeads((prev) =>
      prev.map((l) => l.id === leadId ? { ...l, pipeline_stage: newStage } : l)
    );

    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadId, pipeline_stage: newStage }),
      });
      if (!res.ok) {
        // Revert on failure
        setLeads((prev) =>
          prev.map((l) => l.id === leadId ? { ...l, pipeline_stage: lead.pipeline_stage } : l)
        );
      }
    } catch {
      setLeads((prev) =>
        prev.map((l) => l.id === leadId ? { ...l, pipeline_stage: lead.pipeline_stage } : l)
      );
    }
  };

  const handleAddLead = (stage: StageKey) => {
    setAddLeadStage(stage);
    setAddLeadOpen(true);
  };

  const handleOpenLead = (lead: ApiLead) => {
    const leadData: LeadData = {
      id: lead.id,
      name: `${lead.first_name} ${lead.last_name || ""}`.trim(),
      email: lead.email ?? "",
      org: lead.lead_type ? lead.lead_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—",
      role: lead.source ?? "",
      score: lead.score,
      stage: lead.pipeline_stage ?? "—",
      hot: getHotLevel(lead.score),
      source: lead.source ?? "Inbound",
      phone: lead.phone,
      assignedTo: "—",
      lastActivity: timeAgo(lead.last_message_at),
      createdAt: timeAgo(lead.created_at),
      tags: [],
    };
    openLead(leadData);
  };

  const handleLeadAdded = (newLead: ApiLead) => {
    setLeads((prev) => [newLead, ...prev]);
    setAddLeadOpen(false);
    // Update Emma count
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    setEmmaNewCount((prev) => prev + (new Date(newLead.created_at) > weekAgo ? 1 : 0));
  };

  const kpis = [
    { label: "Total Leads", value: totalPipeline },
    { label: "Hot Leads", value: hotCount },
    { label: "Contacted", value: contactedCount },
    { label: "Qualified", value: qualifiedCount },
    { label: "Won", value: wonCount },
  ];

  return (
    <Shell role="user">
      <AddLeadModal
        open={addLeadOpen}
        onClose={() => setAddLeadOpen(false)}
        onSuccess={handleLeadAdded}
        defaultStage={addLeadStage}
      />

      <div style={{ padding: "32px 40px", maxWidth: 1400 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.005em" }}>
              Pipeline
            </h1>
            <p style={{ fontSize: 13, color: "var(--ink-mute)", marginTop: 4 }}>
              Drag leads between stages to update their status.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn("filter-btn", (showFilters || hasActiveFilters) && "active")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--line)",
                background: showFilters || hasActiveFilters ? "var(--accent-glow)" : "var(--surface-2)",
                color: showFilters || hasActiveFilters ? "var(--accent)" : "var(--ink-mute)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <Filter size={12} /> Filters
              {activeFilterCount > 0 && (
                <span style={{ background: "var(--accent)", color: "#fff", borderRadius: 999, padding: "0 5px", fontSize: 10, fontWeight: 700, marginLeft: 4 }}>
                  {activeFilterCount}
                </span>
              )}
            </button>
            <div style={{ display: "flex", gap: 2, background: "var(--surface-2)", padding: 3, borderRadius: "var(--radius-md)" }}>
              <button
                onClick={() => setViewMode("kanban")}
                className={cn("btn-icon p-1.5", viewMode === "kanban" && "active")}
                style={{ borderRadius: "var(--radius-sm)", background: viewMode === "kanban" ? "var(--surface)" : "transparent" }}
                title="Kanban view"
              >
                <LayoutGrid size={13} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn("btn-icon p-1.5", viewMode === "list" && "active")}
                style={{ borderRadius: "var(--radius-sm)", background: viewMode === "list" ? "var(--surface)" : "transparent" }}
                title="List view"
              >
                <List size={13} />
              </button>
            </div>
            <button
              className="btn-primary"
              style={{ padding: "8px 16px", fontSize: 13 }}
              onClick={() => { setAddLeadStage("new_lead"); setAddLeadOpen(true); }}
            >
              <Plus size={13} style={{ marginRight: 6 }} />
              Add Lead
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 28 }}>
          {kpis.map((k) => (
            <div key={k.label} className="kpi-card">
              <div className="label">{k.label}</div>
              <div className="value">{k.value}</div>
              <SparklineSVG />
            </div>
          ))}
        </div>

        {/* Search & Filter Bar */}
        {(showFilters || hasActiveFilters) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20, alignItems: "center", background: "var(--surface-2)", padding: 12, borderRadius: "var(--radius-lg)", border: "1px solid var(--line)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface-3)", borderRadius: "var(--radius-md)", padding: "8px 12px", flex: 1, minWidth: 260, maxWidth: 360, border: "1px solid var(--line)" }}>
              <Search size={13} style={{ color: "var(--ink-mute)", flexShrink: 0 }} />
              <input
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                placeholder="Search by name, phone or email..."
                style={{ background: "none", border: "none", outline: "none", color: "var(--ink)", fontSize: 13, width: "100%" }}
              />
              {filters.search && (
                <button onClick={() => setFilters((f) => ({ ...f, search: "" }))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-mute)", display: "flex", padding: 0 }}>
                  <X size={12} />
                </button>
              )}
            </div>

            <select
              value={filters.stage}
              onChange={(e) => setFilters((f) => ({ ...f, stage: e.target.value }))}
              style={{ background: "var(--surface-3)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", color: "var(--ink)", fontSize: 13, padding: "8px 12px", outline: "none", cursor: "pointer" }}
            >
              {STAGE_OPTIONS.map((st) => <option key={st} value={st} style={{ color: "#111827", backgroundColor: "#ffffff" }}>{st}</option>)}
            </select>

            <select
              value={filters.leadType}
              onChange={(e) => setFilters((f) => ({ ...f, leadType: e.target.value }))}
              style={{ background: "var(--surface-3)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", color: "var(--ink)", fontSize: 13, padding: "8px 12px", outline: "none", cursor: "pointer" }}
            >
              {LEAD_TYPE_OPTIONS.map((t) => <option key={t} value={t} style={{ color: "#111827", backgroundColor: "#ffffff" }}>{t}</option>)}
            </select>

            <select
              value={filters.source}
              onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))}
              style={{ background: "var(--surface-3)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", color: "var(--ink)", fontSize: 13, padding: "8px 12px", outline: "none", cursor: "pointer" }}
            >
              {SOURCE_OPTIONS.map((s) => <option key={s} value={s} style={{ color: "#111827", backgroundColor: "#ffffff" }}>{s}</option>)}
            </select>

            <select
              value={filters.minScore}
              onChange={(e) => setFilters((f) => ({ ...f, minScore: parseInt(e.target.value) }))}
              style={{ background: "var(--surface-3)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", color: "var(--ink)", fontSize: 13, padding: "8px 12px", outline: "none", cursor: "pointer" }}
            >
              <option value={0} style={{ color: "#111827", backgroundColor: "#ffffff" }}>Any score</option>
              <option value={60} style={{ color: "#111827", backgroundColor: "#ffffff" }}>Score 60+ (warm)</option>
              <option value={80} style={{ color: "#111827", backgroundColor: "#ffffff" }}>Score 80+ (hot)</option>
              <option value={90} style={{ color: "#111827", backgroundColor: "#ffffff" }}>Score 90+</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={() => setFilters({ search: "", leadType: "All Types", source: "All Sources", minScore: 0, stage: "All Stages" })}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-mute)", fontSize: 13, display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}
              >
                <X size={13} /> Clear
              </button>
            )}

            <span style={{ fontSize: 12.5, color: "var(--ink-mute)", marginLeft: "auto" }}>
              {filteredLeads.length} lead{filteredLeads.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Kanban board */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ink-mute)" }}>
              <Loader2 size={18} className="animate-spin" />
              <span style={{ fontSize: 13 }}>Loading pipeline...</span>
            </div>
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--rose)" }}>
            <div style={{ fontSize: 13 }}>{error}</div>
            <button className="btn-ghost" style={{ marginTop: 8, padding: "6px 12px", fontSize: 12 }} onClick={fetchLeads}>Retry</button>
          </div>
        ) : viewMode === "list" ? (
          <ListView leads={filteredLeads} onOpenLead={handleOpenLead} hasActiveFilters={hasActiveFilters} />
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
              {stageOrder.map((key) => (
                <DroppableColumn
                  key={key}
                  stage={key}
                  leads={grouped[key] ?? []}
                  onAddLead={handleAddLead}
                  onOpenLead={handleOpenLead}
                />
              ))}
            </div>

            <DragOverlay>
              {activeLead && (
                <div
                  className="kanban-card"
                  style={{
                    width: 260,
                    opacity: 0.9,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                    transform: "rotate(2deg)",
                    pointerEvents: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "var(--radius-md)",
                        background: "rgba(16,185,129,0.2)",
                        color: "var(--mint)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 600,
                      }}
                    >
                      {activeLead.first_name[0]}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>
                      {activeLead.first_name} {activeLead.last_name || ""}
                    </div>
                  </div>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}

        {/* Emma AI status — dynamic */}
        {emmaNewCount > 0 && (
          <div
            style={{
              marginTop: 24,
              padding: "14px 18px",
              borderRadius: "var(--radius-xl)",
              background: "rgba(19,24,38,0.5)",
              border: "1px solid rgba(99,102,241,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "var(--radius-lg)",
                  background: "linear-gradient(180deg, #7c6cff, #6366f1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 4px 12px rgba(99,102,241,0.3)",
                }}
              >
                <Sparkles size={16} style={{ color: "white" }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                  Emma is finding and qualifying the right opportunities for you.
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 2 }}>
                  {emmaNewCount} new lead{emmaNewCount !== 1 ? "s" : ""} added to your pipeline this week.
                </div>
              </div>
            </div>
            <button
              className="btn-primary"
              style={{ padding: "8px 16px", fontSize: 13, whiteSpace: "nowrap", flexShrink: 0 }}
              onClick={() => window.location.href = "/user/ai"}
            >
              View AI Campaigns
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}