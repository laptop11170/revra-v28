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
    .select("id, workspace_id")
    .eq("clerk_user_id", userId)
    .single();

  if (!currentUser?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("workspace_id", currentUser.workspace_id)
    .order("full_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get leads count per user
  const userIds = data?.map((u) => u.id) || [];
  const { data: leadsData } = await supabase
    .from("leads")
    .select("assigned_agent_id")
    .in("assigned_agent_id", userIds)
    .eq("workspace_id", currentUser.workspace_id);

  const leadsCountMap: Record<string, number> = {};
  leadsData?.forEach((lead) => {
    if (lead.assigned_agent_id) {
      leadsCountMap[lead.assigned_agent_id] = (leadsCountMap[lead.assigned_agent_id] || 0) + 1;
    }
  });

  const members = data?.map((member) => ({
    ...member,
    leads_count: leadsCountMap[member.id] || 0,
  }));

  return NextResponse.json({ members });
}