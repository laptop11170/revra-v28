import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// Shape returned to the client. We always include `author` (possibly null) so
// the UI can render author initials without a second round-trip.
type NoteAuthor = {
 id: string;
 full_name: string | null;
 email: string | null;
 avatar_url: string | null;
} | null;

type NoteRow = {
 id: string;
 workspace_id: string;
 lead_id: string;
 author_id: string | null;
 body: string;
 visibility: "private" | "team";
 created_at: string;
 updated_at: string;
};

// Manual join helper — we look up authors in one extra query and merge them
// onto the note rows. Doing it this way sidesteps PostgREST's FK-relationship
// schema cache (which occasionally misses freshly-created FKs and returns
// PGRST200), at the cost of one extra round-trip per request.
async function attachAuthors(
 supabase: SupabaseClient,
 rows: NoteRow[]
): Promise<(NoteRow & { author: NoteAuthor })[]> {
 if (rows.length === 0) return [];
 const authorIds = Array.from(
 new Set(rows.map((r) => r.author_id).filter((id): id is string => !!id))
 );
 if (authorIds.length === 0) {
 return rows.map((r) => ({ ...r, author: null }));
 }
 const { data: authors } = await supabase
 .from("users")
 .select("id, full_name, email, avatar_url")
 .in("id", authorIds);
 const byId = new Map<string, NoteAuthor>();
 for (const a of authors ?? []) {
 byId.set(a.id as string, a as NoteAuthor);
 }
 return rows.map((r) => ({ ...r, author: r.author_id ? byId.get(r.author_id) ?? null : null }));
}

// GET /api/leads/[id]/notes — list notes for a lead (newest first)
export async function GET(
 req: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 const { userId } = await auth();
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const { id: leadId } = await params;
 const supabase = createServiceSupabaseClient();
 if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

 const { data: user, error: userError } = await supabase
 .from("users")
 .select("id, workspace_id")
 .eq("clerk_user_id", userId)
 .maybeSingle();

 if (userError) {
 console.error("[api/leads/notes GET] users lookup error:", userError);
 return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
 }
 if (!user?.workspace_id) {
 return NextResponse.json({ error: "No workspace found" }, { status: 404 });
 }

 // Verify the lead belongs to the workspace before exposing notes
 const { data: lead, error: leadError } = await supabase
 .from("leads")
 .select("id")
 .eq("id", leadId)
 .eq("workspace_id", user.workspace_id)
 .maybeSingle();

 if (leadError) {
 console.error("[api/leads/notes GET] lead lookup error:", leadError);
 return NextResponse.json({ error: "Failed to load lead" }, { status: 500 });
 }
 if (!lead) {
 return NextResponse.json({ error: "Lead not found" }, { status: 404 });
 }

 const { data, error } = await supabase
 .from("lead_notes")
 .select("id, workspace_id, lead_id, author_id, body, visibility, created_at, updated_at")
 .eq("lead_id", leadId)
 .eq("workspace_id", user.workspace_id)
 .order("created_at", { ascending: false });

 if (error) {
 console.error("[api/leads/notes GET] list error:", error);
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 const notes = await attachAuthors(supabase, (data ?? []) as NoteRow[]);
 return NextResponse.json({ notes });
}

// POST /api/leads/[id]/notes — create a new note for a lead
export async function POST(
 req: NextRequest,
 { params }: { params: Promise<{ id: string }> }
) {
 const { userId } = await auth();
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const { id: leadId } = await params;
 const supabase = createServiceSupabaseClient();
 if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

 const { data: user, error: userError } = await supabase
 .from("users")
 .select("id, workspace_id")
 .eq("clerk_user_id", userId)
 .maybeSingle();

 if (userError) {
 console.error("[api/leads/notes POST] users lookup error:", userError);
 return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
 }
 if (!user?.workspace_id) {
 return NextResponse.json({ error: "No workspace found" }, { status: 404 });
 }

 let body: { body?: string; visibility?: "private" | "team" };
 try {
 body = await req.json();
 } catch {
 return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
 }

 const noteBody = (body.body ?? "").trim();
 if (!noteBody) {
 return NextResponse.json({ error: "Note body is required" }, { status: 400 });
 }
 if (noteBody.length > 10000) {
 return NextResponse.json({ error: "Note is too long (max 10000 chars)" }, { status: 400 });
 }
 const visibility = body.visibility === "private" ? "private" : "team";

 // Verify the lead belongs to the workspace
 const { data: lead, error: leadError } = await supabase
 .from("leads")
 .select("id")
 .eq("id", leadId)
 .eq("workspace_id", user.workspace_id)
 .maybeSingle();

 if (leadError) {
 console.error("[api/leads/notes POST] lead lookup error:", leadError);
 return NextResponse.json({ error: "Failed to load lead" }, { status: 500 });
 }
 if (!lead) {
 return NextResponse.json({ error: "Lead not found" }, { status: 404 });
 }

 const { data, error } = await supabase
 .from("lead_notes")
 .insert({
 workspace_id: user.workspace_id,
 lead_id: leadId,
 author_id: user.id,
 body: noteBody,
 visibility,
 })
 .select("id, workspace_id, lead_id, author_id, body, visibility, created_at, updated_at")
 .single();

 if (error) {
 console.error("[api/leads/notes POST] insert error:", error);
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 const [note] = await attachAuthors(supabase, [data as NoteRow]);
 return NextResponse.json({ note }, { status: 201 });
}
