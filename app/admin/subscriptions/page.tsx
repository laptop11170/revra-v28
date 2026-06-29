"use client";

import { useState, useEffect, useCallback } from "react";
import { Shell } from "@/components/layouts/Shell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/context/theme-provider";
import { CreditCard, DollarSign, Calendar, Users, ExternalLink, RefreshCw } from "lucide-react";

type WorkspacePlan = {
  name: string;
  price: number;
  billing_cycle: string;
  mrr: number;
  seats_total: number;
  seats_used: number;
  renewal_date: string;
};

type PlanFeature = {
  name: string;
  price: number;
  billing: string;
  leads_per_week: number;
  features: string[];
};

const statConfig: Record<string, { bgVar: string; colorVar: string }> = {
  plan: { bgVar: "primary", colorVar: "primary" },
  price: { bgVar: "success", colorVar: "success" },
  seats: { bgVar: "info", colorVar: "info" },
  billing: { bgVar: "warning", colorVar: "warning" },
};

export default function AdminSubscriptionsPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [workspacePlan, setWorkspacePlan] = useState<WorkspacePlan | null>(null);
  const [plans, setPlans] = useState<PlanFeature[]>([]);
  const [members, setMembers] = useState<{ name: string; email: string; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/subscriptions");
      if (res.ok) {
        const json = await res.json();
        setWorkspacePlan(json.workspace);
        setPlans(json.plans || []);
        setMembers(json.members || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStripePortal = () => {
    window.open("https://billing.stripe.com/p/login/test_00000000000000", "_blank");
    addToast({ type: "info", title: "Opening Stripe Portal", description: "You will be redirected to Stripe" });
  };

  const handleContactSales = () => {
    addToast({ type: "info", title: "Contacting Sales", description: "Our team will reach out within 24 hours" });
  };

  const handleManageSeats = () => {
    addToast({ type: "success", title: "Seats Updated", description: "Seat count has been adjusted" });
    setShowManageSeats(false);
  };

  const [showManageSeats, setShowManageSeats] = useState(false);
  const planFeatures = workspacePlan
    ? [
        `${workspacePlan.seats_total} leads/week`,
        `Up to 50 users`,
        "AI Features (SMS Draft, Morning Briefing, etc.)",
        "Google Calendar Sync",
        "Emma AI Campaigns",
        "Workflow Automation",
        "API Access",
        "Priority Support",
      ]
    : ["Loading..."];

  return (
    <Shell role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "hsl(var(--on-surface))" }}>Subscription</h1>
            <p className="text-sm mt-1" style={{ color: "hsl(var(--muted-foreground))" }}>Manage your workspace plan and billing</p>
          </div>
          <Button variant="outline" onClick={handleStripePortal}>
            <ExternalLink size={16} className="mr-2" />Stripe Portal
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {loading ? (
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "center", padding: "20px" }}>
              <RefreshCw size={20} className="animate-spin" style={{ color: "hsl(var(--muted-foreground))" }} />
            </div>
          ) : (
            <>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "hsl(var(--primary)_/_0.15)" }}><CreditCard size={20} style={{ color: "hsl(var(--primary))" }} /></div>
            <div>
              <p className="text-lg font-bold" style={{ color: "hsl(var(--on-surface))" }}>{workspacePlan?.name ?? "—"}</p>
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Current Plan</p>
            </div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "hsl(var(--success)_/_0.15)" }}><DollarSign size={20} style={{ color: "hsl(var(--success))" }} /></div>
            <div>
              <p className="text-lg font-bold" style={{ color: "hsl(var(--on-surface))" }}>${workspacePlan?.price ?? 0}</p>
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Per Month</p>
            </div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "hsl(var(--info)_/_0.15)" }}><Users size={20} style={{ color: "hsl(var(--info))" }} /></div>
            <div>
              <p className="text-lg font-bold" style={{ color: "hsl(var(--on-surface))" }}>{workspacePlan?.seats_used ?? 0} / {workspacePlan?.seats_total ?? 0}</p>
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Seats Used</p>
            </div>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setShowManageSeats(true)}>
              Manage
            </Button>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: "hsl(var(--warning)_/_0.15)" }}><Calendar size={20} style={{ color: "hsl(var(--warning))" }} /></div>
            <div>
              <p className="text-lg font-bold" style={{ color: "hsl(var(--on-surface))" }}>{workspacePlan?.renewal_date ? new Date(workspacePlan.renewal_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}</p>
              <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>Next Billing</p>
            </div>
          </CardContent></Card>
            </>
          )}
        </div>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4" style={{ color: "hsl(var(--on-surface))" }}>Plan Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium mb-3" style={{ color: "hsl(var(--on-surface-variant))" }}>What's Included</h4>
                <div className="space-y-2">
                  {planFeatures.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-sm" style={{ color: "hsl(var(--on-surface-variant))" }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" style={{ color: "hsl(var(--success))" }}>
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-3" style={{ color: "hsl(var(--on-surface-variant))" }}>Available Upgrades</h4>
                <div className="space-y-3">
                  {plans.filter((p) => p.name !== (workspacePlan?.name ?? "")).map((plan) => (
                    <div key={plan.name} className="p-4 rounded-xl flex items-center justify-between" style={{ backgroundColor: "hsl(var(--surface-container-low))" }}>
                      <div>
                        <p className="font-medium" style={{ color: "hsl(var(--on-surface))" }}>{plan.name}</p>
                        <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{plan.leads_per_week ? `${plan.leads_per_week} leads/week` : "Unlimited leads"} · Custom integrations</p>
                      </div>
                      {plan.price ? (
                        <Button size="sm" onClick={handleContactSales}>${plan.price}/mo</Button>
                      ) : (
                        <Button size="sm" onClick={handleContactSales}>Contact Sales</Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Modal open={showManageSeats} onClose={() => setShowManageSeats(false)} title="Manage Seats" size="md">
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "hsl(var(--muted-foreground))" }}>Current: {workspacePlan?.seats_used ?? 0} / {workspacePlan?.seats_total ?? 0} seats used</p>
          <div className="space-y-3">
            {members.map((m, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "hsl(var(--surface-container-low))" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ background: "linear-gradient(135deg, hsl(var(--info)), hsl(var(--primary))" }}>
                  {m.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: "hsl(var(--on-surface))" }}>{m.name}</p>
                  <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>{m.email}</p>
                </div>
                <Badge>{m.role}</Badge>
              </div>
            ))}
          </div>
          <p className="text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>32 seats remaining · Upgrade plan for more seats</p>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4" style={{ borderTop: "1px solid hsl(var(--border))" }}>
          <Button variant="outline" onClick={() => setShowManageSeats(false)}>Close</Button>
          <Button onClick={handleManageSeats}>Save Changes</Button>
        </div>
      </Modal>
    </Shell>
  );
}
