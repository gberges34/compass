import React, { useState, useRef, useEffect } from 'react';
import type { ReviewType, Energy, CreateReviewRequest } from '../types';
import Button from './Button';
import Modal from './Modal';

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

  // Ref for focus management
  const winInputRef = useRef<HTMLTextAreaElement>(null);

  // Focus first textarea on mount
  useEffect(() => {
    winInputRef.current?.focus();
  }, []);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !submitting) {
      handleSubmit(e as any);
    }
  };

  return (
    <Modal
      title={`Create ${reviewType === 'DAILY' ? 'Daily' : 'Weekly'} Review`}
      description="Reflect on your progress and plan ahead."
      onClose={onClose}
      size="lg"
      headerVariant="sky"
    >
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-24">
            {error && (
              <div className="bg-danger/10 border border-danger/30 rounded-default p-12 text-danger text-small">
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
                  ref={winInputRef}
                  value={winInput}
                  onChange={(e) => setWinInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      addWin();
                    }
                  }}
                  className="flex-1 px-12 py-8 border border-stone rounded-default bg-snow text-body focus:outline-none focus:ring-2 focus:ring-action/20 focus:border-action resize-none"
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
                <ul className="space-y-8 bg-mint rounded-default p-12 border border-mint">
                  {wins.map((win, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span className="flex-1 text-ink">{win}</span>
                      <button
                        type="button"
                        onClick={() => removeWin(idx)}
                        className="text-slate hover:text-danger transition-colors"
                        aria-label={`Remove win: ${win.slice(0, 50)}`}
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
                  className="flex-1 px-12 py-8 border border-stone rounded-default bg-snow text-body focus:outline-none focus:ring-2 focus:ring-action/20 focus:border-action resize-none"
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
                <ul className="space-y-8 bg-blush rounded-default p-12 border border-blush">
                  {misses.map((miss, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-red-500 mt-0.5">✗</span>
                      <span className="flex-1 text-ink">{miss}</span>
                      <button
                        type="button"
                        onClick={() => removeMiss(idx)}
                        className="text-slate hover:text-danger transition-colors"
                        aria-label={`Remove miss: ${miss.slice(0, 50)}`}
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
                  className="flex-1 px-12 py-8 border border-stone rounded-default bg-snow text-body focus:outline-none focus:ring-2 focus:ring-action/20 focus:border-action resize-none"
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
                <ul className="space-y-8 bg-sky rounded-default p-12 border border-sky">
                  {lessons.map((lesson, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5">💡</span>
                      <span className="flex-1 text-ink">{lesson}</span>
                      <button
                        type="button"
                        onClick={() => removeLesson(idx)}
                        className="text-slate hover:text-danger transition-colors"
                        aria-label={`Remove lesson: ${lesson.slice(0, 50)}`}
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
                  className="flex-1 px-12 py-8 border border-stone rounded-default bg-snow text-body focus:outline-none focus:ring-2 focus:ring-action/20 focus:border-action resize-none"
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
                <ul className="space-y-8 bg-lavender rounded-default p-12 border border-lavender">
                  {nextGoals.map((goal, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-purple-500 mt-0.5">→</span>
                      <span className="flex-1 text-ink">{goal}</span>
                      <button
                        type="button"
                        onClick={() => removeGoal(idx)}
                        className="text-slate hover:text-danger transition-colors"
                        aria-label={`Remove goal: ${goal.slice(0, 50)}`}
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
              <label className="block text-small font-medium text-ink mb-8">
                Energy Assessment (Optional)
              </label>
              <div className="flex gap-3">
                {(['HIGH', 'MEDIUM', 'LOW'] as const).map((level) => (
                  <label
                    key={level}
                    className={`flex-1 cursor-pointer border rounded-default p-12 transition-standard ${
                      energyAssessment === level
                        ? 'border-action bg-sky shadow-e01'
                        : 'border-stone hover:bg-cloud'
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
                      <div className="font-medium text-ink text-small">{level}</div>
                    </div>
                  </label>
                ))}
              </div>
              {energyAssessment && (
                <button
                  type="button"
                  onClick={() => setEnergyAssessment('')}
                  className="text-small text-slate hover:text-ink mt-8"
                >
                  Clear selection
                </button>
              )}
            </div>
        <div className="flex justify-end gap-12 pt-8">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Creating...' : `Create ${reviewType === 'DAILY' ? 'Daily' : 'Weekly'} Review`}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateReviewModal;
