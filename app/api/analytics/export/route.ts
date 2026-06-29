import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format") || "excel";

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

  // Fetch all valid leads for export
  const { data: leads } = await supabase
    .from("leads")
    .select("id, first_name, last_name, phone, email, score, pipeline_stage, source, created_at")
    .eq("workspace_id", user.workspace_id)
    .neq("pipeline_stage", "archived")
    .order("created_at", { ascending: false });

  // Get message counts per lead
  const { data: messageCounts } = await supabase
    .from("messages")
    .select("lead_id")
    .eq("workspace_id", user.workspace_id);

  const msgCountMap: Record<string, number> = {};
  for (const msg of (messageCounts ?? [])) {
    msgCountMap[msg.lead_id] = (msgCountMap[msg.lead_id] ?? 0) + 1;
  }

  if (format === "excel") {
    // Create CSV content
    const headers = [
      "Lead ID",
      "Name",
      "Phone",
      "Email",
      "Score",
      "Pipeline Stage",
      "Source",
      "Created Date",
      "Message Count"
    ];

    const rows = (leads || []).map(lead => [
      lead.id,
      `${lead.first_name || ""} ${lead.last_name || ""}`.trim() || "",
      lead.phone || "",
      lead.email || "",
      lead.score || 0,
      lead.pipeline_stage || "",
      lead.source || "",
      lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "",
      msgCountMap[lead.id] || 0
    ]);

    const escapeCSV = (val: string | number) => {
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map(row => row.map(escapeCSV).join(","))
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leads-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } else {
    // Return JSON data that can be used for HTML export
    return NextResponse.json({
      exportDate: new Date().toISOString(),
      totalLeads: leads?.length || 0,
      leads: leads || [],
      messageCounts: msgCountMap
    });
  }
}