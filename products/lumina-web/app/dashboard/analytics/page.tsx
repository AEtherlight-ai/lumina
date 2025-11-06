/**
 * DESIGN DECISION: Usage Analytics Dashboard with historical charts
 * WHY: Users need to see ROI from Lumina (time saved, patterns matched, success rate)
 *
 * REASONING CHAIN:
 * 1. Desktop app tracks usage events (voice captures, searches, patterns matched)
 * 2. Desktop syncs events to web backend via API
 * 3. Web aggregates metrics (daily totals, weekly trends)
 * 4. Dashboard displays charts (voice captures over time, time saved, success rate)
 * 5. User sees tangible value ("You saved 7.5 hours this week!")
 *
 * PATTERN: Pattern-ANALYTICS-001 (Usage Analytics Dashboard)
 * RELATED: W2-002 (Usage Analytics Dashboard), app/api/analytics
 */

'use client';

import { useEffect, useState } from 'react';
import { Loader2, TrendingUp, Clock, Target, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AnalyticsData {
  total_captures: number;
  total_searches: number;
  total_patterns_matched: number;
  success_rate: number;
  time_saved_hours: number;
  daily_stats: {
    date: string;
    captures: number;
    searches: number;
    patterns_matched: number;
    time_saved_minutes: number;
  }[];
  weekly_stats: {
    week_start: string;
    captures: number;
    searches: number;
    patterns_matched: number;
    time_saved_hours: number;
  }[];
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?range=${timeRange}`);
      const data = await res.json();

      if (res.ok) {
        setAnalytics(data);
      } else {
        toast.error(data.error || 'Failed to load analytics');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No analytics data available yet.</p>
        <p className="text-sm text-gray-400 mt-2">
          Start using Lumina desktop app to see your usage statistics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Usage Analytics</h1>
        <p className="text-gray-600 mt-2">
          Track your productivity gains with Lumina
        </p>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setTimeRange('7d')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            timeRange === '7d'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Last 7 Days
        </button>
        <button
          onClick={() => setTimeRange('30d')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            timeRange === '30d'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Last 30 Days
        </button>
        <button
          onClick={() => setTimeRange('90d')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            timeRange === '90d'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Last 90 Days
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Voice Captures"
          value={analytics.total_captures}
          icon={Zap}
          color="blue"
        />
        <MetricCard
          title="Searches"
          value={analytics.total_searches}
          icon={TrendingUp}
          color="green"
        />
        <MetricCard
          title="Patterns Matched"
          value={analytics.total_patterns_matched}
          icon={Target}
          color="purple"
        />
        <MetricCard
          title="Time Saved"
          value={`${analytics.time_saved_hours.toFixed(1)}h`}
          subtitle={`~${(analytics.time_saved_hours * 60).toFixed(0)} minutes`}
          icon={Clock}
          color="orange"
        />
      </div>

      {/* Success Rate */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Success Rate</h2>
          <span className="text-3xl font-bold text-green-600">
            {analytics.success_rate.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-green-600 h-4 rounded-full transition-all"
            style={{ width: `${analytics.success_rate}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Percentage of searches that found relevant patterns
        </p>
      </div>

      {/* Daily Stats Chart (Simple Bar Chart) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Daily Activity</h2>
        <div className="space-y-4">
          {analytics.daily_stats.slice(-14).map((day) => (
            <div key={day.date} className="flex items-center gap-4">
              <div className="w-24 text-sm text-gray-600">
                {new Date(day.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className="bg-blue-600 h-8 rounded"
                    style={{
                      width: `${Math.max(
                        (day.captures / Math.max(...analytics.daily_stats.map((d) => d.captures))) * 100,
                        2
                      )}%`,
                    }}
                  />
                  <span className="text-sm text-gray-700">{day.captures} captures</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Weekly Summary</h2>
        <div className="space-y-6">
          {analytics.weekly_stats.slice(-4).map((week) => (
            <div key={week.week_start} className="border-l-4 border-blue-600 pl-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">
                  Week of {new Date(week.week_start).toLocaleDateString()}
                </h3>
                <span className="text-sm font-medium text-blue-600">
                  {week.time_saved_hours.toFixed(1)}h saved
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">{week.captures}</span> captures
                </div>
                <div>
                  <span className="font-medium">{week.searches}</span> searches
                </div>
                <div>
                  <span className="font-medium">{week.patterns_matched}</span> patterns
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}
