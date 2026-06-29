import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";

async function verifySuperadmin(userId: string, supabase: ReturnType<typeof createServiceSupabaseClient>) {
  if (!supabase) return false;
  const { data } = await supabase.from("users").select("role").eq("clerk_user_id", userId).single();
  return data?.role === "superadmin";
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "DB error" }, { status: 500 });

  const isSuperadmin = await verifySuperadmin(userId, supabase);
  if (!isSuperadmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const { first_name, last_name, email, phone, lead_type, source, tier, notes, custom_fields, status } = body;

  const update: Record<string, unknown> = {};
  if (first_name !== undefined) update.first_name = first_name;
  if (last_name !== undefined) update.last_name = last_name;
  if (email !== undefined) update.email = email;
  if (phone !== undefined) update.phone = phone;
  if (lead_type !== undefined) update.lead_type = lead_type;
  if (source !== undefined) update.source = source;
  if (tier !== undefined) update.tier = tier;
  if (notes !== undefined) update.notes = notes;
  if (custom_fields !== undefined) update.custom_fields = custom_fields;
  if (status !== undefined) update.status = status;
  update.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from("marketplace_leads").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ lead: data });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "DB error" }, { status: 500 });

  const isSuperadmin = await verifySuperadmin(userId, supabase);
  if (!isSuperadmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { error } = await supabase.from("marketplace_leads").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
