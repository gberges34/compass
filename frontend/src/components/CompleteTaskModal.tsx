import React, { useState } from 'react';
import type { Task, Effort } from '../types';

interface CompleteTaskModalProps {
  task: Task;
  onClose: () => void;
  onComplete: (completionData: {
    outcome: string;
    effortLevel: Effort;
    keyInsight: string;
    actualDuration: number;
    startTime: string;
    endTime: string;
  }) => Promise<void>;
}

const CompleteTaskModal: React.FC<CompleteTaskModalProps> = ({ task, onClose, onComplete }) => {
  const now = new Date();
  const startTime = task.activatedAt ? new Date(task.activatedAt) : new Date(now.getTime() - task.duration * 60000);

  const [outcome, setOutcome] = useState('');
  const [effortLevel, setEffortLevel] = useState<Effort>('MEDIUM');
  const [keyInsight, setKeyInsight] = useState('');
  const [actualDuration, setActualDuration] = useState(task.duration);
  const [startTimeStr, setStartTimeStr] = useState(
    startTime.toISOString().slice(0, 16)
  );
  const [endTimeStr, setEndTimeStr] = useState(
    now.toISOString().slice(0, 16)
  );
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate metrics
  const variance = actualDuration - task.duration;
  const efficiency = task.duration / actualDuration * 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (outcome.trim().length < 10) {
      setError('Outcome must be at least 10 characters');
      return;
    }
    if (keyInsight.trim().length < 10) {
      setError('Key insight must be at least 10 characters');
      return;
    }
    if (actualDuration <= 0) {
      setError('Actual duration must be greater than 0');
      return;
    }

    setCompleting(true);
    try {
      await onComplete({
        outcome: outcome.trim(),
        effortLevel,
        keyInsight: keyInsight.trim(),
        actualDuration,
        startTime: startTimeStr,
        endTime: endTimeStr,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete task');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-200 bg-green-50">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Complete Task</h2>
                <p className="text-gray-600 mt-1">{task.name}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
                {error}
              </div>
            )}

            {/* Outcome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What did you accomplish? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                rows={4}
                placeholder="Describe what you achieved and the final result..."
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                {outcome.length} characters (minimum 10)
              </div>
            </div>

            {/* Effort Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How hard was it? <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-3">
                {(['EASY', 'MEDIUM', 'HARD'] as Effort[]).map((level) => (
                  <label
                    key={level}
                    className={`flex-1 cursor-pointer border-2 rounded-lg p-4 transition-all ${
                      effortLevel === level
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="effort"
                      value={level}
                      checked={effortLevel === level}
                      onChange={(e) => setEffortLevel(e.target.value as Effort)}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="text-2xl mb-1">
                        {level === 'EASY' && '😊'}
                        {level === 'MEDIUM' && '😐'}
                        {level === 'HARD' && '😰'}
                      </div>
                      <div className="font-medium text-gray-900">{level}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Key Insight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What did you learn? <span className="text-red-500">*</span>
              </label>
              <textarea
                value={keyInsight}
                onChange={(e) => setKeyInsight(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="What would you do differently next time? What surprised you?"
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                {keyInsight.length} characters (minimum 10)
              </div>
            </div>

            {/* Time Tracking */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Time Tracking</h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={startTimeStr}
                    onChange={(e) => setStartTimeStr(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={endTimeStr}
                    onChange={(e) => setEndTimeStr(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actual Duration (minutes) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={actualDuration}
                  onChange={(e) => setActualDuration(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  min="1"
                  required
                />
              </div>

              {/* Metrics */}
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-gray-600 text-xs">Estimated</div>
                  <div className="font-bold text-blue-600">{task.duration} min</div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-gray-600 text-xs">Variance</div>
                  <div className={`font-bold ${variance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {variance > 0 ? '+' : ''}{variance} min
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <div className="text-gray-600 text-xs">Efficiency</div>
                  <div className={`font-bold ${efficiency >= 90 ? 'text-green-600' : efficiency >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {efficiency.toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              disabled={completing}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
              disabled={completing}
            >
              {completing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Completing...
                </>
              ) : (
                '✓ Complete Task'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompleteTaskModal;
