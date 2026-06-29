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

  const { data: workflows, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("workspace_id", user.workspace_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Parse nodes JSON for each workflow
  const parsedWorkflows = (workflows || []).map(wf => ({
    ...wf,
    nodes: typeof wf.nodes === "string" ? JSON.parse(wf.nodes) : wf.nodes || [],
  }));

  return NextResponse.json({ workflows: parsedWorkflows });
}

export async function POST(req: NextRequest) {
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

  const body = await req.json();
  const { name, description, nodes, status } = body;

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("workflows")
    .insert({
      workspace_id: user.workspace_id,
      name,
      description: description || null,
      nodes: nodes ? JSON.stringify(nodes) : "[]",
      status: status || "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    workflow: {
      ...data,
      nodes: typeof data.nodes === "string" ? JSON.parse(data.nodes) : data.nodes || [],
    },
  }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
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

  const body = await req.json();
  const { workflow_id, name, description, nodes, status } = body;

  if (!workflow_id) {
    return NextResponse.json({ error: "workflow_id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (nodes !== undefined) updates.nodes = JSON.stringify(nodes);
  if (status !== undefined) updates.status = status;

  const { data, error } = await supabase
    .from("workflows")
    .update(updates)
    .eq("id", workflow_id)
    .eq("workspace_id", user.workspace_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Workflow not found" }, { status: 404 });

  return NextResponse.json({
    workflow: {
      ...data,
      nodes: typeof data.nodes === "string" ? JSON.parse(data.nodes) : data.nodes || [],
    },
  });
}

export async function DELETE(req: NextRequest) {
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
  const workflowId = searchParams.get("workflow_id");

  if (!workflowId) {
    return NextResponse.json({ error: "workflow_id query param is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("workflows")
    .delete()
    .eq("id", workflowId)
    .eq("workspace_id", user.workspace_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}