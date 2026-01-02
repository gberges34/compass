import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTodayPlan, useCreateDailyPlan } from '../hooks/useDailyPlans';
import type { Energy, PlannedBlock, CreateDailyPlanRequest } from '../types';
import { useToast } from '../contexts/ToastContext';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Input from '../components/Input';
import { formatLongDate } from '../lib/dateUtils';

function createUUID(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for older environments; UUIDv4 shape (not cryptographically strong).
  // eslint-disable-next-line no-bitwise
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    // eslint-disable-next-line no-bitwise
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function timeToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

const OrientEastPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const { data: existingPlan, isLoading } = useTodayPlan();
  const createPlan = useCreateDailyPlan();

  const [isEditing, setIsEditing] = useState(false);
  const [energyLevel, setEnergyLevel] = useState<Energy>('MEDIUM');
  const [plannedBlocks, setPlannedBlocks] = useState<PlannedBlock[]>([
    { id: createUUID(), start: '09:00', end: '11:00', label: '' },
  ]);
  const [outcome1, setOutcome1] = useState('');
  const [outcome2, setOutcome2] = useState('');
  const [outcome3, setOutcome3] = useState('');
  const [reward, setReward] = useState('');

  const today = formatLongDate();

  const validateForm = (): string | null => {
    if (plannedBlocks.length < 1) {
      return 'At least one planned block is required';
    }

    for (const block of plannedBlocks) {
      if (!block.start || !block.end || !block.label.trim()) {
        return 'Each planned block requires start, end, and label';
      }
      const startMinutes = timeToMinutes(block.start);
      const endMinutes = timeToMinutes(block.end);
      if (startMinutes === null || endMinutes === null) {
        return 'Planned block times must be valid (HH:mm)';
      }
      if (startMinutes >= endMinutes) {
        return 'Each planned block start must be before end';
      }
    }

    if (!outcome1.trim() || !outcome2.trim() || !outcome3.trim()) {
      return 'All three outcomes are required';
    }

    const normalizedBlocks = plannedBlocks
      .map((block) => ({
        start: timeToMinutes(block.start)!,
        end: timeToMinutes(block.end)!,
      }))
      .sort((a, b) => a.start - b.start);

    for (let i = 1; i < normalizedBlocks.length; i++) {
      if (normalizedBlocks[i].start < normalizedBlocks[i - 1].end) {
        return 'Planned blocks cannot overlap';
      }
    }

    return null;
  };

  const startEditing = () => {
    if (existingPlan) {
      setEnergyLevel(existingPlan.energyLevel);
      setPlannedBlocks(existingPlan.plannedBlocks.map((block) => ({ ...block })));
      setOutcome1(existingPlan.topOutcomes[0] || '');
      setOutcome2(existingPlan.topOutcomes[1] || '');
      setOutcome3(existingPlan.topOutcomes[2] || '');
      setReward(existingPlan.reward || '');
    }
    setIsEditing(true);
  };

  const addPlannedBlock = () => {
    setPlannedBlocks((prev) => [
      ...prev,
      { id: createUUID(), start: '14:00', end: '15:00', label: '' },
    ]);
  };

  const removePlannedBlock = (id: string) => {
    setPlannedBlocks((prev) => (prev.length > 1 ? prev.filter((b) => b.id !== id) : prev));
  };

  const updatePlannedBlock = (id: string, updates: Partial<PlannedBlock>) => {
    setPlannedBlocks((prev) => prev.map((block) => (block.id === id ? { ...block, ...updates } : block)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast.showError(validationError);
      return;
    }

    try {
      const normalizedBlocks: PlannedBlock[] = plannedBlocks.map((block) => ({
        id: block.id,
        start: block.start,
        end: block.end,
        label: block.label.trim(),
      }));

      const request: CreateDailyPlanRequest = {
        energyLevel,
        plannedBlocks: normalizedBlocks,
        topOutcomes: [outcome1.trim(), outcome2.trim(), outcome3.trim()],
        reward: reward.trim() || undefined,
      };

      await createPlan.mutateAsync(request);
      toast.showSuccess(isEditing ? 'Daily plan updated successfully!' : 'Daily plan created successfully!');
      navigate('/today');
    } catch (err) {
      toast.showError(err instanceof Error ? err.message : 'Failed to create daily plan');
      console.error('Error creating daily plan:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-24">
        <LoadingSkeleton variant="card" count={1} />
        <LoadingSkeleton variant="card" count={5} />
      </div>
    );
  }

  if (existingPlan && !isEditing) {
    return (
      <div className="space-y-24">
        <Card padding="large">
          <h1 className="text-h1 text-ink">Orient East</h1>
          <p className="text-slate mt-4">{today}</p>
        </Card>

        <Card padding="large">
          <div className="flex items-center justify-between mb-16">
            <h2 className="text-h2 text-ink">Today's Plan Already Set</h2>
            <Button variant="primary" onClick={startEditing}>
              Edit Plan
            </Button>
          </div>

          <div className="space-y-16">
            <div className="flex items-center space-x-12">
              <span className="text-slate font-medium">Energy Level:</span>
              <Badge variant={existingPlan.energyLevel === 'HIGH' ? 'mint' : existingPlan.energyLevel === 'MEDIUM' ? 'sun' : 'blush'}>
                {existingPlan.energyLevel === 'HIGH' && '⚡ '}
                {existingPlan.energyLevel === 'MEDIUM' && '⚖️ '}
                {existingPlan.energyLevel === 'LOW' && '🔋 '}
                {existingPlan.energyLevel}
              </Badge>
            </div>

            <div>
              <h3 className="text-h3 text-ink mb-8">Planned Blocks</h3>
              <div className="space-y-8">
                {existingPlan.plannedBlocks.map((block) => (
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
                {existingPlan.topOutcomes.map((outcome, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-action font-bold mr-8">{index + 1}.</span>
                    <span className="text-ink">{outcome}</span>
                  </li>
                ))}
              </ul>
            </div>

            {existingPlan.reward && (
              <div className="bg-sun border border-sun rounded-default p-12">
                <div className="flex items-center">
                  <span className="text-2xl mr-8">🎁</span>
                  <div>
                    <span className="font-medium text-amber-900">Reward: </span>
                    <span className="text-amber-800">{existingPlan.reward}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-24">
      <Card padding="large">
        <h1 className="text-h1 text-ink">Orient East</h1>
        <p className="text-slate mt-4">{today}</p>
        <p className="text-small text-slate mt-8">
          Morning planning: Set your intentions and structure for the day ahead
        </p>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-24">
        <Card padding="large">
          <h2 className="text-h2 text-ink mb-16">Energy Level</h2>
          <select
            value={energyLevel}
            onChange={(e) => setEnergyLevel(e.target.value as Energy)}
            className="w-full px-12 py-8 border border-stone rounded-default bg-snow text-body focus:outline-none focus:ring-2 focus:ring-action focus:border-action"
          >
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </Card>

        <Card padding="large">
          <div className="flex items-start justify-between mb-16">
            <h2 className="text-h2 text-ink">
              Planned Blocks <span className="text-danger">*</span>
            </h2>
            <Button type="button" variant="secondary" size="small" onClick={addPlannedBlock}>
              + Add Block
            </Button>
          </div>

          <div className="space-y-16">
            {plannedBlocks.map((block, index) => (
              <div key={block.id} className="border border-fog rounded-card p-16 bg-snow">
                <div className="flex items-center justify-between mb-12">
                  <h3 className="text-h3 text-ink">Block #{index + 1}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="small"
                    onClick={() => removePlannedBlock(block.id)}
                    disabled={plannedBlocks.length === 1}
                  >
                    Remove
                  </Button>
                </div>

                <div className="space-y-16">
                  <div className="grid grid-cols-2 gap-16">
                    <Input
                      type="time"
                      label="Start Time"
                      value={block.start}
                      onChange={(e) => updatePlannedBlock(block.id, { start: e.target.value })}
                      required
                      fullWidth
                    />
                    <Input
                      type="time"
                      label="End Time"
                      value={block.end}
                      onChange={(e) => updatePlannedBlock(block.id, { end: e.target.value })}
                      required
                      fullWidth
                    />
                  </div>
                  <Input
                    type="text"
                    label="Label"
                    value={block.label}
                    onChange={(e) => updatePlannedBlock(block.id, { label: e.target.value })}
                    placeholder="What is this block for?"
                    required
                    fullWidth
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="large">
          <h2 className="text-h2 text-ink mb-16">
            Top 3 Outcomes <span className="text-danger">*</span>
          </h2>
          <div className="space-y-16">
            <Input
              type="text"
              label="Outcome #1 (Most Important)"
              value={outcome1}
              onChange={(e) => setOutcome1(e.target.value)}
              placeholder="What's the most important outcome for today?"
              required
              fullWidth
            />
            <Input
              type="text"
              label="Outcome #2"
              value={outcome2}
              onChange={(e) => setOutcome2(e.target.value)}
              placeholder="Second most important outcome"
              required
              fullWidth
            />
            <Input
              type="text"
              label="Outcome #3"
              value={outcome3}
              onChange={(e) => setOutcome3(e.target.value)}
              placeholder="Third most important outcome"
              required
              fullWidth
            />
          </div>
        </Card>

        <Card padding="large">
          <h2 className="text-h2 text-ink mb-16">Reward</h2>
          <Input
            type="text"
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            placeholder="How will you celebrate completing today's plan?"
            fullWidth
          />
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            disabled={createPlan.isPending}
          >
            {createPlan.isPending
              ? 'Saving Plan...'
              : isEditing
              ? 'Update Daily Plan'
              : 'Create Daily Plan'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default OrientEastPage;
