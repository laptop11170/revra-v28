import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

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

// Manual join helper — same one as in the parent route. Doing the join
// client-side avoids PostgREST's FK-relationship schema cache (PGRST200).
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

// PATCH /api/leads/[id]/notes/[noteId] — edit a note
// Only the author can edit their own note. Body and visibility are updatable.
export async function PATCH(
 req: NextRequest,
 { params }: { params: Promise<{ id: string; noteId: string }> }
) {
 const { userId } = await auth();
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const { id: leadId, noteId } = await params;
 const supabase = createServiceSupabaseClient();
 if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

 const { data: user, error: userError } = await supabase
 .from("users")
 .select("id, workspace_id")
 .eq("clerk_user_id", userId)
 .maybeSingle();

 if (userError) {
 console.error("[api/leads/notes PATCH] users lookup error:", userError);
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

 const update: Record<string, unknown> = {};
 if (typeof body.body === "string") {
 const trimmed = body.body.trim();
 if (!trimmed) {
 return NextResponse.json({ error: "Note body cannot be empty" }, { status: 400 });
 }
 if (trimmed.length > 10000) {
 return NextResponse.json({ error: "Note is too long (max 10000 chars)" }, { status: 400 });
 }
 update.body = trimmed;
 }
 if (body.visibility === "private" || body.visibility === "team") {
 update.visibility = body.visibility;
 }
 if (Object.keys(update).length === 0) {
 return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
 }

 // First load the note so we can authorise (must be the author, must be in
 // the caller's workspace, must belong to the lead in the URL).
 const { data: existing, error: loadError } = await supabase
 .from("lead_notes")
 .select("id, author_id, workspace_id, lead_id")
 .eq("id", noteId)
 .maybeSingle();

 if (loadError) {
 console.error("[api/leads/notes PATCH] load error:", loadError);
 return NextResponse.json({ error: "Failed to load note" }, { status: 500 });
 }
 if (!existing) {
 return NextResponse.json({ error: "Note not found" }, { status: 404 });
 }
 if (existing.workspace_id !== user.workspace_id) {
 return NextResponse.json({ error: "Note not found" }, { status: 404 });
 }
 if (existing.lead_id !== leadId) {
 return NextResponse.json({ error: "Note does not belong to this lead" }, { status: 400 });
 }
 if (existing.author_id !== user.id) {
 return NextResponse.json({ error: "You can only edit your own notes" }, { status: 403 });
 }

 const { data, error } = await supabase
 .from("lead_notes")
 .update(update)
 .eq("id", noteId)
 .select("id, workspace_id, lead_id, author_id, body, visibility, created_at, updated_at")
 .single();

 if (error) {
 console.error("[api/leads/notes PATCH] update error:", error);
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 const [note] = await attachAuthors(supabase, [data as NoteRow]);
 return NextResponse.json({ note });
}

// DELETE /api/leads/[id]/notes/[noteId] — delete a note
// Only the author (or a workspace admin) can delete.
export async function DELETE(
 req: NextRequest,
 { params }: { params: Promise<{ id: string; noteId: string }> }
) {
 const { userId } = await auth();
 if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const { id: leadId, noteId } = await params;
 const supabase = createServiceSupabaseClient();
 if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

 const { data: user, error: userError } = await supabase
 .from("users")
 .select("id, workspace_id, role")
 .eq("clerk_user_id", userId)
 .maybeSingle();

 if (userError) {
 console.error("[api/leads/notes DELETE] users lookup error:", userError);
 return NextResponse.json({ error: "Failed to load user" }, { status: 500 });
 }
 if (!user?.workspace_id) {
 return NextResponse.json({ error: "No workspace found" }, { status: 404 });
 }

 const { data: existing, error: loadError } = await supabase
 .from("lead_notes")
 .select("id, author_id, workspace_id, lead_id")
 .eq("id", noteId)
 .maybeSingle();

 if (loadError) {
 console.error("[api/leads/notes DELETE] load error:", loadError);
 return NextResponse.json({ error: "Failed to load note" }, { status: 500 });
 }
 if (!existing) {
 return NextResponse.json({ error: "Note not found" }, { status: 404 });
 }
 if (existing.workspace_id !== user.workspace_id) {
 return NextResponse.json({ error: "Note not found" }, { status: 404 });
 }
 if (existing.lead_id !== leadId) {
 return NextResponse.json({ error: "Note does not belong to this lead" }, { status: 400 });
 }

 const isAuthor = existing.author_id === user.id;
 const isAdmin = user.role === "admin" || user.role === "superadmin";
 if (!isAuthor && !isAdmin) {
 return NextResponse.json({ error: "You can only delete your own notes" }, { status: 403 });
 }

 const { error } = await supabase
 .from("lead_notes")
 .delete()
 .eq("id", noteId);

 if (error) {
 console.error("[api/leads/notes DELETE] delete error:", error);
 return NextResponse.json({ error: error.message }, { status: 500 });
 }

 return NextResponse.json({ success: true });
}
