import React, { useState } from 'react';
import { useReviews, useCreateDailyReview, useCreateWeeklyReview } from '../hooks/useReviews';
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
import Card from '../components/Card';
import Button from '../components/Button';

const ReviewsPage: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<ReviewType>('DAILY');
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{
    [reviewId: string]: {
      wins?: boolean;
      misses?: boolean;
      lessons?: boolean;
      nextGoals?: boolean;
    };
  }>({});

  // Replace all manual state with React Query hook
  const limit = activeTab === 'DAILY' ? 30 : 12;
  const { data: reviews = [], isLoading: loading, isError } = useReviews(activeTab, limit);

  const createDailyReview = useCreateDailyReview();
  const createWeeklyReview = useCreateWeeklyReview();

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
      <div className="flex items-center justify-center py-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-48 w-48 border-b-4 border-action"></div>
          <p className="mt-16 text-slate">Loading reviews...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-64">
        <div className="text-center">
          <p className="text-red-600">Failed to load reviews. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-24">
      {/* Header */}
      <Card padding="large">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h1 text-ink">Reviews</h1>
            <p className="text-slate mt-4">Track your progress and reflect on your journey</p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              // TODO: Open modal to create review
              if (activeTab === 'DAILY') {
                console.log('Create daily review');
              } else {
                console.log('Create weekly review');
              }
            }}
          >
            Create {activeTab === 'DAILY' ? 'Daily' : 'Weekly'} Review
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <Card padding="none">
        <div className="border-b border-fog">
          <div className="flex">
            <button
              onClick={() => setActiveTab('DAILY')}
              className={`px-24 py-12 font-medium border-b-2 transition-standard ${
                activeTab === 'DAILY'
                  ? 'border-action text-action'
                  : 'border-transparent text-slate hover:text-ink'
              }`}
            >
              Daily Reviews
            </button>
            <button
              onClick={() => setActiveTab('WEEKLY')}
              className={`px-24 py-12 font-medium border-b-2 transition-standard ${
                activeTab === 'WEEKLY'
                  ? 'border-action text-action'
                  : 'border-transparent text-slate hover:text-ink'
              }`}
            >
              Weekly Reviews
            </button>
          </div>
        </div>
      </Card>

      {/* Charts Section */}
      {reviews.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-24">
          {/* Execution Rate Trend */}
          <Card padding="medium">
            <h3 className="text-h3 text-ink mb-16">
              Execution Rate Trend (Last 7)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={getExecutionRateChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="rate" stroke="#2A6FF2" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Category Balance */}
          <Card padding="medium">
            <h3 className="text-h3 text-ink mb-16">Category Balance</h3>
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
          </Card>

          {/* Deep Work Hours Trend */}
          <Card padding="medium">
            <h3 className="text-h3 text-ink mb-16">
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
          </Card>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-16">
        {reviews.length === 0 ? (
          <Card padding="large">
            <div className="text-center">
              <p className="text-slate mb-16">No {activeTab.toLowerCase()} reviews yet</p>
              <Button
                variant="primary"
                onClick={() => {
                  if (activeTab === 'DAILY') {
                    console.log('Create daily review');
                  } else {
                    console.log('Create weekly review');
                  }
                }}
              >
                Create Your First {activeTab === 'DAILY' ? 'Daily' : 'Weekly'} Review
              </Button>
            </div>
          </Card>
        ) : (
          reviews.map((review) => (
            <Card
              key={review.id}
              padding="none"
              className="overflow-hidden hover:shadow-e02 transition-shadow duration-micro"
            >
              {/* Review Header */}
              <div
                className="p-24 cursor-pointer"
                onClick={() =>
                  setExpandedReview(expandedReview === review.id ? null : review.id)
                }
              >
                <div className="flex items-center justify-between mb-16">
                  <h3 className="text-h3 text-ink">
                    {formatPeriod(review)}
                  </h3>
                  <span className="text-slate">
                    {expandedReview === review.id ? '▼' : '▶'}
                  </span>
                </div>

                {/* Execution Rate */}
                <div className="mb-16">
                  <div className="flex items-center justify-between mb-8">
                    <span className="text-small font-medium text-ink">Execution Rate</span>
                    <span
                      className={`text-body font-bold ${getExecutionRateTextColor(
                        review.executionRate
                      )}`}
                    >
                      {review.executionRate?.toFixed(1) || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-fog rounded-pill h-12">
                    <div
                      className={`h-12 rounded-pill ${getExecutionRateColor(
                        review.executionRate
                      )}`}
                      style={{
                        width: `${Math.min(review.executionRate || 0, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-3 gap-16 mb-16">
                  <div className="bg-sky rounded-default p-12">
                    <p className="text-micro text-blue-600 font-medium">Tasks Completed</p>
                    <p className="text-display text-blue-900">{review.tasksCompleted}</p>
                  </div>
                  <div className="bg-lavender rounded-default p-12">
                    <p className="text-micro text-purple-600 font-medium">Deep Work Hours</p>
                    <p className="text-display text-purple-900">
                      {review.deepWorkHours.toFixed(1)}
                    </p>
                  </div>
                  <div className="bg-mint rounded-default p-12">
                    <p className="text-micro text-green-600 font-medium">Time Coverage</p>
                    <p className="text-display text-green-900">
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
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ReviewsPage;
