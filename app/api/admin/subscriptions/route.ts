import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

const PLATFORM_PLANS = [
  {
    name: "Starter",
    price: 250,
    billing_cycle: "monthly",
    features: ["5 agents", "1,000 leads/mo", "Email support", "Basic analytics"],
  },
  {
    name: "Growth",
    price: 450,
    billing_cycle: "monthly",
    features: ["15 agents", "5,000 leads/mo", "Priority support", "Advanced analytics", "Custom pipelines"],
  },
  {
    name: "Scale",
    price: 799,
    billing_cycle: "monthly",
    features: ["50 agents", "Unlimited leads", "Dedicated support", "Full analytics", "Custom pipelines", "API access", "White-label"],
  },
  {
    name: "Enterprise",
    price: "custom",
    billing_cycle: "custom",
    features: ["Unlimited agents", "Unlimited leads", "24/7 dedicated support", "Custom integrations", "SLA guarantee", "On-premise option"],
  },
];

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const { data: user } = await supabase
    .from("users")
    .select("workspace_id")
    .eq("clerk_user_id", userId)
    .single();

  if (!user?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  // Get workspace info
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, plan, billing_cycle, mrr, seat_count, features")
    .eq("id", user.workspace_id)
    .single();

  // Count current users in workspace
  const { count: memberCount } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", user.workspace_id);

  return NextResponse.json({
    workspace: workspace ? {
      id: workspace.id,
      name: workspace.name,
      plan: workspace.plan,
      billing_cycle: workspace.billing_cycle,
      mrr: workspace.mrr,
      seat_count: workspace.seat_count,
      features: workspace.features,
      member_count: memberCount ?? 0,
    } : null,
    plans: PLATFORM_PLANS,
  });
}