/**
 * DESIGN DECISION: Viral Invitation Hub with Storage Rewards
 * WHY: Storage-based incentives drive viral growth (K-factor >1.5 target)
 *
 * REASONING CHAIN:
 * 1. Unique invite codes prevent fraud (one code per invitation)
 * 2. Storage bonus visualization motivates inviting friends (+10MB, +20MB, +50MB based on tier)
 * 3. Invite status tracking builds trust (user sees pending/accepted/expired)
 * 4. Copy-to-clipboard reduces friction (easy sharing)
 * 5. Invite history shows progress (gamification: "5/10 invites accepted")
 * 6. Total bonus calculation proves value ("You've earned 150MB from invites!")
 *
 * PATTERN: Pattern-VIRAL-001 (Storage-based viral growth)
 * RELATED: Profile storage limits, subscription tiers
 * FUTURE: Social sharing buttons (Twitter, Facebook), referral leaderboards
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { nanoid } from "nanoid";

interface Invitation {
  id: string;
  invite_code: string;
  status: "pending" | "accepted" | "expired";
  storage_bonus_mb: number;
  invited_email: string | null;
  created_at: string;
  accepted_at: string | null;
}

export default async function InvitesPage() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch user profile for tier info
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, storage_bonus_mb")
    .eq("id", user.id)
    .single();

  // Calculate storage bonus based on tier
  const bonusPerInvite =
    profile?.subscription_tier === "enterprise"
      ? 50
      : profile?.subscription_tier === "pro"
      ? 20
      : 10;

  // Fetch all invitations
  const { data: invitations } = await supabase
    .from("invitations")
    .select("*")
    .eq("inviter_id", user.id)
    .order("created_at", { ascending: false });

  const inviteList = (invitations || []) as Invitation[];

  // Calculate stats
  const totalInvites = inviteList.length;
  const acceptedInvites = inviteList.filter((inv) => inv.status === "accepted").length;
  const pendingInvites = inviteList.filter((inv) => inv.status === "pending").length;
  const totalBonusEarned = inviteList
    .filter((inv) => inv.status === "accepted")
    .reduce((sum, inv) => sum + inv.storage_bonus_mb, 0);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Status badge colors
  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    accepted: "bg-green-100 text-green-800",
    expired: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Invite Friends</h1>
        <p className="text-gray-600 mt-1">
          Earn <span className="font-semibold text-blue-600">+{bonusPerInvite}MB</span> storage for
          each friend who joins
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="text-gray-600 text-sm mb-1">Total Invites</div>
          <div className="text-3xl font-bold">{totalInvites}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="text-gray-600 text-sm mb-1">Accepted</div>
          <div className="text-3xl font-bold text-green-600">{acceptedInvites}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="text-gray-600 text-sm mb-1">Pending</div>
          <div className="text-3xl font-bold text-yellow-600">{pendingInvites}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="text-gray-600 text-sm mb-1">Bonus Earned</div>
          <div className="text-3xl font-bold text-blue-600">{totalBonusEarned}MB</div>
        </div>
      </div>

      {/* Generate New Invite */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-8 text-white">
        <h2 className="text-2xl font-bold mb-4">🎁 Generate Your Invite Link</h2>
        <p className="mb-6 text-blue-100">
          Share this link with friends. When they sign up, you both get
          <span className="font-bold"> +{bonusPerInvite}MB</span> storage!
        </p>

        <form action={async () => {
          "use server";
          const supabase = await createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) return;

          // Generate unique invite code
          const inviteCode = nanoid(10);

          // Insert invitation
          await supabase.from("invitations").insert({
            inviter_id: user.id,
            invite_code: inviteCode,
            storage_bonus_mb: bonusPerInvite,
            status: "pending",
          });

          // Redirect to refresh page
          redirect("/dashboard/invites");
        }}>
          <button
            type="submit"
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors shadow-md"
          >
            + Generate New Invite Link
          </button>
        </form>
      </div>

      {/* Invite History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Invite History</h2>
        </div>

        {inviteList.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📨</div>
            <h3 className="text-xl font-semibold mb-2">No Invites Yet</h3>
            <p className="text-gray-600 mb-6">
              Generate your first invite link to start earning storage bonuses
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invite Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bonus
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inviteList.map((invite) => (
                  <tr key={invite.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-sm">{invite.invite_code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                          statusColors[invite.status]
                        }`}
                      >
                        {invite.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-blue-600">
                        +{invite.storage_bonus_mb}MB
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(invite.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {invite.status === "pending" && (
                        <Link
                          href={`/dashboard/invites/${invite.id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Copy Link
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3">💡 How Invites Work</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <div className="flex items-start space-x-2">
            <span className="font-bold">1.</span>
            <span>Generate a unique invite link above</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-bold">2.</span>
            <span>Share the link with friends via email, social media, or messaging</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-bold">3.</span>
            <span>
              When they sign up and verify their email, you BOTH get +{bonusPerInvite}MB storage
            </span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-bold">4.</span>
            <span>No limit! Invite unlimited friends and keep earning storage</span>
          </div>
        </div>
      </div>

      {/* Upgrade CTA */}
      {profile?.subscription_tier === "free" && (
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl shadow-lg p-8 text-white">
          <h3 className="text-2xl font-bold mb-2">💎 Want Bigger Bonuses?</h3>
          <p className="mb-4 text-purple-100">
            Upgrade to <span className="font-bold">Pro</span> for <span className="font-bold">+20MB</span> per invite, or{" "}
            <span className="font-bold">Enterprise</span> for <span className="font-bold">+50MB</span> per invite!
          </p>
          <Link
            href="/dashboard/subscription"
            className="inline-block bg-white text-purple-600 px-6 py-3 rounded-lg font-medium hover:bg-purple-50 transition-colors shadow-md"
          >
            View Pricing
          </Link>
        </div>
      )}
    </div>
  );
}
