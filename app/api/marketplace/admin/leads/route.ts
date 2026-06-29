import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
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

  const { data, error } = await supabase
  .from("marketplace_workspace_leads")
  .select("*")
  .eq("workspace_id", user.workspace_id)
  .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "DB error" }, { status: 500 });

  const { data: user } = await supabase
  .from("users")
  .select("id, workspace_id, role")
  .eq("clerk_user_id", userId)
  .single();

  if (!user || !["admin", "superadmin"].includes(user.role)) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check Stripe connected
  const { data: workspace } = await supabase
  .from("workspaces")
  .select("stripe_account_id")
  .eq("id", user.workspace_id)
  .single();

  if (!workspace?.stripe_account_id) {
  return NextResponse.json({ error: "Stripe not connected" }, { status: 400 });
  }

  const body = await req.json();
  const { first_name, last_name, email, phone, lead_type, source, tier, notes, custom_fields, price_cents } = body;

  if (!first_name || !last_name || !phone || !tier) {
  return NextResponse.json({ error: "first_name, last_name, phone, tier required" }, { status: 400 });
  }

  const { data, error } = await supabase
  .from("marketplace_workspace_leads")
  .insert({
  workspace_id: user.workspace_id,
  admin_id: user.id,
  first_name,
  last_name,
  email: email || null,
  phone,
  lead_type: lead_type || null,
  source: source || null,
  tier,
  notes: notes || null,
  custom_fields: custom_fields || [],
  price_cents: price_cents || 0,
  })
  .select()
  .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}
