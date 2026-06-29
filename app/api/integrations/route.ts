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
    .select("id, workspace_id")
    .eq("clerk_user_id", userId)
    .single();

  if (!user?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  // Get workspace-specific integrations
  const { data: workspaceIntegrations, error: workspaceError } = await supabase
    .from("integrations")
    .select("*")
    .eq("workspace_id", user.workspace_id)
    .eq("is_connected", true)
    .order("name");

  if (workspaceError) {
    return NextResponse.json({ error: workspaceError.message }, { status: 500 });
  }

  // Get platform-wide catalog (no workspace filter)
  const { data: catalog, error: catalogError } = await supabase
    .from("integrations")
    .select("*")
    .is("workspace_id", null)
    .order("category")
    .order("name");

  if (catalogError) {
    return NextResponse.json({ error: catalogError.message }, { status: 500 });
  }

  // Build initials map for catalog items
  const initialsMap: Record<string, string> = {
    Twilio: "T", "Meta Ads": "M", "Google Calendar": "G", Stripe: "S", EMMA: "E", Slack: "SL",
  };
  const colorVarMap: Record<string, string> = {
    Twilio: "danger", "Meta Ads": "info", "Google Calendar": "success", Stripe: "primary", EMMA: "warning", Slack: "surface-container-high",
  };
  const iconMap: Record<string, string> = {
    Twilio: "T", "Meta Ads": "M", "Google Calendar": "G", Stripe: "S", EMMA: "E", Slack: "SL",
  };

  const enrichedCatalog = (catalog || []).map((item: any) => ({
    ...item,
    initials: initialsMap[item.name] || item.name.slice(0, 2).toUpperCase(),
    colorVar: colorVarMap[item.name] || "primary",
    icon: iconMap[item.name] || item.name,
  }));

  return NextResponse.json({
    workspace: workspaceIntegrations || [],
    catalog: enrichedCatalog,
  });
}