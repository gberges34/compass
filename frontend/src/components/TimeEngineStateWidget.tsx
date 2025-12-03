import React, { useState, useEffect } from 'react';
import { useTimeEngine } from '../hooks/useTimeEngine';
import Button from './Button';
import Badge from './Badge';
import { parseISO, differenceInMinutes, format } from 'date-fns';

interface ElapsedTimeProps {
  startTime: string;
}

const ElapsedTime: React.FC<ElapsedTimeProps> = ({ startTime }) => {
  const [, setNow] = useState(new Date());

  // Update elapsed time every second (isolated to this component)
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatElapsedTime = (startTimeStr: string): string => {
    const start = parseISO(startTimeStr);
    const now = new Date();
    const minutes = differenceInMinutes(now, start);
    
    if (minutes < 1) {
      return 'Just started';
    }
    
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

  return <span className="font-medium text-action">{formatElapsedTime(startTime)}</span>;
};

const TimeEngineStateWidget: React.FC = () => {
  const { state, loading, stopSlice, isStopping } = useTimeEngine();

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-fog rounded w-1/3 mb-8"></div>
        <div className="h-16 bg-fog rounded"></div>
      </div>
    );
  }

  if (!state) {
    return null;
  }

  // Build list of active slices with dimension labels
  const activeSlices = [
    { key: 'primary' as const, label: 'Activity', data: state.primary },
    { key: 'work_mode' as const, label: 'Work Mode', data: state.work_mode },
    { key: 'social' as const, label: 'Social', data: state.social },
    { key: 'segment' as const, label: 'Segment', data: state.segment },
  ].filter((slice) => slice.data !== null);

  if (activeSlices.length === 0) {
    return (
      <p className="text-slate text-center text-small">No active time tracking</p>
    );
  }

  // Format start time for display
  const formatStartTime = (startTime: string): string => {
    const start = parseISO(startTime);
    return format(start, 'h:mm a');
  };

  // Map dimension keys to API dimension values
  const dimensionMap: Record<string, 'PRIMARY' | 'WORK_MODE' | 'SOCIAL' | 'SEGMENT'> = {
    primary: 'PRIMARY',
    work_mode: 'WORK_MODE',
    social: 'SOCIAL',
    segment: 'SEGMENT',
  };

  return (
    <div>
      <h3 className="text-h3 text-ink mb-12">Currently Tracking</h3>
      <div className="space-y-8">
        {activeSlices.map(({ key, label, data }) => {
          if (!data) return null;
          
          return (
            <div
              key={key}
              className="flex items-center justify-between bg-mint border border-mint rounded-card p-12"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-8 mb-4">
                  <Badge variant="mint" size="small">
                    {label}
                  </Badge>
                  <span className="font-semibold text-ink">{data.category}</span>
                </div>
                <div className="flex items-center space-x-12 text-micro text-slate">
                  <span>Started: {formatStartTime(data.start)}</span>
                  <ElapsedTime startTime={data.start} />
                </div>
              </div>
              <Button
                variant="ghost"
                size="small"
                onClick={() => stopSlice(dimensionMap[key])}
                disabled={isStopping}
                className="ml-12"
              >
                Stop
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimeEngineStateWidget;

