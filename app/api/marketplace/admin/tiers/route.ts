import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "DB error" }, { status: 500 });

  // Get user's workspace
  const { data: user } = await supabase
  .from("users")
  .select("workspace_id, role")
  .eq("clerk_user_id", userId)
  .single();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Get workspace custom tiers
  const { data: wsTiers } = await supabase
  .from("marketplace_workspace_tiers")
  .select("*")
  .eq("workspace_id", user.workspace_id);

  // Get RevRa defaults
  const { data: revraTiers } = await supabase
  .from("marketplace_tiers")
  .select("*");

  // Merge: workspace tiers override RevRa defaults
  const merged = revraTiers?.map((rt) => {
  const wt = wsTiers?.find((t) => t.tier === rt.tier);
  return wt ? { ...wt, is_custom: true } : { ...rt, is_custom: false };
  }) || [];

  return NextResponse.json({ tiers: merged });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "DB error" }, { status: 500 });

  const { data: user } = await supabase
  .from("users")
  .select("workspace_id, role")
  .eq("clerk_user_id", userId)
  .single();

  if (!user || !["admin", "superadmin"].includes(user.role)) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { tier, price_cents, is_active } = body;

  if (!tier || typeof price_cents !== "number") {
  return NextResponse.json({ error: "tier and price_cents required" }, { status: 400 });
  }

  // Upsert workspace tier
  const { data, error } = await supabase
  .from("marketplace_workspace_tiers")
  .upsert(
  {
  workspace_id: user.workspace_id,
  tier,
  price_cents,
  is_active,
  updated_at: new Date().toISOString(),
  },
  { onConflict: "workspace_id,tier" }
  )
  .select()
  .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tier: data });
}
