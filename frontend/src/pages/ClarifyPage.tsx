import React, { useState, useEffect } from 'react';
import { getTodoistPending, enrichTask, createTask } from '../lib/api';
import type { TempCapturedTask, Priority, Energy } from '../types';
import { useToast } from '../contexts/ToastContext';

interface EnrichedTaskData {
  name: string;
  category: string;
  context: string;
  definitionOfDone: string;
}

const ClarifyPage: React.FC = () => {
  const toast = useToast();
  const [pendingTasks, setPendingTasks] = useState<TempCapturedTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<TempCapturedTask | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [priority, setPriority] = useState<number>(1);
  const [duration, setDuration] = useState<number>(30);
  const [energy, setEnergy] = useState<Energy>('MEDIUM');

  // Enrichment state
  const [enriching, setEnriching] = useState(false);
  const [enrichedData, setEnrichedData] = useState<EnrichedTaskData | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPendingTasks();
  }, []);

  const fetchPendingTasks = async () => {
    setLoading(true);
    try {
      const response = await getTodoistPending();
      setPendingTasks(response.tasks);
    } catch (err) {
      toast.showError('Failed to load pending tasks. Please try again.');
      console.error('Error fetching pending tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTask = (task: TempCapturedTask) => {
    setSelectedTask(task);
    setEnrichedData(null);
    setPriority(1);
    setDuration(30);
    setEnergy('MEDIUM');
  };

  const handleEnrichTask = async () => {
    if (!selectedTask) return;

    setEnriching(true);
    try {
      const enrichedTask = await enrichTask({
        tempTaskId: selectedTask.id,
        priority,
        duration,
        energy,
      });

      setEnrichedData({
        name: enrichedTask.name,
        category: enrichedTask.category,
        context: enrichedTask.context,
        definitionOfDone: enrichedTask.definitionOfDone,
      });
      toast.showSuccess('Task enriched successfully!');
    } catch (err) {
      toast.showError('Failed to enrich task. Please try again.');
      console.error('Error enriching task:', err);
    } finally {
      setEnriching(false);
    }
  };

  const handleSaveTask = async () => {
    if (!selectedTask || !enrichedData) return;

    setSaving(true);
    try {
      const priorityMap: Record<number, Priority> = {
        1: 'MUST',
        2: 'SHOULD',
        3: 'COULD',
        4: 'MAYBE',
      };

      await createTask({
        name: enrichedData.name,
        priority: priorityMap[priority],
        category: enrichedData.category as any,
        context: enrichedData.context as any,
        energyRequired: energy,
        duration,
        definitionOfDone: enrichedData.definitionOfDone,
        status: 'NEXT',
        dueDate: selectedTask.dueDate,
      });

      toast.showSuccess('Task saved successfully!');

      // Remove from pending list
      setPendingTasks(prev => prev.filter(t => t.id !== selectedTask.id));

      // Reset form
      setSelectedTask(null);
      setEnrichedData(null);
    } catch (err) {
      toast.showError('Failed to save task. Please try again.');
      console.error('Error saving task:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Clarify Tasks</h1>
          <p className="text-sm text-gray-600 mt-1">
            Review and enrich tasks captured from Todoist
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Tasks List */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Pending Tasks ({pendingTasks.length})
              </h2>

              {pendingTasks.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <p className="text-gray-500">No pending tasks to clarify</p>
                  <p className="text-sm text-gray-400 mt-2">All caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handleSelectTask(task)}
                      className={`bg-white rounded-lg border p-4 cursor-pointer transition-all ${
                        selectedTask?.id === task.id
                          ? 'border-blue-500 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <h3 className="font-medium text-gray-900 mb-1">{task.name}</h3>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span className="capitalize">{task.source}</span>
                        {task.dueDate && (
                          <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Clarification Form */}
            <div>
              {selectedTask ? (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Clarify Task
                  </h2>

                  <div className="space-y-4">
                    {/* Task Name (Read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Task Name
                      </label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                        {selectedTask.name}
                      </div>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={enriching || saving}
                      >
                        <option value={1}>1 - Must</option>
                        <option value={2}>2 - Should</option>
                        <option value={3}>3 - Could</option>
                        <option value={4}>4 - Maybe</option>
                      </select>
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Duration (minutes)
                      </label>
                      <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        min={5}
                        step={5}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={enriching || saving}
                      />
                    </div>

                    {/* Energy */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Energy Required
                      </label>
                      <select
                        value={energy}
                        onChange={(e) => setEnergy(e.target.value as Energy)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={enriching || saving}
                      >
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                      </select>
                    </div>

                    {/* Enrich Button */}
                    <button
                      onClick={handleEnrichTask}
                      disabled={enriching || saving}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                      {enriching ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Enriching with AI...
                        </>
                      ) : (
                        'Enrich with AI'
                      )}
                    </button>

                    {/* Enriched Data Display */}
                    {enrichedData && (
                      <div className="mt-6 pt-6 border-t space-y-4">
                        <h3 className="font-semibold text-gray-900">Enriched Task Details</h3>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Enriched Name
                          </label>
                          <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-gray-700">
                            {enrichedData.name}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                          </label>
                          <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-gray-700">
                            {enrichedData.category}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Context
                          </label>
                          <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-gray-700">
                            {enrichedData.context}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Definition of Done
                          </label>
                          <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-gray-700 whitespace-pre-wrap">
                            {enrichedData.definitionOfDone}
                          </div>
                        </div>

                        {/* Save Button */}
                        <button
                          onClick={handleSaveTask}
                          disabled={saving}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                          {saving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Saving Task...
                            </>
                          ) : (
                            'Save Task'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <p className="text-gray-500">Select a task to clarify</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClarifyPage;
