import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
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

  const { data: providers, error } = await supabase
    .from("providers")
    .select("*")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const totalMessages = (providers || []).reduce((sum, p) => {
    const s = (p.usage_stats_json as { total_messages?: number }) || {};
    return sum + (s.total_messages ?? 0);
  }, 0);
  const totalDelivered = (providers || []).reduce((sum, p) => {
    const s = (p.usage_stats_json as { delivered?: number }) || {};
    return sum + (s.delivered ?? 0);
  }, 0);
  const totalFailed = (providers || []).reduce((sum, p) => {
    const s = (p.usage_stats_json as { failed?: number }) || {};
    return sum + (s.failed ?? 0);
  }, 0);

  return NextResponse.json({
    providers: providers || [],
    stats: {
      total_messages: totalMessages,
      delivered: totalDelivered,
      failed: totalFailed,
      delivery_rate: totalMessages > 0 ? Math.round((totalDelivered / totalMessages) * 1000) / 10 : 0,
      cost: Math.round(totalMessages * 0.007 * 100) / 100,
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
    .from("providers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ provider: data });
}