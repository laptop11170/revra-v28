"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import {
  Plus,
  Plug,
  Check,
  ExternalLink,
  RefreshCw,
  Zap,
  X,
  Loader2,
  Store,
  MessageSquare,
} from "lucide-react";

const categories = ["All", "Connected", "CRM", "Email", "Calendar", "Comms", "Data"];

type Integration = {
  id: string;
  name: string;
  category: string;
  description: string;
  is_connected: boolean;
  initials: string;
  color: string;
};

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showMarketplaceModal, setShowMarketplaceModal] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requestDesc, setRequestDesc] = useState("");
  const [requestEmail, setRequestEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();

      // Merge workspace connected integrations with catalog
      const workspaceIds = new Set(data.workspace.map((w: { id: string }) => w.id));
      const merged: Integration[] = data.catalog.map((cat: {
        id: string;
        name: string;
        category: string;
        description: string;
        initials: string;
        color: string;
      }) => ({
        ...cat,
        is_connected: workspaceIds.has(cat.id),
      }));

      setIntegrations(merged);
    } catch {
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleConnect = (integration: Integration) => {
    if (integration.is_connected) {
      // Open manage URL if available, otherwise show config prompt
      alert(`Manage ${integration.name}: Configuration panel coming soon.`);
    } else {
      // For now, simulate connecting by calling the API
      alert(`Connect ${integration.name}: OAuth flow coming soon.\n\nFor now, integrations are managed by your admin.`);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestName.trim() || !requestEmail.trim()) return;
    setSubmitting(true);
    // Simulate API call — in production this would POST to /api/integration-requests
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setSubmitSuccess(true);
    setTimeout(() => {
      setShowRequestModal(false);
      setRequestName("");
      setRequestDesc("");
      setRequestEmail("");
      setSubmitSuccess(false);
    }, 1500);
  };

  const catalogIntegrations = integrations.filter((it) => !it.is_connected);
  const connectedCount = integrations.filter((it) => it.is_connected).length;

  return (
    <Shell role="user">
      {/* Request Integration Modal */}
      {showRequestModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(5,7,15,0.62)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 110 }}
          onClick={() => setShowRequestModal(false)}
        >
          <div
            style={{ width: "100%", maxWidth: 480, borderRadius: "var(--radius-2xl)", background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7)", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid rgba(37,43,63,0.5)" }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>Request Integration</h3>
              <button className="btn-icon p-2" onClick={() => setShowRequestModal(false)}><X size={16} /></button>
            </div>
            {submitSuccess ? (
              <div style={{ padding: "40px 24px", textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: 999, background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Check size={24} style={{ color: "var(--mint)" }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>Request submitted!</div>
                <div style={{ fontSize: 13, color: "var(--ink-mute)", marginTop: 6 }}>We'll reach out once it's available.</div>
              </div>
            ) : (
              <form onSubmit={handleSubmitRequest} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink)", marginBottom: 6, display: "block" }}>Integration Name *</label>
                  <input className="input" value={requestName} onChange={(e) => setRequestName(e.target.value)} placeholder="e.g., HubSpot, Salesforce" required />
                </div>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink)", marginBottom: 6, display: "block" }}>Email *</label>
                  <input className="input" type="email" value={requestEmail} onChange={(e) => setRequestEmail(e.target.value)} placeholder="you@company.com" required />
                </div>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink)", marginBottom: 6, display: "block" }}>Use Case</label>
                  <textarea className="input" value={requestDesc} onChange={(e) => setRequestDesc(e.target.value)} placeholder="Tell us how you'd use this integration..." style={{ minHeight: 72, resize: "vertical" }} />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
                  <button type="button" className="btn-ghost" style={{ padding: "8px 16px", fontSize: 13 }} onClick={() => setShowRequestModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" style={{ padding: "8px 16px", fontSize: 13 }} disabled={submitting}>
                    {submitting ? <Loader2 size={13} className="animate-spin" /> : null}
                    Submit Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Marketplace Modal */}
      {showMarketplaceModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(5,7,15,0.62)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80 }}
          onClick={() => setShowMarketplaceModal(false)}
        >
          <div
            style={{ width: "100%", maxWidth: 720, borderRadius: "var(--radius-2xl)", background: "var(--surface)", border: "1px solid var(--line)", boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7)", overflow: "hidden", maxHeight: "80vh", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid rgba(37,43,63,0.5)" }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: "var(--ink)" }}>Integration Marketplace</h3>
                <p style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 2 }}>Expand Revra's capabilities with third-party integrations</p>
              </div>
              <button className="btn-icon p-2" onClick={() => setShowMarketplaceModal(false)}><X size={16} /></button>
            </div>
            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
              {catalogIntegrations.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-mute)", fontSize: 13 }}>All available integrations are already connected.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {catalogIntegrations.map((it) => (
                    <div key={it.id} className="integ-card">
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "var(--radius-md)", background: it.color, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, color: "white", flexShrink: 0 }}>
                          {it.initials}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{it.name}</div>
                          <div style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>{it.category}</div>
                        </div>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--ink-faint)", margin: "8px 0" }}>{it.description}</p>
                      <button className="btn-ghost" style={{ width: "100%", padding: "6px", fontSize: 12 }} onClick={() => handleConnect(it)}>
                        Connect
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "32px 40px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.005em" }}>
              Integrations
            </h1>
            <p style={{ fontSize: 13, color: "var(--ink-mute)", marginTop: 4 }}>
              Connect Revra to your existing stack · {connectedCount} connected
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setShowMarketplaceModal(true)}>
              <Store size={13} style={{ marginRight: 5 }} />
              Browse marketplace
            </button>
            <button className="btn-primary" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setShowRequestModal(true)}>
              <Plus size={13} style={{ marginRight: 6 }} />
              Request integration
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="filters-bar" style={{ marginBottom: 24 }}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat.toLowerCase())}
              className={`filter-btn ${activeTab === cat.toLowerCase() ? "active" : ""}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "80px 0" }}>
            <div style={{
              width: 32,
              height: 32,
              border: "3px solid var(--line-3)",
              borderTopColor: "var(--ink)",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }} />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {integrations
              .filter((it) => {
                if (activeTab === "all") return true;
                if (activeTab === "connected") return it.is_connected;
                return it.category.toLowerCase() === activeTab;
              })
              .map((it) => (
                <div key={it.id} className="integ-card">
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "var(--radius-lg)",
                        background: it.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 13,
                        color: "white",
                        flexShrink: 0,
                      }}
                    >
                      {it.initials}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{it.name}</h4>
                      <p style={{ fontSize: 12, color: "var(--ink-mute)", lineHeight: 1.45 }}>{it.description}</p>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: 12,
                      borderTop: "1px solid var(--line-3)",
                      marginTop: 8,
                    }}
                  >
                    {it.is_connected ? (
                      <span
                        className="badge"
                        style={{
                          background: "rgba(16,185,129,0.15)",
                          color: "var(--mint)",
                          padding: "4px 10px",
                          borderRadius: "var(--radius-md)",
                          fontSize: 11,
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <span className="pulse-dot" style={{ width: 5, height: 5, borderRadius: 999, background: "var(--mint)", display: "inline-block" }} />
                        Connected
                      </span>
                    ) : (
                      <span style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>Not connected</span>
                    )}
                    <button
                      className="btn-ghost"
                      style={{ padding: "6px 12px", fontSize: 12 }}
                      onClick={() => handleConnect(it)}
                    >
                      {it.is_connected ? "Manage" : "Connect"}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </Shell>
  );
}