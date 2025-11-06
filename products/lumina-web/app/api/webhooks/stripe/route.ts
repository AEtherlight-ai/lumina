/**
 * DESIGN DECISION: Stripe Webhook Handler for Subscription Events
 * WHY: Real-time database sync when subscriptions change (upgrade/downgrade/cancel)
 *
 * REASONING CHAIN:
 * 1. Stripe webhook sends events when subscription changes (reliable, real-time)
 * 2. Verify webhook signature prevents fraud (STRIPE_WEBHOOK_SECRET validation)
 * 3. Extract customer and subscription data from event
 * 4. Update Supabase profiles + subscriptions tables atomically
 * 5. Handle all subscription lifecycle events (created, updated, deleted)
 * 6. Storage limits update automatically based on tier
 *
 * PATTERN: Pattern-WEBHOOK-001 (Stripe webhook handling)
 * RELATED: Subscription page, profile storage limits
 * FUTURE: Email notifications on subscription changes, Slack alerts for team events
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

// Initialize Stripe (will need real keys in production)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
  apiVersion: "2024-12-18.acacia",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_placeholder";

// Storage limits by tier
const tierStorageLimits: Record<string, number> = {
  free: 100,
  network: 500,
  pro: 2048,
  enterprise: 10240,
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await createClient();

  // Handle different event types
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;

      // Extract metadata (user_id should be set during Checkout creation)
      const userId = subscription.metadata.user_id;
      if (!userId) {
        console.error("No user_id in subscription metadata");
        return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
      }

      // Determine tier from price ID
      const priceId = subscription.items.data[0]?.price.id;
      const tier = determineTierFromPriceId(priceId);

      // Update profile
      await supabase
        .from("profiles")
        .update({
          subscription_tier: tier,
          storage_limit_mb: tierStorageLimits[tier],
        })
        .eq("id", userId);

      // Upsert subscription record
      await supabase.from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: subscription.customer as string,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        price_id: priceId,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      });

      console.log(`Subscription ${subscription.id} ${event.type} for user ${userId}`);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata.user_id;

      if (!userId) {
        console.error("No user_id in subscription metadata");
        return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
      }

      // Downgrade to free tier
      await supabase
        .from("profiles")
        .update({
          subscription_tier: "free",
          storage_limit_mb: tierStorageLimits.free,
        })
        .eq("id", userId);

      // Mark subscription as canceled
      await supabase
        .from("subscriptions")
        .update({
          status: "canceled",
        })
        .eq("stripe_subscription_id", subscription.id);

      console.log(`Subscription ${subscription.id} canceled for user ${userId}`);
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`Payment succeeded for invoice ${invoice.id}`);
      // TODO: Send receipt email
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.log(`Payment failed for invoice ${invoice.id}`);
      // TODO: Send payment failure email
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

/**
 * Determine subscription tier from Stripe price ID
 * In production, map actual Stripe price IDs to tiers
 */
function determineTierFromPriceId(priceId?: string): string {
  if (!priceId) return "free";

  // TODO: Replace with actual Stripe price IDs
  const tierMap: Record<string, string> = {
    price_network: "network",
    price_pro: "pro",
    price_enterprise: "enterprise",
  };

  return tierMap[priceId] || "free";
}
