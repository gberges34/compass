import React from 'react';
import type { Task } from '../types';
import IconButton from './IconButton';

interface TaskActionsProps {
  task: Task;
  onActivate?: () => Promise<void>;
  onComplete?: () => void;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
  onSchedule?: () => void;
  compact?: boolean;
  loading?: boolean;
}

const TaskActions: React.FC<TaskActionsProps> = ({
  task,
  onActivate,
  onComplete,
  onEdit,
  onDelete,
  onSchedule,
  compact = false,
  loading = false,
}) => {
  const buttonClass = compact
    ? 'px-2 py-1 text-xs rounded-default'
    : 'px-3 py-2 text-small rounded-default';

  const baseClass = 'font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

  // Determine which actions are available based on task status
  const canActivate = task.status === 'NEXT' || task.status === 'WAITING';
  const canComplete = task.status === 'ACTIVE';
  const canSchedule = task.status === 'NEXT';
  const canEdit = true; // Can edit any task
  const canDelete = true; // Can delete any task

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {canActivate && onActivate && (
          <IconButton
            onClick={onActivate}
            disabled={loading}
            variant="success"
            label="Activate task"
            icon={
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
            className="min-w-[36px] min-h-[36px]"
          />
        )}
        {canComplete && onComplete && (
          <IconButton
            onClick={onComplete}
            disabled={loading}
            variant="default"
            label="Complete task"
            icon={
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            }
            className="min-w-[36px] min-h-[36px]"
          />
        )}
        {canSchedule && onSchedule && (
          <IconButton
            onClick={onSchedule}
            disabled={loading}
            variant="default"
            label="Schedule task"
            icon={
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            }
            className="min-w-[36px] min-h-[36px]"
          />
        )}
        {canEdit && onEdit && (
          <IconButton
            onClick={onEdit}
            disabled={loading}
            variant="default"
            label="Edit task"
            icon={
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            }
            className="min-w-[36px] min-h-[36px]"
          />
        )}
        {canDelete && onDelete && (
          <IconButton
            onClick={onDelete}
            disabled={loading}
            variant="danger"
            label="Delete task"
            icon={
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            }
            className="min-w-[36px] min-h-[36px]"
          />
        )}
      </div>
    );
  }

  // Full-sized buttons with text
  return (
    <div className="flex flex-wrap gap-2">
      {canActivate && onActivate && (
        <button
          onClick={onActivate}
          disabled={loading}
          className={`${buttonClass} ${baseClass} bg-success text-snow hover:bg-green-600 flex items-center`}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {loading ? 'Activating...' : 'Activate'}
        </button>
      )}

      {canComplete && onComplete && (
        <button
          onClick={onComplete}
          disabled={loading}
          className={`${buttonClass} ${baseClass} bg-action text-snow hover:bg-action-hover flex items-center`}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Complete
        </button>
      )}

      {canSchedule && onSchedule && (
        <button
          onClick={onSchedule}
          disabled={loading}
          className={`${buttonClass} ${baseClass} bg-lavender text-purple-700 border border-lavender hover:bg-lavender/80 flex items-center`}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Schedule
        </button>
      )}

      {canEdit && onEdit && (
        <button
          onClick={onEdit}
          disabled={loading}
          className={`${buttonClass} ${baseClass} bg-cloud text-ink border border-stone hover:bg-fog flex items-center`}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </button>
      )}

      {canDelete && onDelete && (
        <button
          onClick={onDelete}
          disabled={loading}
          className={`${buttonClass} ${baseClass} bg-blush text-danger border border-blush hover:bg-blush/80 flex items-center`}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      )}
    </div>
  );
};

export default TaskActions;
