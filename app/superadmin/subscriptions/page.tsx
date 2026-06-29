"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/context/theme-provider";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Plus,
  ExternalLink,
  Edit,
} from "lucide-react";

interface Subscription {
  workspace: string;
  plan: string;
  mrr: number;
  status: string;
  renewal_date: string;
  seats: number;
}

interface SubscriptionStats {
  mrr: number;
  activeCount: number;
  growth: number;
  arr: number;
}

interface SubscriptionsResponse {
  subscriptions: Subscription[];
  stats: SubscriptionStats;
}

const plans = [
  { name: "Starter", price: 250, period: "month", leads: 10, features: ["Basic CRM", "SMS & Voice", "Email Support"] },
  { name: "Growth", price: 450, period: "month", leads: 20, features: ["Everything in Starter", "AI Features", "Google Calendar", "Priority Support"] },
  { name: "Scale", price: 799, period: "month", leads: 40, features: ["Everything in Growth", "RevRa AI Chat", "Workflows", "API Access", "Dedicated Support"] },
  { name: "Enterprise", price: "Custom", period: "", leads: "Unlimited", features: ["Everything in Scale", "Unlimited", "Custom Integrations", "SLA", "Account Manager"] },
];

const planHeaderColors: Record<string, { bgVar: string; colorVar: string }> = {
  Starter: { bgVar: "surface-container-high", colorVar: "on-surface-variant" },
  Growth: { bgVar: "success", colorVar: "success" },
  Scale: { bgVar: "info", colorVar: "info" },
  Enterprise: { bgVar: "primary", colorVar: "primary" },
};

export default function SubscriptionsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [showEditPlan, setShowEditPlan] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/superadmin/subscriptions");
      if (!res.ok) throw new Error("Failed to fetch subscriptions");
      const json: SubscriptionsResponse = await res.json();
      setSubscriptions(json.subscriptions);
      setStats(json.stats);
    } catch (err) {
      addToast({ type: "error", title: "Error", description: "Failed to load subscriptions" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleStripeDashboard = () => {
    window.open("https://dashboard.stripe.com", "_blank");
    addToast({ type: "info", title: "Opening Stripe Dashboard", description: "Redirecting to Stripe" });
  };

  const handleEditPlan = (sub: Subscription) => {
    setEditingSub(sub);
    setShowEditPlan(true);
  };

  const handleSavePlan = () => {
    addToast({ type: "success", title: "Plan Updated", description: `${editingSub?.workspace} has been updated` });
    setShowEditPlan(false);
    setEditingSub(null);
  };

  return (
    <Shell role="superadmin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>Subscriptions</h1>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Manage plans and billing across all workspaces</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleStripeDashboard}>
              <ExternalLink size={16} className="mr-2" />Stripe Dashboard
            </Button>
            <Button>
              <Plus size={16} className="mr-2" />Add Plan
            </Button>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-12 flex items-center justify-center">
              <div style={{ textAlign: "center" }}>
                <div className="animate-spin" style={{ width: 32, height: 32, border: "3px solid hsl(var(--border))", borderTopColor: "hsl(var(--primary))", borderRadius: "50%", margin: "0 auto 16px" }} />
                <p style={{ color: "hsl(var(--muted-foreground))" }}>Loading subscriptions...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card><CardContent className="p-6 flex items-center gap-3">
                <div className="p-3 rounded-xl" style={{ backgroundColor: "hsl(var(--success)_/_0.15)" }}><DollarSign size={24} style={{ color: "hsl(var(--success))" }} /></div>
                <div><p className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>${((stats?.mrr || 0) / 100).toFixed(2)}</p><p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Monthly Revenue</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-6 flex items-center gap-3">
                <div className="p-3 rounded-xl" style={{ backgroundColor: "hsl(var(--info)_/_0.15)" }}><CreditCard size={24} style={{ color: "hsl(var(--info))" }} /></div>
                <div><p className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>{stats?.activeCount || subscriptions.filter((s) => s.status === "active").length}</p><p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Active Subscriptions</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-6 flex items-center gap-3">
                <div className="p-3 rounded-xl" style={{ backgroundColor: "hsl(var(--primary)_/_0.15)" }}><TrendingUp size={24} style={{ color: "hsl(var(--primary))" }} /></div>
                <div><p className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>+{stats?.growth || 12}%</p><p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Growth (30d)</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-6 flex items-center gap-3">
                <div className="p-3 rounded-xl" style={{ backgroundColor: "hsl(var(--warning)_/_0.15)" }}><RefreshCw size={24} style={{ color: "hsl(var(--warning))" }} /></div>
                <div><p className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>${((stats?.arr || 0) / 1000).toFixed(0)}K</p><p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>ARR</p></div>
              </CardContent></Card>
            </div>

            {/* Plan Tiers */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {plans.map((plan) => (
                <Card key={plan.name}>
                  <CardContent className="p-6">
                    <h3 className="font-semibold" style={{ color: "hsl(var(--on-surface))" }}>{plan.name}</h3>
                    <div className="mt-2 mb-4">
                      <span className="text-3xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>{plan.price}</span>
                      {plan.price !== "Custom" && <span className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>/{plan.period}</span>}
                    </div>
                    <p className="text-sm mb-4" style={{ color: "hsl(var(--muted-foreground))" }}>{plan.leads} leads/week</p>
                    <div className="space-y-1 mb-4">
                      {plan.features.map((f) => (
                        <p key={f} className="text-xs flex items-center gap-2" style={{ color: "hsl(var(--on-surface-variant))" }}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "hsl(var(--success))" }} />
                          {f}
                        </p>
                      ))}
                    </div>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => {
                      addToast({ type: "info", title: "Plan Editor", description: "Plan editing modal would open here" });
                    }}>
                      <Edit size={14} className="mr-1" />Edit
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Subscriptions Table */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4" style={{ color: "hsl(var(--on-surface))" }}>All Subscriptions</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workspace</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>MRR</TableHead>
                      <TableHead>Seats</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Renewal Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12" style={{ color: "hsl(var(--muted-foreground))" }}>No subscriptions found</TableCell>
                      </TableRow>
                    ) : (
                      subscriptions.map((sub, i) => (
                        <TableRow key={i}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "hsl(var(--primary)_/_0.04)")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                          onClick={() => handleEditPlan(sub)}
                          style={{ cursor: "pointer" }}
                        >
                          <TableCell className="font-medium" style={{ color: "hsl(var(--on-surface))" }}>{sub.workspace}</TableCell>
                          <TableCell><Badge>{sub.plan}</Badge></TableCell>
                          <TableCell className="font-semibold" style={{ color: "hsl(var(--on-surface))" }}>${sub.mrr.toLocaleString()}</TableCell>
                          <TableCell>{sub.seats}</TableCell>
                          <TableCell>
                            <Badge variant={
                              sub.status === "active" ? "success" :
                              sub.status === "trial" ? "info" : "danger"
                            }>{sub.status.replace("_", " ")}</Badge>
                          </TableCell>
                          <TableCell className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>{sub.renewal_date}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Edit Plan Modal */}
      <Modal open={showEditPlan} onClose={() => setShowEditPlan(false)} title="Edit Subscription" size="md">
        {editingSub && (
          <div className="space-y-4">
            <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Editing subscription for <span className="font-medium" style={{ color: "hsl(var(--on-surface))" }}>{editingSub.workspace}</span></p>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Plan</label>
              <Select defaultValue={editingSub.plan}>
                <option>Starter</option>
                <option>Growth</option>
                <option>Scale</option>
                <option>Enterprise</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "hsl(var(--muted-foreground))" }}>Status</label>
              <Select defaultValue={editingSub.status}>
                <option value="active">Active</option>
                <option value="trial">Trial</option>
                <option value="past_due">Past Due</option>
                <option value="suspended">Suspended</option>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              window.open("https://billing.stripe.com/p/login/test", "_blank");
            }}>
              <ExternalLink size={14} className="mr-1" />Open in Stripe
            </Button>
          </div>
        )}
        <div className="flex justify-end gap-2 px-6 py-4" style={{ borderTop: "1px solid hsl(var(--border))" }}>
          <Button variant="outline" onClick={() => setShowEditPlan(false)}>Cancel</Button>
          <Button onClick={handleSavePlan}>Save Changes</Button>
        </div>
      </Modal>
    </Shell>
  );
}
