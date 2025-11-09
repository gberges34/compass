import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getTodayPlan, updateDailyPlanReflection } from '../lib/api';
import type { DailyPlan, EnergyMatch, UpdateDailyPlanRequest } from '../types';
import { useToast } from '../contexts/ToastContext';
import LoadingSkeleton from '../components/LoadingSkeleton';

const OrientWestPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // State
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [noPlanFound, setNoPlanFound] = useState(false);

  // Form state
  const [actualOutcomes, setActualOutcomes] = useState<number>(0);
  const [energyMatch, setEnergyMatch] = useState<EnergyMatch>('MOSTLY_ALIGNED');
  const [reflection, setReflection] = useState('');

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        setLoading(true);
        const todayPlan = await getTodayPlan();
        setPlan(todayPlan);
        setNoPlanFound(false);
      } catch (err) {
        setNoPlanFound(true);
        toast.showWarning('No plan found for today. Please create a plan first with Orient East.');
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!plan) {
      toast.showError('No plan to update');
      return;
    }

    if (!reflection.trim()) {
      toast.showError('Reflection is required');
      return;
    }

    try {
      setSubmitting(true);

      const request: UpdateDailyPlanRequest = {
        reflection: reflection.trim(),
        actualOutcomes,
        energyMatch,
      };

      await updateDailyPlanReflection(plan.id, request);
      toast.showSuccess('Evening reflection saved successfully! Navigating to Reviews...');

      // Navigate to reviews after a brief delay
      setTimeout(() => {
        navigate('/reviews');
      }, 1500);
    } catch (err) {
      toast.showError(err instanceof Error ? err.message : 'Failed to save reflection');
      console.error('Error saving reflection:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <LoadingSkeleton variant="card" count={1} />
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  if (!plan || noPlanFound) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900">Orient West</h1>
          <p className="text-gray-600 mt-1">{today}</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-900 mb-2">No Plan Found</h2>
          <p className="text-yellow-800 mb-4">
            You need to create a morning plan before you can reflect on it.
          </p>
          <Link
            to="/orient/east"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Morning Plan
          </Link>
        </div>
      </div>
    );
  }

  // Check if already reflected
  if (plan.reflection) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900">Orient West</h1>
          <p className="text-gray-600 mt-1">{today}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Evening Reflection Already Completed
          </h2>

          <div className="space-y-4">
            {/* Actual Outcomes */}
            <div>
              <span className="text-gray-600 font-medium">Outcomes Completed:</span>
              <span className="ml-2 text-lg font-bold text-blue-600">
                {plan.actualOutcomes} / 3
              </span>
            </div>

            {/* Energy Match */}
            <div>
              <span className="text-gray-600 font-medium">Energy Match:</span>
              <span
                className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${
                  plan.energyMatch === 'PERFECT'
                    ? 'bg-green-100 text-green-800'
                    : plan.energyMatch === 'MOSTLY_ALIGNED'
                    ? 'bg-blue-100 text-blue-800'
                    : plan.energyMatch === 'SOME_MISMATCH'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {plan.energyMatch}
              </span>
            </div>

            {/* Reflection */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Reflection:</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{plan.reflection}</p>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Link
              to="/reviews"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              View Reviews
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-3xl font-bold text-gray-900">Orient West</h1>
        <p className="text-gray-600 mt-1">{today}</p>
        <p className="text-sm text-gray-500 mt-2">
          Evening reflection: Review your day and capture learnings
        </p>
      </div>

      {/* Morning Plan Review */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">This Morning's Plan</h2>

        <div className="space-y-4">
          {/* Energy Level */}
          <div className="flex items-center space-x-3">
            <span className="text-gray-600 font-medium">Planned Energy:</span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                plan.energyLevel === 'HIGH'
                  ? 'bg-green-100 text-green-800'
                  : plan.energyLevel === 'MEDIUM'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {plan.energyLevel === 'HIGH' && '� '}
              {plan.energyLevel === 'MEDIUM' && '� '}
              {plan.energyLevel === 'LOW' && '= '}
              {plan.energyLevel}
            </span>
          </div>

          {/* Deep Work Blocks */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Deep Work Blocks</h3>
            <div className="space-y-2">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-blue-900">{plan.deepWorkBlock1.focus}</span>
                  <span className="text-sm text-blue-700">
                    {plan.deepWorkBlock1.start} - {plan.deepWorkBlock1.end}
                  </span>
                </div>
              </div>
              {plan.deepWorkBlock2 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-blue-900">{plan.deepWorkBlock2.focus}</span>
                    <span className="text-sm text-blue-700">
                      {plan.deepWorkBlock2.start} - {plan.deepWorkBlock2.end}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Top 3 Outcomes */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Top 3 Outcomes</h3>
            <ul className="space-y-2">
              {plan.topOutcomes.map((outcome, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-600 font-bold mr-2">{index + 1}.</span>
                  <span className="text-gray-700">{outcome}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Reward */}
          {plan.reward && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <div className="flex items-center">
                <span className="text-2xl mr-2">🎁</span>
                <div>
                  <span className="font-medium text-amber-900">Planned Reward: </span>
                  <span className="text-amber-800">{plan.reward}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reflection Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Actual Outcomes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            How many outcomes did you complete? <span className="text-red-500">*</span>
          </h2>
          <div className="grid grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setActualOutcomes(num)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  actualOutcomes === num
                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="text-3xl font-bold">{num}</div>
                <div className="text-sm mt-1">
                  {num === 0
                    ? 'None'
                    : num === 1
                    ? 'One'
                    : num === 2
                    ? 'Two'
                    : 'All Three'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Energy Match */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            How accurate was your energy prediction? <span className="text-red-500">*</span>
          </h2>
          <div className="space-y-3">
            <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors hover:border-gray-300">
              <input
                type="radio"
                name="energyMatch"
                value="PERFECT"
                checked={energyMatch === 'PERFECT'}
                onChange={(e) => setEnergyMatch(e.target.value as EnergyMatch)}
                className="w-5 h-5 text-blue-600"
              />
              <div className="ml-3">
                <div className="font-medium text-gray-900">🎯 Perfect</div>
                <div className="text-sm text-gray-500">Energy matched exactly as predicted</div>
              </div>
            </label>

            <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors hover:border-gray-300">
              <input
                type="radio"
                name="energyMatch"
                value="MOSTLY_ALIGNED"
                checked={energyMatch === 'MOSTLY_ALIGNED'}
                onChange={(e) => setEnergyMatch(e.target.value as EnergyMatch)}
                className="w-5 h-5 text-blue-600"
              />
              <div className="ml-3">
                <div className="font-medium text-gray-900"> Mostly Aligned</div>
                <div className="text-sm text-gray-500">Close enough, minor differences</div>
              </div>
            </label>

            <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors hover:border-gray-300">
              <input
                type="radio"
                name="energyMatch"
                value="SOME_MISMATCH"
                checked={energyMatch === 'SOME_MISMATCH'}
                onChange={(e) => setEnergyMatch(e.target.value as EnergyMatch)}
                className="w-5 h-5 text-blue-600"
              />
              <div className="ml-3">
                <div className="font-medium text-gray-900">H Some Mismatch</div>
                <div className="text-sm text-gray-500">Noticeable difference from prediction</div>
              </div>
            </label>

            <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors hover:border-gray-300">
              <input
                type="radio"
                name="energyMatch"
                value="POOR"
                checked={energyMatch === 'POOR'}
                onChange={(e) => setEnergyMatch(e.target.value as EnergyMatch)}
                className="w-5 h-5 text-blue-600"
              />
              <div className="ml-3">
                <div className="font-medium text-gray-900"> Poor</div>
                <div className="text-sm text-gray-500">Way off from what actually happened</div>
              </div>
            </label>
          </div>
        </div>

        {/* Reflection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            What happened today? <span className="text-red-500">*</span>
          </h2>
          <div className="mb-3 text-sm text-gray-600">
            <p className="mb-2">Consider these prompts:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500">
              <li>What went well today?</li>
              <li>What was challenging?</li>
              <li>What would you do differently?</li>
              <li>What did you learn?</li>
              <li>What surprised you?</li>
            </ul>
          </div>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Write your reflection here... Be specific about wins, challenges, and learnings."
            rows={8}
            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            required
          />
          <div className="mt-2 text-sm text-gray-500">
            {reflection.length} characters
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Link
            to="/today"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {submitting ? 'Saving...' : 'Save Reflection'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrientWestPage;
