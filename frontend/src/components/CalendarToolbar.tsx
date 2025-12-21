import React from 'react';
import { Circle, ChevronLeft, ChevronRight } from 'lucide-react';
import { ToolbarProps, View, Event } from 'react-big-calendar';
import IconButton from './IconButton';
import Tabs from './Tabs';

const CalendarToolbar = <TEvent extends Event = Event, TResource extends object = object>({ date, view, onNavigate, onView, label }: ToolbarProps<TEvent, TResource>) => {
  const navigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    onNavigate(action);
  };

  const changeView = (newView: View) => {
    onView(newView);
  };

  return (
    <div className="flex items-center justify-between mb-16 pb-12 border-b border-fog">
      {/* Left Section: Navigation Buttons */}
      <div className="flex items-center space-x-2">
        {/* Back Button with Left Arrow */}
        <IconButton
          onClick={() => navigate('PREV')}
          variant="default"
          label="Previous"
          icon={<ChevronLeft size={20} strokeWidth={2} />}
          className="min-w-[40px] min-h-[40px]"
        />

        {/* Today Button with Circle Icon */}
        <IconButton
          onClick={() => navigate('TODAY')}
          variant="primary"
          label="Go to Today"
          icon={<Circle size={20} strokeWidth={2} />}
          className="min-w-[40px] min-h-[40px]"
        />

        {/* Next Button with Right Arrow */}
        <IconButton
          onClick={() => navigate('NEXT')}
          variant="default"
          label="Next"
          icon={<ChevronRight size={20} strokeWidth={2} />}
          className="min-w-[40px] min-h-[40px]"
        />
      </div>

      {/* Center Section: Current Date Label */}
      <div className="flex-1 text-center">
        <h2 className="text-h3 text-ink">{label}</h2>
      </div>

      {/* Right Section: View Toggle Buttons */}
      <Tabs<View>
        value={view}
        onChange={changeView}
        variant="pills"
        ariaLabel="Calendar view"
        items={[
          { id: 'month', label: 'Month' },
          { id: 'week', label: 'Week' },
          { id: 'day', label: 'Day' },
        ]}
      />
    </div>
  );
};

export default CalendarToolbar;
