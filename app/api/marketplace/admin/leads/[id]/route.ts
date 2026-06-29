import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";

async function verifyAdmin(userId: string, supabase: ReturnType<typeof createServiceSupabaseClient>) {
  if (!supabase) return null;
  const { data } = await supabase
  .from("users")
  .select("workspace_id, role")
  .eq("clerk_user_id", userId)
  .single();
  if (!data || !["admin", "superadmin"].includes(data.role)) return null;
  return data.workspace_id;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "DB error" }, { status: 500 });

  const workspaceId = await verifyAdmin(userId, supabase);
  if (!workspaceId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const update: Record<string, unknown> = {};
  ["first_name", "last_name", "email", "phone", "lead_type", "source", "tier", "notes", "custom_fields", "price_cents", "status"].forEach((k) => {
  if (body[k] !== undefined) update[k] = body[k];
  });
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabase
  .from("marketplace_workspace_leads")
  .update(update)
  .eq("id", id)
  .eq("workspace_id", workspaceId)
  .select()
  .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "DB error" }, { status: 500 });

  const workspaceId = await verifyAdmin(userId, supabase);
  if (!workspaceId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { error } = await supabase
  .from("marketplace_workspace_leads")
  .delete()
  .eq("id", id)
  .eq("workspace_id", workspaceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
