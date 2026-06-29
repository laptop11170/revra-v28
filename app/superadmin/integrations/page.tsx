"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IntegrationConfigModal } from "@/components/features/communications/IntegrationConfigModal";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/context/theme-provider";
import {
  Plug,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

interface Integration {
  name: string;
  category: string;
  description: string;
  status: "connected" | "disconnected" | "pending";
  workspaces: number;
  colorVar: string;
  icon: string;
}

interface IntegrationsResponse {
  workspace: Integration[];
  catalog: Integration[];
}

const statusConfig = {
  connected: { label: "Connected", variant: "success" as const, icon: CheckCircle2 },
  disconnected: { label: "Disconnected", variant: "danger" as const, icon: XCircle },
  pending: { label: "Pending", variant: "warning" as const, icon: Clock },
};

export default function IntegrationsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState<Integration | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/integrations");
      if (!res.ok) throw new Error("Failed to fetch integrations");
      const json: IntegrationsResponse = await res.json();
      // Use workspace integrations for platform-wide view
      setIntegrations(json.workspace || []);
    } catch (err) {
      addToast({ type: "error", title: "Error", description: "Failed to load integrations" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const filtered = integrations.filter((i) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleSync = async (name: string) => {
    setSyncing(name);
    await new Promise((r) => setTimeout(r, 2000));
    setSyncing(null);
    addToast({ type: "success", title: "Sync Complete", description: `${name} data synchronized` });
  };

  const handleConnect = (name: string) => {
    addToast({ type: "info", title: "OAuth Flow", description: `Connecting ${name} — OAuth window would open here` });
  };

  return (
    <Shell role="superadmin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>Integrations</h1>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Manage third-party service connections</p>
          </div>
          <Button>
            <Plus size={16} className="mr-2" />Add Integration
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground))" }} />
          <Input placeholder="Search integrations..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-12 flex items-center justify-center">
              <div style={{ textAlign: "center" }}>
                <div className="animate-spin" style={{ width: 32, height: 32, border: "3px solid hsl(var(--border))", borderTopColor: "hsl(var(--primary))", borderRadius: "50%", margin: "0 auto 16px" }} />
                <p style={{ color: "hsl(var(--muted-foreground))" }}>Loading integrations...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.length === 0 ? (
              <Card className="md:col-span-2">
                <CardContent className="p-12 flex items-center justify-center">
                  <p style={{ color: "hsl(var(--muted-foreground))" }}>No integrations found</p>
                </CardContent>
              </Card>
            ) : (
              filtered.map((integration, i) => {
                const status = statusConfig[integration.status];
                const StatusIcon = status.icon;
                return (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{ backgroundColor: `hsl(var(--${integration.colorVar}))` }}>
                          {integration.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold" style={{ color: "hsl(var(--on-surface))" }}>{integration.name}</h3>
                              <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{integration.category}</p>
                            </div>
                            <Badge variant={status.variant}>
                              <StatusIcon size={10} className="mr-1" />
                              {status.label}
                            </Badge>
                          </div>
                          <p className="text-sm mt-2" style={{ color: "hsl(var(--muted-foreground))" }}>{integration.description}</p>
                          <div className="flex items-center justify-between mt-4">
                            <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                              Used by <span className="font-medium" style={{ color: "hsl(var(--on-surface-variant))" }}>{integration.workspaces}</span> workspaces
                            </p>
                            <div className="flex gap-2">
                              {integration.status === "connected" ? (
                                <>
                                  <Button variant="ghost" size="sm" onClick={() => handleSync(integration.name)} disabled={syncing === integration.name}>
                                    <RefreshCw size={14} className={`mr-1 ${syncing === integration.name ? "animate-spin" : ""}`} />
                                    {syncing === integration.name ? "Syncing..." : "Sync"}
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => setShowConfig(integration)}>
                                    <ExternalLink size={14} className="mr-1" />Configure
                                  </Button>
                                </>
                              ) : (
                                <Button size="sm" onClick={() => handleConnect(integration.name)}>Connect</Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>

      <IntegrationConfigModal
        open={!!showConfig}
        onClose={() => setShowConfig(null)}
        integration={showConfig}
      />
    </Shell>
  );
}
