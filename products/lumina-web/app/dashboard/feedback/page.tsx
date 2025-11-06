/**
 * DESIGN DECISION: Feedback dashboard for viewing submitted feedback
 * WHY: Users need visibility into feedback they've submitted and admin responses
 *
 * REASONING CHAIN:
 * 1. User submits feedback (thumbs up/down, corrections, reports)
 * 2. Feedback goes to pending status (admin review queue)
 * 3. User views all feedback in this dashboard (filterable by status)
 * 4. Admin reviews feedback, updates status (reviewed/resolved/dismissed)
 * 5. User sees status updates and optional admin responses
 * 6. Helps users understand what feedback was acted upon
 *
 * PATTERN: Pattern-DASHBOARD-002 (Feedback Dashboard)
 * RELATED: app/api/feedback, feedback table
 */

'use client';

import { useEffect, useState } from 'react';
import { Loader2, ThumbsUp, ThumbsDown, AlertCircle, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Feedback {
  id: string;
  pattern_id: string | null;
  usage_event_id: string | null;
  feedback_type: 'thumbs_up' | 'thumbs_down' | 'correction' | 'report';
  correction_text: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  admin_response: string | null;
  created_at: string;
  patterns_metadata?: { pattern_name: string };
  usage_events?: { event_type: string };
}

interface FeedbackResponse {
  feedback: Feedback[];
  total: number;
  page: number;
  per_page: number;
}

export default function FeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchFeedback();
  }, [selectedStatus, page]);

  async function fetchFeedback() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: selectedStatus,
        page: page.toString(),
        per_page: '20',
      });

      const res = await fetch(`/api/feedback?${params.toString()}`);
      const data: FeedbackResponse = await res.json();

      if (res.ok) {
        setFeedback(data.feedback);
        setTotal(data.total);
      } else {
        toast.error('Failed to load feedback');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function getFeedbackIcon(type: string) {
    switch (type) {
      case 'thumbs_up':
        return <ThumbsUp className="h-5 w-5 text-green-600" />;
      case 'thumbs_down':
        return <ThumbsDown className="h-5 w-5 text-red-600" />;
      case 'correction':
        return <MessageSquare className="h-5 w-5 text-blue-600" />;
      case 'report':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default:
        return null;
    }
  }

  function getStatusBadgeColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'reviewed':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'dismissed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  if (loading && feedback.length === 0) {
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
        <h1 className="text-3xl font-bold text-gray-900">My Feedback</h1>
        <p className="text-gray-600 mt-2">
          View all feedback you've submitted and track admin responses
        </p>
      </div>

      {/* Status Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Status
        </label>
        <select
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setPage(1);
          }}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Feedback</option>
          <option value="pending">Pending Review</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      {/* Results Count */}
      {!loading && (
        <div className="text-sm text-gray-600">
          Showing {feedback.length} of {total} feedback items
        </div>
      )}

      {/* Feedback List */}
      {feedback.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No feedback yet</h3>
          <p className="text-gray-600">
            {selectedStatus !== 'all'
              ? 'No feedback with this status'
              : 'Submit feedback on patterns and usage events to help us improve'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedback.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getFeedbackIcon(item.feedback_type)}
                  <div>
                    <div className="font-semibold text-gray-900">
                      {item.patterns_metadata?.pattern_name || 'Usage Event'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(item.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                    item.status
                  )}`}
                >
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </span>
              </div>

              {/* Feedback Type */}
              <div className="text-sm text-gray-600 mb-2">
                <span className="font-medium">Type:</span>{' '}
                {item.feedback_type.replace('_', ' ').charAt(0).toUpperCase() +
                  item.feedback_type.replace('_', ' ').slice(1)}
              </div>

              {/* Correction Text */}
              {item.correction_text && (
                <div className="bg-gray-50 rounded p-3 mb-3">
                  <div className="text-sm font-medium text-gray-700 mb-1">Your feedback:</div>
                  <div className="text-sm text-gray-600">{item.correction_text}</div>
                </div>
              )}

              {/* Admin Response */}
              {item.admin_response && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <div className="text-sm font-medium text-blue-900 mb-1">Admin Response:</div>
                  <div className="text-sm text-blue-800">{item.admin_response}</div>
                </div>
              )}
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
