import React, { useMemo } from 'react';
import { useTimeHistory } from '../hooks/useTimeHistory';
import { getActivityColor, activityColors } from '../lib/designTokens';
import { addDays, format, startOfDay } from 'date-fns';

const MINUTES_IN_DAY = 24 * 60;
const CLOCK_HEIGHT_PX = 200;
const VIEWBOX_SIZE = 220;
const OUTER_RADIUS = 96;
const INNER_RADIUS = 64;
const BACKGROUND_STROKE = '#eef2f7';

const HOUR_LABEL_TOP_OFFSET = 6;
const HOUR_LABEL_SIDE_OFFSET = 10;
const HOUR_LABEL_SIDE_Y = 3;
const HOUR_LABEL_BOTTOM_OFFSET = 14;

const CENTER_TITLE_Y = -4;
const CENTER_SUBTITLE_Y = 14;

type ClockSegment = {
  startMin: number; // minutes since dayStart
  endMin: number; // minutes since dayStart
  category: string;
  isUntracked: boolean;
  isActive: boolean;
};

type LegendItem = {
  category: string;
  minutes: number;
  hours: number;
  isUntracked: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function minutesBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 60000);
}

function timeToAngleDeg(minSinceDayStart: number) {
  // 0 min => -90deg (12 o'clock). 360deg => full day clockwise.
  return (minSinceDayStart / MINUTES_IN_DAY) * 360 - 90;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (Math.PI / 180) * angleDeg;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function ringSegmentPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngleDeg: number,
  endAngleDeg: number
) {
  const startOuter = polarToCartesian(cx, cy, outerR, startAngleDeg);
  const endOuter = polarToCartesian(cx, cy, outerR, endAngleDeg);
  const startInner = polarToCartesian(cx, cy, innerR, startAngleDeg);
  const endInner = polarToCartesian(cx, cy, innerR, endAngleDeg);
  const delta = endAngleDeg - startAngleDeg;
  const largeArc = delta > 180 ? 1 : 0;

  // Sweep flag 1 draws clockwise for our angle convention.
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ');
}

function segmentLabel(dayStart: Date, seg: ClockSegment) {
  const start = new Date(dayStart.getTime() + seg.startMin * 60000);
  const end = new Date(dayStart.getTime() + seg.endMin * 60000);
  const durMin = Math.max(0, seg.endMin - seg.startMin);
  const durH = Math.round((durMin / 60) * 10) / 10;
  return `${seg.category}: ${format(start, 'p')}–${format(end, 'p')} (${durH}h)`;
}

function buildClockSegments(input: {
  dayStart: Date;
  dayEnd: Date;
  slices: Array<{ start: string; end: string | null; category: string }>;
}) {
  const { dayStart, dayEnd, slices } = input;

  const rawSegments: ClockSegment[] = slices
    .map((s) => {
      const start = new Date(s.start);
      const end = s.end ? new Date(s.end) : new Date();
      const clampedStart = start < dayStart ? dayStart : start;
      const clampedEnd = end > dayEnd ? dayEnd : end;
      const startMin = clamp(minutesBetween(dayStart, clampedStart), 0, MINUTES_IN_DAY);
      const endMin = clamp(minutesBetween(dayStart, clampedEnd), 0, MINUTES_IN_DAY);
      return {
        startMin,
        endMin,
        category: s.category,
        isUntracked: false,
        isActive: s.end === null,
      };
    })
    .filter((seg) => seg.endMin > seg.startMin)
    .sort((a, b) => (a.startMin !== b.startMin ? a.startMin - b.startMin : a.endMin - b.endMin));

  const timeline: ClockSegment[] = [];
  let cursor = 0;

  for (const seg of rawSegments) {
    const startMin = Math.max(seg.startMin, cursor);
    const endMin = Math.max(startMin, seg.endMin);

    if (startMin > cursor) {
      timeline.push({
        startMin: cursor,
        endMin: startMin,
        category: 'Untracked',
        isUntracked: true,
        isActive: false,
      });
    }

    if (endMin > startMin) {
      timeline.push({
        ...seg,
        startMin,
        endMin,
      });
      cursor = Math.max(cursor, endMin);
    }
  }

  if (cursor < MINUTES_IN_DAY) {
    timeline.push({
      startMin: cursor,
      endMin: MINUTES_IN_DAY,
      category: 'Untracked',
      isUntracked: true,
      isActive: false,
    });
  }

  return timeline;
}

export default function RadialClockChart(props: { date: Date }) {
  const dayStart = useMemo(() => startOfDay(props.date), [props.date]);
  const dayEnd = useMemo(() => addDays(dayStart, 1), [dayStart]); // end-exclusive boundary

  const { slices, loading, error } = useTimeHistory({
    startDate: dayStart,
    endDate: dayEnd,
    dimension: 'PRIMARY',
  });

  const segments = useMemo(() => {
    return buildClockSegments({ dayStart, dayEnd, slices });
  }, [dayStart, dayEnd, slices]);

  const totals = useMemo(() => {
    const byCategory = new Map<string, number>();
    let trackedMin = 0;
    let untrackedMin = 0;

    for (const seg of segments) {
      const dur = Math.max(0, seg.endMin - seg.startMin);
      if (seg.isUntracked) {
        untrackedMin += dur;
        continue;
      }
      trackedMin += dur;
      byCategory.set(seg.category, (byCategory.get(seg.category) || 0) + dur);
    }

    const items: LegendItem[] = Array.from(byCategory.entries())
      .map(([category, minutes]) => ({
        category,
        minutes,
        hours: Math.round((minutes / 60) * 10) / 10,
        isUntracked: false,
      }))
      .sort((a, b) => b.minutes - a.minutes);

    const untrackedItem: LegendItem = {
      category: 'Untracked',
      minutes: untrackedMin,
      hours: Math.round((untrackedMin / 60) * 10) / 10,
      isUntracked: true,
    };

    const legendItems = [...items, untrackedItem];

    return {
      trackedH: Math.round((trackedMin / 60) * 10) / 10,
      untrackedH: Math.round((untrackedMin / 60) * 10) / 10,
      legendItems,
    };
  }, [segments]);

  const cx = VIEWBOX_SIZE / 2;
  const cy = VIEWBOX_SIZE / 2;

  if (loading) {
    return (
      <div className="h-[200px] flex items-center justify-center">
        <p className="text-slate text-small">Loading activity clock…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[200px] flex items-center justify-center">
        <p className="text-red-600 text-small">Failed to load Time Engine slices.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="w-full h-[200px]">
        <svg
          role="application"
          tabIndex={0}
          className="recharts-surface"
          width="100%"
          height={CLOCK_HEIGHT_PX}
          viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
          style={{ display: 'block' }}
        >
          {/* Background ring */}
          <circle
            cx={cx}
            cy={cy}
            r={(INNER_RADIUS + OUTER_RADIUS) / 2}
            fill="none"
            stroke={BACKGROUND_STROKE}
            strokeWidth={OUTER_RADIUS - INNER_RADIUS}
          />

          {/* Segments */}
          {segments.map((seg) => {
            const startAngle = timeToAngleDeg(seg.startMin);
            const endAngle = timeToAngleDeg(seg.endMin);
            const fill = seg.isUntracked ? activityColors._untracked : getActivityColor(seg.category);
            const d = ringSegmentPath(cx, cy, INNER_RADIUS, OUTER_RADIUS, startAngle, endAngle);

            return (
              <path
                key={`${seg.startMin}-${seg.endMin}-${seg.category}-${seg.isUntracked ? 'u' : 't'}`}
                d={d}
                fill={fill}
                opacity={seg.isUntracked ? 0.7 : 1}
                className={seg.isActive ? 'animate-pulse' : undefined}
              >
                <title>{segmentLabel(dayStart, seg)}</title>
              </path>
            );
          })}

          {/* Hour markers */}
          <text
            x={cx}
            y={cy - OUTER_RADIUS - HOUR_LABEL_TOP_OFFSET}
            textAnchor="middle"
            className="fill-current text-slate"
            fontSize="10"
          >
            12a
          </text>
          <text
            x={cx + OUTER_RADIUS + HOUR_LABEL_SIDE_OFFSET}
            y={cy + HOUR_LABEL_SIDE_Y}
            textAnchor="middle"
            className="fill-current text-slate"
            fontSize="10"
          >
            6a
          </text>
          <text
            x={cx}
            y={cy + OUTER_RADIUS + HOUR_LABEL_BOTTOM_OFFSET}
            textAnchor="middle"
            className="fill-current text-slate"
            fontSize="10"
          >
            12p
          </text>
          <text
            x={cx - OUTER_RADIUS - HOUR_LABEL_SIDE_OFFSET}
            y={cy + HOUR_LABEL_SIDE_Y}
            textAnchor="middle"
            className="fill-current text-slate"
            fontSize="10"
          >
            6p
          </text>

          {/* Center labels */}
          <text
            x={cx}
            y={cy + CENTER_TITLE_Y}
            textAnchor="middle"
            className="fill-current text-ink"
            fontSize="12"
            fontWeight="600"
          >
            {totals.trackedH}h tracked
          </text>
          <text
            x={cx}
            y={cy + CENTER_SUBTITLE_Y}
            textAnchor="middle"
            className="fill-current text-slate"
            fontSize="10"
          >
            {totals.untrackedH}h untracked
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-16 gap-y-8">
        {totals.legendItems.map((item) => (
          <div key={item.category} className="flex items-center gap-8">
            <span
              className="inline-block h-10 w-10 rounded-sm border border-fog"
              style={{
                backgroundColor: item.isUntracked ? activityColors._untracked : getActivityColor(item.category),
              }}
              aria-hidden
            />
            <span className="text-small text-ink">
              {item.category}{' '}
              <span className="text-slate">
                {item.hours}h
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* Small hint */}
      <p className="text-micro text-slate">
        Hover segments to see exact times.
      </p>
    </div>
  );
}


