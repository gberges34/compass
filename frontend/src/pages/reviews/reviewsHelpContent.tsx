import React from 'react';

export type ReviewsHelpId = 'chart-execution' | 'chart-cat-balance' | 'chart-activities';

export const reviewsHelpContent: Record<ReviewsHelpId, React.ReactNode> = {
  'chart-execution': (
    <div className="space-y-8">
      <p>
        <span className="font-semibold">What it is:</span> Percentage of planned outcomes you actually achieved.
      </p>
      <p>
        <span className="font-semibold">Where it comes from:</span> Historical Review records.
      </p>
      <p>
        <span className="font-semibold">How it’s derived:</span> (Completed Outcomes / Planned Outcomes) × 100 per day.
      </p>
    </div>
  ),
  'chart-cat-balance': (
    <div className="space-y-8">
      <p>
        <span className="font-semibold">What it is:</span> Breakdown of time spent on structured work/tasks.
      </p>
      <p>
        <span className="font-semibold">Where it comes from:</span> Completed Compass tasks + Linked Toggl entries.
      </p>
      <p>
        <span className="font-semibold">How it’s derived:</span> Sum of PostDoLog durations grouped by category.
      </p>
    </div>
  ),
  'chart-activities': (
    <div className="space-y-8">
      <p>
        <span className="font-semibold">What it is:</span> Breakdown of unstructured life time (e.g., Sleep, Commute, Chores).
      </p>
      <p>
        <span className="font-semibold">Where it comes from:</span> Time Engine slices not linked to specific tasks.
      </p>
      <p>
        <span className="font-semibold">How it’s derived:</span> PRIMARY dimension slices summed by category.
      </p>
    </div>
  ),
};

