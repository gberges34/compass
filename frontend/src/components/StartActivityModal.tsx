import React, { useState } from 'react';
import { useTimeEngine } from '../hooks/useTimeEngine';
import Input from './Input';
import type { StartSliceRequest } from '../lib/api';
import Button from './Button';
import Modal from './Modal';
import Select from './Select';

interface StartActivityModalProps {
  onClose: () => void;
}

// Predefined categories for non-task activities
// Note: Some activities are automated via external systems:
// - Sleep → HealthKit API (authoritative source)
// - Gaming → Discord Bot → Gaming Focus Mode
// - Discord Call → Discord Bot (usually automatic, but can be started manually)
const ACTIVITY_CATEGORIES = [
  // PRIMARY Activities (manual triggers only)
  'Showering',
  'Commute',
  'Cooking',
  'Workout',
  'Personal Care',
  'Errands',
  // WORK_MODE Activities
  'Focus',
  'Light Work',
  // SOCIAL Activities (can overlap with PRIMARY)
  'Discord Call',
  // SEGMENT Activities
  'Morning Lag',
  'Gym Block',
] as const;

const DIMENSIONS: Array<{ value: StartSliceRequest['dimension']; label: string }> = [
  { value: 'PRIMARY', label: 'Primary Activity' },
  { value: 'WORK_MODE', label: 'Work Mode' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'SEGMENT', label: 'Segment' },
];

const StartActivityModal: React.FC<StartActivityModalProps> = ({ onClose }) => {
  const { startSlice, isStarting } = useTimeEngine();
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [dimension, setDimension] = useState<StartSliceRequest['dimension']>('PRIMARY');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const finalCategory = category === 'CUSTOM' ? customCategory.trim() : category.trim();
    if (!finalCategory) {
      setError('Please select or enter a category');
      return;
    }

    try {
      await startSlice(finalCategory, dimension, 'MANUAL');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start activity');
    }
  };

  return (
    <Modal
      title="Start Activity"
      description="Track time for non-task activities."
      onClose={onClose}
      size="sm"
      headerVariant="sky"
      footer={
        <div className="flex items-center justify-end gap-12">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isStarting}>
            Cancel
          </Button>
          <Button type="submit" form="start-activity-form" variant="primary" disabled={isStarting}>
            {isStarting ? 'Starting...' : 'Start Activity'}
          </Button>
        </div>
      }
    >
      <form id="start-activity-form" onSubmit={handleSubmit} className="space-y-16">
        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-default p-12 text-danger text-small">
            {error}
          </div>
        )}

        <div>
          <label className="block text-small font-medium text-ink mb-4">Dimension</label>
          <div className="grid grid-cols-2 gap-12">
            {DIMENSIONS.map((dim) => (
              <label
                key={dim.value}
                className={`cursor-pointer border rounded-default p-12 transition-standard ${
                  dimension === dim.value
                    ? 'border-action bg-sky text-ink shadow-e01'
                    : 'border-stone bg-snow hover:bg-cloud'
                }`}
              >
                <input
                  type="radio"
                  name="dimension"
                  value={dim.value}
                  checked={dimension === dim.value}
                  onChange={(e) => setDimension(e.target.value as StartSliceRequest['dimension'])}
                  className="sr-only"
                />
                <div className="text-center">
                  <div className="font-medium text-ink text-small">{dim.label}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <Select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Select a category..."
          options={[
            ...ACTIVITY_CATEGORIES.map((cat) => ({ value: cat, label: cat })),
            { value: 'CUSTOM', label: 'Custom...' },
          ]}
          fullWidth
          disabled={isStarting}
        />

        {category === 'CUSTOM' && (
          <Input
            label="Custom Category"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            placeholder="Enter category name"
            fullWidth
            required
            disabled={isStarting}
          />
        )}
      </form>
    </Modal>
  );
};

export default StartActivityModal;
