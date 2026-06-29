"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import {
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  Users,
  AlertCircle,
  Link2,
} from "lucide-react";

interface SendilloPhone {
  id: string;
  phone_number: string;
  label: string | null;
  agent_id: string;
  is_active: boolean;
  created_at: string;
  agent?: { id: string; full_name: string | null; email: string };
}

interface PurchasedNumber {
  phoneNumber: string;
  label?: string;
  active: boolean;
}

interface Brand {
  id: number;
  name: string;
}

export default function SuperadminSendilloPage() {
  const [purchasedNumbers, setPurchasedNumbers] = useState<PurchasedNumber[]>([]);
  const [registeredNumbers, setRegisteredNumbers] = useState<SendilloPhone[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"numbers" | "brands">("numbers");
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  // Add form state
  const [addPhone, setAddPhone] = useState("");
  const [addLabel, setAddLabel] = useState("");
  const [addAgentId, setAddAgentId] = useState("");
  const [agents, setAgents] = useState<Array<{ id: string; full_name: string; email: string }>>([]);

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    setLoading(true);
    try {
      const [purchRes, regRes, brandRes] = await Promise.all([
        fetch("/api/sendillo/numbers").then((r) => r.json()).catch(() => ({ numbers: [] })),
        fetch("/api/sendillo/numbers?type=registered").then((r) => r.json()).catch(() => ({ numbers: [] })),
        fetch("/api/sendillo/brands").then((r) => r.json()).catch(() => ({ brands: [] })),
      ]);
      setPurchasedNumbers(purchRes.numbers ?? []);
      setRegisteredNumbers(regRes.numbers ?? []);
      setBrands(brandRes.brands ?? []);
    } finally {
      setLoading(false);
      if (showRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleAddNumber() {
    if (!addPhone.trim() || !addAgentId) {
      setAddError("Phone number and agent are required");
      return;
    }
    setAdding(true);
    setAddError("");
    try {
      const res = await fetch("/api/sendillo/numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: addPhone.trim(), label: addLabel.trim() || null, agent_id: addAgentId }),
      });
      if (res.ok) {
        const data = await res.json();
        setRegisteredNumbers((prev) => [data, ...prev]);
        setShowAddModal(false);
        setAddPhone("");
        setAddLabel("");
        setAddAgentId("");
      } else {
        const err = await res.json();
        setAddError(err.error ?? "Failed to add number");
      }
    } catch {
      setAddError("Network error");
    } finally {
      setAdding(false);
    }
  }

  async function toggleActive(phone: SendilloPhone) {
    await fetch(`/api/sendillo/numbers/${phone.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !phone.is_active }),
    });
    setRegisteredNumbers((prev) => prev.map((p) => p.id === phone.id ? { ...p, is_active: !p.is_active } : p));
  }

  async function deleteNumber(id: string) {
    await fetch(`/api/sendillo/numbers/${id}`, { method: "DELETE" });
    setRegisteredNumbers((prev) => prev.filter((p) => p.id !== id));
  }

  // Fetch agents for the dropdown
  useEffect(() => {
    if (showAddModal) {
      fetch("/api/team").then((r) => r.json()).then((d) => setAgents(d.members ?? [])).catch(() => {});
    }
  }, [showAddModal]);

  return (
    <Shell role="superadmin">
      <div style={{ padding: "32px 40px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.005em" }}>
              Sendillo
            </h1>
            <p style={{ fontSize: 13, color: "var(--ink-mute)", marginTop: 4 }}>
              Manage purchased Sendillo numbers, assign them to agents, and view brands.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="btn-ghost" style={{ padding: "8px 12px", fontSize: 12 }} onClick={() => fetchData(true)} disabled={refreshing}>
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
            <button className="btn-primary" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => setShowAddModal(true)}>
              <Plus size={13} style={{ marginRight: 6 }} />
              Add Number
            </button>
          </div>
        </div>

        {/* Info banner */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: "var(--radius-lg)", background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)", marginBottom: 24 }}>
          <Link2 size={16} style={{ color: "var(--cyan)", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "var(--ink-mute)" }}>
            Set your Sendillo webhook URL to <code style={{ color: "var(--cyan)", background: "rgba(6,182,212,0.1)", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>https://app.letsrevra.com/api/webhooks/sendillo</code> in the Sendillo dashboard to receive delivery receipts and inbound message events.
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
          {(["numbers", "brands"] as const).map((t) => (
            <button key={t} onClick={() => setActiveTab(t)}
              style={{ padding: "6px 16px", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 500, border: "none", cursor: "pointer", background: activeTab === t ? "var(--surface-2)" : "transparent", color: activeTab === t ? "var(--ink)" : "var(--ink-mute)", boxShadow: activeTab === t ? "inset 0 0 0 1px var(--line-2)" : "none", textTransform: "capitalize" }}>
              {t === "numbers" ? `Numbers (${registeredNumbers.length})` : `Brands (${brands.length})`}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
            <Loader2 size={24} style={{ color: "var(--ink-mute)", animation: "spin 1s linear infinite" }} />
          </div>
        )}

        {!loading && activeTab === "numbers" && (
          <>
            {/* Purchased numbers from Sendillo */}
            {purchasedNumbers.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-mute)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Purchased on Sendillo
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {purchasedNumbers.map((n) => (
                    <div key={n.phoneNumber} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: "var(--radius-lg)", background: "rgba(19,24,38,0.5)", border: "1px solid var(--line)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Phone size={16} style={{ color: "var(--cyan)" }} />
                        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{n.phoneNumber}</span>
                        {n.label && <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{n.label}</span>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: n.active ? "var(--mint)" : "var(--ink-mute)", display: "flex", alignItems: "center", gap: 4 }}>
                          {n.active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                          {n.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Registered numbers in RevRa */}
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-mute)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Registered in RevRa
              </h3>
              {registeredNumbers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-mute)", fontSize: 14, border: "1px dashed var(--line)", borderRadius: "var(--radius-xl)" }}>
                  No numbers registered yet. Add a Sendillo number to assign it to an agent.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {registeredNumbers.map((n) => (
                    <div key={n.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderRadius: "var(--radius-lg)", background: "rgba(19,24,38,0.5)", border: "1px solid var(--line)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "rgba(6,182,212,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Phone size={16} style={{ color: "var(--cyan)" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{n.phone_number}</div>
                          <div style={{ fontSize: 12, color: "var(--ink-mute)", display: "flex", alignItems: "center", gap: 4 }}>
                            {n.agent ? (
                              <><Users size={11} /> {n.agent.full_name ?? n.agent.email}</>
                            ) : "—"}
                            {n.label && <> · {n.label}</>}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button className="btn-icon p-2" title={n.is_active ? "Deactivate" : "Activate"} onClick={() => toggleActive(n)}>
                          {n.is_active ? <XCircle size={14} style={{ color: "var(--ink-mute)" }} /> : <CheckCircle2 size={14} style={{ color: "var(--mint)" }} />}
                        </button>
                        <button className="btn-icon p-2" title="Delete" onClick={() => deleteNumber(n.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {!loading && activeTab === "brands" && (
          <div>
            {brands.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-mute)", fontSize: 14, border: "1px dashed var(--line)", borderRadius: "var(--radius-xl)" }}>
                No brands found on Sendillo account.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {brands.map((b) => (
                  <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: "var(--radius-lg)", background: "rgba(19,24,38,0.5)", border: "1px solid var(--line)" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: "rgba(99,102,241,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 600, color: "var(--indi-400)" }}>
                      {b.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{b.name}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>Brand ID: {b.id}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Number Modal */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(5,7,15,0.62)", backdropFilter: "blur(6px)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 110 }}
          onClick={() => setShowAddModal(false)}>
          <div style={{ width: "100%", maxWidth: 480, borderRadius: "var(--radius-2xl)", background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7)", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid rgba(37,43,63,0.5)" }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>Add Sendillo Number</h3>
              <button className="btn-icon p-2" onClick={() => setShowAddModal(false)}><X size={16} /></button>
            </div>
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label className="input-label">Phone Number *</label>
                <input className="input" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} placeholder="+15551234567" />
              </div>
              <div>
                <label className="input-label">Label (optional)</label>
                <input className="input" value={addLabel} onChange={(e) => setAddLabel(e.target.value)} placeholder="e.g., Main SMS Line" />
              </div>
              <div>
                <label className="input-label">Assign to Agent *</label>
                <select className="input" style={{ appearance: "none" }} value={addAgentId} onChange={(e) => setAddAgentId(e.target.value)}>
                  <option value="">Select agent...</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>{a.full_name ?? a.email}</option>
                  ))}
                </select>
              </div>
              {addError && (
                <div style={{ padding: "10px 14px", borderRadius: 8, background: "hsl(var(--destructive)/0.1)", color: "hsl(var(--destructive))", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertCircle size={14} />{addError}
                </div>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "16px 24px", borderTop: "1px solid rgba(37,43,63,0.5)" }}>
              <button className="btn-ghost" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-primary" style={{ padding: "8px 16px", fontSize: 13 }} onClick={handleAddNumber} disabled={adding}>
                {adding ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={13} style={{ marginRight: 6 }} />}
                Add Number
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}