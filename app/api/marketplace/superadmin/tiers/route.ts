import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "DB error" }, { status: 500 });

  const { data, error } = await supabase
  .from("marketplace_tiers")
  .select("*")
  .order("tier", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tiers: data });
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "DB error" }, { status: 500 });

  // Verify superadmin
  const { data: user } = await supabase
  .from("users")
  .select("role")
  .eq("clerk_user_id", userId)
  .single();

  if (!user || user.role !== "superadmin") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { tier, price_cents, is_active } = body;

  if (!tier || typeof price_cents !== "number") {
  return NextResponse.json({ error: "tier and price_cents required" }, { status: 400 });
  }

  const { data, error } = await supabase
  .from("marketplace_tiers")
  .update({ price_cents, is_active, updated_at: new Date().toISOString() })
  .eq("tier", tier)
  .select()
  .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tier: data });
}
