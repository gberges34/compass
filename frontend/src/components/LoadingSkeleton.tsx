import React from 'react';

interface LoadingSkeletonProps {
  variant?: 'card' | 'text' | 'stat' | 'list';
  count?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ variant = 'card', count = 1 }) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'stat':
        return (
          <div className="bg-cloud rounded-card shadow-e02 p-24 animate-pulse border border-fog">
            <div className="h-4 bg-fog rounded-default w-1/2 mb-12"></div>
            <div className="h-10 bg-fog rounded-default w-1/3"></div>
          </div>
        );

      case 'text':
        return (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-fog rounded-default w-3/4"></div>
            <div className="h-4 bg-fog rounded-default w-1/2"></div>
          </div>
        );

      case 'list':
        return (
          <div className="border border-fog bg-cloud rounded-card p-16 animate-pulse shadow-e01">
            <div className="h-6 bg-fog rounded-default w-3/4 mb-12"></div>
            <div className="h-4 bg-fog rounded-default w-full mb-8"></div>
            <div className="flex space-x-2">
              <div className="h-6 bg-fog rounded-default w-16"></div>
              <div className="h-6 bg-fog rounded-default w-16"></div>
              <div className="h-6 bg-fog rounded-default w-20"></div>
            </div>
          </div>
        );

      case 'card':
      default:
        return (
          <div className="bg-cloud rounded-card shadow-e02 border border-fog p-24 animate-pulse">
            <div className="space-y-12">
              <div className="h-6 bg-fog rounded-default w-1/2"></div>
              <div className="h-4 bg-fog rounded-default w-full"></div>
              <div className="h-4 bg-fog rounded-default w-3/4"></div>
            </div>
          </div>
        );
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>{renderSkeleton()}</div>
      ))}
    </>
  );
};

export default LoadingSkeleton;
