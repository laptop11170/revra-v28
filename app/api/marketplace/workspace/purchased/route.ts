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
  .select("id")
  .eq("clerk_user_id", userId)
  .single();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { data, error } = await supabase
  .from("marketplace_purchases")
  .select("*, marketplace_leads(*), marketplace_workspace_leads(*)")
  .eq("buyer_id", user.id)
  .order("purchased_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ purchases: data });
}
