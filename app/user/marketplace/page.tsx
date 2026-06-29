"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import { LeadCard, LeadCardData } from "@/components/features/marketplace/LeadCard";
import {
  ShoppingCart,
  Search,
  X,
  SlidersHorizontal,
  Star,
  Target,
  Package,
  DollarSign,
} from "lucide-react";

interface Purchase {
  id: string;
  price_cents: number;
  purchased_at: string;
}

type Tab = "revra" | "workspace";

export default function UserMarketplace() {
  const [tab, setTab] = useState<Tab>("revra");
  const [revraLeads, setRevraLeads] = useState<LeadCardData[]>([]);
  const [workspaceLeads, setWorkspaceLeads] = useState<LeadCardData[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [buyingLead, setBuyingLead] = useState<LeadCardData | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const fetchData = useCallback(async () => {
  setLoading(true);
  try {
  const [revraRes, wsRes, purchasedRes] = await Promise.all([
  fetch("/api/marketplace/superadmin/leads?status=available"),
  fetch("/api/marketplace/admin/leads"),
  fetch("/api/marketplace/workspace/purchased"),
  ]);

  const revra = revraRes.ok ? await revraRes.json() : { leads: [] };
  const ws = wsRes.ok ? await wsRes.json() : { leads: [] };
  const purch = purchasedRes.ok ? await purchasedRes.json() : { purchases: [] };

  // Map workspace leads to only available ones
  const availableWs = (ws.leads || []).filter((l: LeadCardData) => l.status === "available");

  setRevraLeads(
  (revra.leads || []).map((l: LeadCardData) => ({ ...l, isRevra: true }))
  );
  setWorkspaceLeads(availableWs);
  setPurchases(purch.purchases || []);
  } catch (err) {
  console.error(err);
  } finally {
  setLoading(false);
  }
  }, []);

  useEffect(() => {
  fetchData();
  }, [fetchData]);

  const handleBuy = async (lead: LeadCardData) => {
  setCheckoutLoading(true);
  try {
  const res = await fetch("/api/marketplace/checkout", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
  leadId: lead.id,
  leadSource: lead.isRevra ? "revra" : "workspace",
  }),
  });
  const data = await res.json();
  if (data.url) {
  window.location.href = data.url;
  } else {
  alert(data.error || "Checkout failed");
  }
  } catch {
  alert("Checkout error");
  } finally {
  setCheckoutLoading(false);
  }
  };

  const leads = tab === "revra" ? revraLeads : workspaceLeads;
  const filtered = leads.filter((l) => {
  const q = search.toLowerCase();
  const matchesSearch =
  !q ||
  l.first_name.toLowerCase().includes(q) ||
  l.last_name.toLowerCase().includes(q) ||
  l.phone.includes(q) ||
  (l.email && l.email.toLowerCase().includes(q));
  const matchesTier = tierFilter === "all" || l.tier === tierFilter;
  return matchesSearch && matchesTier;
  });

  const totalPurchased = purchases.length;
  const totalSpent = purchases.reduce((s, p) => s + p.price_cents, 0);

  const tierOptions = [
  { value: "all", label: "All Tiers" },
  { value: "premium", label: "Premium" },
  { value: "normal", label: "Normal" },
  { value: "aged", label: "Aged" },
  ];

  return (
  <Shell role="user">
  <div className="p-6 space-y-6">
  {/* Header */}
  <div className="flex items-center justify-between">
  <div>
  <h1 className="text-xl font-semibold">Lead Marketplace</h1>
  <p className="text-sm text-[var(--ink-mute)]">
  Browse and purchase high-quality leads from RevRa and your workspace
  </p>
  </div>
  <div className="flex items-center gap-3">
  <a
  href="/user/marketplace/purchased"
  className="btn btn-secondary flex items-center gap-2"
  >
  <Package size={14} />
  My Purchases ({totalPurchased})
  </a>
  </div>
  </div>

  {/* Stats */}
  <div className="grid grid-cols-3 gap-4">
  <StatCard icon={<ShoppingCart size={16} />} label="Available RevRa" value={String(revraLeads.length)} />
  <StatCard icon={<Target size={16} />} label="Available Workspace" value={String(workspaceLeads.length)} />
  <StatCard icon={<DollarSign size={16} />} label="Total Spent" value={`$${(totalSpent / 100).toFixed(2)}`} />
  </div>

  {/* Tabs */}
  <div className="flex items-center gap-1 border-b border-[var(--border)]">
  <TabButton active={tab === "revra"} onClick={() => setTab("revra")} label="RevRa Pool" />
  <TabButton active={tab === "workspace"} onClick={() => setTab("workspace")} label="My Workspace" />
  </div>

  {/* Filters */}
  <div className="flex items-center gap-3">
  <div className="search-bar flex-1">
  <Search size={14} className="text-[var(--ink-mute)]" />
  <input
  placeholder="Search by name, phone, email..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  />
  {search && (
  <button onClick={() => setSearch("")} className="btn-icon">
  <X size={14} />
  </button>
  )}
  </div>
  <div className="flex items-center gap-2">
  <SlidersHorizontal size={14} className="text-[var(--ink-mute)]" />
  <select
  value={tierFilter}
  onChange={(e) => setTierFilter(e.target.value)}
  className="input"
  style={{ width: 140 }}
  >
  {tierOptions.map((o) => (
  <option key={o.value} value={o.value}>
  {o.label}
  </option>
  ))}
  </select>
  </div>
  </div>

  {/* Grid */}
  {loading ? (
  <div className="flex justify-center py-20">
  <div className="animate-spin w-8 h-8 border-2 border-[var(--mint)] border-t-transparent rounded-full" />
  </div>
  ) : filtered.length === 0 ? (
  <div className="text-center py-20 text-[var(--ink-mute)]">
  <Star size={32} className="mx-auto mb-3 opacity-40" />
  <p className="font-medium">No leads available</p>
  <p className="text-sm mt-1">
  {tab === "revra"
  ? "Check back later for new RevRa leads"
  : "Your workspace admin hasn't listed any leads yet"}
  </p>
  </div>
  ) : (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {filtered.map((lead) => (
  <LeadCard key={lead.id} lead={lead} onBuy={() => setBuyingLead(lead)} />
  ))}
  </div>
  )}
  </div>

  {/* Buy Modal */}
  {buyingLead && (
  <div
  className="fixed inset-0 z-50 flex items-center justify-center"
  style={{ background: "rgba(5,7,15,0.62)", backdropFilter: "blur(6px)" }}
  onClick={() => setBuyingLead(null)}
  >
  <div
  className="p-6 space-y-4"
  style={{
  maxWidth: 420,
  width: "90%",
  borderRadius: "var(--radius-2xl)",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  }}
  onClick={(e) => e.stopPropagation()}
  >
  <h3 className="text-lg font-semibold">Confirm Purchase</h3>
  <LeadCard lead={buyingLead} onBuy={undefined} showBuy={false} />
  <p className="text-sm text-[var(--ink-mute)]">
  This lead will be added to your workspace pipeline after successful payment.
  </p>
  <div className="flex items-center gap-3">
  <button
  className="btn btn-secondary flex-1"
  onClick={() => setBuyingLead(null)}
  >
  Cancel
  </button>
  <button
  className="btn btn-primary flex-1"
  onClick={() => handleBuy(buyingLead)}
  disabled={checkoutLoading}
  >
  {checkoutLoading ? "Processing..." : `Pay $${(buyingLead.price_cents! / 100).toFixed(2)}`}
  </button>
  </div>
  </div>
  </div>
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

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
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
