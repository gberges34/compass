import React, { useState, useEffect } from 'react';
import type { Task, Priority, Category, Context, Energy } from '../types';
import { dateToISO } from '../lib/dateUtils';

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
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={handleKeyDown}
    >
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {mode === 'create' ? 'Create New Task' : 'Edit Task'}
              </h2>
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

          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
                {error}
              </div>
            )}

            {/* Task Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Task Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Write project proposal"
                required
                autoFocus
              />
            </div>

            {/* Priority, Category, Context - Grid */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority <span className="text-red-500">*</span>
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="MUST">Must</option>
                  <option value="SHOULD">Should</option>
                  <option value="COULD">Could</option>
                  <option value="MAYBE">Maybe</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="SCHOOL">School</option>
                  <option value="MUSIC">Music</option>
                  <option value="FITNESS">Fitness</option>
                  <option value="GAMING">Gaming</option>
                  <option value="NUTRITION">Nutrition</option>
                  <option value="HYGIENE">Hygiene</option>
                  <option value="PET">Pet</option>
                  <option value="SOCIAL">Social</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Context <span className="text-red-500">*</span>
                </label>
                <select
                  value={context}
                  onChange={(e) => setContext(e.target.value as Context)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="HOME">Home</option>
                  <option value="OFFICE">Office</option>
                  <option value="COMPUTER">Computer</option>
                  <option value="PHONE">Phone</option>
                  <option value="ERRANDS">Errands</option>
                  <option value="ANYWHERE">Anywhere</option>
                </select>
              </div>
            </div>

            {/* Energy & Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Energy Required <span className="text-red-500">*</span>
                </label>
                <div className="flex space-x-3">
                  {(['HIGH', 'MEDIUM', 'LOW'] as Energy[]).map((level) => (
                    <label key={level} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="energy"
                        value={level}
                        checked={energyRequired === level}
                        onChange={(e) => setEnergyRequired(e.target.value as Energy)}
                        className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{level}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="1"
                  required
                />
              </div>
            </div>

            {/* Definition of Done */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Definition of Done <span className="text-red-500">*</span>
              </label>
              <textarea
                value={definitionOfDone}
                onChange={(e) => setDefinitionOfDone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
                placeholder="How will you know this task is complete?"
                required
              />
              <div className="text-xs text-gray-500 mt-1">
                {definitionOfDone.length} characters (minimum 10)
              </div>
            </div>

            {/* Optional: Due Date & Scheduled Start */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date (optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Start (optional)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={saving}
            >
              {saving ? 'Saving...' : mode === 'create' ? 'Create Task' : 'Save Changes'}
            </button>
          </div>

          <div className="px-6 pb-4 text-xs text-gray-500 text-center">
            Press ESC to close • CMD/CTRL+Enter to submit
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
