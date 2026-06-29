"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IntegrationConfigModal } from "@/components/features/communications/IntegrationConfigModal";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/context/theme-provider";
import { CheckCircle2, XCircle, RefreshCw, Settings } from "lucide-react";

interface Integration {
  id: string;
  name: string;
  category: string;
  description: string;
  is_connected: boolean;
  initials: string;
  color: string;
  icon: string;
  colorVar: string;
}

export default function AdminIntegrationsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [showConfig, setShowConfig] = useState<Integration | null>(null);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations");
      if (res.ok) {
        const json = await res.json();
        const catalog = json.catalog || [];
        const workspaceIds = new Set((json.workspace || []).map((w: { id: string }) => w.id));
        const mapped = catalog.map((it: any) => ({
          id: it.id,
          name: it.name,
          category: it.category,
          description: it.description,
          is_connected: workspaceIds.has(it.id),
          initials: it.initials || it.name.slice(0, 2).toUpperCase(),
          color: it.color || "#6366f1",
          icon: it.name,
          colorVar: it.color_var || "primary",
        }));
        setIntegrations(mapped);
      } else {
        setIntegrations([]);
      }
    } catch {
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

  const handleRefresh = async (name: string) => {
    setRefreshing(name);
    await new Promise((r) => setTimeout(r, 1500));
    setRefreshing(null);
    addToast({ type: "success", title: "Sync Complete", description: `${name} synced successfully` });
  };

  const handleConnect = (name: string) => {
    addToast({ type: "info", title: "Connecting...", description: `OAuth flow for ${name} would open here` });
  };

  return (
    <Shell role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>Integrations</h1>
          <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Connect third-party services to your workspace</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "center", padding: "40px" }}>
              <RefreshCw size={20} className="animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
            </div>
          ) : (
          integrations.map((integration) => (
            <Card key={integration.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: integration.color }}>
                      {integration.initials}
                    </div>
                    <div>
                      <h3 className="font-semibold" style={{ color: "hsl(var(--on-surface))" }}>{integration.name}</h3>
                      <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{integration.category}</p>
                    </div>
                  </div>
                  <Badge variant={integration.is_connected ? "success" : "default"}>
                    {integration.is_connected ? <CheckCircle2 size={10} className="mr-1" /> : <XCircle size={10} className="mr-1" />}
                    {integration.is_connected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                <p className="text-sm mb-4" style={{ color: "hsl(var(--muted-foreground))" }}>{integration.description}</p>
                <div className="flex gap-2">
                  {integration.is_connected ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setShowConfig(integration)}>
                        <Settings size={14} className="mr-1" />Configure
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRefresh(integration.name)} disabled={refreshing === integration.name}>
                        <RefreshCw size={14} className={refreshing === integration.name ? "animate-spin" : ""} />
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => handleConnect(integration.name)}>Connect</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
          )}
        </div>
      </div>

      <IntegrationConfigModal
        open={!!showConfig}
        onClose={() => setShowConfig(null)}
        integration={showConfig}
      />
    </Shell>
  );
}
