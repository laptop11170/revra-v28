import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { getStripe } from "@/lib/stripe/client";
import { Stripe } from "stripe";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "DB error" }, { status: 500 });

  const { data: user } = await supabase
  .from("users")
  .select("workspace_id, role")
  .eq("clerk_user_id", userId)
  .single();

  if (!user || !["admin", "superadmin"].includes(user.role)) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stripe = getStripe();

  const account = await stripe.accounts.create({
  type: "standard",
  metadata: { workspace_id: user.workspace_id },
  });

  // Store account ID
  await supabase
  .from("workspaces")
  .update({ stripe_account_id: account.id })
  .eq("id", user.workspace_id);

  // Create account link for onboarding
  const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/marketplace?stripe=refresh`,
  return_url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/marketplace?stripe=success`,
  type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
