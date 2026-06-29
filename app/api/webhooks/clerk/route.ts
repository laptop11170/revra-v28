import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Webhook } from "svix";

// Default workspace ID — matches the demo workspace in seed data
const DEFAULT_WORKSPACE_ID = "00000000-0000-0000-0000-000000000001";

// ─── Clerk Webhook Handler ───────────────────────────────────────────────────
// POST /api/webhooks/clerk
// Handles: user.created, user.updated, user.deleted from Clerk
// Auto-assigns new users to the default workspace as "agent"
// ─────────────────────────────────────────────────────────────────────────────
// Setup steps:
// 1. In Clerk Dashboard → Webhooks → Add Endpoint
// 2. URL: https://your-domain.com/api/webhooks/clerk (use ngrok for local)
// 3. Enable events: user.created, user.updated, user.deleted
// 4. Copy the Signing Secret (whsec_...) to CLERK_WEBHOOK_SECRET in .env.local
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headers = req.headers;

  const svix_id = headers.get("svix-id");
  const svix_timestamp = headers.get("svix-timestamp");
  const svix_signature = headers.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // Verify webhook signature using svix
  const wh = new Webhook(webhookSecret);
  let evt: {
    type: string;
    data: {
      id?: string;
      email_addresses?: Array<{ email_address?: string }>;
      first_name?: string;
      last_name?: string;
      image_url?: string;
      public_metadata?: Record<string, unknown>;
    };
  };

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as typeof evt;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { createServiceSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });

  const { id: clerk_user_id, email_addresses, first_name, last_name, image_url, public_metadata } = evt.data;

  switch (evt.type) {
    case "user.created": {
      const primaryEmail = email_addresses?.[0]?.email_address ?? "";
      const fullName = [first_name, last_name].filter(Boolean).join(" ") || null;
      const role = (public_metadata?.role as string) || "agent";

      const { error } = await supabase.from("users").upsert({
        clerk_user_id,
        workspace_id: DEFAULT_WORKSPACE_ID,
        email: primaryEmail,
        full_name: fullName,
        avatar_url: image_url || null,
        role,
      });

      if (error) {
        console.error("webhook user.created error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      console.log(`User created: ${clerk_user_id} → workspace ${DEFAULT_WORKSPACE_ID} as ${role}`);
      break;
    }

    case "user.updated": {
      const primaryEmail = email_addresses?.[0]?.email_address ?? "";

      const { error } = await supabase
        .from("users")
        .update({
          email: primaryEmail,
          full_name: [first_name, last_name].filter(Boolean).join(" ") || null,
          avatar_url: image_url || null,
          role: (public_metadata?.role as string) || "agent",
        })
        .eq("clerk_user_id", clerk_user_id);

      if (error) {
        console.error("webhook user.updated error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      break;
    }

    case "user.deleted": {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("clerk_user_id", clerk_user_id);

      if (error) {
        console.error("webhook user.deleted error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      break;
    }

    default:
      return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}