import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { auth } from "@clerk/nextjs/server";
import { getStripe } from "@/lib/stripe/client";
import Stripe from "stripe";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "DB error" }, { status: 500 });

  const { data: user } = await supabase
  .from("users")
  .select("id, workspace_id, email, role")
  .eq("clerk_user_id", userId)
  .single();

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const { leadId, leadSource } = body;
  if (!leadId || !leadSource || !["revra", "workspace"].includes(leadSource)) {
  return NextResponse.json({ error: "leadId and leadSource (revra|workspace) required" }, { status: 400 });
  }

  let lead: Record<string, unknown> | null = null;
  let priceCents = 0;
  let sellerStripeAccountId: string | null = null;
  let productName = "Lead Purchase";

  if (leadSource === "revra") {
  const { data: ml } = await supabase
  .from("marketplace_leads")
  .select("*, marketplace_tiers!inner(price_cents)")
  .eq("id", leadId)
  .eq("status", "available")
  .single();

  if (!ml) return NextResponse.json({ error: "Lead not found or sold" }, { status: 404 });
  lead = ml;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  priceCents = (ml.marketplace_tiers as any)?.price_cents ?? ml.sold_price_cents ?? 0;
  productName = `RevRa Lead — ${ml.first_name} ${ml.last_name} (${ml.tier})`;
  sellerStripeAccountId = null; // money goes to RevRa
  } else {
  const { data: wl } = await supabase
  .from("marketplace_workspace_leads")
  .select("*, workspaces!inner(stripe_account_id)")
  .eq("id", leadId)
  .eq("status", "available")
  .single();

  if (!wl) return NextResponse.json({ error: "Lead not found or sold" }, { status: 404 });
  lead = wl;
  priceCents = wl.price_cents ?? 0;
  productName = `${wl.first_name} ${wl.last_name} — ${wl.tier}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sellerStripeAccountId = (wl.workspaces as any)?.stripe_account_id ?? null;

  if (!sellerStripeAccountId) {
  return NextResponse.json({ error: "Seller Stripe not connected" }, { status: 400 });
  }
  }

  const checkoutData: Stripe.Checkout.SessionCreateParams = {
  payment_method_types: ["card"],
  line_items: [{
  price_data: {
  currency: "usd",
  product_data: { name: productName },
  unit_amount: priceCents,
  },
  quantity: 1,
  }],
  mode: "payment",
  metadata: {
  lead_id: leadId,
  lead_source: leadSource,
  buyer_id: user.id,
  buyer_workspace_id: user.workspace_id,
  price_cents: String(priceCents),
  },
  success_url: `${process.env.NEXT_PUBLIC_APP_URL}/user/marketplace?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/user/marketplace?purchase=cancelled`,
  customer_email: user.email || undefined,
  };

  // For workspace leads: route payment to admin's connected account
  if (leadSource === "workspace" && sellerStripeAccountId) {
  checkoutData.payment_intent_data = {
  transfer_data: {
  destination: sellerStripeAccountId,
  },
  };
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create(checkoutData);

  return NextResponse.json({ url: session.url });
}
