import React, { useState } from 'react';
import type { Task, Effort } from '../types';
import { formatForDatetimeInput, addMinutesToDate } from '../lib/dateUtils';
import Button from './Button';
import Input from './Input';
import Modal from './Modal';

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
  const startTime = task.activatedAt ? new Date(task.activatedAt) : addMinutesToDate(now, -task.duration);

  const [outcome, setOutcome] = useState('');
  const [effortLevel, setEffortLevel] = useState<Effort>('MEDIUM');
  const [keyInsight, setKeyInsight] = useState('');
  const [actualDuration, setActualDuration] = useState(task.duration);
  const [startTimeStr, setStartTimeStr] = useState(
    formatForDatetimeInput(startTime)
  );
  const [endTimeStr, setEndTimeStr] = useState(
    formatForDatetimeInput(now)
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
    <Modal
      title="Complete Task"
      description={task.name}
      onClose={onClose}
      size="md"
      headerVariant="mint"
    >
      <form onSubmit={handleSubmit} className="space-y-16">
        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-default p-12 text-danger text-small">
            {error}
          </div>
        )}

        <div>
          <label className="block text-small font-medium text-ink mb-4">
            What did you accomplish?
          </label>
          <textarea
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            className="w-full px-12 py-8 border border-stone rounded-default bg-snow text-body focus:outline-none focus:ring-2 focus:ring-action/20 focus:border-action min-h-[120px]"
            rows={4}
            placeholder="Describe what you achieved and the final result..."
            required
            disabled={completing}
          />
          <div className="mt-4 text-micro text-slate">{outcome.length} characters (minimum 10)</div>
        </div>

        <div>
          <label className="block text-small font-medium text-ink mb-4">How hard was it?</label>
          <div className="flex gap-12 flex-wrap">
            {(['SMALL', 'MEDIUM', 'LARGE'] as Effort[]).map((level) => {
              const isActive = effortLevel === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setEffortLevel(level)}
                  disabled={completing}
                  className={`px-16 py-12 rounded-default border transition-standard ${
                    isActive ? 'border-action bg-sky text-ink shadow-e01' : 'border-stone bg-snow text-ink hover:bg-cloud'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-4">
                      {level === 'SMALL' && '😊'}
                      {level === 'MEDIUM' && '😐'}
                      {level === 'LARGE' && '😰'}
                    </div>
                    <div className="font-medium">{level}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-small font-medium text-ink mb-4">What did you learn?</label>
          <textarea
            value={keyInsight}
            onChange={(e) => setKeyInsight(e.target.value)}
            className="w-full px-12 py-8 border border-stone rounded-default bg-snow text-body focus:outline-none focus:ring-2 focus:ring-action/20 focus:border-action min-h-[96px]"
            rows={3}
            placeholder="What would you do differently next time? What surprised you?"
            required
            disabled={completing}
          />
          <div className="mt-4 text-micro text-slate">{keyInsight.length} characters (minimum 10)</div>
        </div>

        <div className="bg-cloud border border-fog rounded-card p-16">
          <h3 className="text-h3 text-ink mb-12">Time Tracking</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-16">
            <Input
              type="datetime-local"
              label="Start Time"
              value={startTimeStr}
              onChange={(e) => setStartTimeStr(e.target.value)}
              fullWidth
              disabled={completing}
            />

            <Input
              type="datetime-local"
              label="End Time"
              value={endTimeStr}
              onChange={(e) => setEndTimeStr(e.target.value)}
              fullWidth
              disabled={completing}
            />
          </div>

          <Input
            type="number"
            label="Actual Duration (minutes)"
            value={actualDuration}
            onChange={(e) => setActualDuration(parseInt(e.target.value, 10))}
            min={1}
            fullWidth
            required
            disabled={completing}
          />

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="bg-snow rounded-default p-12 border border-fog">
              <div className="text-micro text-slate">Estimated</div>
              <div className="font-semibold text-action">{task.duration} min</div>
            </div>
            <div className="bg-snow rounded-default p-12 border border-fog">
              <div className="text-micro text-slate">Variance</div>
              <div className={`font-semibold ${variance > 0 ? 'text-danger' : 'text-success'}`}>
                {variance > 0 ? '+' : ''}
                {variance} min
              </div>
            </div>
            <div className="bg-snow rounded-default p-12 border border-fog">
              <div className="text-micro text-slate">Efficiency</div>
              <div className={`font-semibold ${efficiency >= 90 ? 'text-success' : efficiency >= 70 ? 'text-warn' : 'text-danger'}`}>
                {efficiency.toFixed(0)}%
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-12">
          <Button type="button" variant="secondary" onClick={onClose} disabled={completing}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={completing}>
            {completing ? 'Completing...' : 'Complete Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CompleteTaskModal;
