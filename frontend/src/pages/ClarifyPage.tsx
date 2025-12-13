import React, { useState, useEffect } from 'react';
import type { TempCapturedTask, Priority, Category, Energy, Context } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useTodoistPending } from '../hooks/useTodoist';
import { useProcessCapturedTask } from '../hooks/useTasks';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import EmptyState from '../components/EmptyState';
import Select from '../components/Select';

const ClarifyPage: React.FC = () => {
  const toast = useToast();

  // Data fetching hooks
  const { data, isLoading, isError } = useTodoistPending();
  const pendingTasks = data?.tasks ?? [];

  // Mutation hooks
  const processTaskMutation = useProcessCapturedTask();

  // UI State
  const [selectedTask, setSelectedTask] = useState<TempCapturedTask | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [priority, setPriority] = useState<number>(1);
  const [duration, setDuration] = useState<number>(30);
  const [energy, setEnergy] = useState<Energy>('MEDIUM');
  const [category, setCategory] = useState<Category>('PERSONAL');
  const [context, setContext] = useState<Context>('ANYWHERE');
  const [definitionOfDone, setDefinitionOfDone] = useState('');

  // Reset form when a task is selected
  useEffect(() => {
    if (selectedTask) {
      setName(selectedTask.name);
      setPriority(1); // Default to Must
      setDuration(30);
      setEnergy('MEDIUM');
      setCategory('PERSONAL');
      setContext('ANYWHERE');
      setDefinitionOfDone('');
    }
  }, [selectedTask]);

  const handleSelectTask = (task: TempCapturedTask) => {
    setSelectedTask(task);
  };

  const handleProcessTask = async () => {
    if (!selectedTask) return;

    if (definitionOfDone.trim().length < 5) {
      toast.showError('Please provide a Definition of Done');
      return;
    }

    setIsProcessing(true);

    const priorityMap: Record<number, Priority> = {
      1: 'MUST',
      2: 'SHOULD',
      3: 'COULD',
      4: 'MAYBE',
    };

    try {
      await processTaskMutation.mutateAsync({
        tempTaskId: selectedTask.id,
        name: name.trim(),
        priority: priorityMap[priority],
        category,
        context,
        energyRequired: energy,
        duration,
        definitionOfDone: definitionOfDone.trim(),
        dueDate: selectedTask.dueDate,
        status: 'NEXT'
      });

      toast.showSuccess('Task processed successfully!');
      setSelectedTask(null);
    } catch (err) {
      toast.showError('Failed to process task. Please try again.');
      console.error('Error processing task:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-24">
      {/* Header */}
      <Card padding="large">
        <h1 className="text-h1 text-ink">Clarify Tasks</h1>
        <p className="text-slate mt-4">
          Process tasks captured from Todoist
        </p>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center py-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-48 w-48 border-b-4 border-action"></div>
            <p className="mt-16 text-slate">Loading tasks...</p>
          </div>
        </div>
      ) : isError ? (
        <div className="flex justify-center items-center py-64">
          <div className="text-center">
            <p className="text-red-600">Failed to load pending tasks</p>
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
              <EmptyState
                title="No pending tasks"
                description="All caught up — nothing to clarify right now."
              />
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
                  {/* Task Name */}
                  <Input
                    label="Task Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                    disabled={isProcessing}
                  />

                  {/* Priority & Duration */}
                  <div className="grid grid-cols-2 gap-16">
                    <div>
                      <label className="block text-small font-medium text-ink mb-4">
                        Priority
                      </label>
                      <Select
                        value={String(priority)}
                        onChange={(e) => setPriority(Number(e.target.value))}
                        options={[
                          { value: '1', label: '1 - Must' },
                          { value: '2', label: '2 - Should' },
                          { value: '3', label: '3 - Could' },
                          { value: '4', label: '4 - Maybe' },
                        ]}
                        fullWidth
                        disabled={isProcessing}
                      />
                    </div>

                    <Input
                      type="number"
                      label="Duration (min)"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      min={5}
                      step={5}
                      disabled={isProcessing}
                      fullWidth
                    />
                  </div>

                  {/* Category & Energy */}
                  <div className="grid grid-cols-2 gap-16">
                    <div>
                      <label className="block text-small font-medium text-ink mb-4">
                        Category
                      </label>
                      <Select
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
                        disabled={isProcessing}
                      />
                    </div>

                    <div>
                      <label className="block text-small font-medium text-ink mb-4">
                        Energy
                      </label>
                      <Select
                        value={energy}
                        onChange={(e) => setEnergy(e.target.value as Energy)}
                        options={[
                          { value: 'HIGH', label: 'High' },
                          { value: 'MEDIUM', label: 'Medium' },
                          { value: 'LOW', label: 'Low' },
                        ]}
                        fullWidth
                        disabled={isProcessing}
                      />
                    </div>
                  </div>

                  {/* Context */}
                  <div>
                    <label className="block text-small font-medium text-ink mb-4">
                      Context
                    </label>
                    <Select
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
                      disabled={isProcessing}
                    />
                  </div>

                  {/* Definition of Done */}
                  <div>
                    <label className="block text-small font-medium text-ink mb-4">
                      Definition of Done
                    </label>
                    <textarea
                      value={definitionOfDone}
                      onChange={(e) => setDefinitionOfDone(e.target.value)}
                      className="w-full px-12 py-8 border border-stone rounded-default bg-snow text-body focus:outline-none focus:ring-2 focus:ring-action focus:border-action min-h-[100px]"
                      placeholder="What does finished look like?"
                      disabled={isProcessing}
                    />
                  </div>

                  {/* Save Button */}
                  <Button
                    variant="primary"
                    onClick={handleProcessTask}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-snow mr-8 inline-block"></div>
                        Processing...
                      </>
                    ) : (
                      'Save Task'
                    )}
                  </Button>
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
