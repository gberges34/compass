import React, { useState } from 'react';
import type { ReviewType, Energy, CreateReviewRequest } from '../types';
import Button from './Button';

interface CreateReviewModalProps {
  reviewType: ReviewType;
  onClose: () => void;
  onCreate: (data: CreateReviewRequest) => Promise<void>;
}

const CreateReviewModal: React.FC<CreateReviewModalProps> = ({
  reviewType,
  onClose,
  onCreate,
}) => {
  // State for each array field
  const [wins, setWins] = useState<string[]>([]);
  const [misses, setMisses] = useState<string[]>([]);
  const [lessons, setLessons] = useState<string[]>([]);
  const [nextGoals, setNextGoals] = useState<string[]>([]);
  const [energyAssessment, setEnergyAssessment] = useState<Energy | ''>('');

  // State for input fields
  const [winInput, setWinInput] = useState('');
  const [missInput, setMissInput] = useState('');
  const [lessonInput, setLessonInput] = useState('');
  const [goalInput, setGoalInput] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addWin = () => {
    if (winInput.trim()) {
      setWins([...wins, winInput.trim()]);
      setWinInput('');
    }
  };

  const removeWin = (index: number) => {
    setWins(wins.filter((_, i) => i !== index));
  };

  const addMiss = () => {
    if (missInput.trim()) {
      setMisses([...misses, missInput.trim()]);
      setMissInput('');
    }
  };

  const removeMiss = (index: number) => {
    setMisses(misses.filter((_, i) => i !== index));
  };

  const addLesson = () => {
    if (lessonInput.trim()) {
      setLessons([...lessons, lessonInput.trim()]);
      setLessonInput('');
    }
  };

  const removeLesson = (index: number) => {
    setLessons(lessons.filter((_, i) => i !== index));
  };

  const addGoal = () => {
    if (goalInput.trim()) {
      setNextGoals([...nextGoals, goalInput.trim()]);
      setGoalInput('');
    }
  };

  const removeGoal = (index: number) => {
    setNextGoals(nextGoals.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (wins.length === 0 && misses.length === 0 && lessons.length === 0 && nextGoals.length === 0) {
      setError('Please add at least one item to any section');
      return;
    }

    setSubmitting(true);
    try {
      await onCreate({
        wins,
        misses,
        lessons,
        nextGoals,
        energyAssessment: energyAssessment || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="p-6 border-b border-gray-200 bg-blue-50">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Create {reviewType === 'DAILY' ? 'Daily' : 'Weekly'} Review
                </h2>
                <p className="text-gray-600 mt-1">
                  Reflect on your progress and plan ahead
                </p>
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

          {/* Content */}
          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
                {error}
              </div>
            )}

            {/* Wins Section */}
            <div>
              <label className="block text-sm font-medium text-green-700 mb-2">
                ✓ Wins ({wins.length})
              </label>
              <div className="flex gap-2 mb-2">
                <textarea
                  value={winInput}
                  onChange={(e) => setWinInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addWin();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={2}
                  placeholder="What went well? What are you proud of?"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="medium"
                  onClick={addWin}
                  disabled={!winInput.trim()}
                >
                  Add
                </Button>
              </div>
              {wins.length > 0 && (
                <ul className="space-y-2 bg-green-50 rounded-lg p-3">
                  {wins.map((win, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span className="flex-1 text-gray-700">{win}</span>
                      <button
                        type="button"
                        onClick={() => removeWin(idx)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Misses Section */}
            <div>
              <label className="block text-sm font-medium text-red-700 mb-2">
                ✗ Misses ({misses.length})
              </label>
              <div className="flex gap-2 mb-2">
                <textarea
                  value={missInput}
                  onChange={(e) => setMissInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addMiss();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={2}
                  placeholder="What didn't go as planned? What would you change?"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="medium"
                  onClick={addMiss}
                  disabled={!missInput.trim()}
                >
                  Add
                </Button>
              </div>
              {misses.length > 0 && (
                <ul className="space-y-2 bg-red-50 rounded-lg p-3">
                  {misses.map((miss, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-red-500 mt-0.5">✗</span>
                      <span className="flex-1 text-gray-700">{miss}</span>
                      <button
                        type="button"
                        onClick={() => removeMiss(idx)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Lessons Section */}
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-2">
                💡 Lessons Learned ({lessons.length})
              </label>
              <div className="flex gap-2 mb-2">
                <textarea
                  value={lessonInput}
                  onChange={(e) => setLessonInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addLesson();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={2}
                  placeholder="What insights did you gain? What will you remember?"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="medium"
                  onClick={addLesson}
                  disabled={!lessonInput.trim()}
                >
                  Add
                </Button>
              </div>
              {lessons.length > 0 && (
                <ul className="space-y-2 bg-blue-50 rounded-lg p-3">
                  {lessons.map((lesson, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5">💡</span>
                      <span className="flex-1 text-gray-700">{lesson}</span>
                      <button
                        type="button"
                        onClick={() => removeLesson(idx)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Next Goals Section */}
            <div>
              <label className="block text-sm font-medium text-purple-700 mb-2">
                → Next Goals ({nextGoals.length})
              </label>
              <div className="flex gap-2 mb-2">
                <textarea
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addGoal();
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={2}
                  placeholder="What will you focus on next?"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="medium"
                  onClick={addGoal}
                  disabled={!goalInput.trim()}
                >
                  Add
                </Button>
              </div>
              {nextGoals.length > 0 && (
                <ul className="space-y-2 bg-purple-50 rounded-lg p-3">
                  {nextGoals.map((goal, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-purple-500 mt-0.5">→</span>
                      <span className="flex-1 text-gray-700">{goal}</span>
                      <button
                        type="button"
                        onClick={() => removeGoal(idx)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Energy Assessment (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Energy Assessment (Optional)
              </label>
              <div className="flex gap-3">
                {(['HIGH', 'MEDIUM', 'LOW'] as const).map((level) => (
                  <label
                    key={level}
                    className={`flex-1 cursor-pointer border-2 rounded-lg p-3 transition-all ${
                      energyAssessment === level
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="energy"
                      value={level}
                      checked={energyAssessment === level}
                      onChange={(e) => setEnergyAssessment(e.target.value as Energy)}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="text-2xl mb-1">
                        {level === 'HIGH' && '⚡'}
                        {level === 'MEDIUM' && '😊'}
                        {level === 'LOW' && '😴'}
                      </div>
                      <div className="font-medium text-gray-900 text-sm">{level}</div>
                    </div>
                  </label>
                ))}
              </div>
              {energyAssessment && (
                <button
                  type="button"
                  onClick={() => setEnergyAssessment('')}
                  className="text-sm text-gray-500 hover:text-gray-700 mt-2"
                >
                  Clear selection
                </button>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : `Create ${reviewType === 'DAILY' ? 'Daily' : 'Weekly'} Review`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateReviewModal;
