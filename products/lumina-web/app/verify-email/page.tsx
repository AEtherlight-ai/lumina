/**
 * DESIGN DECISION: Email verification page
 * WHY: Inform users to check their email after signup
 */

import Link from "next/link";
import { Mail } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-blue-50 to-cyan-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 shadow-lg">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-white font-bold" fill="currentColor">
              <text x="12" y="18" textAnchor="middle" fontSize="16" fontWeight="900" fontFamily="system-ui">ÆL</text>
            </svg>
          </div>
          <span className="text-2xl font-bold text-gray-700">Lumina</span>
        </Link>

        {/* Verification Card */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl p-8 border-2 border-white/50 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-10 w-10 text-blue-600" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">Check Your Email</h1>
          <p className="text-gray-600 mb-8">
            We've sent you a verification link. Click the link in your email to activate your account.
          </p>

          <div className="space-y-4">
            <Link
              href="/sign-in"
              className="block w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Back to Sign In
            </Link>

            <p className="text-sm text-gray-500">
              Didn't receive an email? Check your spam folder or{" "}
              <Link href="/sign-up" className="text-blue-600 hover:text-blue-700 underline">
                try again
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
