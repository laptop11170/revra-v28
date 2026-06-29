import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import Stripe from "stripe";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
  return NextResponse.json({ error: "Missing stripe-signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
  const stripe = getStripe();
  const rawBody = await req.text();
  event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
  const message = err instanceof Error ? err.message : "Unknown error";
  console.error("Stripe webhook verification failed:", message);
  return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
  return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const md = session.metadata || {};

  const leadId = md.lead_id;
  const leadSource = md.lead_source as "revra" | "workspace";
  const buyerId = md.buyer_id;
  const buyerWorkspaceId = md.buyer_workspace_id;
  const priceCents = parseInt(md.price_cents || "0", 10);
  const paymentIntent = session.payment_intent as string;

  if (!leadId || !leadSource || !buyerId || !buyerWorkspaceId) {
  console.error("Stripe webhook: missing metadata", md);
  return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  if (!supabase) return NextResponse.json({ error: "DB error" }, { status: 500 });

  // 1. Fetch the lead to get its data
  let leadData: Record<string, unknown> | null = null;
  let sellerWorkspaceId: string | null = null;

  if (leadSource === "revra") {
  const { data } = await supabase
  .from("marketplace_leads")
  .select("*")
  .eq("id", leadId)
  .single();
  if (data) {
  leadData = data;
  sellerWorkspaceId = null;
  }
  } else {
  const { data } = await supabase
  .from("marketplace_workspace_leads")
  .select("*")
  .eq("id", leadId)
  .single();
  if (data) {
  leadData = data;
  sellerWorkspaceId = data.workspace_id as string;
  }
  }

  if (!leadData) {
  console.error("Stripe webhook: lead not found", { leadId, leadSource });
  return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // 2. Mark lead as sold
  const now = new Date().toISOString();

  if (leadSource === "revra") {
  await supabase
  .from("marketplace_leads")
  .update({ status: "sold", sold_to: buyerId, sold_at: now })
  .eq("id", leadId);
  } else {
  await supabase
  .from("marketplace_workspace_leads")
  .update({ status: "sold", sold_to: buyerId, sold_at: now })
  .eq("id", leadId);
  }

  // 3. Log purchase
  const purchaseData = {
  lead_source: leadSource,
  marketplace_lead_id: leadSource === "revra" ? leadId : null,
  workspace_lead_id: leadSource === "workspace" ? leadId : null,
  buyer_id: buyerId,
  buyer_workspace_id: buyerWorkspaceId,
  seller_workspace_id: sellerWorkspaceId,
  price_cents: priceCents,
  stripe_payment_intent: paymentIntent,
  };

  await supabase.from("marketplace_purchases").insert(purchaseData);

  // 4. Create lead in buyer's workspace pipeline
  const customFields = (leadData.custom_fields as unknown[]) || [];

  const insertPayload = {
  workspace_id: buyerWorkspaceId,
  assigned_agent_id: buyerId,
  first_name: leadData.first_name as string,
  last_name: leadData.last_name as string,
  email: leadData.email as string || null,
  phone: leadData.phone as string,
  lead_type: (leadData.lead_type as string) || null,
  source: (leadData.source as string) || null,
  pipeline_stage: "new_lead",
  score: 0,
  tags: [],
  previous_stages: [],
  notes: leadData.notes as string || null,
  enrichment_data: {
  marketplace_purchase_id: null, // filled after purchase insert if needed
  marketplace_lead_id: leadId,
  marketplace_lead_source: leadSource,
  },
  is_marketplace_lead: true,
  marketplace_data: {
  purchased_at: now,
  price_cents: priceCents,
  lead_source: leadSource,
  custom_fields: customFields,
  },
  };

  const { error: leadInsertError } = await supabase.from("leads").insert(insertPayload);
  if (leadInsertError) {
  console.error("Stripe webhook: failed to create workspace lead:", leadInsertError.message);
  // Don't fail the webhook — the purchase is done, just log the lead creation error
  }

  return NextResponse.json({ received: true, lead_created: !leadInsertError });
}
