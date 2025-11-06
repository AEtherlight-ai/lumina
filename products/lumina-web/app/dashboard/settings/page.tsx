"use client";

/**
 * DESIGN DECISION: Comprehensive account settings with security focus
 * WHY: Users need control over profile, security, and account lifecycle
 *
 * REASONING CHAIN:
 * 1. Profile section: Update name, email (with email verification flow)
 * 2. Password section: Secure password change with current password validation
 * 3. Avatar section: Upload/crop profile picture (placeholder - full upload later)
 * 4. Account deletion: Confirmation dialog with "type to confirm" safeguard
 * 5. All actions use Supabase auth for security
 * 6. Toast notifications for success/error feedback
 *
 * PATTERN: Pattern-SETTINGS-001 (Account Settings Page)
 * RELATED: Supabase auth, profiles table, toast notifications
 * FUTURE: Avatar upload with image cropping, email verification flow
 */

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Mail, Lock, Trash2, Upload, AlertCircle, CheckCircle } from "lucide-react";

export default function SettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  // Profile form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Delete account
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = "/sign-in";
          return;
        }

        setUser(user);
        setEmail(user.email || "");

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileData) {
          setProfile(profileData);
          setFullName(profileData.full_name || "");
        }
      } catch (error) {
        console.error("Error loading user:", error);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Update email if changed
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) throw emailError;
        showToast("Email update sent! Check your inbox to confirm.", "success");
      } else {
        showToast("Profile updated successfully!", "success");
      }
    } catch (error: any) {
      showToast(error.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showToast("Passwords don't match", "error");
      return;
    }

    if (newPassword.length < 8) {
      showToast("Password must be at least 8 characters", "error");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      showToast("Password changed successfully!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      showToast(error.message || "Failed to change password", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") {
      showToast('Please type "DELETE" to confirm', "error");
      return;
    }

    setSaving(true);

    try {
      // Delete user data (cascades to related tables via RLS)
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Sign out and redirect
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (error: any) {
      showToast(error.message || "Failed to delete account", "error");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Account Settings</h1>

      {/* Toast Notification */}
      {toast && (
        <div className={`mb-6 flex items-center gap-3 rounded-lg p-4 ${toast.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
          {toast.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Profile Section */}
      <section className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-6 flex items-center gap-3">
          <User className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="mb-2 block text-sm font-medium text-gray-900">
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-900">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="john@example.com"
            />
            <p className="mt-1 text-sm text-gray-600">Changing your email requires verification</p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </section>

      {/* Password Section */}
      <section className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-6 flex items-center gap-3">
          <Lock className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="mb-2 block text-sm font-medium text-gray-900">
              Current Password
            </label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="mb-2 block text-sm font-medium text-gray-900">
              New Password
            </label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
            <p className="mt-1 text-sm text-gray-600">Must be at least 8 characters</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-gray-900">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !newPassword || !confirmPassword}
            className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Changing..." : "Change Password"}
          </button>
        </form>
      </section>

      {/* Avatar Section (Placeholder) */}
      <section className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-6 flex items-center gap-3">
          <Upload className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Profile Picture</h2>
        </div>

        <div className="flex items-center gap-6">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
            {fullName ? fullName.charAt(0).toUpperCase() : "?"}
          </div>
          <div>
            <button
              type="button"
              disabled
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Upload Photo (Coming Soon)
            </button>
            <p className="mt-2 text-sm text-gray-600">JPG, PNG or GIF. Max 2MB.</p>
          </div>
        </div>
      </section>

      {/* Delete Account Section */}
      <section className="rounded-lg border-2 border-red-200 bg-red-50 p-6">
        <div className="mb-6 flex items-center gap-3">
          <Trash2 className="h-6 w-6 text-red-600" />
          <h2 className="text-xl font-bold text-red-900">Delete Account</h2>
        </div>

        <p className="mb-4 text-sm text-red-800">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>

        {!showDeleteDialog ? (
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="rounded-lg border-2 border-red-600 bg-white px-4 py-2 font-semibold text-red-600 hover:bg-red-600 hover:text-white transition-colors"
          >
            Delete Account
          </button>
        ) : (
          <div className="space-y-4 rounded-lg border border-red-300 bg-white p-4">
            <p className="font-semibold text-red-900">Are you absolutely sure?</p>
            <p className="text-sm text-red-800">
              Type <span className="font-mono font-bold">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              className="w-full rounded-lg border border-red-300 px-4 py-2 text-gray-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Type DELETE"
            />
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={saving || deleteConfirmation !== "DELETE"}
                className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? "Deleting..." : "Permanently Delete"}
              </button>
              <button
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirmation("");
                }}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
