import React from 'react';

export type ReviewsHelpId =
  | 'chart-execution'
  | 'chart-cat-balance'
  | 'chart-activities'
  | 'chart-planned-vs-actual';

export const reviewsHelpContent: Record<ReviewsHelpId, React.ReactNode> = {
  'chart-execution': (
    <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-4">
      <dt className="font-semibold whitespace-nowrap">What it is:</dt>
      <dd>Percentage of planned outcomes you actually achieved.</dd>
      <dt className="font-semibold whitespace-nowrap">Where it comes from:</dt>
      <dd>Historical Review records.</dd>
      <dt className="font-semibold whitespace-nowrap">How it’s derived:</dt>
      <dd>(Completed Outcomes / Planned Outcomes) × 100 per day.</dd>
    </dl>
  ),
  'chart-cat-balance': (
    <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-4">
      <dt className="font-semibold whitespace-nowrap">What it is:</dt>
      <dd>Breakdown of time spent on structured work/tasks.</dd>
      <dt className="font-semibold whitespace-nowrap">Where it comes from:</dt>
      <dd>Completed Compass tasks + Linked Toggl entries.</dd>
      <dt className="font-semibold whitespace-nowrap">How it’s derived:</dt>
      <dd>Sum of PostDoLog durations grouped by category.</dd>
    </dl>
  ),
  'chart-activities': (
    <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-4">
      <dt className="font-semibold whitespace-nowrap">What it is:</dt>
      <dd>A 24-hour clock view of your PRIMARY Time Engine slices, plus any untracked gaps.</dd>
      <dt className="font-semibold whitespace-nowrap">Where it comes from:</dt>
      <dd>Time Engine PRIMARY time slices.</dd>
      <dt className="font-semibold whitespace-nowrap">How it’s derived:</dt>
      <dd>Slices are positioned by start/end time; gaps between slices are shown as Untracked.</dd>
    </dl>
  ),
  'chart-planned-vs-actual': (
    <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-4">
      <dt className="font-semibold whitespace-nowrap">What it is:</dt>
      <dd>Side-by-side breakdown of planned time vs tracked time by primary category.</dd>
      <dt className="font-semibold whitespace-nowrap">Where it comes from:</dt>
      <dd>Planned Blocks (Orient East) + Time Engine PRIMARY slices.</dd>
      <dt className="font-semibold whitespace-nowrap">How it’s derived:</dt>
      <dd>
        Planned totals come from block durations; Actual totals come from PRIMARY slice minutes.
        Unknown categories roll up into Other.
      </dd>
    </dl>
  ),
};
