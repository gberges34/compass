import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTodayPlan, useCreateDailyPlan } from '../hooks/useDailyPlans';
import type { Energy, DeepWorkBlock, TimeBlock, CreateDailyPlanRequest } from '../types';
import { useToast } from '../contexts/ToastContext';
import LoadingSkeleton from '../components/LoadingSkeleton';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import Input from '../components/Input';
import ToggleSwitch from '../components/ToggleSwitch';
import { formatLongDate } from '../lib/dateUtils';

const OrientEastPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  // Replace manual state management with React Query
  const { data: existingPlan, isLoading } = useTodayPlan();
  const createPlan = useCreateDailyPlan();

  // Local UI state
  const [isEditing, setIsEditing] = useState(false);

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

  const today = formatLongDate();

  // No useEffect needed - React Query handles data fetching
  // No cleanup function needed - React Query handles component unmounting
  // No isMounted checks needed - React Query prevents memory leaks

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

      await createPlan.mutateAsync(request);
      toast.showSuccess('Daily plan created successfully!');

      // No setTimeout hack needed!
      // Cache is already updated by mutation
      // Immediate navigation after plan creation
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

  // Show existing plan if it exists and not editing
  if (existingPlan && !isEditing) {
    return (
      <div className="space-y-24">
        {/* Header */}
        <Card padding="large">
          <h1 className="text-h1 text-ink">Orient East</h1>
          <p className="text-slate mt-4">{today}</p>
        </Card>

        {/* Existing Plan Card */}
        <Card padding="large">
          <div className="flex items-center justify-between mb-16">
            <h2 className="text-h2 text-ink">Today's Plan Already Set</h2>
            <Button variant="primary" onClick={() => setIsEditing(true)}>
              Edit Plan
            </Button>
          </div>

          <div className="space-y-16">
            {/* Energy Level */}
            <div className="flex items-center space-x-12">
              <span className="text-slate font-medium">Energy Level:</span>
              <Badge variant={existingPlan.energyLevel === 'HIGH' ? 'mint' : existingPlan.energyLevel === 'MEDIUM' ? 'sun' : 'blush'}>
                {existingPlan.energyLevel === 'HIGH' && '⚡ '}
                {existingPlan.energyLevel === 'MEDIUM' && '⚖️ '}
                {existingPlan.energyLevel === 'LOW' && '🔋 '}
                {existingPlan.energyLevel}
              </Badge>
            </div>

            {/* Deep Work Blocks */}
            <div>
              <h3 className="text-h3 text-ink mb-8">Deep Work Blocks</h3>
              <div className="space-y-8">
                <div className="bg-sky border border-sky rounded-default p-12">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-blue-900">
                      {existingPlan.deepWorkBlock1.focus}
                    </span>
                    <span className="text-small text-blue-700">
                      {existingPlan.deepWorkBlock1.start} - {existingPlan.deepWorkBlock1.end}
                    </span>
                  </div>
                </div>
                {existingPlan.deepWorkBlock2 && (
                  <div className="bg-sky border border-sky rounded-default p-12">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-blue-900">
                        {existingPlan.deepWorkBlock2.focus}
                      </span>
                      <span className="text-small text-blue-700">
                        {existingPlan.deepWorkBlock2.start} - {existingPlan.deepWorkBlock2.end}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top 3 Outcomes */}
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

            {/* Reward */}
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

  // Show form for creating/editing plan
  return (
    <div className="space-y-24">
      {/* Header */}
      <Card padding="large">
        <h1 className="text-h1 text-ink">Orient East</h1>
        <p className="text-slate mt-4">{today}</p>
        <p className="text-small text-slate mt-8">
          Morning planning: Set your intentions and structure for the day ahead
        </p>
      </Card>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-24">
        {/* Energy Level */}
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

        {/* Deep Work Block #1 (Required) */}
        <Card padding="large">
          <h2 className="text-h2 text-ink mb-16">
            Deep Work Block #1 <span className="text-danger">*</span>
          </h2>
          <div className="space-y-16">
            <div className="grid grid-cols-2 gap-16">
              <Input
                type="time"
                label="Start Time"
                value={dwb1Start}
                onChange={(e) => setDwb1Start(e.target.value)}
                required
                fullWidth
              />
              <Input
                type="time"
                label="End Time"
                value={dwb1End}
                onChange={(e) => setDwb1End(e.target.value)}
                required
                fullWidth
              />
            </div>
            <Input
              type="text"
              label="Focus"
              value={dwb1Focus}
              onChange={(e) => setDwb1Focus(e.target.value)}
              placeholder="What will you work on during this block?"
              required
              fullWidth
            />
          </div>
        </Card>

        {/* Deep Work Block #2 (Optional) */}
        <Card padding="large">
          <div className="flex items-start justify-between mb-16">
            <h2 className="text-h2 text-ink">Deep Work Block #2</h2>
            <ToggleSwitch
              checked={enableDwb2}
              onChange={setEnableDwb2}
              ariaLabel="Enable Deep Work Block 2"
            />
          </div>
          {enableDwb2 && (
            <div className="space-y-16">
              <div className="grid grid-cols-2 gap-16">
                <Input
                  type="time"
                  label="Start Time"
                  value={dwb2Start}
                  onChange={(e) => setDwb2Start(e.target.value)}
                  fullWidth
                />
                <Input
                  type="time"
                  label="End Time"
                  value={dwb2End}
                  onChange={(e) => setDwb2End(e.target.value)}
                  fullWidth
                />
              </div>
              <Input
                type="text"
                label="Focus"
                value={dwb2Focus}
                onChange={(e) => setDwb2Focus(e.target.value)}
                placeholder="What will you work on during this block?"
                fullWidth
              />
            </div>
          )}
        </Card>

        {/* Admin Block (Optional) */}
        <Card padding="large">
          <div className="flex items-start justify-between mb-16">
            <h2 className="text-h2 text-ink">Admin Block</h2>
            <ToggleSwitch
              checked={enableAdmin}
              onChange={setEnableAdmin}
              ariaLabel="Enable Admin Block"
            />
          </div>
          {enableAdmin && (
            <div className="space-y-16">
              <div className="grid grid-cols-2 gap-16">
                <Input
                  type="time"
                  label="Start Time"
                  value={adminStart}
                  onChange={(e) => setAdminStart(e.target.value)}
                  fullWidth
                />
                <Input
                  type="time"
                  label="End Time"
                  value={adminEnd}
                  onChange={(e) => setAdminEnd(e.target.value)}
                  fullWidth
                />
              </div>
            </div>
          )}
        </Card>

        {/* Buffer Block (Optional) */}
        <Card padding="large">
          <div className="flex items-start justify-between mb-16">
            <h2 className="text-h2 text-ink">Buffer Block</h2>
            <ToggleSwitch
              checked={enableBuffer}
              onChange={setEnableBuffer}
              ariaLabel="Enable Buffer Block"
            />
          </div>
          {enableBuffer && (
            <div className="space-y-16">
              <div className="grid grid-cols-2 gap-16">
                <Input
                  type="time"
                  label="Start Time"
                  value={bufferStart}
                  onChange={(e) => setBufferStart(e.target.value)}
                  fullWidth
                />
                <Input
                  type="time"
                  label="End Time"
                  value={bufferEnd}
                  onChange={(e) => setBufferEnd(e.target.value)}
                  fullWidth
                />
              </div>
            </div>
          )}
        </Card>

        {/* Top 3 Outcomes (Required) */}
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

        {/* Reward (Optional) */}
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

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            disabled={createPlan.isPending}
          >
            {createPlan.isPending ? 'Creating Plan...' : 'Create Daily Plan'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default OrientEastPage;
