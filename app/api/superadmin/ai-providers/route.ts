import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  // Verify superadmin role
  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("clerk_user_id", userId)
    .single();

  if (currentUser?.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: providers, error } = await supabase
    .from("ai_providers")
    .select("*")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Aggregate stats from real data
  const totalCalls = (providers || []).reduce((sum, p) => {
    const s = (p.stats as { total_calls?: number }) || {};
    return sum + (s.total_calls ?? 0);
  }, 0);

  const totalCost = (providers || []).reduce((sum, p) => {
    const s = (p.stats as { total_calls?: number; avg_cost?: number }) || {};
    return sum + ((s.total_calls ?? 0) * (s.avg_cost ?? 0));
  }, 0);

  const avgSuccessRate = providers?.length
    ? providers.reduce((sum, p) => {
      const s = (p.stats as { success_rate?: number }) || {};
      return sum + (s.success_rate ?? 0);
    }, 0) / providers.length
    : 0;

  return NextResponse.json({
    providers: providers || [],
    stats: {
      total_calls: totalCalls,
      avg_cost: totalCalls > 0 ? Math.round((totalCost / totalCalls) * 100) / 100 : 0,
      success_rate: Math.round(avgSuccessRate * 10) / 10,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("clerk_user_id", userId)
    .single();

  if (currentUser?.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("ai_providers")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ provider: data });
}