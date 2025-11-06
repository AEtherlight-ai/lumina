/**
 * DESIGN DECISION: Subscription Management with Stripe Checkout
 * WHY: Enable users to upgrade/downgrade plans and manage billing
 *
 * REASONING CHAIN:
 * 1. Show current plan with clear benefits (user sees value)
 * 2. Compare all tiers side-by-side (informed decision-making)
 * 3. Stripe Checkout for secure payment (PCI compliance, no custom forms)
 * 4. Customer Portal for self-service (reduce support burden)
 * 5. Webhook handler updates database on subscription changes (real-time sync)
 * 6. Storage limits update automatically on tier change
 *
 * PATTERN: Pattern-STRIPE-001 (Subscription management)
 * RELATED: Profile storage limits, invite bonuses
 * FUTURE: Annual billing discount, add-ons (extra storage, priority support)
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const tiers = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    pricePerMonth: 0,
    storage: "100MB",
    storageMb: 100,
    features: [
      "Voice capture",
      "Local pattern matching",
      "VS Code integration",
      "Desktop app",
      "1 device",
      "Local-only storage",
    ],
    cta: "Current Plan",
    popular: false,
  },
  {
    id: "network",
    name: "Network",
    price: "$4.99",
    pricePerMonth: 4.99,
    storage: "500MB + viral bonus",
    storageMb: 500,
    inviteBonus: 10,
    features: [
      "Everything in Free",
      "Team sync (5 users)",
      "Cross-device sync",
      "1 knowledge pool",
      "+10MB per invite",
      "5 devices",
    ],
    cta: "Upgrade to Network",
    popular: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$14.99",
    pricePerMonth: 14.99,
    storage: "2GB + viral bonus",
    storageMb: 2048,
    inviteBonus: 20,
    features: [
      "Everything in Network",
      "Unlimited team size",
      "3 knowledge pools",
      "Priority support",
      "+20MB per invite",
      "10 devices",
      "Advanced analytics",
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$49",
    pricePerMonth: 49,
    storage: "10GB + viral bonus",
    storageMb: 10240,
    inviteBonus: 50,
    features: [
      "Everything in Pro",
      "Unlimited knowledge pools",
      "Self-hosted option",
      "SSO/SAML",
      "SLA guarantee",
      "+50MB per invite",
      "Unlimited devices",
      "Dedicated support",
    ],
    cta: "Upgrade to Enterprise",
    popular: false,
  },
];

export default async function SubscriptionPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, storage_limit_mb, storage_bonus_mb")
    .eq("id", user.id)
    .single();

  const currentTier = profile?.subscription_tier || "free";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">Choose Your Plan</h1>
        <p className="text-gray-600 text-lg">
          Upgrade anytime. Cancel anytime. All plans include our core features.
        </p>
      </div>

      {/* Current Plan Banner */}
      <div className="bg-blue-50 rounded-xl p-6 border-2 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-blue-600 font-medium mb-1">Current Plan</div>
            <div className="text-2xl font-bold capitalize">{currentTier}</div>
            <div className="text-sm text-gray-600 mt-1">
              Storage: {profile?.storage_limit_mb || 0}MB base +{" "}
              {profile?.storage_bonus_mb || 0}MB bonus
            </div>
          </div>
          {currentTier !== "free" && (
            <Link
              href="https://billing.stripe.com/p/login/test_YOUR_PORTAL_LINK"
              target="_blank"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Manage Billing
            </Link>
          )}
        </div>
      </div>

      {/* Pricing Tiers */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map((tier) => {
          const isCurrent = currentTier === tier.id;

          return (
            <div
              key={tier.id}
              className={`relative bg-white rounded-xl shadow-lg border-2 p-6 transition-all ${
                tier.popular
                  ? "border-purple-500 transform scale-105"
                  : isCurrent
                  ? "border-blue-500"
                  : "border-gray-200"
              }`}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </div>
              )}

              {/* Current Badge */}
              {isCurrent && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Current Plan
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                <div className="text-4xl font-bold mb-1">{tier.price}</div>
                <div className="text-sm text-gray-600">/month</div>
                <div className="text-sm text-blue-600 font-medium mt-2">{tier.storage}</div>
              </div>

              <ul className="space-y-3 mb-6">
                {tier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start text-sm">
                    <span className="text-green-500 mr-2 mt-0.5">✓</span>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <button
                  disabled
                  className="w-full bg-gray-200 text-gray-500 py-3 rounded-lg font-medium cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <form
                  action={async () => {
                    "use server";
                    // TODO: Implement Stripe Checkout
                    // For now, just update tier directly (development only)
                    const supabase = await createClient();
                    const {
                      data: { user },
                    } = await supabase.auth.getUser();
                    if (!user) return;

                    await supabase
                      .from("profiles")
                      .update({
                        subscription_tier: tier.id,
                        storage_limit_mb: tier.storageMb,
                      })
                      .eq("id", user.id);

                    redirect("/dashboard/subscription");
                  }}
                >
                  <button
                    type="submit"
                    className={`w-full py-3 rounded-lg font-medium transition-colors ${
                      tier.popular
                        ? "bg-purple-600 text-white hover:bg-purple-700"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {tier.cta}
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
        <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-2">Can I change plans anytime?</h3>
            <p className="text-gray-600">
              Yes! Upgrade or downgrade anytime. Upgrades take effect immediately. Downgrades
              take effect at the end of your billing period.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">What happens to my data if I downgrade?</h3>
            <p className="text-gray-600">
              Your data stays safe! If you exceed your new storage limit, syncing will pause until
              you free up space or upgrade again.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">How do invite bonuses work?</h3>
            <p className="text-gray-600">
              Invite friends and earn extra storage! Network tier gets +10MB per invite, Pro gets
              +20MB, and Enterprise gets +50MB. No limit on invites!
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">Do you offer annual billing?</h3>
            <p className="text-gray-600">
              Not yet, but it's coming soon! Annual plans will save you 20% compared to monthly
              billing.
            </p>
          </div>
        </div>
      </div>

      {/* Enterprise CTA */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-xl shadow-lg p-8 text-white text-center">
        <h2 className="text-3xl font-bold mb-2">Need a Custom Plan?</h2>
        <p className="text-gray-300 mb-6">
          Large teams, self-hosted requirements, or custom integrations? Let's talk.
        </p>
        <Link
          href="mailto:sales@lumina.ai"
          className="inline-block bg-white text-gray-900 px-8 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
        >
          Contact Sales
        </Link>
      </div>
    </div>
  );
}
