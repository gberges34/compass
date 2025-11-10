import React from 'react';
import { Circle, ChevronLeft, ChevronRight } from 'lucide-react';
import { ToolbarProps, View } from 'react-big-calendar';

const CalendarToolbar: React.FC<ToolbarProps> = ({ date, view, onNavigate, onView, label }) => {
  const navigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
    onNavigate(action);
  };

  const changeView = (newView: View) => {
    onView(newView);
  };

  return (
    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
      {/* Left Section: Navigation Buttons */}
      <div className="flex items-center space-x-2">
        {/* Back Button with Left Arrow */}
        <button
          onClick={() => navigate('PREV')}
          className="flex items-center justify-center w-10 h-10 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors duration-200 shadow-sm hover:shadow-md"
          title="Previous"
          aria-label="Previous"
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>

        {/* Today Button with Circle Icon */}
        <button
          onClick={() => navigate('TODAY')}
          className="flex items-center justify-center w-10 h-10 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md"
          title="Go to Today"
          aria-label="Go to Today"
        >
          <Circle size={20} strokeWidth={2} />
        </button>

        {/* Next Button with Right Arrow */}
        <button
          onClick={() => navigate('NEXT')}
          className="flex items-center justify-center w-10 h-10 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors duration-200 shadow-sm hover:shadow-md"
          title="Next"
          aria-label="Next"
        >
          <ChevronRight size={20} strokeWidth={2} />
        </button>
      </div>

      {/* Center Section: Current Date Label */}
      <div className="flex-1 text-center">
        <h2 className="text-xl font-semibold text-gray-900">{label}</h2>
      </div>

      {/* Right Section: View Toggle Buttons */}
      <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => changeView('month')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
            view === 'month'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
          aria-label="Month View"
        >
          Month
        </button>
        <button
          onClick={() => changeView('week')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
            view === 'week'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
          aria-label="Week View"
        >
          Week
        </button>
        <button
          onClick={() => changeView('day')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
            view === 'day'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
          aria-label="Day View"
        >
          Day
        </button>
      </div>
    </div>
  );
};

export default CalendarToolbar;
