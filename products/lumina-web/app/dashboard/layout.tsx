/**
 * DESIGN DECISION: Dashboard layout with sidebar navigation
 * WHY: Consistent navigation, protected routes, user context
 *
 * REASONING CHAIN:
 * 1. Server component for auth check
 * 2. Redirect to sign-in if not authenticated (middleware catches this)
 * 3. Sidebar with nav links (Dashboard, Devices, Invites, Settings)
 * 4. User profile dropdown
 * 5. Sign out button
 *
 * PATTERN: Pattern-DASHBOARD-001 (Protected Dashboard Layout)
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Home, HardDrive, Users, Settings, LogOut, Download, BarChart3, Code2, MessageSquare } from 'lucide-react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 shadow-lg">
                <svg viewBox="0 0 24 24" className="h-6 w-6 text-white font-bold" fill="currentColor">
                  <text x="12" y="18" textAnchor="middle" fontSize="16" fontWeight="900" fontFamily="system-ui">ÆL</text>
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-700">Lumina</span>
            </Link>

            {/* User Profile */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-gray-900">{profile?.full_name || user.email}</div>
                <div className="text-xs text-gray-500 capitalize">{profile?.subscription_tier || 'free'} Plan</div>
              </div>
              <form action="/auth/sign-out" method="post">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <nav className="p-4 space-y-1">
            <NavLink href="/dashboard" icon={Home}>
              Dashboard
            </NavLink>
            <NavLink href="/dashboard/devices" icon={HardDrive}>
              Devices
            </NavLink>
            <NavLink href="/dashboard/download" icon={Download}>
              Download
            </NavLink>
            <NavLink href="/dashboard/analytics" icon={BarChart3}>
              Analytics
            </NavLink>
            <NavLink href="/dashboard/patterns" icon={Code2}>
              Pattern Library
            </NavLink>
            <NavLink href="/dashboard/feedback" icon={MessageSquare}>
              Feedback
            </NavLink>
            <NavLink href="/dashboard/invites" icon={Users}>
              Invite Hub
            </NavLink>
            <NavLink href="/dashboard/settings" icon={Settings}>
              Settings
            </NavLink>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="ml-64 flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors group"
    >
      <Icon className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
      <span className="font-medium">{children}</span>
    </Link>
  );
}
