import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTodayPlan, createDailyPlan } from '../lib/api';
import type { DailyPlan, Energy, DeepWorkBlock, TimeBlock, CreateDailyPlanRequest } from '../types';
import { useToast } from '../contexts/ToastContext';
import LoadingSkeleton from '../components/LoadingSkeleton';

const OrientEastPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // State for existing plan
  const [existingPlan, setExistingPlan] = useState<DailyPlan | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [energyLevel, setEnergyLevel] = useState<Energy>('MEDIUM');

  // Deep Work Block 1 (required)
  const [dwb1Start, setDwb1Start] = useState('09:00');
  const [dwb1End, setDwb1End] = useState('11:00');
  const [dwb1Focus, setDwb1Focus] = useState('');

  // Deep Work Block 2 (optional)
  const [enableDwb2, setEnableDwb2] = useState(false);
  const [dwb2Start, setDwb2Start] = useState('14:00');
  const [dwb2End, setDwb2End] = useState('16:00');
  const [dwb2Focus, setDwb2Focus] = useState('');

  // Admin Block (optional)
  const [enableAdmin, setEnableAdmin] = useState(false);
  const [adminStart, setAdminStart] = useState('16:00');
  const [adminEnd, setAdminEnd] = useState('17:00');

  // Buffer Block (optional)
  const [enableBuffer, setEnableBuffer] = useState(false);
  const [bufferStart, setBufferStart] = useState('17:00');
  const [bufferEnd, setBufferEnd] = useState('18:00');

  // Top 3 Outcomes (required)
  const [outcome1, setOutcome1] = useState('');
  const [outcome2, setOutcome2] = useState('');
  const [outcome3, setOutcome3] = useState('');

  // Reward (optional)
  const [reward, setReward] = useState('');

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    const checkExistingPlan = async () => {
      try {
        setLoading(true);
        const plan = await getTodayPlan();
        setExistingPlan(plan);
      } catch (err) {
        // No plan exists yet, that's fine
        setExistingPlan(null);
        setIsEditing(true); // Show form if no plan exists
      } finally {
        setLoading(false);
      }
    };

    checkExistingPlan();
  }, []);

  const validateForm = (): string | null => {
    if (!dwb1Start || !dwb1End || !dwb1Focus.trim()) {
      return 'Deep Work Block #1 is required (start, end, and focus)';
    }

    if (enableDwb2 && (!dwb2Start || !dwb2End || !dwb2Focus.trim())) {
      return 'Deep Work Block #2: Please fill all fields or disable it';
    }

    if (enableAdmin && (!adminStart || !adminEnd)) {
      return 'Admin Block: Please fill all fields or disable it';
    }

    if (enableBuffer && (!bufferStart || !bufferEnd)) {
      return 'Buffer Block: Please fill all fields or disable it';
    }

    if (!outcome1.trim() || !outcome2.trim() || !outcome3.trim()) {
      return 'All three outcomes are required';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast.showError(validationError);
      return;
    }

    try {
      setSubmitting(true);

      const deepWorkBlock1: DeepWorkBlock = {
        start: dwb1Start,
        end: dwb1End,
        focus: dwb1Focus.trim(),
      };

      const deepWorkBlock2: DeepWorkBlock | undefined = enableDwb2
        ? {
            start: dwb2Start,
            end: dwb2End,
            focus: dwb2Focus.trim(),
          }
        : undefined;

      const adminBlock: TimeBlock | undefined = enableAdmin
        ? {
            start: adminStart,
            end: adminEnd,
          }
        : undefined;

      const bufferBlock: TimeBlock | undefined = enableBuffer
        ? {
            start: bufferStart,
            end: bufferEnd,
          }
        : undefined;

      const request: CreateDailyPlanRequest = {
        energyLevel,
        deepWorkBlock1,
        deepWorkBlock2,
        adminBlock,
        bufferBlock,
        topOutcomes: [outcome1.trim(), outcome2.trim(), outcome3.trim()],
        reward: reward.trim() || undefined,
      };

      await createDailyPlan(request);
      toast.showSuccess('Daily plan created successfully! Navigating to Today page...');

      // Navigate to /today after a brief delay
      setTimeout(() => {
        navigate('/today');
      }, 1500);
    } catch (err) {
      toast.showError(err instanceof Error ? err.message : 'Failed to create daily plan');
      console.error('Error creating daily plan:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <LoadingSkeleton variant="card" count={1} />
        <LoadingSkeleton variant="card" count={5} />
      </div>
    );
  }

  // Show existing plan if it exists and not editing
  if (existingPlan && !isEditing) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900">Orient East</h1>
          <p className="text-gray-600 mt-1">{today}</p>
        </div>

        {/* Existing Plan Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Today's Plan Already Set</h2>
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Edit Plan
            </button>
          </div>

          <div className="space-y-4">
            {/* Energy Level */}
            <div className="flex items-center space-x-3">
              <span className="text-gray-600 font-medium">Energy Level:</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  existingPlan.energyLevel === 'HIGH'
                    ? 'bg-green-100 text-green-800'
                    : existingPlan.energyLevel === 'MEDIUM'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {existingPlan.energyLevel === 'HIGH' && '⚡ '}
                {existingPlan.energyLevel === 'MEDIUM' && '⚖️ '}
                {existingPlan.energyLevel === 'LOW' && '🔋 '}
                {existingPlan.energyLevel}
              </span>
            </div>

            {/* Deep Work Blocks */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Deep Work Blocks</h3>
              <div className="space-y-2">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-blue-900">
                      {existingPlan.deepWorkBlock1.focus}
                    </span>
                    <span className="text-sm text-blue-700">
                      {existingPlan.deepWorkBlock1.start} - {existingPlan.deepWorkBlock1.end}
                    </span>
                  </div>
                </div>
                {existingPlan.deepWorkBlock2 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-blue-900">
                        {existingPlan.deepWorkBlock2.focus}
                      </span>
                      <span className="text-sm text-blue-700">
                        {existingPlan.deepWorkBlock2.start} - {existingPlan.deepWorkBlock2.end}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top 3 Outcomes */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Top 3 Outcomes</h3>
              <ul className="space-y-1">
                {existingPlan.topOutcomes.map((outcome, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-600 font-bold mr-2">{index + 1}.</span>
                    <span className="text-gray-700">{outcome}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Reward */}
            {existingPlan.reward && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">🎁</span>
                  <div>
                    <span className="font-medium text-amber-900">Reward: </span>
                    <span className="text-amber-800">{existingPlan.reward}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show form for creating/editing plan
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900">Orient East</h1>
        <p className="text-gray-600 mt-1">{today}</p>
        <p className="text-sm text-gray-500 mt-2">
          Morning planning: Set your intentions and structure for the day ahead
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Energy Level */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Energy Level</h2>
          <select
            value={energyLevel}
            onChange={(e) => setEnergyLevel(e.target.value as Energy)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="HIGH">⚡ HIGH - Fully energized and ready</option>
            <option value="MEDIUM">⚖️ MEDIUM - Normal energy levels</option>
            <option value="LOW">🔋 LOW - Running on reserve</option>
          </select>
        </div>

        {/* Deep Work Block #1 (Required) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Deep Work Block #1 <span className="text-red-500">*</span>
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={dwb1Start}
                  onChange={(e) => setDwb1Start(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={dwb1End}
                  onChange={(e) => setDwb1End(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Focus
              </label>
              <input
                type="text"
                value={dwb1Focus}
                onChange={(e) => setDwb1Focus(e.target.value)}
                placeholder="What will you work on during this block?"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>

        {/* Deep Work Block #2 (Optional) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Deep Work Block #2</h2>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableDwb2}
                onChange={(e) => setEnableDwb2(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Enable</span>
            </label>
          </div>
          {enableDwb2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={dwb2Start}
                    onChange={(e) => setDwb2Start(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={dwb2End}
                    onChange={(e) => setDwb2End(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Focus
                </label>
                <input
                  type="text"
                  value={dwb2Focus}
                  onChange={(e) => setDwb2Focus(e.target.value)}
                  placeholder="What will you work on during this block?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Admin Block (Optional) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Admin Block</h2>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableAdmin}
                onChange={(e) => setEnableAdmin(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Enable</span>
            </label>
          </div>
          {enableAdmin && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={adminStart}
                  onChange={(e) => setAdminStart(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={adminEnd}
                  onChange={(e) => setAdminEnd(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Buffer Block (Optional) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Buffer Block</h2>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enableBuffer}
                onChange={(e) => setEnableBuffer(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Enable</span>
            </label>
          </div>
          {enableBuffer && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={bufferStart}
                  onChange={(e) => setBufferStart(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={bufferEnd}
                  onChange={(e) => setBufferEnd(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Top 3 Outcomes (Required) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Top 3 Outcomes <span className="text-red-500">*</span>
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Outcome #1 (Most Important)
              </label>
              <input
                type="text"
                value={outcome1}
                onChange={(e) => setOutcome1(e.target.value)}
                placeholder="What's the most important outcome for today?"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Outcome #2
              </label>
              <input
                type="text"
                value={outcome2}
                onChange={(e) => setOutcome2(e.target.value)}
                placeholder="Second most important outcome"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Outcome #3
              </label>
              <input
                type="text"
                value={outcome3}
                onChange={(e) => setOutcome3(e.target.value)}
                placeholder="Third most important outcome"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>

        {/* Reward (Optional) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Reward</h2>
          <input
            type="text"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            placeholder="How will you celebrate completing today's plan?"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {submitting ? 'Creating Plan...' : 'Create Daily Plan'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrientEastPage;
