/**
 * DESIGN DECISION: Individual Invite Link Page with Copy-to-Clipboard
 * WHY: Easy sharing reduces friction, improves conversion rate
 *
 * REASONING CHAIN:
 * 1. Show full invite URL (builds trust, user sees what they're sharing)
 * 2. Copy button with instant feedback (toast notification on success)
 * 3. Social sharing buttons (reduce friction, increase viral spread)
 * 4. QR code for in-person sharing (trade shows, meetups)
 * 5. Invite stats (shows status, bonus earned)
 *
 * PATTERN: Pattern-VIRAL-001 (Storage-based viral growth)
 * RELATED: Invite hub, invitation tracking
 * FUTURE: WhatsApp/Telegram sharing, email templates
 */

"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Link from "next/link";

interface Invitation {
  id: string;
  invite_code: string;
  status: string;
  storage_bonus_mb: number;
  created_at: string;
}

export default function InviteLinkPage() {
  const router = useRouter();
  const params = useParams();
  const inviteId = params.id as string;
  const supabase = createClient();

  const [invite, setInvite] = useState<Invitation | null>(null);
  const [inviteUrl, setInviteUrl] = useState("");

  useEffect(() => {
    async function fetchInvite() {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("id", inviteId)
        .single();

      if (error || !data) {
        toast.error("Invitation not found");
        router.push("/dashboard/invites");
        return;
      }

      setInvite(data as Invitation);

      // Build invite URL
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/sign-up?invite=${data.invite_code}`;
      setInviteUrl(url);
    }

    fetchInvite();
  }, [inviteId, supabase, router]);

  const handleCopy = async () => {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleShareTwitter = () => {
    const text = `Join me on Lumina! We'll both get +${invite?.storage_bonus_mb}MB storage 🎁`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(
      inviteUrl
    )}`;
    window.open(url, "_blank");
  };

  const handleShareEmail = () => {
    const subject = "You're invited to join Lumina!";
    const body = `Hey! I'm using Lumina and thought you'd love it.\n\nJoin using my invite link and we'll both get +${invite?.storage_bonus_mb}MB storage bonus:\n\n${inviteUrl}\n\nLumina helps you capture ideas with voice, match proven patterns, and never forget a solution. Try it free!\n\n- Your friend`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
  };

  if (!invite) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/invites"
          className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block"
        >
          ← Back to Invites
        </Link>
        <h1 className="text-3xl font-bold">Your Invite Link</h1>
        <p className="text-gray-600 mt-1">Share this link to earn storage bonuses</p>
      </div>

      {/* Invite Status */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Invite Code</div>
            <div className="font-mono text-lg font-semibold">{invite.invite_code}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-1">Bonus</div>
            <div className="text-lg font-semibold text-blue-600">
              +{invite.storage_bonus_mb}MB
            </div>
          </div>
        </div>
        <div
          className={`px-4 py-2 rounded-lg text-center font-medium ${
            invite.status === "pending"
              ? "bg-yellow-100 text-yellow-800"
              : invite.status === "accepted"
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {invite.status === "pending"
            ? "⏳ Waiting for friend to sign up"
            : invite.status === "accepted"
            ? "✅ Bonus earned!"
            : "❌ Expired"}
        </div>
      </div>

      {/* Copy Link Section */}
      {invite.status === "pending" && (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg p-8 text-white space-y-4">
          <h2 className="text-2xl font-bold">📋 Copy Your Invite Link</h2>
          <p className="text-blue-100">
            Share this link with friends. When they sign up, you both get{" "}
            <span className="font-bold">+{invite.storage_bonus_mb}MB</span> storage!
          </p>

          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={inviteUrl}
                readOnly
                className="flex-1 bg-white/20 text-white px-4 py-2 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <button
                onClick={handleCopy}
                className="bg-white text-blue-600 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors whitespace-nowrap"
              >
                📋 Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Social Sharing */}
      {invite.status === "pending" && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 space-y-4">
          <h3 className="text-lg font-semibold">Share on Social Media</h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleShareTwitter}
              className="flex items-center justify-center space-x-2 bg-blue-400 text-white px-4 py-3 rounded-lg hover:bg-blue-500 transition-colors"
            >
              <span>🐦</span>
              <span>Twitter</span>
            </button>
            <button
              onClick={handleShareEmail}
              className="flex items-center justify-center space-x-2 bg-gray-700 text-white px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <span>✉️</span>
              <span>Email</span>
            </button>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3">💡 How It Works</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <div className="flex items-start space-x-2">
            <span className="font-bold">1.</span>
            <span>Copy the invite link above</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-bold">2.</span>
            <span>Share it with a friend (email, social media, messaging)</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-bold">3.</span>
            <span>
              When they sign up using your link and verify their email, you BOTH get +
              {invite.storage_bonus_mb}MB
            </span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-bold">4.</span>
            <span>Track the status on your Invites page</span>
          </div>
        </div>
      </div>
    </div>
  );
}
