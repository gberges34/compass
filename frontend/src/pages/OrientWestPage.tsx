import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTodayPlan, useUpdateDailyPlanReflection } from '../hooks/useDailyPlans';
import type { EnergyMatch, UpdateDailyPlanRequest } from '../types';
import { useToast } from '../contexts/ToastContext';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { formatLongDate } from '../lib/dateUtils';
import { getEnergyStyle } from '../lib/designTokens';
import { getEnergyBadgeVariant } from '../lib/badgeUtils';

const OrientWestPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // Replace all manual state with React Query
  const { data: plan, isLoading } = useTodayPlan();
  const updateReflection = useUpdateDailyPlanReflection();

  // Form state
  const [actualOutcomes, setActualOutcomes] = useState<number>(0);
  const [energyMatch, setEnergyMatch] = useState<EnergyMatch>('MOSTLY_ALIGNED');
  const [reflection, setReflection] = useState('');

  const today = formatLongDate();

  // No isMounted checks needed
  // No useEffect needed
  // No cleanup function needed

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
      const request: UpdateDailyPlanRequest = {
        reflection: reflection.trim(),
        actualOutcomes,
        energyMatch,
      };

      await updateReflection.mutateAsync({
        planId: plan.id,
        request,
      });

      toast.showSuccess('Evening reflection saved successfully!');

      // No setTimeout hack needed - immediate navigation
      navigate('/reviews');
    } catch (err) {
      toast.showError(err instanceof Error ? err.message : 'Failed to save reflection');
      console.error('Error saving reflection:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-24">
        <LoadingSkeleton variant="card" count={1} />
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-24">
        <Card padding="large">
          <h1 className="text-h1 text-ink">Orient West</h1>
          <p className="text-slate mt-4">{today}</p>
        </Card>

        <EmptyState
          title="No Plan Found"
          description="You need to create a morning plan before you can reflect on it."
          variant="warning"
          action={
            <Link to="/orient/east">
              <Button variant="primary">Create Morning Plan</Button>
            </Link>
          }
        />
      </div>
    );
  }

  // Check if already reflected
  if (plan.reflection) {
    return (
      <div className="space-y-24">
        <Card padding="large">
          <h1 className="text-h1 text-ink">Orient West</h1>
          <p className="text-slate mt-4">{today}</p>
        </Card>

        <Card padding="large">
          <h2 className="text-h2 text-ink mb-16">
            Evening Reflection Already Completed
          </h2>

          <div className="space-y-16">
            {/* Actual Outcomes */}
            <div>
              <span className="text-slate font-medium">Outcomes Completed:</span>
              <span className="ml-8 text-body font-bold text-action">
                {plan.actualOutcomes} / 3
              </span>
            </div>

            {/* Energy Match */}
            <div className="flex items-center space-x-8">
              <span className="text-slate font-medium">Energy Match:</span>
              <Badge variant={
                plan.energyMatch === 'PERFECT' ? 'success' :
                plan.energyMatch === 'MOSTLY_ALIGNED' ? 'sky' :
                plan.energyMatch === 'SOME_MISMATCH' ? 'warn' : 'danger'
              }>
                {plan.energyMatch}
              </Badge>
            </div>

            {/* Reflection */}
            <div>
              <h3 className="text-h3 text-ink mb-8">Reflection:</h3>
              <div className="bg-fog border border-stone rounded-default p-16">
                <p className="text-ink whitespace-pre-wrap">{plan.reflection}</p>
              </div>
            </div>
          </div>

          <div className="mt-24">
            <Link to="/reviews">
              <Button variant="primary">
                View Reviews
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-24">
      {/* Header */}
      <Card padding="large">
        <h1 className="text-h1 text-ink">Orient West</h1>
        <p className="text-slate mt-4">{today}</p>
        <p className="text-small text-slate mt-8">
          Evening reflection: Review your day and capture learnings
        </p>
      </Card>

      {/* Morning Plan Review */}
      <Card padding="large">
        <h2 className="text-h2 text-ink mb-16">This Morning&apos;s Plan</h2>

        <div className="space-y-16">
          <div className="flex items-center gap-12">
            <span className="text-slate font-medium">Planned Energy:</span>
            <Badge variant={getEnergyBadgeVariant(plan.energyLevel)}>
              {getEnergyStyle(plan.energyLevel).icon} {plan.energyLevel}
            </Badge>
          </div>

          {/* Planned Blocks */}
          <div>
            <h3 className="text-h3 text-ink mb-8">Planned Blocks</h3>
            <div className="space-y-8">
              {plan.plannedBlocks.map((block) => (
                <div key={block.id} className="bg-sky border border-sky rounded-default p-12">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-blue-900">{block.label}</span>
                    <span className="text-small text-blue-700">
                      {block.start} - {block.end}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-h3 text-ink mb-8">Top 3 Outcomes</h3>
            <ul className="space-y-4">
              {plan.topOutcomes.map((outcome, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-action font-bold mr-8">{index + 1}.</span>
                  <span className="text-ink">{outcome}</span>
                </li>
              ))}
            </ul>
          </div>

          {plan.reward && (
            <div className="bg-sun border border-sun rounded-default p-12">
              <div className="flex items-center">
                <span className="text-2xl mr-8">🎁</span>
                <div>
                  <span className="font-medium text-amber-900">Planned Reward: </span>
                  <span className="text-amber-800">{plan.reward}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Reflection Form */}
      <form onSubmit={handleSubmit} className="space-y-24">
        {/* Actual Outcomes */}
        <Card padding="large">
          <h2 className="text-h3 text-ink mb-16">
            How many outcomes did you complete? <span className="text-red-500">*</span>
          </h2>
          <div className="grid grid-cols-4 gap-12">
            {[0, 1, 2, 3].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setActualOutcomes(num)}
                className={`p-12 rounded-default border transition-standard ${
                  actualOutcomes === num
                    ? 'border-action bg-sky text-ink shadow-e01'
                    : 'border-stone bg-snow text-ink hover:bg-cloud'
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
        </Card>

        {/* Energy Match */}
        <Card padding="large">
          <h2 className="text-h3 text-ink mb-16">
            How accurate was your energy prediction? <span className="text-red-500">*</span>
          </h2>
          <div className="space-y-12">
            <label className="flex items-center p-12 border rounded-default cursor-pointer transition-standard hover:bg-cloud">
              <input
                type="radio"
                name="energyMatch"
                value="PERFECT"
                checked={energyMatch === 'PERFECT'}
                onChange={(e) => setEnergyMatch(e.target.value as EnergyMatch)}
                className="w-20 h-20 text-action"
              />
              <div className="ml-3">
                <div className="font-medium text-ink">🎯 Perfect</div>
                <div className="text-small text-slate">Energy matched exactly as predicted</div>
              </div>
            </label>

            <label className="flex items-center p-12 border rounded-default cursor-pointer transition-standard hover:bg-cloud">
              <input
                type="radio"
                name="energyMatch"
                value="MOSTLY_ALIGNED"
                checked={energyMatch === 'MOSTLY_ALIGNED'}
                onChange={(e) => setEnergyMatch(e.target.value as EnergyMatch)}
                className="w-20 h-20 text-action"
              />
              <div className="ml-3">
                <div className="font-medium text-ink">👍 Mostly Aligned</div>
                <div className="text-small text-slate">Close enough, minor differences</div>
              </div>
            </label>

            <label className="flex items-center p-12 border rounded-default cursor-pointer transition-standard hover:bg-cloud">
              <input
                type="radio"
                name="energyMatch"
                value="SOME_MISMATCH"
                checked={energyMatch === 'SOME_MISMATCH'}
                onChange={(e) => setEnergyMatch(e.target.value as EnergyMatch)}
                className="w-20 h-20 text-action"
              />
              <div className="ml-3">
                <div className="font-medium text-ink">⚠️ Some Mismatch</div>
                <div className="text-small text-slate">Noticeable difference from prediction</div>
              </div>
            </label>

            <label className="flex items-center p-12 border rounded-default cursor-pointer transition-standard hover:bg-cloud">
              <input
                type="radio"
                name="energyMatch"
                value="POOR"
                checked={energyMatch === 'POOR'}
                onChange={(e) => setEnergyMatch(e.target.value as EnergyMatch)}
                className="w-20 h-20 text-action"
              />
              <div className="ml-3">
                <div className="font-medium text-ink">❌ Poor</div>
                <div className="text-small text-slate">Way off from what actually happened</div>
              </div>
            </label>
          </div>
        </Card>

        {/* Reflection */}
        <Card padding="large">
          <h2 className="text-h3 text-ink mb-16">
            What happened today? <span className="text-red-500">*</span>
          </h2>
          <div className="mb-12 text-small text-slate">
            <p className="mb-8">Consider these prompts:</p>
            <ul className="list-disc list-inside space-y-4 text-slate">
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
            className="w-full px-12 py-8 border border-stone rounded-default bg-snow text-body focus:outline-none focus:ring-2 focus:ring-action/20 focus:border-action resize-none"
            required
          />
          <div className="mt-8 text-small text-slate">{reflection.length} characters</div>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-12">
          <Link to="/today">
            <Button variant="secondary">Cancel</Button>
          </Link>
          <Button type="submit" variant="primary" disabled={updateReflection.isPending}>
            {updateReflection.isPending ? 'Saving...' : 'Save Reflection'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default OrientWestPage;
