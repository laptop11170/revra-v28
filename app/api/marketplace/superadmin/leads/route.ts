import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "DB error" }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  let query = supabase.from("marketplace_leads").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "DB error" }, { status: 500 });

  // Verify superadmin
  const { data: user } = await supabase
  .from("users")
  .select("id, role")
  .eq("clerk_user_id", userId)
  .single();

  if (!user || user.role !== "superadmin") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { first_name, last_name, email, phone, lead_type, source, tier, notes, custom_fields } = body;

  if (!first_name || !last_name || !phone || !tier) {
  return NextResponse.json({ error: "first_name, last_name, phone, tier required" }, { status: 400 });
  }

  const { data: tierInfo } = await supabase
  .from("marketplace_tiers")
  .select("price_cents")
  .eq("tier", tier)
  .single();

  const { data, error } = await supabase
  .from("marketplace_leads")
  .insert({
  superadmin_id: user.id,
  first_name,
  last_name,
  email: email || null,
  phone,
  lead_type: lead_type || null,
  source: source || null,
  tier,
  notes: notes || null,
  custom_fields: custom_fields || [],
  sold_price_cents: tierInfo?.price_cents || 0,
  })
  .select()
  .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}
