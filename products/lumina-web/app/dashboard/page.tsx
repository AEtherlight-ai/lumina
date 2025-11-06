/**
 * DESIGN DECISION: Dashboard overview with key metrics
 * WHY: Show user stats, storage usage, subscription status at a glance
 *
 * REASONING CHAIN:
 * 1. Fetch user profile + subscription data
 * 2. Calculate storage percentage (used / total)
 * 3. Show quick stats (devices, invites, patterns)
 * 4. Display subscription tier with upgrade CTA
 * 5. Recent activity feed
 *
 * PATTERN: Pattern-DASHBOARD-002 (Dashboard Overview)
 */

import { createClient } from '@/lib/supabase/server';
import { HardDrive, Users, Zap, TrendingUp } from 'lucide-react';
import ConnectionStatus from './components/ConnectionStatus';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch devices count
  const { count: devicesCount } = await supabase
    .from('devices')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_active', true);

  // Fetch invitations count
  const { count: invitesCount } = await supabase
    .from('invitations')
    .select('*', { count: 'exact', head: true })
    .eq('inviter_id', user.id)
    .eq('status', 'accepted');

  // Calculate total storage
  const totalStorageMB = (profile?.storage_limit_mb || 0) + (profile?.storage_bonus_mb || 0);
  const usedStorageMB = profile?.storage_used_mb || 0;
  const storagePercentage = totalStorageMB > 0 ? Math.round((usedStorageMB / totalStorageMB) * 100) : 0;

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, {profile?.full_name || 'there'}!</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Storage Usage */}
        <StatCard
          icon={HardDrive}
          label="Storage Used"
          value={`${usedStorageMB}MB / ${totalStorageMB}MB`}
          percentage={storagePercentage}
          color="blue"
        />

        {/* Active Devices */}
        <StatCard
          icon={Zap}
          label="Active Devices"
          value={devicesCount || 0}
          color="purple"
        />

        {/* Accepted Invites */}
        <StatCard
          icon={Users}
          label="Accepted Invites"
          value={invitesCount || 0}
          color="green"
        />

        {/* Storage Bonus */}
        <StatCard
          icon={TrendingUp}
          label="Bonus Storage"
          value={`${profile?.storage_bonus_mb || 0}MB`}
          color="cyan"
        />
      </div>

      {/* Subscription Status */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Subscription Status</h2>
            <p className="text-gray-600">
              You're on the <span className="font-semibold capitalize">{profile?.subscription_tier || 'free'}</span> plan
            </p>
          </div>
          {profile?.subscription_tier === 'free' && (
            <a
              href="#pricing"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Upgrade Plan
            </a>
          )}
        </div>

        {/* Storage Progress Bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Storage Usage</span>
            <span className="text-sm text-gray-500">{storagePercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                storagePercentage > 90
                  ? 'bg-red-500'
                  : storagePercentage > 70
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${storagePercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Connection Status + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connection Status Widget (left column) */}
        <div className="lg:col-span-1">
          <ConnectionStatus />
        </div>

        {/* Quick Actions (right columns) */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <QuickAction
            title="Add Device"
            description="Connect a new device to sync patterns"
            href="/dashboard/devices"
            color="blue"
          />
          <QuickAction
            title="Invite Friends"
            description="Get +10-50MB storage per accepted invite"
            href="/dashboard/invites"
            color="purple"
          />
          <QuickAction
            title="View Analytics"
            description="See your usage stats and time saved"
            href="/dashboard/analytics"
            color="blue"
          />
          <QuickAction
            title="Manage Settings"
            description="Configure your account preferences"
            href="/dashboard/settings"
            color="gray"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  percentage,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  percentage?: number;
  color: 'blue' | 'purple' | 'green' | 'cyan';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    cyan: 'bg-cyan-100 text-cyan-600',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-4">
        <div className={`flex-shrink-0 p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
      </div>
      {percentage !== undefined && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                color === 'blue' ? 'bg-blue-500' :
                color === 'purple' ? 'bg-purple-500' :
                color === 'green' ? 'bg-green-500' :
                'bg-cyan-500'
              }`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickAction({
  title,
  description,
  href,
  color,
}: {
  title: string;
  description: string;
  href: string;
  color: 'blue' | 'purple' | 'gray';
}) {
  const colorClasses = {
    blue: 'hover:border-blue-600',
    purple: 'hover:border-purple-600',
    gray: 'hover:border-gray-400',
  };

  return (
    <a
      href={href}
      className={`block bg-white rounded-2xl shadow-sm border-2 border-gray-200 ${colorClasses[color]} p-6 transition-colors group`}
    >
      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </a>
  );
}
