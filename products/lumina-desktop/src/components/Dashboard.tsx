/**
 * Dashboard Component - Usage Analytics Visualization
 *
 * DESIGN DECISION: Real-time dashboard with auto-refresh
 * WHY: Users need to see ROI ("You saved 2.5 hours this week") and track productivity
 *
 * REASONING CHAIN:
 * 1. User opens dashboard → see immediately (no loading spinner if cached)
 * 2. Dashboard auto-refreshes every 5 seconds (configurable)
 * 3. Period selector allows switching Daily/Weekly/Monthly/All-time
 * 4. MetricsCards show key stats (total time, actions, productivity boost)
 * 5. Optional chart shows trend over time (time saved per day)
 *
 * PATTERN: Pattern-DASHBOARD-001 (Analytics Dashboard with Real-time Updates)
 * RELATED: P3-005 (Analytics Tracker), MetricsCard component
 * FUTURE: Export to CSV, custom date ranges, comparison view
 *
 * PERFORMANCE:
 * - Target: <100ms to load dashboard
 * - Target: <50ms to switch periods
 * - Auto-refresh interval: 5 seconds (configurable)
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import MetricsCard from './MetricsCard';

interface UsageMetrics {
  period: string;
  total_events: number;
  total_time_saved_minutes: number;
  total_time_saved_hours: number;
  voice_captures: number;
  searches: number;
  insertions: number;
  pattern_matches: number;
}

type Period = 'daily' | 'weekly' | 'monthly' | 'all_time';

/**
 * DESIGN DECISION: Separate Dashboard component (not in App.tsx)
 * WHY: Separation of concerns, reusability, easier testing
 */
export default function Dashboard() {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('weekly');
  const [refreshInterval] = useState(5000); // 5 seconds

  /**
   * DESIGN DECISION: Fetch metrics on mount and period change
   * WHY: Keep data fresh, respond to user selections immediately
   */
  const fetchMetrics = async () => {
    try {
      setError(null);
      const data = await invoke<UsageMetrics>('get_usage_metrics', {
        period: selectedPeriod
      });
      setMetrics(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setError(err as string);
      setLoading(false);
    }
  };

  // Fetch metrics on mount and when period changes
  useEffect(() => {
    fetchMetrics();
  }, [selectedPeriod]);

  /**
   * DESIGN DECISION: Auto-refresh metrics every 5 seconds
   * WHY: Real-time dashboard, show updates immediately after actions
   *
   * REASONING CHAIN:
   * 1. User performs action (voice capture, search, etc.)
   * 2. Action recorded to analytics database
   * 3. Dashboard auto-refreshes within 5 seconds
   * 4. User sees updated metrics without manual refresh
   */
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !error) {
        fetchMetrics();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [loading, error, refreshInterval, selectedPeriod]);

  /**
   * DESIGN DECISION: Period selector buttons (not dropdown)
   * WHY: Faster switching (one click), visually clear active period
   */
  const handlePeriodChange = (period: Period) => {
    setSelectedPeriod(period);
    setLoading(true);
  };

  /**
   * DESIGN DECISION: Show placeholder on first load, not error state
   * WHY: Analytics database might not exist yet (first run)
   */
  if (loading && !metrics) {
    return (
      <div className="dashboard loading">
        <h1>Usage Analytics</h1>
        <p>Loading your productivity metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard error">
        <h1>Usage Analytics</h1>
        <p className="error-message">
          Error loading metrics: {error}
        </p>
        <p className="error-hint">
          Start using Lumina (voice captures, searches) to see your productivity stats.
        </p>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  /**
   * DESIGN DECISION: Format period labels for display
   * WHY: Improve UX (show "Daily (Last 24h)" not just "daily")
   */
  const periodLabels: Record<Period, string> = {
    daily: 'Daily (Last 24h)',
    weekly: 'Weekly (Last 7 days)',
    monthly: 'Monthly (Last 30 days)',
    all_time: 'All Time',
  };

  /**
   * DESIGN DECISION: Calculate productivity boost percentage
   * WHY: Show tangible ROI ("You're 25% more productive")
   *
   * REASONING CHAIN:
   * 1. Assume 8-hour workday (480 minutes)
   * 2. Time saved = extra productivity
   * 3. Productivity boost = (time_saved / 480) * 100
   * 4. Example: 120 minutes saved = 25% boost
   */
  const productivityBoost = metrics.total_time_saved_minutes > 0
    ? Math.round((metrics.total_time_saved_minutes / 480) * 100)
    : 0;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Usage Analytics</h1>

        {/* Period Selector */}
        <div className="period-selector">
          {(Object.keys(periodLabels) as Period[]).map((period) => (
            <button
              key={period}
              className={`period-button ${selectedPeriod === period ? 'active' : ''}`}
              onClick={() => handlePeriodChange(period)}
            >
              {periodLabels[period]}
            </button>
          ))}
        </div>
      </header>

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <MetricsCard
          title="Time Saved"
          value={`${metrics.total_time_saved_hours.toFixed(1)}h`}
          subtitle={`${metrics.total_time_saved_minutes} minutes`}
          icon="⏱️"
        />

        <MetricsCard
          title="Actions This Period"
          value={metrics.total_events.toString()}
          subtitle={`${metrics.voice_captures} voice captures`}
          icon="⚡"
        />

        <MetricsCard
          title="Productivity Boost"
          value={`${productivityBoost}%`}
          subtitle={`Based on ${selectedPeriod} usage`}
          icon="📈"
        />
      </div>

      {/* Detailed Breakdown */}
      <div className="metrics-breakdown">
        <h2>Detailed Breakdown</h2>
        <div className="breakdown-grid">
          <div className="breakdown-item">
            <span className="breakdown-label">Voice Captures</span>
            <span className="breakdown-value">{metrics.voice_captures}</span>
            <span className="breakdown-time">
              {metrics.voice_captures * 2} min saved
            </span>
          </div>

          <div className="breakdown-item">
            <span className="breakdown-label">Searches</span>
            <span className="breakdown-value">{metrics.searches}</span>
            <span className="breakdown-time">
              {metrics.searches * 5} min saved
            </span>
          </div>

          <div className="breakdown-item">
            <span className="breakdown-label">Code Insertions</span>
            <span className="breakdown-value">{metrics.insertions}</span>
            <span className="breakdown-time">
              {metrics.insertions * 2} min saved
            </span>
          </div>

          <div className="breakdown-item">
            <span className="breakdown-label">Pattern Matches</span>
            <span className="breakdown-value">{metrics.pattern_matches}</span>
            <span className="breakdown-time">
              {metrics.pattern_matches * 10} min saved
            </span>
          </div>
        </div>
      </div>

      {/* Refresh indicator */}
      <div className="refresh-indicator">
        <span className="refresh-text">
          Auto-refreshes every {refreshInterval / 1000}s
        </span>
      </div>
    </div>
  );
}
