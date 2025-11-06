/**
 * DESIGN DECISION: Pattern library viewer with search and filtering
 * WHY: Users need visibility into what patterns Lumina has learned from their codebase
 *
 * REASONING CHAIN:
 * 1. Desktop app indexes codebase and syncs pattern metadata to web backend
 * 2. Web displays patterns with search (fuzzy match), filter (domain/source), sort (confidence)
 * 3. User clicks pattern → detail modal with Chain of Thought, code examples, usage history
 * 4. Personal patterns can be edited/deleted, community patterns can be flagged
 * 5. Empty state prompts user to index codebase via desktop app
 *
 * PATTERN: Pattern-SEARCH-001 (Full-text search), Pattern-PRIVACY-001 (Pattern abstraction)
 * RELATED: W2-003 (Pattern Library Viewer), app/api/patterns
 */

'use client';

import { useEffect, useState } from 'react';
import { Search, Filter, Loader2, Code2, Tag, TrendingUp } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Pattern {
  id: string;
  pattern_name: string;
  pattern_description: string;
  confidence_score: number;
  domain: string;
  tags: string[];
  source: 'personal' | 'team' | 'community';
  usage_count: number;
  created_at: string;
}

interface PatternsResponse {
  patterns: Pattern[];
  total: number;
  page: number;
  per_page: number;
}

export default function PatternsPage() {
  const [loading, setLoading] = useState(true);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchPatterns();
  }, [searchQuery, selectedDomain, selectedSource, page]);

  async function fetchPatterns() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '20',
      });

      if (searchQuery) params.append('search', searchQuery);
      if (selectedDomain !== 'all') params.append('domain', selectedDomain);
      if (selectedSource !== 'all') params.append('source', selectedSource);

      const res = await fetch(`/api/patterns?${params.toString()}`);
      const data: PatternsResponse = await res.json();

      if (res.ok) {
        setPatterns(data.patterns);
        setTotal(data.total);
      } else {
        toast.error('Failed to load patterns');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function getConfidenceBadgeColor(score: number): string {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  }

  function getSourceBadgeColor(source: string): string {
    if (source === 'personal') return 'bg-blue-100 text-blue-800';
    if (source === 'team') return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  }

  if (loading && patterns.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pattern Library</h1>
        <p className="text-gray-600 mt-2">
          Browse and search patterns learned from your codebase
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search patterns by name or description..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1); // Reset to page 1 on search
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          {/* Domain Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Domain
            </label>
            <select
              value={selectedDomain}
              onChange={(e) => {
                setSelectedDomain(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Domains</option>
              <option value="web">Web</option>
              <option value="mobile">Mobile</option>
              <option value="backend">Backend</option>
              <option value="data">Data</option>
              <option value="devops">DevOps</option>
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source
            </label>
            <select
              value={selectedSource}
              onChange={(e) => {
                setSelectedSource(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Sources</option>
              <option value="personal">Personal</option>
              <option value="team">Team</option>
              <option value="community">Community</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      {!loading && (
        <div className="text-sm text-gray-600">
          Showing {patterns.length} of {total} patterns
        </div>
      )}

      {/* Pattern Grid */}
      {patterns.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Code2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No patterns found
          </h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || selectedDomain !== 'all' || selectedSource !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Index your first codebase with the desktop app to see patterns here'}
          </p>
          {!searchQuery && selectedDomain === 'all' && selectedSource === 'all' && (
            <button
              onClick={() => (window.location.href = '/dashboard/download')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Download Desktop App
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {patterns.map((pattern) => (
            <div
              key={pattern.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 cursor-pointer"
              onClick={() => {
                // TODO: Open pattern detail modal or navigate to detail page
                toast.success('Pattern detail view coming soon');
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {pattern.pattern_name}
                </h3>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceBadgeColor(
                    pattern.confidence_score
                  )}`}
                >
                  {Math.round(pattern.confidence_score * 100)}%
                </span>
              </div>

              {/* Description */}
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {pattern.pattern_description || 'No description available'}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-3">
                {pattern.tags.slice(0, 3).map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
                {pattern.tags.length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    +{pattern.tags.length - 3} more
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span
                  className={`px-2 py-1 rounded font-medium ${getSourceBadgeColor(
                    pattern.source
                  )}`}
                >
                  {pattern.source.charAt(0).toUpperCase() + pattern.source.slice(1)}
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {pattern.usage_count} uses
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {Math.ceil(total / 20)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
