/**
 * DESIGN DECISION: Aggregated analytics API with time range filtering
 * WHY: Frontend needs metrics aggregated by day/week for chart display
 *
 * REASONING CHAIN:
 * 1. Desktop app syncs raw usage events to usage_events table
 * 2. API aggregates by day (COUNT, SUM) for daily charts
 * 3. API aggregates by week (GROUP BY week) for weekly summary
 * 4. Calculate time saved: pattern_matched = 5 min saved per match
 * 5. Return totals + daily_stats + weekly_stats
 *
 * PATTERN: Pattern-API-002 (Analytics Aggregation API)
 * RELATED: app/dashboard/analytics, usage_events table
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get time range from query params (7d, 30d, 90d)
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '30d';

  // Calculate date range
  const daysAgo = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysAgo);
  const startDateStr = startDate.toISOString().split('T')[0];

  try {
    // Get all usage events for user within date range
    const { data: events, error } = await supabase
      .from('usage_events')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDateStr)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // If no events, return empty analytics
    if (!events || events.length === 0) {
      return NextResponse.json({
        total_captures: 0,
        total_searches: 0,
        total_patterns_matched: 0,
        success_rate: 0,
        time_saved_hours: 0,
        daily_stats: [],
        weekly_stats: [],
      });
    }

    // Aggregate totals
    const total_captures = events.filter((e) => e.event_type === 'voice_capture').length;
    const total_searches = events.filter((e) => e.event_type === 'search').length;
    const total_patterns_matched = events.filter(
      (e) => e.event_type === 'pattern_matched'
    ).length;

    // Success rate: patterns matched / searches (avoid division by zero)
    const success_rate = total_searches > 0 ? (total_patterns_matched / total_searches) * 100 : 0;

    // Time saved calculation: 5 minutes per pattern matched
    const time_saved_minutes = total_patterns_matched * 5;
    const time_saved_hours = time_saved_minutes / 60;

    // Aggregate by day
    const dailyMap = new Map<
      string,
      {
        date: string;
        captures: number;
        searches: number;
        patterns_matched: number;
        time_saved_minutes: number;
      }
    >();

    events.forEach((event) => {
      const date = event.created_at.split('T')[0]; // YYYY-MM-DD
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          captures: 0,
          searches: 0,
          patterns_matched: 0,
          time_saved_minutes: 0,
        });
      }

      const day = dailyMap.get(date)!;
      if (event.event_type === 'voice_capture') day.captures++;
      if (event.event_type === 'search') day.searches++;
      if (event.event_type === 'pattern_matched') {
        day.patterns_matched++;
        day.time_saved_minutes += 5;
      }
    });

    const daily_stats = Array.from(dailyMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Aggregate by week (week starts on Monday)
    const weeklyMap = new Map<
      string,
      {
        week_start: string;
        captures: number;
        searches: number;
        patterns_matched: number;
        time_saved_hours: number;
      }
    >();

    events.forEach((event) => {
      const date = new Date(event.created_at);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
      const monday = new Date(date);
      monday.setDate(date.getDate() + daysToMonday);
      const weekStart = monday.toISOString().split('T')[0];

      if (!weeklyMap.has(weekStart)) {
        weeklyMap.set(weekStart, {
          week_start: weekStart,
          captures: 0,
          searches: 0,
          patterns_matched: 0,
          time_saved_hours: 0,
        });
      }

      const week = weeklyMap.get(weekStart)!;
      if (event.event_type === 'voice_capture') week.captures++;
      if (event.event_type === 'search') week.searches++;
      if (event.event_type === 'pattern_matched') {
        week.patterns_matched++;
        week.time_saved_hours += 5 / 60; // 5 minutes = 0.083 hours
      }
    });

    const weekly_stats = Array.from(weeklyMap.values()).sort(
      (a, b) => new Date(a.week_start).getTime() - new Date(b.week_start).getTime()
    );

    return NextResponse.json({
      total_captures,
      total_searches,
      total_patterns_matched,
      success_rate,
      time_saved_hours,
      daily_stats,
      weekly_stats,
    });
  } catch (error: any) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: error.message },
      { status: 500 }
    );
  }
}
