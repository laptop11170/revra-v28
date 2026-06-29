"use client";

import { useState, useEffect } from "react";
import { Shell } from "@/components/layouts/Shell";
import { ArrowLeft, Calendar, DollarSign, Tag, Star, Building2 } from "lucide-react";

interface Purchase {
  id: string;
  lead_source: "revra" | "workspace";
  price_cents: number;
  purchased_at: string;
  stripe_payment_intent: string;
  marketplace_leads?: {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  tier: string;
  } | null;
  marketplace_workspace_leads?: {
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  tier: string;
  } | null;
}

export default function PurchasedLeads() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  fetch("/api/marketplace/workspace/purchased")
  .then((r) => r.json())
  .then((data) => {
  setPurchases(data.purchases || []);
  setLoading(false);
  })
  .catch(() => setLoading(false));
  }, []);

  const totalSpent = purchases.reduce((s, p) => s + p.price_cents, 0);

  return (
  <Shell role="user">
  <div className="p-6 space-y-6">
  <div className="flex items-center gap-3">
  <a href="/user/marketplace" className="btn btn-icon">
  <ArrowLeft size={16} />
  </a>
  <div>
  <h1 className="text-xl font-semibold">My Purchased Leads</h1>
  <p className="text-sm text-[var(--ink-mute)]">
  Total spent: <span className="font-semibold text-[var(--mint)]">${(totalSpent / 100).toFixed(2)}</span>
  </p>
  </div>
  </div>

  {loading ? (
  <div className="flex justify-center py-20">
  <div className="animate-spin w-8 h-8 border-2 border-[var(--mint)] border-t-transparent rounded-full" />
  </div>
  ) : purchases.length === 0 ? (
  <div className="text-center py-20 text-[var(--ink-mute)]">
  <Star size={32} className="mx-auto mb-3 opacity-40" />
  <p className="font-medium">No purchases yet</p>
  <p className="text-sm mt-1">Browse the marketplace to buy your first lead</p>
  </div>
  ) : (
  <div className="space-y-3">
  {purchases.map((p) => {
  const lead = p.lead_source === "revra" ? p.marketplace_leads : p.marketplace_workspace_leads;
  if (!lead) return null;
  return (
  <div
  key={p.id}
  className="p-4 flex items-center justify-between"
  style={{
  borderRadius: "var(--radius-xl)",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  }}
  >
  <div className="flex items-center gap-4">
  <div
  style={{
  width: 40,
  height: 40,
  borderRadius: 999,
  background: "var(--surface-3)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 13,
  fontWeight: 700,
  color: "var(--ink)",
  }}
  >
  {lead.first_name[0]}{lead.last_name[0]}
  </div>
  <div>
  <p className="font-medium">
  {lead.first_name} {lead.last_name}
  </p>
  <div className="flex items-center gap-3 text-xs text-[var(--ink-mute)] mt-1">
  <span className="flex items-center gap-1">
  <Tag size={10} /> {lead.tier}
  </span>
  <span className="flex items-center gap-1">
  <Building2 size={10} /> {p.lead_source === "revra" ? "RevRa" : "Workspace"}
  </span>
  <span className="flex items-center gap-1">
  <Calendar size={10} /> {new Date(p.purchased_at).toLocaleDateString()}
  </span>
  </div>
  </div>
  </div>
  <div className="text-right">
  <p className="font-bold text-[var(--mint)]">${(p.price_cents / 100).toFixed(2)}</p>
  <p className="text-xs text-[var(--ink-mute)]">{lead.phone}</p>
  </div>
  </div>
  );
  })}
  </div>
  )}
  </div>
  </Shell>
  );
}
