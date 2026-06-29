import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

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

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");
  const pipelineStage = searchParams.get("pipeline_stage") || undefined;
  const assignedAgentId = searchParams.get("assigned_agent_id") || undefined;
  const search = searchParams.get("search") || undefined;

  let query = supabase
    .from("leads")
    .select(`
      id,
      first_name,
      last_name,
      email,
      phone,
      score,
      pipeline_stage,
      lead_source,
      lead_type,
      created_at,
      assigned_agent_id,
      assigned_agent:users!assigned_agent_id(full_name)
    `, { count: "exact" })
    .eq("workspace_id", user.workspace_id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (pipelineStage) query = query.eq("pipeline_stage", pipelineStage);
  if (assignedAgentId) query = query.eq("assigned_agent_id", assignedAgentId);
  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Flatten assigned_agent to just the name
  const leads = (data || []).map((lead: any) => ({
    ...lead,
    assigned_agent_name: (lead.assigned_agent as any)?.full_name || null,
    assigned_agent: undefined,
  }));

  return NextResponse.json({ leads, total: count });
}