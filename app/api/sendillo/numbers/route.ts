// app/api/sendillo/numbers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { listPurchasedNumbers } from "@/lib/sendillo/client";

// GET /api/sendillo/numbers — list Sendillo numbers
// ?type=registered → list numbers registered in RevRa
//  (all authenticated users; filtered by workspace)
// (default) → list Sendillo-API purchased numbers (superadmin)

export async function GET(req: NextRequest) {
 const { userId } = await auth();
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const supabase = createServiceSupabaseClient();
 if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

 // Look up the calling user — we need their workspace + role
 const { data: user } = await supabase
 .from("users")
 .select("id, role, workspace_id")
 .eq("clerk_user_id", userId)
 .single();

 if (!user?.workspace_id) {
 return NextResponse.json({ error: "No workspace" }, { status: 404 });
 }

 const { searchParams } = new URL(req.url);
 const type = searchParams.get("type") || "purchased";

 if (type === "registered") {
 // All users in a workspace can see their own workspace's registered numbers
 const { data, error } = await supabase
 .from("sendillo_phone_numbers")
 .select("*, agent:users(id, full_name, email)")
 .eq("workspace_id", user.workspace_id)
 .order("created_at", { ascending: false });

 if (error) return NextResponse.json({ error: error.message }, { status: 500 });
 return NextResponse.json({ numbers: data ?? [] });
 }

 // Default: fetch from Sendillo API (superadmin only — uses the platform key)
 if (user.role !== "superadmin") {
 return NextResponse.json({ error: "Superadmin only" }, { status: 403 });
 }

 try {
 const purchasedNumbers = await listPurchasedNumbers();
 return NextResponse.json({ numbers: purchasedNumbers });
 } catch (err: unknown) {
 const e = err as { message?: string };
 return NextResponse.json({ error: e.message ?? "Sendillo error" }, { status: 500 });
 }
}

export async function POST(req: NextRequest) {
 const { userId } = await auth();
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const supabase = createServiceSupabaseClient();
 if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

 const { data: user } = await supabase
 .from("users")
 .select("id, role, workspace_id")
 .eq("clerk_user_id", userId)
 .single();

 if (user?.role !== "superadmin") {
 return NextResponse.json({ error: "Superadmin only" }, { status: 403 });
 }

 const body = await req.json().catch(() => null);
 if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

 const { phone_number, label, agent_id } = body;
 if (!phone_number || !agent_id) {
 return NextResponse.json({ error: "phone_number and agent_id are required" }, { status: 400 });
 }

 // Verify agent exists and belongs to same workspace
 const { data: agent } = await supabase
 .from("users")
 .select("id, workspace_id")
 .eq("id", agent_id)
 .single();

 if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

 const { data: record, error } = await supabase
 .from("sendillo_phone_numbers")
 .insert({
 workspace_id: agent.workspace_id,
 agent_id: agent.id,
 phone_number,
 label: label || null,
 is_active: true,
 })
 .select()
 .single();

 if (error) return NextResponse.json({ error: error.message }, { status: 500 });

 return NextResponse.json(record, { status: 201 });
}