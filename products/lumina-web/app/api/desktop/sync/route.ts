/**
 * Desktop Sync API
 *
 * DESIGN DECISION: Batch sync endpoint for desktop apps to upload usage data
 * WHY: Efficient data transfer, single request per sync cycle
 *
 * REASONING CHAIN:
 * 1. Desktop app queues events locally (SQLite)
 * 2. Every 5 minutes OR 100 events → batch sync to web backend
 * 3. POST /api/desktop/sync with events[], patterns[], feedback[]
 * 4. Backend validates device_id + license
 * 5. Batch insert into usage_events, patterns_metadata, feedback tables
 * 6. Return sync_id + synced_count + errors[]
 * 7. Desktop app marks events as synced locally
 *
 * PATTERN: Pattern-API-006 (Desktop sync API)
 * PATTERN: Pattern-BATCH-001 (Batch processing for performance)
 * RELATED: usage_events, patterns_metadata, feedback tables
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Sync request payload
 */
interface SyncRequest {
  device_id: string;
  events?: Array<{
    event_type: 'voice_capture' | 'search' | 'pattern_matched' | 'insertion';
    timestamp: string; // ISO 8601
    metadata?: Record<string, any>;
  }>;
  patterns?: Array<{
    pattern_name: string;
    pattern_description?: string;
    confidence_score: number;
    domain: string;
    tags?: string[];
    source?: 'personal' | 'team' | 'community';
  }>;
  feedback?: Array<{
    pattern_id?: string;
    usage_event_id?: string;
    feedback_type: 'thumbs_up' | 'thumbs_down' | 'correction' | 'report';
    correction_text?: string;
  }>;
}

/**
 * POST /api/desktop/sync
 *
 * Batch sync usage events, patterns, and feedback from desktop app.
 *
 * Request Body: SyncRequest
 *
 * Response:
 * {
 *   success: true;
 *   sync_id: string;
 *   synced_events_count: number;
 *   synced_patterns_count: number;
 *   synced_feedback_count: number;
 *   errors: Array<{ type: string; index: number; error: string }>;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: SyncRequest = await request.json();
    const { device_id, events = [], patterns = [], feedback = [] } = body;

    if (!device_id) {
      return NextResponse.json(
        { error: 'device_id is required' },
        { status: 400 }
      );
    }

    // Validate device exists and belongs to user
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id, user_id, is_active')
      .eq('id', device_id)
      .eq('user_id', user.id)
      .single();

    if (deviceError || !device) {
      return NextResponse.json(
        { error: 'Device not found or not owned by user' },
        { status: 404 }
      );
    }

    if (!device.is_active) {
      return NextResponse.json(
        { error: 'Device is not active' },
        { status: 403 }
      );
    }

    const errors: Array<{ type: string; index: number; error: string }> = [];
    const sync_id = crypto.randomUUID();

    // DESIGN DECISION: Process each batch independently (events, patterns, feedback)
    // WHY: Partial success possible (e.g., events succeed but patterns fail)

    // 1. Sync usage events
    let synced_events_count = 0;
    if (events.length > 0) {
      const eventsToInsert = events.map((event, index) => {
        // Validate event_type
        if (!['voice_capture', 'search', 'pattern_matched', 'insertion'].includes(event.event_type)) {
          errors.push({
            type: 'event',
            index,
            error: `Invalid event_type: ${event.event_type}`,
          });
          return null;
        }

        return {
          user_id: user.id,
          device_id: device_id,
          event_type: event.event_type,
          metadata: event.metadata || {},
          created_at: event.timestamp,
        };
      }).filter(Boolean);

      if (eventsToInsert.length > 0) {
        const { error: eventsError, count } = await supabase
          .from('usage_events')
          .insert(eventsToInsert);

        if (eventsError) {
          console.error('Events insert error:', eventsError);
          errors.push({
            type: 'events_batch',
            index: -1,
            error: eventsError.message,
          });
        } else {
          synced_events_count = eventsToInsert.length;
        }
      }
    }

    // 2. Sync patterns
    let synced_patterns_count = 0;
    if (patterns.length > 0) {
      const patternsToInsert = patterns.map((pattern, index) => {
        // Validate required fields
        if (!pattern.pattern_name || !pattern.domain) {
          errors.push({
            type: 'pattern',
            index,
            error: 'pattern_name and domain are required',
          });
          return null;
        }

        // Validate confidence_score
        if (pattern.confidence_score < 0 || pattern.confidence_score > 1) {
          errors.push({
            type: 'pattern',
            index,
            error: 'confidence_score must be between 0 and 1',
          });
          return null;
        }

        return {
          user_id: user.id,
          pattern_name: pattern.pattern_name,
          pattern_description: pattern.pattern_description || null,
          confidence_score: pattern.confidence_score,
          domain: pattern.domain,
          tags: pattern.tags || [],
          source: pattern.source || 'personal',
          usage_count: 0,
        };
      }).filter(Boolean);

      if (patternsToInsert.length > 0) {
        const { error: patternsError, count } = await supabase
          .from('patterns_metadata')
          .insert(patternsToInsert);

        if (patternsError) {
          console.error('Patterns insert error:', patternsError);
          errors.push({
            type: 'patterns_batch',
            index: -1,
            error: patternsError.message,
          });
        } else {
          synced_patterns_count = patternsToInsert.length;
        }
      }
    }

    // 3. Sync feedback
    let synced_feedback_count = 0;
    if (feedback.length > 0) {
      const feedbackToInsert = feedback.map((fb, index) => {
        // Validate feedback_type
        if (!['thumbs_up', 'thumbs_down', 'correction', 'report'].includes(fb.feedback_type)) {
          errors.push({
            type: 'feedback',
            index,
            error: `Invalid feedback_type: ${fb.feedback_type}`,
          });
          return null;
        }

        // At least one of pattern_id or usage_event_id required
        if (!fb.pattern_id && !fb.usage_event_id) {
          errors.push({
            type: 'feedback',
            index,
            error: 'Either pattern_id or usage_event_id is required',
          });
          return null;
        }

        return {
          user_id: user.id,
          pattern_id: fb.pattern_id || null,
          usage_event_id: fb.usage_event_id || null,
          feedback_type: fb.feedback_type,
          correction_text: fb.correction_text || null,
          status: 'pending',
        };
      }).filter(Boolean);

      if (feedbackToInsert.length > 0) {
        const { error: feedbackError, count } = await supabase
          .from('feedback')
          .insert(feedbackToInsert);

        if (feedbackError) {
          console.error('Feedback insert error:', feedbackError);
          errors.push({
            type: 'feedback_batch',
            index: -1,
            error: feedbackError.message,
          });
        } else {
          synced_feedback_count = feedbackToInsert.length;
        }
      }
    }

    // Update device last_seen_at (heartbeat)
    await supabase
      .from('devices')
      .update({
        last_seen_at: new Date().toISOString(),
        connection_status: 'online',
      })
      .eq('id', device_id);

    // Return sync result
    return NextResponse.json({
      success: true,
      sync_id,
      synced_events_count,
      synced_patterns_count,
      synced_feedback_count,
      errors,
    });
  } catch (error) {
    console.error('Desktop sync error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/desktop/sync?device_id=xxx
 *
 * Get sync status for a device.
 *
 * Response:
 * {
 *   device_id: string;
 *   last_sync_at: string | null;
 *   total_events_synced: number;
 *   total_patterns_synced: number;
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get device_id from query params
    const searchParams = request.nextUrl.searchParams;
    const device_id = searchParams.get('device_id');

    if (!device_id) {
      return NextResponse.json(
        { error: 'device_id query parameter is required' },
        { status: 400 }
      );
    }

    // Validate device
    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id, last_seen_at')
      .eq('id', device_id)
      .eq('user_id', user.id)
      .single();

    if (deviceError || !device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    // Count synced events
    const { count: eventsCount } = await supabase
      .from('usage_events')
      .select('*', { count: 'exact', head: true })
      .eq('device_id', device_id);

    // Count synced patterns
    const { count: patternsCount } = await supabase
      .from('patterns_metadata')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return NextResponse.json({
      device_id: device.id,
      last_sync_at: device.last_seen_at,
      total_events_synced: eventsCount || 0,
      total_patterns_synced: patternsCount || 0,
    });
  } catch (error) {
    console.error('Get sync status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
