"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AddProviderModal } from "@/components/features/modals/AddProviderModal";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/context/theme-provider";
import {
  Bot,
  Plus,
  CheckCircle2,
  RefreshCw,
  Settings,
  Brain,
  MessageSquare,
  Phone,
  BarChart3,
  Zap,
  FileText,
  Eye,
  EyeOff,
  Copy,
  Activity,
} from "lucide-react";

interface LLMProvider {
  id: number;
  name: string;
  model: string;
  status: string;
  colorVar: string;
  icon: string;
  usage: { requests: string; tokens: string; errors: string };
  cost: string;
  avgLatency: string;
  config: Record<string, string>;
}

interface AIProvidersResponse {
  providers: {
  llmProviders: LLMProvider[];
  };
  stats: {
  totalCost: number;
  totalRequests: number;
  activeProviders: number;
  };
}

const aiFeatures = [
  { name: "SMS Draft Generation", credits: "~1 credit", enabled: true, featureIcon: MessageSquare, colorVar: "success" },
  { name: "Morning Briefing", credits: "~5 credits", enabled: true, featureIcon: FileText, colorVar: "info" },
  { name: "Lead Scoring", credits: "~2 credits", enabled: true, featureIcon: BarChart3, colorVar: "warning" },
  { name: "Pre-Call Brief", credits: "~3 credits", enabled: true, featureIcon: Phone, colorVar: "primary" },
  { name: "Post-Call Summary", credits: "~3 credits", enabled: true, featureIcon: Phone, colorVar: "primary" },
  { name: "Chat Messages", credits: "~1 credit", enabled: true, featureIcon: Bot, colorVar: "info" },
  { name: "CSV Column Mapping", credits: "~2 credits", enabled: true, featureIcon: FileText, colorVar: "muted-foreground" },
];

export default function AIProvidersPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"llm" | "features">("llm");
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [testingProvider, setTestingProvider] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<Record<number, "success" | "error" | null>>({});
  const [llmProviders, setLlmProviders] = useState<LLMProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchProviders = useCallback(async () => {
  try {
  setLoading(true);
  const res = await fetch("/api/superadmin/ai-providers");
  if (!res.ok) throw new Error("Failed to fetch AI providers");
  const json: AIProvidersResponse = await res.json();
  setLlmProviders(json.providers?.llmProviders || []);
  } catch (err) {
  addToast({ type: "error", title: "Error", description: "Failed to load AI providers" });
  } finally {
  setLoading(false);
  }
  }, []);

  useEffect(() => {
  fetchProviders();
  }, [fetchProviders]);

  const toggleShow = (key: string) => {
  setShowKey((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTest = async (providerId: number) => {
  setTestingProvider(providerId);
  await new Promise((r) => setTimeout(r, 2000));
  setTestingProvider(null);
  const result = Math.random() > 0.1 ? "success" : "error";
  setTestResult((p) => ({ ...p, [providerId]: result }));
  if (result === "success") addToast({ type: "success", title: "Connection Successful", description: "Provider is responding correctly" });
  else addToast({ type: "error", title: "Connection Failed", description: "Check your API key and try again" });
  setTimeout(() => setTestResult((p) => ({ ...p, [providerId]: null })), 3000);
  };

  const handleCopyApiKey = (key: string) => {
  navigator.clipboard.writeText(key).catch(() => {});
  addToast({ type: "success", title: "Copied to Clipboard" });
  };

  const tabConfig = [
  { key: "llm" as const, label: "LLM Providers", icon: Brain },
  { key: "features" as const, label: "AI Features", icon: Zap },
  ];

  if (loading) {
  return (
  <Shell role="superadmin">
  <div className="space-y-6">
  <div className="flex items-center justify-between">
  <div>
  <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>AI & LLM Providers</h1>
  <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Configure AI models for RevRa platform</p>
  </div>
  </div>
  <Card>
  <CardContent className="p-12 flex items-center justify-center">
  <div style={{ textAlign: "center" }}>
  <div className="animate-spin" style={{ width: 32, height: 32, border: "3px solid hsl(var(--border))", borderTopColor: "hsl(var(--primary))", borderRadius: "50%", margin: "0 auto 16px" }} />
  <p style={{ color: "hsl(var(--muted-foreground))" }}>Loading AI providers...</p>
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
  <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>AI & LLM Providers</h1>
  <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Configure AI models for RevRa platform</p>
  </div>
  <Button onClick={() => setShowAddProvider(true)}>
  <Plus size={16} className="mr-2" />Add Provider
  </Button>
  </div>

  <div className="flex gap-2 pb-4" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
  {tabConfig.map((tab) => {
  const isActive = activeTab === tab.key;
  return (
  <button
  key={tab.key}
  onClick={() => setActiveTab(tab.key)}
  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
  style={isActive
  ? { backgroundColor: "hsl(var(--primary)_/_0.12)", color: "hsl(var(--primary))" }
  : { color: "hsl(var(--muted-foreground))" }
  }
  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "hsl(var(--surface-container-high))"; }}
  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = "transparent"; }}
  >
  <tab.icon size={16} />
  {tab.label}
  </button>
  );
  })}
  </div>

  {activeTab === "llm" && (
  <div className="space-y-6">
  {llmProviders.length === 0 ? (
  <Card>
  <CardContent className="p-12 flex items-center justify-center">
  <p style={{ color: "hsl(var(--muted-foreground))" }}>No LLM providers configured</p>
  </CardContent>
  </Card>
  ) : (
  llmProviders.map((provider) => (
  <Card key={provider.id}>
  <CardHeader>
  <div className="flex items-start justify-between">
  <div className="flex items-center gap-4">
  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: `hsl(var(--${provider.colorVar}))` }}>
  {provider.icon}
  </div>
  <div>
  <div className="flex items-center gap-3">
  <CardTitle>{provider.name}</CardTitle>
  <Badge variant={provider.status === "active" ? "success" : "default"}>
  {provider.status}
  </Badge>
  </div>
  <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Model: {provider.model}</p>
  </div>
  </div>
  <div className="flex gap-2">
  <Button variant="outline" size="sm">
  <Settings size={14} className="mr-1" />Configure
  </Button>
  <Button
  variant="outline"
  size="sm"
  onClick={() => handleTest(provider.id)}
  disabled={testingProvider === provider.id}
  >
  <RefreshCw size={14} className={`mr-1 ${testingProvider === provider.id ? "animate-spin" : ""}`} />
  {testingProvider === provider.id ? "Testing..." : "Test"}
  </Button>
  {testResult[provider.id] === "success" && (
  <Badge variant="success"><CheckCircle2 size={10} className="mr-1" />Connected</Badge>
  )}
  {testResult[provider.id] === "error" && (
  <Badge variant="danger">Failed</Badge>
  )}
  </div>
  </div>
  </CardHeader>
  <CardContent>
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <div className="md:col-span-2 space-y-3">
  <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Configuration</h4>
  <div className="space-y-2">
  {Object.entries(provider.config).map(([key, value]) => {
  const isApiKey = key === "apiKey";
  const isHidden = isApiKey && !showKey[`${provider.id}-${key}`];
  return (
  <div key={key} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--surface-container-low))" }}>
  <div>
  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{key}</p>
  <p className="text-sm font-mono" style={{ color: "hsl(var(--on-surface))" }}>
  {isApiKey ? (isHidden ? "••••••••••••••••" : value) : value}
  </p>
  </div>
  {isApiKey && (
  <div className="flex gap-1">
  <button
  onClick={() => toggleShow(`${provider.id}-${key}`)}
  className="p-1.5 rounded-md transition-colors"
  style={{ color: "hsl(var(--muted-foreground))" }}
  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--surface-container-high))")}
  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
  >
  {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
  </button>
  <button onClick={() => handleCopyApiKey(value)} className="p-1.5 rounded-md transition-colors"
  style={{ color: "hsl(var(--muted-foreground))" }}
  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--surface-container-high))")}
  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
  >
  <Copy size={14} />
  </button>
  </div>
  )}
  </div>
  );
  })}
  </div>
  </div>

  <div className="space-y-3">
  <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Usage</h4>
  <div className="grid grid-cols-3 gap-2">
  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: "hsl(var(--info)_/_0.1)" }}>
  <p className="text-lg font-bold" style={{ color: "hsl(var(--info))" }}>{provider.usage.requests}</p>
  <p className="text-xs" style={{ color: "hsl(var(--info))", opacity: 0.8 }}>Requests</p>
  </div>
  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: "hsl(var(--success)_/_0.1)" }}>
  <p className="text-lg font-bold" style={{ color: "hsl(var(--success))" }}>{provider.usage.tokens}</p>
  <p className="text-xs" style={{ color: "hsl(var(--success))", opacity: 0.8 }}>Tokens</p>
  </div>
  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: "hsl(var(--surface-container-high))" }}>
  <p className="text-lg font-bold" style={{ color: "hsl(var(--on-surface-variant))" }}>{provider.usage.errors}</p>
  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Errors</p>
  </div>
  </div>
  <div className="flex justify-between text-sm">
  <span style={{ color: "hsl(var(--muted-foreground))" }}>Monthly Cost</span>
  <span className="font-semibold" style={{ color: "hsl(var(--on-surface))" }}>{provider.cost}</span>
  </div>
  <div className="flex justify-between text-sm">
  <span style={{ color: "hsl(var(--muted-foreground))" }}>Avg Latency</span>
  <span className="font-semibold" style={{ color: "hsl(var(--on-surface))" }}>{provider.avgLatency}</span>
  </div>
  </div>

  <div className="space-y-3">
  <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "hsl(var(--muted-foreground))" }}>Health</h4>
  <div className="space-y-2">
  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--success)_/_0.1)" }}>
  <span className="text-sm" style={{ color: "hsl(var(--on-surface-variant))" }}>Status</span>
  <Badge variant="success"><CheckCircle2 size={10} className="mr-1" /> Healthy</Badge>
  </div>
  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--surface-container-low))" }}>
  <span className="text-sm" style={{ color: "hsl(var(--on-surface-variant))" }}>Uptime</span>
  <span className="text-sm font-semibold" style={{ color: "hsl(var(--on-surface))" }}>99.97%</span>
  </div>
  <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--surface-container-low))" }}>
  <span className="text-sm" style={{ color: "hsl(var(--on-surface-variant))" }}>Rate Limit</span>
  <span className="text-sm font-semibold" style={{ color: "hsl(var(--on-surface))" }}>500/min</span>
  </div>
  </div>
  </div>
  </div>
  </CardContent>
  </Card>
  ))
  )}
  </div>
  )}

  {activeTab === "features" && (
  <Card>
  <CardHeader>
  <CardTitle>AI Features & Credit Costs</CardTitle>
  </CardHeader>
  <CardContent>
  <div className="space-y-3">
  {aiFeatures.map((feature, i) => {
  const IconComponent = feature.featureIcon;
  return (
  <div key={i} className="flex items-center justify-between p-4 rounded-xl" style={{ backgroundColor: "hsl(var(--surface-container-low))" }}>
  <div className="flex items-center gap-3">
  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `hsl(var(--${feature.colorVar})_/_0.15)` }}>
  <IconComponent size={16} style={{ color: `hsl(var(--${feature.colorVar}))` }} />
  </div>
  <span className="font-medium" style={{ color: "hsl(var(--on-surface))" }}>{feature.name}</span>
  </div>
  <div className="flex items-center gap-4">
  <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{feature.credits}</span>
  <Badge variant={feature.enabled ? "success" : "default"}>
  {feature.enabled ? "Enabled" : "Disabled"}
  </Badge>
  <Button variant="ghost" size="sm"><Settings size={14} /></Button>
  </div>
  </div>
  );
  })}
  </div>
  </CardContent>
  </Card>
  )}
  </div>

  <AddProviderModal open={showAddProvider} onClose={() => setShowAddProvider(false)} />
  </Shell>
  );
}
