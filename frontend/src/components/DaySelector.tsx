import React, { useMemo } from 'react';
import { eachDayOfInterval, format, isSameDay, startOfDay } from 'date-fns';

export default function DaySelector(props: {
  periodStart: Date;
  periodEnd: Date;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}) {
  const days = useMemo(() => {
    const start = startOfDay(props.periodStart);
    const end = startOfDay(props.periodEnd);
    return eachDayOfInterval({ start, end }).slice(0, 7);
  }, [props.periodStart, props.periodEnd]);

  return (
    <div className="flex flex-wrap gap-8 mb-12">
      {days.map((day) => {
        const selected = isSameDay(day, props.selectedDate);
        return (
          <button
            key={day.toISOString()}
            type="button"
            onClick={() => props.onDateChange(day)}
            className={[
              'px-12 py-8 rounded-default border text-small transition-colors',
              selected
                ? 'bg-action/10 border-action/30 text-action'
                : 'bg-cloud border-fog text-slate hover:bg-fog',
            ].join(' ')}
            aria-pressed={selected}
          >
            <span className="font-semibold">{format(day, 'EEE')}</span>{' '}
            <span className="opacity-80">{format(day, 'd')}</span>
          </button>
        );
      })}
    </div>
  );
}


