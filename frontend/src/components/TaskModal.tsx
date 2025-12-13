import React, { useEffect, useState } from 'react';
import type { Task, Priority, Category, Context, Energy } from '../types';
import { dateToISO } from '../lib/dateUtils';
import Button from './Button';
import Input from './Input';
import Modal from './Modal';
import Select from './Select';
import EnergySelector from './EnergySelector';

interface TaskModalProps {
  mode: 'create' | 'edit';
  task?: Task;
  onClose: () => void;
  onSave: (taskData: Partial<Task>) => Promise<void>;
}

const TaskModal: React.FC<TaskModalProps> = ({ mode, task, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [priority, setPriority] = useState<Priority>('SHOULD');
  const [category, setCategory] = useState<Category>('PERSONAL');
  const [context, setContext] = useState<Context>('ANYWHERE');
  const [energyRequired, setEnergyRequired] = useState<Energy>('MEDIUM');
  const [duration, setDuration] = useState(30);
  const [definitionOfDone, setDefinitionOfDone] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'edit' && task) {
      setName(task.name);
      setPriority(task.priority);
      setCategory(task.category);
      setContext(task.context);
      setEnergyRequired(task.energyRequired);
      setDuration(task.duration);
      setDefinitionOfDone(task.definitionOfDone);
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
      setScheduledStart(task.scheduledStart || '');
    }
  }, [mode, task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (name.trim().length < 3) {
      setError('Task name must be at least 3 characters');
      return;
    }
    if (definitionOfDone.trim().length < 10) {
      setError('Definition of Done must be at least 10 characters');
      return;
    }
    if (duration <= 0) {
      setError('Duration must be greater than 0');
      return;
    }

    setSaving(true);
    try {
      const taskData: Partial<Task> = {
        name: name.trim(),
        priority,
        category,
        context,
        energyRequired,
        duration,
        definitionOfDone: definitionOfDone.trim(),
        status: 'NEXT',
      };

      if (dueDate) {
        taskData.dueDate = dateToISO(new Date(dueDate));
      }
      if (scheduledStart) {
        taskData.scheduledStart = scheduledStart;
      }

      await onSave(taskData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSubmit(e as any);
    }
  };

  return (
    <Modal
      title={mode === 'create' ? 'Create New Task' : 'Edit Task'}
      description="Capture a clear outcome, context, and energy so the next action is obvious."
      onClose={onClose}
      size="md"
      footer={
        <div className="flex items-center justify-between gap-12">
          <p className="text-micro text-slate">Press ESC to close • CMD/CTRL+Enter to submit</p>
          <div className="flex items-center gap-12">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="task-form" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : mode === 'create' ? 'Create Task' : 'Save Changes'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="task-form" onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-16">
        {error && (
          <div className="bg-danger/10 border border-danger/30 rounded-default p-12 text-danger text-small">
            {error}
          </div>
        )}

        <Input
          label="Task Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Write project proposal"
          fullWidth
          required
          autoFocus
          disabled={saving}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            options={[
              { value: 'MUST', label: 'Must' },
              { value: 'SHOULD', label: 'Should' },
              { value: 'COULD', label: 'Could' },
              { value: 'MAYBE', label: 'Maybe' },
            ]}
            fullWidth
            disabled={saving}
          />

          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            options={[
              { value: 'SCHOOL', label: 'School' },
              { value: 'MUSIC', label: 'Music' },
              { value: 'FITNESS', label: 'Fitness' },
              { value: 'GAMING', label: 'Gaming' },
              { value: 'NUTRITION', label: 'Nutrition' },
              { value: 'HYGIENE', label: 'Hygiene' },
              { value: 'PET', label: 'Pet' },
              { value: 'SOCIAL', label: 'Social' },
              { value: 'PERSONAL', label: 'Personal' },
              { value: 'ADMIN', label: 'Admin' },
            ]}
            fullWidth
            disabled={saving}
          />

          <Select
            label="Context"
            value={context}
            onChange={(e) => setContext(e.target.value as Context)}
            options={[
              { value: 'HOME', label: 'Home' },
              { value: 'OFFICE', label: 'Office' },
              { value: 'COMPUTER', label: 'Computer' },
              { value: 'PHONE', label: 'Phone' },
              { value: 'ERRANDS', label: 'Errands' },
              { value: 'ANYWHERE', label: 'Anywhere' },
            ]}
            fullWidth
            disabled={saving}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <div>
            <label className="block text-small font-medium text-ink mb-4">Energy Required</label>
            <EnergySelector
              value={energyRequired}
              onChange={setEnergyRequired}
              disabled={saving}
            />
          </div>

          <Input
            type="number"
            label="Duration (minutes)"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value, 10))}
            min={1}
            fullWidth
            required
            disabled={saving}
          />
        </div>

        <div>
          <label className="block text-small font-medium text-ink mb-4">Definition of Done</label>
          <textarea
            value={definitionOfDone}
            onChange={(e) => setDefinitionOfDone(e.target.value)}
            className="w-full px-12 py-8 border border-stone rounded-default bg-snow text-body focus:outline-none focus:ring-2 focus:ring-action/20 focus:border-action min-h-[120px]"
            placeholder="How will you know this task is complete?"
            rows={4}
            required
            disabled={saving}
          />
          <div className="mt-4 text-micro text-slate">{definitionOfDone.length} characters (minimum 10)</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <Input
            type="date"
            label="Due Date (optional)"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            fullWidth
            disabled={saving}
          />
          <Input
            type="datetime-local"
            label="Scheduled Start (optional)"
            value={scheduledStart}
            onChange={(e) => setScheduledStart(e.target.value)}
            fullWidth
            disabled={saving}
          />
        </div>
      </form>
    </Modal>
  );
};

export default TaskModal;
