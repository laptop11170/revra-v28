// app/api/auth/google/callback/route.ts
// OAuth callback handler for Google Calendar connection

import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { exchangeCode } from "@/lib/google/calendar";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Default redirect is calendar page
  const defaultRedirect = "/user/calendar";
  const state = searchParams.get("state") || "";

  // ─── Handle OAuth errors ────────────────────────────────────────────────────────
  if (error) {
    console.error("[GoogleOAuth] User denied consent:", error);
    const redirectUrl = new URL(`${defaultRedirect}?error=permission_denied`, req.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    console.error("[GoogleOAuth] No authorization code received");
    const redirectUrl = new URL(`${defaultRedirect}?error=no_code`, req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // ─── Extract workspace ID from state parameter ─────────────────────────
  let workspaceId: string | null = null;
  let redirectPath = defaultRedirect;

  if (state.startsWith("ws:")) {
    const parts = state.split(":");
    if (parts.length >= 2) {
      workspaceId = parts[1];
      // Any remaining parts (after workspace ID) form the redirect path
      if (parts.length > 2) {
        redirectPath = parts.slice(2).join(":");
      }
    }
  }

  // Fallback: no workspace ID
  if (!workspaceId) {
    console.error("[GoogleOAuth] No workspace_id in state parameter");
    const redirectUrl = new URL(`${defaultRedirect}?error=no_workspace`, req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // ─── Exchange code for tokens ────────────────────────────────────────────
  let tokens;
  try {
    tokens = await exchangeCode(code);
  } catch (err: unknown) {
    const e = err as { message?: string };
    console.error("[GoogleOAuth] Token exchange failed:", e.message);
    const redirectUrl = new URL(`${redirectPath}?error=exchange_failed`, req.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (!tokens.access_token) {
    console.error("[GoogleOAuth] No access token returned");
    const redirectUrl = new URL(`${redirectPath}?error=no_token`, req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // ─── Store credentials in database ────────────────────────────────
  const supabase = createServiceSupabaseClient();
  if (!supabase) {
    console.error("[GoogleOAuth] No Supabase client");
    const redirectUrl = new URL(`${redirectPath}?error=server_error`, req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Format credentials for storage
  const creds = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || null,
    expiry_date: tokens.expiry_date || null,
    scope: tokens.scope || null,
    token_type: tokens.token_type || null,
  };

  // Update workspace with credentials
  const { error: updateErr } = await supabase
    .from("workspaces")
    .update({ google_calendar_creds: creds })
    .eq("id", workspaceId);

  if (updateErr) {
    console.error("[GoogleOAuth] Failed to store credentials:", updateErr.message);
    const redirectUrl = new URL(`${redirectPath}?error=save_failed`, req.url);
    return NextResponse.redirect(redirectUrl);
  }

  console.log("[GoogleOAuth] Calendar connected successfully for workspace:", workspaceId);

  // ─── Redirect back to app with success flag ─────────────────────────
  const redirectUrl = new URL(`${redirectPath}?connected=1`, req.url);
  return NextResponse.redirect(redirectUrl);
}