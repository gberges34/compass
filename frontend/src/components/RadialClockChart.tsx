import React, { useMemo } from 'react';
import { useTimeHistory } from '../hooks/useTimeHistory';
import { getActivityColor, activityColors } from '../lib/designTokens';
import { addDays, format, startOfDay } from 'date-fns';

type ClockSegment = {
  startMin: number; // minutes since dayStart
  endMin: number; // minutes since dayStart
  category: string;
  isUntracked: boolean;
  isActive: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function minutesBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 60000);
}

function timeToAngleDeg(minSinceDayStart: number) {
  // 0 min => -90deg (12 o'clock). 360deg => full day clockwise.
  return (minSinceDayStart / 1440) * 360 - 90;
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
  const dayMinutes = 1440;

  const rawSegments: ClockSegment[] = slices
    .map((s) => {
      const start = new Date(s.start);
      const end = s.end ? new Date(s.end) : new Date();
      const clampedStart = start < dayStart ? dayStart : start;
      const clampedEnd = end > dayEnd ? dayEnd : end;
      const startMin = clamp(minutesBetween(dayStart, clampedStart), 0, dayMinutes);
      const endMin = clamp(minutesBetween(dayStart, clampedEnd), 0, dayMinutes);
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

  if (cursor < dayMinutes) {
    timeline.push({
      startMin: cursor,
      endMin: dayMinutes,
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

    const items = Array.from(byCategory.entries())
      .map(([category, minutes]) => ({
        category,
        minutes,
        hours: Math.round((minutes / 60) * 10) / 10,
      }))
      .sort((a, b) => b.minutes - a.minutes);

    return {
      trackedH: Math.round((trackedMin / 60) * 10) / 10,
      untrackedH: Math.round((untrackedMin / 60) * 10) / 10,
      items,
    };
  }, [segments]);

  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 96;
  const innerR = 64;

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
          height="200"
          viewBox={`0 0 ${size} ${size}`}
          style={{ display: 'block' }}
        >
          {/* Background ring */}
          <circle cx={cx} cy={cy} r={(innerR + outerR) / 2} fill="none" stroke="#eef2f7" strokeWidth={outerR - innerR} />

          {/* Segments */}
          {segments.map((seg, idx) => {
            const startAngle = timeToAngleDeg(seg.startMin);
            const endAngle = timeToAngleDeg(seg.endMin);
            const fill = seg.isUntracked ? activityColors._untracked : getActivityColor(seg.category);
            const d = ringSegmentPath(cx, cy, innerR, outerR, startAngle, endAngle);

            return (
              <path
                key={`${seg.category}-${seg.startMin}-${seg.endMin}-${idx}`}
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
          <text x={cx} y={cy - outerR - 6} textAnchor="middle" className="fill-current text-slate" fontSize="10">
            12a
          </text>
          <text x={cx + outerR + 10} y={cy + 3} textAnchor="middle" className="fill-current text-slate" fontSize="10">
            6a
          </text>
          <text x={cx} y={cy + outerR + 14} textAnchor="middle" className="fill-current text-slate" fontSize="10">
            12p
          </text>
          <text x={cx - outerR - 10} y={cy + 3} textAnchor="middle" className="fill-current text-slate" fontSize="10">
            6p
          </text>

          {/* Center labels */}
          <text x={cx} y={cy - 4} textAnchor="middle" className="fill-current text-ink" fontSize="12" fontWeight="600">
            {totals.trackedH}h tracked
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" className="fill-current text-slate" fontSize="10">
            {totals.untrackedH}h untracked
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-16 gap-y-8">
        {totals.items.map((item) => (
          <div key={item.category} className="flex items-center gap-8">
            <span
              className="inline-block h-10 w-10 rounded-sm border border-fog"
              style={{ backgroundColor: getActivityColor(item.category) }}
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
        <div className="flex items-center gap-8">
          <span
            className="inline-block h-10 w-10 rounded-sm border border-fog"
            style={{ backgroundColor: activityColors._untracked }}
            aria-hidden
          />
          <span className="text-small text-ink">
            Untracked <span className="text-slate">{totals.untrackedH}h</span>
          </span>
        </div>
      </div>

      {/* Small hint */}
      <p className="text-micro text-slate">
        Hover segments to see exact times.
      </p>
    </div>
  );
}


