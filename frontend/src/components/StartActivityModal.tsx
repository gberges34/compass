import React, { useState } from 'react';
import { useTimeEngine } from '../hooks/useTimeEngine';
import Button from './Button';
import Input from './Input';
import type { StartSliceRequest } from '../lib/api';

interface StartActivityModalProps {
  onClose: () => void;
}

// Predefined categories for non-task activities
const ACTIVITY_CATEGORIES = [
  // Non-task activities
  'Sleep',
  'Commute',
  'Gaming',
  'Cooking',
  'Workout',
  'Personal Care',
  'Errands',
  // Work modes
  'Deep Work',
  'Shallow Work',
  'Admin',
  // Social
  'Discord Call',
  'In-Person',
  'Date Night',
  // Task categories (for reference)
  'SCHOOL',
  'MUSIC',
  'FITNESS',
  'NUTRITION',
  'HYGIENE',
  'PET',
  'SOCIAL',
  'PERSONAL',
  'ADMIN',
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

    if (category === 'CUSTOM' && customCategory.trim().length < 1) {
      setError('Please enter a category name');
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
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-200 bg-blue-50">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Start Activity</h2>
                <p className="text-gray-600 mt-1">Track time for non-task activities</p>
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

            {/* Dimension Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dimension <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {DIMENSIONS.map((dim) => (
                  <label
                    key={dim.value}
                    className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                      dimension === dim.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
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
                      <div className="font-medium text-gray-900 text-sm">{dim.label}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a category...</option>
                {ACTIVITY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="CUSTOM">Custom...</option>
              </select>
            </div>

            {/* Custom Category Input */}
            {category === 'CUSTOM' && (
              <div>
                <Input
                  label="Custom Category"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Enter category name"
                  fullWidth
                  required
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              disabled={isStarting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
              disabled={isStarting}
            >
              {isStarting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Starting...
                </>
              ) : (
                '▶ Start Activity'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StartActivityModal;

