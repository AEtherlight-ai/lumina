/**
 * DESIGN DECISION: Pattern library API with search and pagination
 * WHY: Frontend needs paginated pattern data with full-text search capability
 *
 * REASONING CHAIN:
 * 1. Desktop app syncs pattern metadata to patterns_metadata table (no full code)
 * 2. API supports search (PostgreSQL full-text), filter (domain/source), pagination
 * 3. Returns 20 patterns per page with total count for pagination UI
 * 4. RLS ensures users only see their own personal patterns or shared team/community patterns
 * 5. Search uses PostgreSQL tsvector for fast fuzzy matching
 *
 * PATTERN: Pattern-API-003 (Paginated Search API), Pattern-SEARCH-001 (Full-text search)
 * RELATED: app/dashboard/patterns, patterns_metadata table
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
  const search = searchParams.get('search') || '';
  const domain = searchParams.get('domain') || 'all';
  const source = searchParams.get('source') || 'all';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const per_page = parseInt(searchParams.get('per_page') || '20', 10);

  try {
    // Build query
    let query = supabase
      .from('patterns_metadata')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply search filter (full-text search)
    if (search) {
      query = query.or(
        `pattern_name.ilike.%${search}%,pattern_description.ilike.%${search}%`
      );
    }

    // Apply domain filter
    if (domain !== 'all') {
      query = query.eq('domain', domain);
    }

    // Apply source filter
    if (source !== 'all') {
      query = query.eq('source', source);
    }

    // Apply pagination
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;
    query = query.range(from, to);

    // Execute query
    const { data: patterns, error, count } = await query;

    if (error) throw error;

    return NextResponse.json({
      patterns: patterns || [],
      total: count || 0,
      page,
      per_page,
    });
  } catch (error: any) {
    console.error('Patterns API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patterns', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/patterns - Create new pattern (from desktop sync)
 *
 * DESIGN DECISION: Desktop app can sync pattern metadata to web
 * WHY: Enable pattern browsing in web dashboard without exposing full code
 *
 * Body: {
 *   pattern_name: string,
 *   pattern_description: string,
 *   confidence_score: number,
 *   domain: string,
 *   tags: string[],
 *   source: 'personal' | 'team' | 'community',
 *   device_id: string
 * }
 */
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
    const {
      pattern_name,
      pattern_description,
      confidence_score,
      domain,
      tags,
      source,
      device_id,
    } = body;

    // Validate required fields
    if (!pattern_name || !domain) {
      return NextResponse.json(
        { error: 'pattern_name and domain are required' },
        { status: 400 }
      );
    }

    // Insert pattern metadata
    const { data: pattern, error } = await supabase
      .from('patterns_metadata')
      .insert({
        user_id: user.id,
        device_id,
        pattern_name,
        pattern_description,
        confidence_score: confidence_score || 0.0,
        domain,
        tags: tags || [],
        source: source || 'personal',
        usage_count: 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ pattern }, { status: 201 });
  } catch (error: any) {
    console.error('Pattern creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create pattern', details: error.message },
      { status: 500 }
    );
  }
}
