"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import { LeadCard, LeadCardData } from "@/components/features/marketplace/LeadCard";
import { UploadModal } from "@/components/features/marketplace/UploadModal";
import {
  Plus,
  DollarSign,
  Package,
  ShoppingBag,
  Trash2,
  Edit2,
  BarChart3,
} from "lucide-react";

type Tab = "listed" | "sold" | "tiers";

export default function SuperadminMarketplace() {
  const [tab, setTab] = useState<Tab>("listed");
  const [leads, setLeads] = useState<LeadCardData[]>([]);
  const [tierPrices, setTierPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadCardData | null>(null);
  const [stats, setStats] = useState({ totalSold: 0, totalRevenue: 0, totalListed: 0 });

  const fetchData = useCallback(async () => {
  setLoading(true);
  try {
  const [leadsRes, tiersRes, purchasesRes] = await Promise.all([
  fetch("/api/marketplace/superadmin/leads?status=available"),
  fetch("/api/marketplace/superadmin/tiers"),
  fetch("/api/marketplace/workspace/purchased"),
  ]);

  if (leadsRes.ok) {
  const l = await leadsRes.json();
  setLeads(l.leads || []);
  }

  if (tiersRes.ok) {
  const t = await tiersRes.json();
  const prices: Record<string, number> = {};
  (t.tiers || []).forEach((tier: { tier: string; price_cents: number }) => {
  prices[tier.tier] = tier.price_cents;
  });
  setTierPrices(prices);
  }

  if (purchasesRes.ok) {
  const p = await purchasesRes.json();
  const purchases = p.purchases || [];
  const revraPurchases = purchases.filter((p: { lead_source: string }) => p.lead_source === "revra");
  setStats({
  totalListed: leads.length,
  totalSold: revraPurchases.length,
  totalRevenue: revraPurchases.reduce((s: number, p: { price_cents: number }) => s + p.price_cents, 0),
  });
  }
  } catch (err) {
  console.error(err);
  } finally {
  setLoading(false);
  }
  }, [leads.length]);

  useEffect(() => {
  fetchData();
  }, [fetchData]);

  const uploadLead = async (leadData: Record<string, unknown>) => {
  const res = await fetch("/api/marketplace/superadmin/leads", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(leadData),
  });
  if (res.ok) fetchData();
  else alert("Upload failed");
  };

  const updateLead = async (id: string, update: Record<string, unknown>) => {
  const res = await fetch(`/api/marketplace/superadmin/leads/${id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(update),
  });
  if (res.ok) fetchData();
  else alert("Update failed");
  };

  const deleteLead = async (id: string) => {
  if (!confirm("Delete this lead from RevRa pool?")) return;
  const res = await fetch(`/api/marketplace/superadmin/leads/${id}`, { method: "DELETE" });
  if (res.ok) fetchData();
  };

  const updateTier = async (tier: string, priceCents: number) => {
  const res = await fetch("/api/marketplace/superadmin/tiers", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ tier, price_cents: priceCents }),
  });
  if (res.ok) {
  setTierPrices({ ...tierPrices, [tier]: priceCents });
  } else {
  alert("Failed to update tier price");
  }
  };

  const listedLeads = leads.filter((l) => l.status === "available");
  const soldLeads = leads.filter((l) => l.status === "sold");

  return (
  <Shell role="superadmin">
  <div className="p-6 space-y-6">
  <div className="flex items-center justify-between">
  <div>
  <h1 className="text-xl font-semibold">RevRa Marketplace</h1>
  <p className="text-sm text-[var(--ink-mute)]">Manage platform lead pool</p>
  </div>
  <button className="btn btn-primary flex items-center gap-2" onClick={() => setShowUpload(true)}>
  <Plus size={16} />
  Upload Lead
  </button>
  </div>

  {/* Stats */}
  <div className="grid grid-cols-3 gap-4">
  <StatCard icon={<Package size={16} />} label="Listed" value={String(listedLeads.length)} />
  <StatCard icon={<ShoppingBag size={16} />} label="Sold" value={String(stats.totalSold)} />
  <StatCard icon={<DollarSign size={16} />} label="Revenue" value={`$${(stats.totalRevenue / 100).toFixed(2)}`} />
  </div>

  {/* Tabs */}
  <div className="flex items-center gap-1 border-b border-[var(--border)]">
  <TabButton active={tab === "listed"} onClick={() => setTab("listed")} label="Listed Leads" />
  <TabButton active={tab === "sold"} onClick={() => setTab("sold")} label="Sold Leads" />
  <TabButton active={tab === "tiers"} onClick={() => setTab("tiers")} label="Tier Prices" />
  </div>

  {/* Content */}
  {loading ? (
  <div className="flex justify-center py-20">
  <div className="animate-spin w-8 h-8 border-2 border-[var(--mint)] border-t-transparent rounded-full" />
  </div>
  ) : tab === "listed" ? (
  listedLeads.length === 0 ? (
  <div className="text-center py-20 text-[var(--ink-mute)]">
  <Package size={32} className="mx-auto mb-3 opacity-40" />
  <p className="font-medium">No RevRa leads listed</p>
  <p className="text-sm mt-1">Upload leads to start selling</p>
  </div>
  ) : (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {listedLeads.map((lead) => (
  <div key={lead.id} className="relative group">
  <LeadCard lead={{ ...lead, isRevra: true, price_cents: tierPrices[lead.tier] || 0 }} onBuy={undefined} showBuy={false} />
  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
  <button
  className="btn-icon p-1.5"
  style={{ background: "var(--surface-2)" }}
  onClick={() => setEditingLead(lead)}
  >
  <Edit2 size={12} />
  </button>
  <button
  className="btn-icon p-1.5"
  style={{ background: "var(--surface-2)" }}
  onClick={() => deleteLead(lead.id)}
  >
  <Trash2 size={12} className="text-red-400" />
  </button>
  </div>
  </div>
  ))}
  </div>
  )
  ) : tab === "sold" ? (
  soldLeads.length === 0 ? (
  <div className="text-center py-20 text-[var(--ink-mute)]">
  <ShoppingBag size={32} className="mx-auto mb-3 opacity-40" />
  <p className="font-medium">No sales yet</p>
  </div>
  ) : (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {soldLeads.map((lead) => (
  <LeadCard key={lead.id} lead={{ ...lead, isRevra: true, price_cents: tierPrices[lead.tier] || 0 }} onBuy={undefined} showBuy={false} />
  ))}
  </div>
  )
  ) : (
  <TierEditor prices={tierPrices} onUpdate={updateTier} />
  )}
  </div>

  {showUpload && <UploadModal onClose={() => setShowUpload(false)} onSubmit={uploadLead} isWorkspace={false} />}
  {editingLead && (
  <UploadModal
  onClose={() => setEditingLead(null)}
  onSubmit={(data) => {
  updateLead(editingLead.id, data);
  setEditingLead(null);
  }}
  isWorkspace={false}
  editingLead={editingLead}
  />
  )}
  </Shell>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
  <div
  className="p-4 space-y-2"
  style={{
  borderRadius: "var(--radius-xl)",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  }}
  >
  <div className="flex items-center gap-2 text-[var(--ink-mute)]">
  {icon}
  <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
  </div>
  <p className="text-2xl font-bold text-[var(--ink)]">{value}</p>
  </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
  <button
  onClick={onClick}
  className="px-4 py-2 text-sm font-medium transition-colors"
  style={{
  color: active ? "var(--ink)" : "var(--ink-mute)",
  borderBottom: active ? "2px solid var(--mint)" : "2px solid transparent",
  }}
  >
  {label}
  </button>
  );
}

function TierEditor({
  prices,
  onUpdate,
}: {
  prices: Record<string, number>;
  onUpdate: (tier: string, priceCents: number) => void;
}) {
  const [localPrices, setLocalPrices] = useState(prices);

  useEffect(() => {
  setLocalPrices(prices);
  }, [prices]);

  const tiers = [
  { key: "premium", label: "Premium", defaultDesc: "$50.00" },
  { key: "normal", label: "Normal", defaultDesc: "$25.00" },
  { key: "aged", label: "Aged", defaultDesc: "$15.00" },
  ];

  return (
  <div className="space-y-4">
  <p className="text-sm text-[var(--ink-mute)]">Set platform-wide tier prices for RevRa leads.</p>
  {tiers.map((t) => (
  <div
  key={t.key}
  className="p-4 flex items-center justify-between"
  style={{
  borderRadius: "var(--radius-xl)",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  }}
  >
  <div>
  <p className="font-medium capitalize">{t.label}</p>
  <p className="text-xs text-[var(--ink-mute)]">Default: {t.defaultDesc}</p>
  </div>
  <div className="flex items-center gap-3">
  <div className="flex items-center gap-1">
  <span className="text-[var(--ink-mute)]">$</span>
  <input
  className="input"
  style={{ width: 80 }}
  type="number"
  value={localPrices[t.key] !== undefined ? Math.round((localPrices[t.key] || 0) / 100) : ""}
  onChange={(e) =>
  setLocalPrices({
  ...localPrices,
  [t.key]: parseInt(e.target.value || "0") * 100,
  })
  }
  />
  </div>
  <button className="btn btn-primary" onClick={() => onUpdate(t.key, localPrices[t.key] || 0)}>
  Save
  </button>
  </div>
  </div>
  ))}
  </div>
  );
}
