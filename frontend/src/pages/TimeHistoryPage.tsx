import React, { useState, useMemo } from 'react';
import { useTimeHistory } from '../hooks/useTimeHistory';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Input from '../components/Input';
import { formatDisplayDate, formatDisplayTime, calculateDurationMinutes } from '../lib/dateUtils';
import { parseISO, subDays, formatISO, startOfDay, endOfDay, format, startOfDay as startOfDayFns } from 'date-fns';
import type { TimeSlice } from '../lib/api';
import { useToast } from '../contexts/ToastContext';

const TimeHistoryPage: React.FC = () => {
  const toast = useToast();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'custom'>('7d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [editingSlice, setEditingSlice] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ start?: string; end?: string; category?: string }>({});
  const [deletingSlice, setDeletingSlice] = useState<string | null>(null);

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const end = endOfDay(new Date());
    let start: Date;

    if (dateRange === '7d') {
      start = startOfDay(subDays(end, 7));
    } else if (dateRange === '30d') {
      start = startOfDay(subDays(end, 30));
    } else {
      // Custom range
      if (customStartDate && customEndDate) {
        start = startOfDay(parseISO(customStartDate));
        const customEnd = endOfDay(parseISO(customEndDate));
        return { startDate: start, endDate: customEnd };
      }
      // Fallback to 7 days if custom dates not set
      start = startOfDay(subDays(end, 7));
    }

    return { startDate: start, endDate: end };
  }, [dateRange, customStartDate, customEndDate]);

  const { slices, loading, updateSlice, deleteSlice, isUpdating, isDeleting } = useTimeHistory({
    startDate,
    endDate,
  });

  // Group slices by day
  const slicesByDay = useMemo(() => {
    const grouped: Record<string, TimeSlice[]> = {};
    slices.forEach((slice) => {
      const sliceDate = parseISO(slice.start);
      // Use ISO date string (YYYY-MM-DD) as key for reliable sorting
      const dayKey = format(startOfDayFns(sliceDate), 'yyyy-MM-dd');
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(slice);
    });
    // Sort days descending (most recent first) and format display key
    return Object.entries(grouped)
      .map(([isoKey, daySlices]) => {
        const displayKey = formatDisplayDate(parseISO(isoKey + 'T00:00:00'));
        return { displayKey, isoKey, slices: daySlices };
      })
      .sort((a, b) => {
        // Sort by ISO key (descending)
        return b.isoKey.localeCompare(a.isoKey);
      });
  }, [slices]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    let totalMinutes = 0;
    const byDimension: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    slices.forEach((slice) => {
      if (slice.end) {
        const duration = calculateDurationMinutes(parseISO(slice.start), parseISO(slice.end));
        totalMinutes += duration;
        byDimension[slice.dimension] = (byDimension[slice.dimension] || 0) + duration;
        byCategory[slice.category] = (byCategory[slice.category] || 0) + duration;
      }
    });

    return {
      totalHours: (totalMinutes / 60).toFixed(1),
      byDimension,
      byCategory,
    };
  }, [slices]);

  const formatDuration = (start: string, end: string | null): string => {
    if (!end) return 'Active';
    const minutes = calculateDurationMinutes(parseISO(start), parseISO(end));
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  const getDimensionBadgeVariant = (dimension: string): 'mint' | 'sky' | 'lavender' | 'blush' => {
    const map: Record<string, 'mint' | 'sky' | 'lavender' | 'blush'> = {
      PRIMARY: 'mint',
      WORK_MODE: 'sky',
      SOCIAL: 'lavender',
      SEGMENT: 'blush',
    };
    return map[dimension] || 'mint';
  };

  const handleEdit = (slice: TimeSlice) => {
    setEditingSlice(slice.id);
    setEditForm({
      start: slice.start.slice(0, 16), // Format for datetime-local input
      end: slice.end ? slice.end.slice(0, 16) : '',
      category: slice.category,
    });
  };

  const handleSaveEdit = async (sliceId: string) => {
    try {
      const updateData: { start?: string; end?: string | null; category?: string } = {};
      if (editForm.start) {
        updateData.start = new Date(editForm.start).toISOString();
      }
      if (editForm.end !== undefined) {
        updateData.end = editForm.end ? new Date(editForm.end).toISOString() : null;
      }
      if (editForm.category) {
        updateData.category = editForm.category;
      }

      await updateSlice({ id: sliceId, data: updateData });
      setEditingSlice(null);
      setEditForm({});
      toast.showSuccess('Time slice updated successfully');
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleDelete = async (sliceId: string) => {
    if (!window.confirm('Are you sure you want to delete this time slice?')) {
      return;
    }

    try {
      await deleteSlice(sliceId);
      setDeletingSlice(null);
      toast.showSuccess('Time slice deleted successfully');
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleCancelEdit = () => {
    setEditingSlice(null);
    setEditForm({});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-48 w-48 border-b-4 border-action"></div>
          <p className="mt-16 text-slate">Loading time history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-24">
      {/* Header */}
      <Card padding="large">
        <div className="flex items-center justify-between mb-24">
          <div>
            <h1 className="text-h1 text-ink">Time History</h1>
            <p className="text-slate mt-4">View and manage your tracked time</p>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-16 flex-wrap">
          <div className="flex items-center gap-8">
            <button
              onClick={() => setDateRange('7d')}
              className={`px-16 py-8 rounded-default font-medium transition-standard ${
                dateRange === '7d'
                  ? 'bg-action text-snow shadow-e02'
                  : 'bg-snow text-ink border border-stone hover:bg-fog'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setDateRange('30d')}
              className={`px-16 py-8 rounded-default font-medium transition-standard ${
                dateRange === '30d'
                  ? 'bg-action text-snow shadow-e02'
                  : 'bg-snow text-ink border border-stone hover:bg-fog'
              }`}
            >
              Last 30 Days
            </button>
            <button
              onClick={() => setDateRange('custom')}
              className={`px-16 py-8 rounded-default font-medium transition-standard ${
                dateRange === 'custom'
                  ? 'bg-action text-snow shadow-e02'
                  : 'bg-snow text-ink border border-stone hover:bg-fog'
              }`}
            >
              Custom Range
            </button>
          </div>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-12">
              <Input
                type="date"
                label="Start Date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-auto"
              />
              <Input
                type="date"
                label="End Date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-auto"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Summary Stats */}
      {slices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-24">
          <Card padding="medium">
            <h3 className="text-h3 text-ink mb-8">Total Time</h3>
            <p className="text-display text-action">{summaryStats.totalHours}h</p>
            <p className="text-small text-slate mt-4">Tracked in selected period</p>
          </Card>

          <Card padding="medium">
            <h3 className="text-h3 text-ink mb-8">By Dimension</h3>
            <div className="space-y-8">
              {Object.entries(summaryStats.byDimension).map(([dimension, minutes]) => (
                <div key={dimension} className="flex items-center justify-between">
                  <Badge variant={getDimensionBadgeVariant(dimension)} size="small">
                    {dimension.replace('_', ' ')}
                  </Badge>
                  <span className="text-body text-ink font-medium">
                    {(minutes / 60).toFixed(1)}h
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="medium">
            <h3 className="text-h3 text-ink mb-8">Top Categories</h3>
            <div className="space-y-8">
              {Object.entries(summaryStats.byCategory)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([category, minutes]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-body text-ink">{category}</span>
                    <span className="text-body text-slate font-medium">
                      {(minutes / 60).toFixed(1)}h
                    </span>
                  </div>
                ))}
            </div>
          </Card>
        </div>
      )}

      {/* Timeline View */}
      {slices.length === 0 ? (
        <Card padding="large">
          <div className="text-center">
            <p className="text-slate mb-16">No time slices found for the selected period</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-24">
          {slicesByDay.map(({ displayKey, slices: daySlices }) => (
            <Card key={displayKey} padding="none">
              <div className="p-24 border-b border-fog">
                <h2 className="text-h2 text-ink">{displayKey}</h2>
                <p className="text-small text-slate mt-4">
                  {daySlices.length} {daySlices.length === 1 ? 'slice' : 'slices'}
                </p>
              </div>

              <div className="divide-y divide-fog">
                {daySlices.map((slice) => (
                  <div key={slice.id} className="p-24 hover:bg-cloud/50 transition-standard">
                    {editingSlice === slice.id ? (
                      <div className="space-y-16">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
                          <Input
                            type="datetime-local"
                            label="Start Time"
                            value={editForm.start || ''}
                            onChange={(e) => setEditForm({ ...editForm, start: e.target.value })}
                            fullWidth
                          />
                          <Input
                            type="datetime-local"
                            label="End Time"
                            value={editForm.end || ''}
                            onChange={(e) => setEditForm({ ...editForm, end: e.target.value })}
                            fullWidth
                          />
                          <Input
                            label="Category"
                            value={editForm.category || ''}
                            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                            fullWidth
                          />
                        </div>
                        <div className="flex items-center gap-12">
                          <Button
                            variant="primary"
                            size="small"
                            onClick={() => handleSaveEdit(slice.id)}
                            disabled={isUpdating}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="small"
                            onClick={handleCancelEdit}
                            disabled={isUpdating}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-12 mb-8">
                            <Badge
                              variant={getDimensionBadgeVariant(slice.dimension)}
                              size="small"
                            >
                              {slice.dimension.replace('_', ' ')}
                            </Badge>
                            <span className="font-semibold text-ink text-body">{slice.category}</span>
                            {slice.linkedTaskId && (
                              <Badge variant="neutral" size="small">
                                Task Linked
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-16 text-small text-slate">
                            <span>{formatDisplayTime(slice.start)}</span>
                            {slice.end && (
                              <>
                                <span>→</span>
                                <span>{formatDisplayTime(slice.end)}</span>
                              </>
                            )}
                            <span className="font-medium text-ink">
                              {formatDuration(slice.start, slice.end)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <Button
                            variant="ghost"
                            size="small"
                            onClick={() => handleEdit(slice)}
                            disabled={isDeleting}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="small"
                            onClick={() => handleDelete(slice.id)}
                            disabled={isDeleting || isUpdating}
                            className="text-danger hover:text-danger"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimeHistoryPage;

