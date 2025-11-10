import React, { useState, useEffect } from 'react';
import { getTodoistPending, enrichTask, createTask } from '../lib/api';
import type { TempCapturedTask, Priority, Energy } from '../types';
import { useToast } from '../contexts/ToastContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';

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
    <div className="space-y-24">
      {/* Header */}
      <Card padding="large">
        <h1 className="text-h1 text-ink">Clarify Tasks</h1>
        <p className="text-slate mt-4">
          Review and enrich tasks captured from Todoist
        </p>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-48 w-48 border-b-4 border-action"></div>
            <p className="mt-16 text-slate">Loading tasks...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
          {/* Pending Tasks List */}
          <div>
            <h2 className="text-h2 text-ink mb-16">
              Pending Tasks ({pendingTasks.length})
            </h2>

            {pendingTasks.length === 0 ? (
              <Card padding="large">
                <div className="text-center">
                  <p className="text-slate">No pending tasks to clarify</p>
                  <p className="text-small text-slate mt-8">All caught up!</p>
                </div>
              </Card>
            ) : (
              <div className="space-y-12">
                {pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleSelectTask(task)}
                    className={`bg-cloud rounded-card shadow-e01 border border-fog p-24 cursor-pointer transition-all duration-micro ${
                      selectedTask?.id === task.id
                        ? 'border-action shadow-e02'
                        : 'hover:border-stone hover:shadow-e01'
                    }`}
                  >
                    <h3 className="font-medium text-ink mb-4">{task.name}</h3>
                    <div className="flex items-center justify-between text-small text-slate">
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
              <Card padding="large">
                <h2 className="text-h2 text-ink mb-16">
                  Clarify Task
                </h2>

                <div className="space-y-16">
                  {/* Task Name (Read-only) */}
                  <div>
                    <label className="block text-small font-medium text-ink mb-4">
                      Task Name
                    </label>
                    <div className="px-12 py-8 bg-fog border border-stone rounded-default text-ink">
                      {selectedTask.name}
                    </div>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-small font-medium text-ink mb-4">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(Number(e.target.value))}
                      className="w-full px-12 py-8 border border-stone rounded-default bg-snow text-body focus:outline-none focus:ring-2 focus:ring-action focus:border-action"
                      disabled={enriching || saving}
                    >
                      <option value={1}>1 - Must</option>
                      <option value={2}>2 - Should</option>
                      <option value={3}>3 - Could</option>
                      <option value={4}>4 - Maybe</option>
                    </select>
                  </div>

                  {/* Duration */}
                  <Input
                    type="number"
                    label="Duration (minutes)"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    min={5}
                    step={5}
                    disabled={enriching || saving}
                    fullWidth
                  />

                  {/* Energy */}
                  <div>
                    <label className="block text-small font-medium text-ink mb-4">
                      Energy Required
                    </label>
                    <select
                      value={energy}
                      onChange={(e) => setEnergy(e.target.value as Energy)}
                      className="w-full px-12 py-8 border border-stone rounded-default bg-snow text-body focus:outline-none focus:ring-2 focus:ring-action focus:border-action"
                      disabled={enriching || saving}
                    >
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>

                  {/* Enrich Button */}
                  <Button
                    variant="primary"
                    onClick={handleEnrichTask}
                    disabled={enriching || saving}
                    className="w-full"
                  >
                    {enriching ? (
                      <>
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-snow mr-8 inline-block"></div>
                        Enriching with AI...
                      </>
                    ) : (
                      'Enrich with AI'
                    )}
                  </Button>

                  {/* Enriched Data Display */}
                  {enrichedData && (
                    <div className="mt-24 pt-16 border-t border-fog space-y-16">
                      <h3 className="text-h3 text-ink">Enriched Task Details</h3>

                      <div>
                        <label className="block text-small font-medium text-ink mb-4">
                          Enriched Name
                        </label>
                        <div className="px-12 py-8 bg-sky border border-sky rounded-default text-ink">
                          {enrichedData.name}
                        </div>
                      </div>

                      <div>
                        <label className="block text-small font-medium text-ink mb-4">
                          Category
                        </label>
                        <div className="px-12 py-8 bg-sky border border-sky rounded-default text-ink">
                          {enrichedData.category}
                        </div>
                      </div>

                      <div>
                        <label className="block text-small font-medium text-ink mb-4">
                          Context
                        </label>
                        <div className="px-12 py-8 bg-sky border border-sky rounded-default text-ink">
                          {enrichedData.context}
                        </div>
                      </div>

                      <div>
                        <label className="block text-small font-medium text-ink mb-4">
                          Definition of Done
                        </label>
                        <div className="px-12 py-8 bg-sky border border-sky rounded-default text-ink whitespace-pre-wrap">
                          {enrichedData.definitionOfDone}
                        </div>
                      </div>

                      {/* Save Button */}
                      <Button
                        variant="primary"
                        onClick={handleSaveTask}
                        disabled={saving}
                        className="w-full"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-snow mr-8 inline-block"></div>
                            Saving Task...
                          </>
                        ) : (
                          'Save Task'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card padding="large">
                <div className="text-center">
                  <svg
                    className="mx-auto h-48 w-48 text-slate mb-16"
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
                  <p className="text-slate">Select a task to clarify</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClarifyPage;
