import React, { useState, useEffect, useCallback } from 'react';
import { getReviews } from '../lib/api';
import type { Review, ReviewType } from '../types';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { useToast } from '../contexts/ToastContext';

const ReviewsPage: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<ReviewType>('DAILY');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{
    [reviewId: string]: {
      wins?: boolean;
      misses?: boolean;
      lessons?: boolean;
      nextGoals?: boolean;
    };
  }>({});

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const limit = activeTab === 'DAILY' ? 30 : 12;
      const data = await getReviews(activeTab, limit);
      setReviews(data);
    } catch (err) {
      toast.showError('Failed to load reviews. Please try again.');
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, toast]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const toggleSection = (reviewId: string, section: 'wins' | 'misses' | 'lessons' | 'nextGoals') => {
    setExpandedSections((prev) => ({
      ...prev,
      [reviewId]: {
        ...prev[reviewId],
        [section]: !prev[reviewId]?.[section],
      },
    }));
  };

  const getExecutionRateColor = (rate?: number): string => {
    if (!rate) return 'bg-gray-500';
    if (rate >= 100) return 'bg-green-500';
    if (rate >= 80) return 'bg-blue-500';
    if (rate >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getExecutionRateTextColor = (rate?: number): string => {
    if (!rate) return 'text-gray-700';
    if (rate >= 100) return 'text-green-700';
    if (rate >= 80) return 'text-blue-700';
    if (rate >= 60) return 'text-yellow-700';
    return 'text-red-700';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPeriod = (review: Review) => {
    const start = formatDate(review.periodStart);
    const end = formatDate(review.periodEnd);
    return `${start} - ${end}`;
  };

  // Chart data preparation
  const getExecutionRateChartData = () => {
    return reviews
      .slice(0, 7)
      .reverse()
      .map((review) => ({
        date: new Date(review.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        rate: review.executionRate || 0,
      }));
  };

  const getCategoryBalanceChartData = () => {
    if (reviews.length === 0) return [];
    const latestReview = reviews[0];
    return Object.entries(latestReview.categoryBalance || {}).map(([category, hours]) => ({
      name: category,
      value: hours,
    }));
  };

  const getDeepWorkTrendData = () => {
    return reviews
      .slice(0, 7)
      .reverse()
      .map((review) => ({
        date: new Date(review.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        hours: review.deepWorkHours,
      }));
  };

  const COLORS = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
    '#6366f1',
    '#84cc16',
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading reviews...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reviews</h1>
            <p className="text-gray-600 mt-1">Track your progress and reflect on your journey</p>
          </div>
          <button
            onClick={() => {
              // TODO: Open modal to create review
              if (activeTab === 'DAILY') {
                console.log('Create daily review');
              } else {
                console.log('Create weekly review');
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create {activeTab === 'DAILY' ? 'Daily' : 'Weekly'} Review
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('DAILY')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'DAILY'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Daily Reviews
            </button>
            <button
              onClick={() => setActiveTab('WEEKLY')}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'WEEKLY'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Weekly Reviews
            </button>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {reviews.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Execution Rate Trend */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Execution Rate Trend (Last 7)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={getExecutionRateChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Category Balance */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Balance</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={getCategoryBalanceChartData()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getCategoryBalanceChartData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Deep Work Hours Trend */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Deep Work Hours (Last 7)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={getDeepWorkTrendData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="hours" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-600 mb-4">No {activeTab.toLowerCase()} reviews yet</p>
            <button
              onClick={() => {
                if (activeTab === 'DAILY') {
                  console.log('Create daily review');
                } else {
                  console.log('Create weekly review');
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Your First {activeTab === 'DAILY' ? 'Daily' : 'Weekly'} Review
            </button>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Review Header */}
              <div
                className="p-6 cursor-pointer"
                onClick={() =>
                  setExpandedReview(expandedReview === review.id ? null : review.id)
                }
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {formatPeriod(review)}
                  </h3>
                  <span className="text-gray-400">
                    {expandedReview === review.id ? '▼' : '▶'}
                  </span>
                </div>

                {/* Execution Rate */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Execution Rate</span>
                    <span
                      className={`text-lg font-bold ${getExecutionRateTextColor(
                        review.executionRate
                      )}`}
                    >
                      {review.executionRate?.toFixed(1) || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${getExecutionRateColor(
                        review.executionRate
                      )}`}
                      style={{
                        width: `${Math.min(review.executionRate || 0, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-600 font-medium">Tasks Completed</p>
                    <p className="text-2xl font-bold text-blue-900">{review.tasksCompleted}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-purple-600 font-medium">Deep Work Hours</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {review.deepWorkHours.toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-green-600 font-medium">Time Coverage</p>
                    <p className="text-2xl font-bold text-green-900">
                      {review.timeCoverage.toFixed(0)}%
                    </p>
                  </div>
                </div>

                {/* Preview of sections */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Wins Preview */}
                  <div>
                    <h4 className="text-sm font-semibold text-green-700 mb-2">
                      Wins ({review.wins.length})
                    </h4>
                    <ul className="space-y-1">
                      {review.wins.slice(0, 2).map((win, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start">
                          <span className="text-green-500 mr-2">✓</span>
                          <span className="line-clamp-1">{win}</span>
                        </li>
                      ))}
                      {review.wins.length > 2 && (
                        <li className="text-sm text-gray-500 italic">
                          +{review.wins.length - 2} more...
                        </li>
                      )}
                    </ul>
                  </div>

                  {/* Misses Preview */}
                  <div>
                    <h4 className="text-sm font-semibold text-red-700 mb-2">
                      Misses ({review.misses.length})
                    </h4>
                    <ul className="space-y-1">
                      {review.misses.slice(0, 2).map((miss, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start">
                          <span className="text-red-500 mr-2">✗</span>
                          <span className="line-clamp-1">{miss}</span>
                        </li>
                      ))}
                      {review.misses.length > 2 && (
                        <li className="text-sm text-gray-500 italic">
                          +{review.misses.length - 2} more...
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedReview === review.id && (
                <div className="border-t border-gray-200 p-6 bg-gray-50 space-y-4">
                  {/* Full Wins */}
                  <div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSection(review.id, 'wins');
                      }}
                      className="flex items-center justify-between w-full text-left mb-2"
                    >
                      <h4 className="text-lg font-semibold text-green-700">
                        Wins ({review.wins.length})
                      </h4>
                      <span className="text-gray-400">
                        {expandedSections[review.id]?.wins ? '▼' : '▶'}
                      </span>
                    </button>
                    {expandedSections[review.id]?.wins && (
                      <ul className="space-y-2 ml-4">
                        {review.wins.map((win, idx) => (
                          <li key={idx} className="text-gray-700 flex items-start">
                            <span className="text-green-500 mr-2">✓</span>
                            <span>{win}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Full Misses */}
                  <div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSection(review.id, 'misses');
                      }}
                      className="flex items-center justify-between w-full text-left mb-2"
                    >
                      <h4 className="text-lg font-semibold text-red-700">
                        Misses ({review.misses.length})
                      </h4>
                      <span className="text-gray-400">
                        {expandedSections[review.id]?.misses ? '▼' : '▶'}
                      </span>
                    </button>
                    {expandedSections[review.id]?.misses && (
                      <ul className="space-y-2 ml-4">
                        {review.misses.map((miss, idx) => (
                          <li key={idx} className="text-gray-700 flex items-start">
                            <span className="text-red-500 mr-2">✗</span>
                            <span>{miss}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Full Lessons */}
                  <div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSection(review.id, 'lessons');
                      }}
                      className="flex items-center justify-between w-full text-left mb-2"
                    >
                      <h4 className="text-lg font-semibold text-blue-700">
                        Lessons ({review.lessons.length})
                      </h4>
                      <span className="text-gray-400">
                        {expandedSections[review.id]?.lessons ? '▼' : '▶'}
                      </span>
                    </button>
                    {expandedSections[review.id]?.lessons && (
                      <ul className="space-y-2 ml-4">
                        {review.lessons.map((lesson, idx) => (
                          <li key={idx} className="text-gray-700 flex items-start">
                            <span className="text-blue-500 mr-2">💡</span>
                            <span>{lesson}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Full Next Goals */}
                  <div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSection(review.id, 'nextGoals');
                      }}
                      className="flex items-center justify-between w-full text-left mb-2"
                    >
                      <h4 className="text-lg font-semibold text-purple-700">
                        Next Goals ({review.nextGoals.length})
                      </h4>
                      <span className="text-gray-400">
                        {expandedSections[review.id]?.nextGoals ? '▼' : '▶'}
                      </span>
                    </button>
                    {expandedSections[review.id]?.nextGoals && (
                      <ul className="space-y-2 ml-4">
                        {review.nextGoals.map((goal, idx) => (
                          <li key={idx} className="text-gray-700 flex items-start">
                            <span className="text-purple-500 mr-2">→</span>
                            <span>{goal}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Additional Metadata */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-300">
                    <div>
                      <p className="text-sm text-gray-600">Total Tracked Time</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {review.totalTrackedTime.toFixed(1)} hours
                      </p>
                    </div>
                    {review.contextSwitches !== undefined && (
                      <div>
                        <p className="text-sm text-gray-600">Context Switches</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {review.contextSwitches}
                        </p>
                      </div>
                    )}
                    {review.energyAssessment && (
                      <div>
                        <p className="text-sm text-gray-600">Energy Assessment</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {review.energyAssessment}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReviewsPage;
