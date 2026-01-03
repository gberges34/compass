import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFlatReviews, useCreateDailyReview, useCreateWeeklyReview } from '../hooks/useReviews';
import type { Category, DailyPlan, Review, ReviewType, CreateReviewRequest } from '../types';
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
import CreateReviewModal from '../components/CreateReviewModal';
import SectionTitleWithInfo from '../components/SectionTitleWithInfo';
import Tabs from '../components/Tabs';
import { categoryColors } from '../lib/designTokens';
import { reviewsHelpContent } from './reviews/reviewsHelpContent';
import DaySelector from '../components/DaySelector';
import RadialClockChart from '../components/RadialClockChart';
import { eachDayOfInterval, format, isValid, startOfDay } from 'date-fns';
import * as api from '../lib/api';
import {
  hhmmToMinutes,
  isPrimaryCategory,
  parsePlannedBlockLabel,
  PRIMARY_CATEGORIES,
} from '../lib/planningBlocks';

const PAGE_SIZE = 30;
const INITIAL_VISIBLE_REVIEWS = 3;

const ReviewsPage: React.FC = () => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<ReviewType>('DAILY');
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedClockDate, setSelectedClockDate] = useState<Date>(startOfDay(new Date()));
  const [visibleReviewCount, setVisibleReviewCount] = useState(INITIAL_VISIBLE_REVIEWS);
  const [expandedSections, setExpandedSections] = useState<{
    [reviewId: string]: {
      wins?: boolean;
      misses?: boolean;
      lessons?: boolean;
      nextGoals?: boolean;
    };
  }>({});

  // Replace all manual state with React Query hook
  const {
    reviews = [],
    isLoading: loading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFlatReviews(activeTab);

  const createDailyReview = useCreateDailyReview();
  const createWeeklyReview = useCreateWeeklyReview();

  const handleCreateReview = async (data: CreateReviewRequest) => {
    try {
      if (activeTab === 'DAILY') {
        await createDailyReview.mutateAsync(data);
        toast.showSuccess('Daily review created successfully!');
      } else {
        await createWeeklyReview.mutateAsync(data);
        toast.showSuccess('Weekly review created successfully!');
      }
    } catch (error) {
      toast.showError(error instanceof Error ? error.message : 'Failed to create review');
      throw error; // Re-throw so modal can handle it
    }
  };

  const handleLoadMore = async () => {
    if (isFetchingNextPage) return;
    if (visibleReviewCount < PAGE_SIZE) {
      setVisibleReviewCount(Math.min(PAGE_SIZE, reviews.length));
      return;
    }

    const target = visibleReviewCount + PAGE_SIZE;
    if (reviews.length >= target) {
      setVisibleReviewCount(target);
      return;
    }

    if (!hasNextPage) {
      setVisibleReviewCount(reviews.length);
      return;
    }

    try {
      await fetchNextPage();
      setVisibleReviewCount(target);
    } catch (error) {
      toast.showError(error instanceof Error ? error.message : 'Failed to load more reviews');
    }
  };

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
    if (!rate) return 'bg-stone';
    if (rate >= 100) return 'bg-green-500';
    if (rate >= 80) return 'bg-blue-500';
    if (rate >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getExecutionRateTextColor = (rate?: number): string => {
    if (!rate) return 'text-slate';
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
    if (review.type === 'DAILY') {
      // For daily reviews, just show the single date
      return formatDate(review.periodStart);
    } else {
      // For weekly reviews, show the range
      const start = formatDate(review.periodStart);
      const end = formatDate(review.periodEnd);
      return `${start} - ${end}`;
    }
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

  const CATEGORY_COLORS = Object.values(categoryColors).map(config => config.hex);

  useEffect(() => {
    if (reviews.length === 0) return;
    // Default weekly clock selection to the first day in the period
    setSelectedClockDate(startOfDay(new Date(reviews[0].periodStart)));
  }, [activeTab, reviews]);

  useEffect(() => {
    setVisibleReviewCount(INITIAL_VISIBLE_REVIEWS);
    setExpandedReview(null);
  }, [activeTab]);

  const chartReviews = useMemo(() => reviews.slice(0, 7).reverse(), [reviews]);
  const plannedActualPeriods = useMemo(() => {
    return chartReviews
      .map((review) => {
        const start = new Date(review.periodStart);
        const end = new Date(review.periodEnd);

        if (!isValid(start) || !isValid(end)) {
          console.error('[ReviewsPage] Invalid review period dates', {
            reviewId: review.id,
            periodStart: review.periodStart,
            periodEnd: review.periodEnd,
          });
          return null;
        }

        return {
          id: review.id,
          label: format(end, 'MMM d'),
          start,
          end,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [chartReviews]);

  const plannedActualRange = useMemo(() => {
    if (plannedActualPeriods.length === 0) return null;
    const start = plannedActualPeriods.reduce((min, p) => (p.start < min ? p.start : min), plannedActualPeriods[0].start);
    const end = plannedActualPeriods.reduce((max, p) => (p.end > max ? p.end : max), plannedActualPeriods[0].end);
    return { start, end };
  }, [plannedActualPeriods]);

  const plannedActualRangeIso = useMemo(() => {
    if (!plannedActualRange) return null;
    try {
      return {
        startIso: plannedActualRange.start.toISOString(),
        endIso: plannedActualRange.end.toISOString(),
      };
    } catch (error) {
      console.error('[ReviewsPage] Invalid plannedActualRange ISO conversion', plannedActualRange, error);
      return null;
    }
  }, [plannedActualRange]);

  const planDateStrings = useMemo(() => {
    if (!plannedActualRange) return [];
    const start = startOfDay(plannedActualRange.start);
    const end = startOfDay(plannedActualRange.end);
    try {
      return eachDayOfInterval({ start, end }).map((d) => format(d, 'yyyy-MM-dd'));
    } catch (error) {
      console.error('[ReviewsPage] Invalid interval for planDateStrings', { start, end }, error);
      return [];
    }
  }, [plannedActualRange]);

  const { data: plansByDate = {}, isLoading: plansLoading } = useQuery({
    queryKey: ['reviews', 'planned-actual', 'plans', planDateStrings],
    enabled: planDateStrings.length > 0,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const entries = await Promise.all(
        planDateStrings.map(async (dateStr) => {
          try {
            const plan = await api.getPlanByDate(dateStr);
            return [dateStr, plan] as const;
          } catch (error: any) {
            if (error?.response?.status === 404) {
              return [dateStr, null] as const;
            }
            throw error;
          }
        })
      );

      return entries.reduce((acc, [dateStr, plan]) => {
        acc[dateStr] = plan;
        return acc;
      }, {} as Record<string, DailyPlan | null>);
    },
  });

  const { data: primarySlices = [], isLoading: slicesLoading } = useQuery({
    queryKey: [
      'reviews',
      'planned-actual',
      'slices',
      activeTab,
      plannedActualRangeIso?.startIso,
      plannedActualRangeIso?.endIso,
    ],
    enabled: !!plannedActualRangeIso,
    staleTime: 30000,
    queryFn: () =>
      api.getTimeSlices({
        startDate: plannedActualRangeIso!.startIso,
        endDate: plannedActualRangeIso!.endIso,
        dimension: 'PRIMARY',
      }),
  });

  const plannedActualChartData = useMemo(() => {
    if (!plannedActualRange) return [];

    const chartCategories: Array<Category | 'OTHER'> = [...PRIMARY_CATEGORIES, 'OTHER'];

    const addMinutes = (
      map: Record<string, number>,
      category: Category | 'OTHER',
      minutes: number
    ) => {
      const key = category;
      map[key] = (map[key] || 0) + minutes;
    };

    const minutesOverlap = (sliceStart: Date, sliceEnd: Date, start: Date, end: Date) => {
      const clampedStart = sliceStart < start ? start : sliceStart;
      const clampedEnd = sliceEnd > end ? end : sliceEnd;
      const minutes = Math.floor((clampedEnd.getTime() - clampedStart.getTime()) / 60000);
      return Math.max(0, minutes);
    };

    const plannedMinutesForPeriod = (periodStart: Date, periodEnd: Date) => {
      const totals: Record<string, number> = {};
      const start = startOfDay(periodStart);
      const end = startOfDay(periodEnd);
      let days: Date[] = [];
      try {
        days = eachDayOfInterval({ start, end });
      } catch (error) {
        console.error('[ReviewsPage] Invalid period interval for planned minutes', { start, end }, error);
        return totals;
      }

      for (const day of days) {
        const dateStr = format(day, 'yyyy-MM-dd');
        const plan = plansByDate[dateStr];
        if (!plan) continue;

        for (const block of plan.plannedBlocks) {
          const startMin = hhmmToMinutes(block.start);
          const endMin = hhmmToMinutes(block.end);
          if (startMin === null || endMin === null) continue;

          const minutes = Math.max(0, endMin - startMin);
          const parsed = parsePlannedBlockLabel(block.label);
          const category = parsed.primary === 'OTHER' ? 'OTHER' : parsed.primary;
          addMinutes(totals, category, minutes);
        }
      }

      return totals;
    };

    const actualMinutesForPeriod = (periodStart: Date, periodEnd: Date) => {
      const totals: Record<string, number> = {};

      for (const slice of primarySlices) {
        const start = new Date(slice.start);
        const end = slice.end ? new Date(slice.end) : new Date();
        const minutes = minutesOverlap(start, end, periodStart, periodEnd);
        if (minutes === 0) continue;

        const category: Category | 'OTHER' = isPrimaryCategory(slice.category) ? slice.category : 'OTHER';
        addMinutes(totals, category, minutes);
      }

      return totals;
    };

    return plannedActualPeriods.map((period) => {
      const plannedTotals = plannedMinutesForPeriod(period.start, period.end);
      const actualTotals = actualMinutesForPeriod(period.start, period.end);

      const row: Record<string, any> = { date: period.label };
      for (const category of chartCategories) {
        row[`planned_${category}`] = plannedTotals[category] || 0;
        row[`actual_${category}`] = actualTotals[category] || 0;
      }

      return row;
    });
  }, [plannedActualPeriods, plannedActualRange, plansByDate, primarySlices]);

  const plannedActualTooltip = (props: any) => {
    const { active, label, payload } = props;
    if (!active || !payload || payload.length === 0) return null;

    const plannedByCategory = new Map<string, number>();
    const actualByCategory = new Map<string, number>();

    for (const entry of payload) {
      const key: string = entry.dataKey;
      const value: number = Number(entry.value) || 0;
      if (key.startsWith('planned_')) plannedByCategory.set(key.slice('planned_'.length), value);
      if (key.startsWith('actual_')) actualByCategory.set(key.slice('actual_'.length), value);
    }

    const categories = [...PRIMARY_CATEGORIES, 'OTHER'];
    const plannedTotal = categories.reduce((sum, c) => sum + (plannedByCategory.get(c) || 0), 0);
    const actualTotal = categories.reduce((sum, c) => sum + (actualByCategory.get(c) || 0), 0);

    const lineItems = categories
      .map((c) => ({
        category: c,
        planned: plannedByCategory.get(c) || 0,
        actual: actualByCategory.get(c) || 0,
      }))
      .filter((x) => x.planned > 0 || x.actual > 0);

    return (
      <div className="bg-snow border border-stone rounded-default p-12 shadow-e02">
        <p className="text-small font-medium text-ink mb-8">{label}</p>
        <div className="space-y-4">
          <p className="text-micro text-slate">
            Planned: {Math.round(plannedTotal)}m • Actual: {Math.round(actualTotal)}m • Δ{' '}
            {Math.round(actualTotal - plannedTotal)}m
          </p>
          <div className="space-y-2">
            {lineItems.map((item) => (
              <div key={item.category} className="flex items-center justify-between gap-12 text-micro">
                <span className="text-ink">{item.category}</span>
                <span className="text-slate">
                  P {Math.round(item.planned)}m • A {Math.round(item.actual)}m • Δ{' '}
                  {Math.round(item.actual - item.planned)}m
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

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
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create {activeTab === 'DAILY' ? 'Daily' : 'Weekly'} Review
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <Card padding="none">
        <div className="p-0">
          <Tabs<ReviewType>
            value={activeTab}
            onChange={setActiveTab}
            variant="underline"
            ariaLabel="Review type"
            items={[
              { id: 'DAILY', label: 'Daily Reviews' },
              { id: 'WEEKLY', label: 'Weekly Reviews' },
            ]}
            className="px-24"
            buttonClassName="py-12 px-24"
          />
        </div>
      </Card>

      {/* Charts Section */}
      {reviews.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-24">
          {/* Execution Rate Trend */}
          <Card padding="medium">
            <SectionTitleWithInfo
              title="Execution Rate Trend (Last 7)"
              tooltipAriaLabel="About Execution Rate Trend"
              tooltipContent={reviewsHelpContent['chart-execution']}
            />
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
            <SectionTitleWithInfo
              title="Category Balance"
              tooltipAriaLabel="About Category Balance"
              tooltipContent={reviewsHelpContent['chart-cat-balance']}
            />
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
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Primary Activities (Time Engine) - Always shows TODAY's live slices */}
          <Card padding="medium">
            <SectionTitleWithInfo
              title="Daily Activity Clock"
              tooltipAriaLabel="About Primary Activities"
              tooltipContent={reviewsHelpContent['chart-activities']}
            />
            {activeTab === 'WEEKLY' && (
              <DaySelector
                periodStart={new Date(reviews[0].periodStart)}
                periodEnd={new Date(reviews[0].periodEnd)}
                selectedDate={selectedClockDate}
                onDateChange={setSelectedClockDate}
              />
            )}
            <RadialClockChart
              date={activeTab === 'DAILY' ? new Date() : selectedClockDate}
            />
          </Card>

          {/* Planned vs Actual (Primary Categories) */}
          <Card padding="medium">
            <SectionTitleWithInfo
              title="Planned vs Actual (Last 7)"
              tooltipAriaLabel="About Planned vs Actual"
              tooltipContent={reviewsHelpContent['chart-planned-vs-actual']}
            />
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={plannedActualChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={plannedActualTooltip} />
                {[...PRIMARY_CATEGORIES, 'OTHER'].map((category) => {
                  const fill =
                    category === 'OTHER' ? '#94a3b8' : categoryColors[category as Category].hex;
                  return (
                    <React.Fragment key={category}>
                      <Bar
                        dataKey={`planned_${category}`}
                        stackId="planned"
                        fill={fill}
                        fillOpacity={0.35}
                        isAnimationActive={false}
                      />
                      <Bar
                        dataKey={`actual_${category}`}
                        stackId="actual"
                        fill={fill}
                        isAnimationActive={false}
                      />
                    </React.Fragment>
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
            {(plansLoading || slicesLoading) && (
              <p className="text-micro text-slate mt-8">Loading planned vs actual…</p>
            )}
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
                onClick={() => setIsCreateModalOpen(true)}
              >
                Create Your First {activeTab === 'DAILY' ? 'Daily' : 'Weekly'} Review
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {reviews.slice(0, visibleReviewCount).map((review) => (
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
                    <p className="text-micro text-purple-600 font-medium">Tracked Hours</p>
                    <p className="text-display text-purple-900">
                      {(
                        Object.values(review.activityBreakdown || {}).reduce((sum, mins) => sum + mins, 0) /
                        60
                      ).toFixed(1)}
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
                      {review.wins.slice(0, 2).map((win: string, idx: number) => (
                        <li key={idx} className="text-small text-ink flex items-start">
                          <span className="text-green-500 mr-2">✓</span>
                          <span className="line-clamp-1">{win}</span>
                        </li>
                      ))}
                      {review.wins.length > 2 && (
                        <li className="text-small text-slate italic">
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
                      {review.misses.slice(0, 2).map((miss: string, idx: number) => (
                        <li key={idx} className="text-small text-ink flex items-start">
                          <span className="text-red-500 mr-2">✗</span>
                          <span className="line-clamp-1">{miss}</span>
                        </li>
                      ))}
                      {review.misses.length > 2 && (
                        <li className="text-small text-slate italic">
                          +{review.misses.length - 2} more...
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedReview === review.id && (
                <div className="border-t border-fog p-24 bg-cloud space-y-16">
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
                      <span className="text-slate">
                        {expandedSections[review.id]?.wins ? '▼' : '▶'}
                      </span>
                    </button>
                    {expandedSections[review.id]?.wins && (
                      <ul className="space-y-2 ml-4">
                        {review.wins.map((win: string, idx: number) => (
                          <li key={idx} className="text-ink flex items-start">
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
                      <span className="text-slate">
                        {expandedSections[review.id]?.misses ? '▼' : '▶'}
                      </span>
                    </button>
                    {expandedSections[review.id]?.misses && (
                      <ul className="space-y-2 ml-4">
                        {review.misses.map((miss: string, idx: number) => (
                          <li key={idx} className="text-ink flex items-start">
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
                      <span className="text-slate">
                        {expandedSections[review.id]?.lessons ? '▼' : '▶'}
                      </span>
                    </button>
                    {expandedSections[review.id]?.lessons && (
                      <ul className="space-y-2 ml-4">
                        {review.lessons.map((lesson: string, idx: number) => (
                          <li key={idx} className="text-ink flex items-start">
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
                      <span className="text-slate">
                        {expandedSections[review.id]?.nextGoals ? '▼' : '▶'}
                      </span>
                    </button>
                    {expandedSections[review.id]?.nextGoals && (
                      <ul className="space-y-2 ml-4">
                        {review.nextGoals.map((goal: string, idx: number) => (
                          <li key={idx} className="text-ink flex items-start">
                            <span className="text-purple-500 mr-2">→</span>
                            <span>{goal}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Additional Metadata */}
                  <div className="grid grid-cols-2 gap-16 pt-16 border-t border-fog">
                    <div>
                      <p className="text-small text-slate">Total Tracked Time</p>
                      <p className="text-h3 font-semibold text-ink">
                        {review.totalTrackedTime.toFixed(1)} hours
                      </p>
                    </div>
                    {review.contextSwitches !== undefined && (
                      <div>
                        <p className="text-small text-slate">Context Switches</p>
                        <p className="text-h3 font-semibold text-ink">
                          {review.contextSwitches}
                        </p>
                      </div>
                    )}
                    {review.energyAssessment && (
                      <div>
                        <p className="text-small text-slate">Energy Assessment</p>
                        <p className="text-h3 font-semibold text-ink">
                          {review.energyAssessment}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              </Card>
            ))}
            {(visibleReviewCount < reviews.length || !!hasNextPage) && (
              <div className="flex justify-center pt-8">
                <Button variant="secondary" disabled={isFetchingNextPage} onClick={handleLoadMore}>
                  {isFetchingNextPage ? 'Loading more...' : 'Load more'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Review Modal */}
      {isCreateModalOpen && (
        <CreateReviewModal
          reviewType={activeTab}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateReview}
        />
      )}
    </div>
  );
};

export default ReviewsPage;
