"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SlideOver } from "@/components/ui/slide-over";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/context/theme-provider";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Server,
  Zap,
  RefreshCw,
  ChevronRight,
} from "lucide-react";

interface Service {
  name: string;
  status: string;
  uptime: string;
  latency: string;
  region: string;
}

interface Alert {
  id: string;
  service: string;
  type: string;
  message: string;
  time: string;
}

interface HourStat {
  hour: string;
  requests: number;
  errors: number;
  latency: number;
}

interface HealthData {
  services: Service[];
  recentAlerts: Alert[];
  hourStats: HourStat[];
}

const statusConfig = {
  healthy: { label: "Healthy", variant: "success" as const, icon: CheckCircle2, colorVar: "success" },
  degraded: { label: "Degraded", variant: "warning" as const, icon: AlertCircle, colorVar: "warning" },
  down: { label: "Down", variant: "danger" as const, icon: XCircle, colorVar: "danger" },
};

const alertDotColors: Record<string, string> = {
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  info: "hsl(var(--info))",
};

export default function HealthPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HealthData | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const { addToast } = useToast();

  const fetchHealth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/superadmin/health");
      if (!res.ok) throw new Error("Failed to fetch health data");
      const json: HealthData = await res.json();
      setData(json);
    } catch (err) {
      addToast({ type: "error", title: "Error", description: "Failed to load health data" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHealth();
    setRefreshing(false);
    addToast({ type: "success", title: "Health Data Refreshed", description: "All service statuses are current" });
  };

  const services = data?.services || [];
  const recentAlerts = data?.recentAlerts || [];
  const hourStats = data?.hourStats || [];

  const healthyCount = services.filter((s) => s.status === "healthy").length;
  const degradedCount = services.filter((s) => s.status === "degraded").length;

  // Calculate avg latency from hourStats
  const avgLatency = hourStats.length > 0
    ? Math.round(hourStats.reduce((s, h) => s + h.latency, 0) / hourStats.length)
    : 48;

  // Calculate avg uptime
  const avgUptime = services.length > 0
    ? services.reduce((s, svc) => {
        const uptime = parseFloat(svc.uptime.replace("%", ""));
        return s + uptime;
      }, 0) / services.length
    : 99.94;

  if (loading) {
    return (
      <Shell role="superadmin">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>System Health</h1>
              <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Real-time infrastructure monitoring</p>
            </div>
          </div>
          <Card>
            <CardContent className="p-12 flex items-center justify-center">
              <div style={{ textAlign: "center" }}>
                <div className="animate-spin" style={{ width: 32, height: 32, border: "3px solid hsl(var(--border))", borderTopColor: "hsl(var(--primary))", borderRadius: "50%", margin: "0 auto 16px" }} />
                <p style={{ color: "hsl(var(--muted-foreground))" }}>Loading health data...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Shell>
    );
  }

  return (
    <Shell role="superadmin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>System Health</h1>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Real-time infrastructure monitoring</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={degradedCount > 0 ? "warning" : "success"}>
              <Activity size={12} className="mr-1" />
              {healthyCount}/{services.length} Services Healthy
            </Badge>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw size={14} className={`mr-1 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: "hsl(var(--success)_/_0.15)" }}><CheckCircle2 size={20} style={{ color: "hsl(var(--success))" }} /></div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>{healthyCount}/{services.length}</p>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Services Healthy</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: "hsl(var(--info)_/_0.15)" }}><Server size={20} style={{ color: "hsl(var(--info))" }} /></div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>{avgUptime.toFixed(2)}%</p>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Avg Uptime</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: "hsl(var(--primary)_/_0.15)" }}><Zap size={20} style={{ color: "hsl(var(--primary))" }} /></div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>{avgLatency}ms</p>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Avg Latency</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: "hsl(var(--warning)_/_0.15)" }}><AlertCircle size={20} style={{ color: "hsl(var(--warning))" }} /></div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>{degradedCount}</p>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Active Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Services</CardTitle>
              <Button variant="ghost" size="sm">View All Logs <ChevronRight size={14} className="ml-1" /></Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {services.length === 0 ? (
                  <p className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>No services found</p>
                ) : (
                  services.map((service, i) => {
                    const status = statusConfig[service.status as keyof typeof statusConfig] || statusConfig.degraded;
                    const StatusIcon = status.icon;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors"
                        style={{ backgroundColor: "hsl(var(--surface-container-low))" }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--surface-container-high))")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--surface-container-low))")}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(var(--${status.colorVar}))` }} />
                          <span className="font-medium" style={{ color: "hsl(var(--on-surface))" }}>{service.name}</span>
                          <Badge variant={status.variant} className="text-xs">
                            <StatusIcon size={10} className="mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <p style={{ color: "hsl(var(--muted-foreground))" }}>Uptime</p>
                            <p className="font-medium" style={{ color: "hsl(var(--on-surface))" }}>{service.uptime}</p>
                          </div>
                          <div className="text-right">
                            <p style={{ color: "hsl(var(--muted-foreground))" }}>Latency</p>
                            <p className="font-medium" style={{ color: service.latency && parseInt(service.latency) > 200 ? "hsl(var(--warning))" : "hsl(var(--on-surface))" }}>
                              {service.latency}
                            </p>
                          </div>
                          <div className="text-right">
                            <p style={{ color: "hsl(var(--muted-foreground))" }}>Region</p>
                            <p className="font-medium" style={{ color: "hsl(var(--on-surface))" }}>{service.region}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAlerts.length === 0 ? (
                  <p className="text-center py-8" style={{ color: "hsl(var(--muted-foreground))" }}>No recent alerts</p>
                ) : (
                  recentAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex gap-3 cursor-pointer rounded-lg p-2 -m-2 transition-colors"
                      style={{ backgroundColor: "transparent" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--surface-container-low))")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ backgroundColor: alertDotColors[alert.type] || "hsl(var(--info))" }} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: "hsl(var(--on-surface))" }}>{alert.service}</p>
                        <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))" }}>{alert.message}</p>
                        <p className="text-xs mt-0.5" style={{ color: "hsl(var(--muted-foreground))", opacity: 0.5 }}>{alert.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {hourStats.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Request Volume (Last 24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-32">
                {hourStats.map((stat, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-md transition-all"
                      style={{ height: `${(stat.requests / 5230) * 100}%`, backgroundColor: "hsl(var(--primary))" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--primary-hover))")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--primary))")}
                    />
                    <span className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{stat.hour}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-4 text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
                <span>Peak: {Math.max(...hourStats.map(s => s.requests)).toLocaleString()} req/hr</span>
                <span>Total: {hourStats.reduce((s, h) => s + h.requests, 0).toLocaleString()} req</span>
                <span>Errors: {hourStats.reduce((s, h) => s + h.errors, 0)} ({((hourStats.reduce((s, h) => s + h.errors, 0) / hourStats.reduce((s, h) => s + h.requests, 0)) * 100).toFixed(2)}%)</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Alert Detail SlideOver */}
      <SlideOver
        open={!!selectedAlert}
        onClose={() => setSelectedAlert(null)}
        title={selectedAlert?.service || ""}
        description="Alert details"
        size="sm"
      >
        {selectedAlert && (
          <div className="p-6 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: `hsl(var(--${alertDotColors[selectedAlert.type] === "hsl(var(--success))" ? "success" : alertDotColors[selectedAlert.type] === "hsl(var(--warning))" ? "warning" : "info"})_/_0.15)`, color: `hsl(var(--${alertDotColors[selectedAlert.type] === "hsl(var(--success))" ? "success" : alertDotColors[selectedAlert.type] === "hsl(var(--warning))" ? "warning" : "info"}))` }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: alertDotColors[selectedAlert.type] }} />
              {selectedAlert.type.charAt(0).toUpperCase() + selectedAlert.type.slice(1)}
            </div>
            <p style={{ color: "hsl(var(--on-surface-variant))" }}>{selectedAlert.message}</p>
            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{selectedAlert.time}</p>
            <div className="pt-4" style={{ borderTop: "1px solid hsl(var(--border))" }}>
              <Button variant="outline" className="w-full">View Service Logs</Button>
            </div>
          </div>
        )}
      </SlideOver>
    </Shell>
  );
}
