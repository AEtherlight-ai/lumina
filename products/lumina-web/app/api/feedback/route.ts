/**
 * DESIGN DECISION: Feedback API for thumbs up/down, corrections, and reports
 * WHY: Users need ability to provide feedback on patterns to improve quality over time
 *
 * REASONING CHAIN:
 * 1. User interacts with pattern (voice capture, search, match)
 * 2. User clicks thumbs up/down or submits correction/report
 * 3. Frontend calls POST /api/feedback with feedback_type and optional correction_text
 * 4. Backend validates user owns pattern or usage event (RLS)
 * 5. Backend inserts feedback record (prevents duplicates via unique constraint)
 * 6. Feedback goes to pending status for admin review
 * 7. Future: Trigger webhook to Slack/Discord for admin notification
 *
 * PATTERN: Pattern-API-004 (Feedback API), Pattern-FEEDBACK-001 (User feedback loop)
 * RELATED: app/dashboard/feedback, feedback table
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

  // Parse query params
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'all';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const per_page = parseInt(searchParams.get('per_page') || '20', 10);

  try {
    // Build query
    let query = supabase
      .from('feedback')
      .select('*, patterns_metadata(pattern_name), usage_events(event_type)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply pagination
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;
    query = query.range(from, to);

    // Execute query
    const { data: feedback, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      feedback: feedback || [],
      total: count || 0,
      page,
      per_page,
    });
  } catch (error: any) {
    console.error('Feedback GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { pattern_id, usage_event_id, feedback_type, correction_text } = body;

    // Validate required fields
    if (!feedback_type) {
      return NextResponse.json({ error: 'feedback_type is required' }, { status: 400 });
    }

    // Validate feedback_type
    if (!['thumbs_up', 'thumbs_down', 'correction', 'report'].includes(feedback_type)) {
      return NextResponse.json({ error: 'Invalid feedback_type' }, { status: 400 });
    }

    // Must have either pattern_id or usage_event_id
    if (!pattern_id && !usage_event_id) {
      return NextResponse.json(
        { error: 'Either pattern_id or usage_event_id is required' },
        { status: 400 }
      );
    }

    // Validate correction_text length if provided
    if (correction_text && correction_text.length > 1000) {
      return NextResponse.json(
        { error: 'correction_text must be 1000 characters or less' },
        { status: 400 }
      );
    }

    // Insert feedback record
    const { data: feedback, error } = await supabase
      .from('feedback')
      .insert({
        user_id: user.id,
        pattern_id: pattern_id || null,
        usage_event_id: usage_event_id || null,
        feedback_type,
        correction_text: correction_text || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      // Check for duplicate feedback (unique constraint violation)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Feedback already submitted for this pattern/event' },
          { status: 409 }
        );
      }
      throw error;
    }

    // TODO: Trigger webhook for admin notification (Slack/Discord)
    // Future: await notifyAdmins(feedback);

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error: any) {
    console.error('Feedback POST error:', error);
    return NextResponse.json(
      { error: 'Failed to submit feedback', details: error.message },
      { status: 500 }
    );
  }
}
