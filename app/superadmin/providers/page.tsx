"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/theme-provider";
import {
  Layers,
  Plus,
  Wifi,
  WifiOff,
  Edit,
  Trash2,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";

interface Provider {
  id: number;
  name: string;
  type: string;
  provider: string;
  status: string;
  workspaces: number;
  colorVar: string;
  description: string;
  credentials: Record<string, string>;
  usage: { sent: string; received: string; failed: string };
}

interface ProvidersResponse {
  providers: Provider[];
  stats: {
    totalProviders: number;
    activeProviders: number;
    totalSent: number;
    totalReceived: number;
  };
}

const providerTypes = [
  { key: "all", label: "All" },
  { key: "imessage", label: "iMessage" },
  { key: "sms", label: "SMS" },
  { key: "rcs", label: "RCS" },
  { key: "whatsapp", label: "WhatsApp" },
];

export default function ProvidersPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [filter, setFilter] = useState("all");
  const [showToken, setShowToken] = useState<Record<number, Record<string, boolean>>>({});
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProviders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/superadmin/providers");
      if (!res.ok) throw new Error("Failed to fetch providers");
      const json: ProvidersResponse = await res.json();
      setProviders(json.providers || []);
    } catch (err) {
      // Keep existing providers on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const filtered = filter === "all" ? providers : providers.filter((p) => p.type === filter);

  const toggleShow = (providerId: number, key: string) => {
    setShowToken((prev) => ({
      ...prev,
      [providerId]: { ...prev[providerId], [key]: !prev[providerId]?.[key] },
    }));
  };

  return (
    <Shell role="superadmin">
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>Message Providers</h1>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Configure SMS, iMessage, RCS, and WhatsApp providers</p>
          </div>
          <Button>
            <Plus size={16} className="mr-2" />
            Add Provider
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 pb-4" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
          {providerTypes.map((type) => {
            const isActive = filter === type.key;
            return (
              <button
                key={type.key}
                onClick={() => setFilter(type.key)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={isActive
                  ? { backgroundColor: "hsl(var(--primary)_/_0.12)", color: "hsl(var(--primary))" }
                  : { color: "hsl(var(--muted-foreground))" }
                }
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "hsl(var(--surface-container-high)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                {type.label}
              </button>
            );
          })}
        </div>

        {/* Providers List */}
        {loading ? (
          <Card>
            <CardContent className="p-12 flex items-center justify-center">
              <div style={{ textAlign: "center" }}>
                <div className="animate-spin" style={{ width: 32, height: 32, border: "3px solid hsl(var(--border))", borderTopColor: "hsl(var(--primary))", borderRadius: "50%", margin: "0 auto 16px" }} />
                <p style={{ color: "hsl(var(--muted-foreground))" }}>Loading providers...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filtered.length === 0 ? (
              <Card>
                <CardContent className="p-12 flex items-center justify-center">
                  <p style={{ color: "hsl(var(--muted-foreground))" }}>No providers found</p>
                </CardContent>
              </Card>
            ) : (
              filtered.map((provider) => (
                <Card key={provider.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: `hsl(var(--${provider.colorVar}))` }}>
                          {provider.type[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <CardTitle>{provider.name}</CardTitle>
                            <Badge variant={provider.status === "active" ? "success" : "danger"}>
                              {provider.status === "active" ? (
                                <Wifi size={10} className="mr-1" />
                              ) : (
                                <WifiOff size={10} className="mr-1" />
                              )}
                              {provider.status}
                            </Badge>
                          </div>
                          <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>{provider.provider} · Used by {provider.workspaces} workspaces</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit size={14} className="mr-1" />
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-6" style={{ color: "hsl(var(--muted-foreground))" }}>{provider.description}</p>

                    {/* Credentials */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>Credentials</h4>
                        <div className="space-y-2">
                          {Object.entries(provider.credentials).map(([key, value]) => {
                            const isHidden = !showToken[provider.id]?.[key];
                            return (
                              <div key={key} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--surface-container-low))" }}>
                                <div>
                                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{key}</p>
                                  <p className="text-sm font-mono" style={{ color: "hsl(var(--on-surface))" }}>{isHidden ? "••••••••••••••••" : value}</p>
                                </div>
                                <button
                                  onClick={() => toggleShow(provider.id, key)}
                                  className="p-1.5 rounded-md transition-colors"
                                  style={{ color: "hsl(var(--muted-foreground))" }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--surface-container-high))")}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                                >
                                  {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Usage Stats */}
                      <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "hsl(var(--muted-foreground))" }}>Usage (This Month)</h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "hsl(var(--success)_/_0.1)" }}>
                            <p className="text-2xl font-bold" style={{ color: "hsl(var(--success))" }}>{provider.usage.sent}</p>
                            <p className="text-xs mt-1" style={{ color: "hsl(var(--success))", opacity: 0.8 }}>Sent</p>
                          </div>
                          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "hsl(var(--info)_/_0.1)" }}>
                            <p className="text-2xl font-bold" style={{ color: "hsl(var(--info))" }}>{provider.usage.received}</p>
                            <p className="text-xs mt-1" style={{ color: "hsl(var(--info))", opacity: 0.8 }}>Received</p>
                          </div>
                          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: "hsl(var(--surface-container-high))" }}>
                            <p className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface-variant))" }}>{provider.usage.failed}</p>
                            <p className="text-xs mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Failed</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4" style={{ borderTop: "1px solid hsl(var(--border))" }}>
                      <Button variant="outline" size="sm">
                        <Copy size={14} className="mr-1" />
                        Copy Config
                      </Button>
                      <Button variant="outline" size="sm">
                        View Logs
                      </Button>
                      <Button variant="outline" size="sm">
                        Test Connection
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
