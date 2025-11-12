import React, { useState } from 'react';
import type { Task, TaskStatus, Category, Energy, Priority } from '../types';
import { useToast } from '../contexts/ToastContext';
import {
  useFlatTasks,
  useCreateTask,
  useActivateTask,
  useCompleteTask,
  useUpdateTask,
  useDeleteTask,
} from '../hooks/useTasks';
import TaskModal from '../components/TaskModal';
import CompleteTaskModal from '../components/CompleteTaskModal';
import TaskActions from '../components/TaskActions';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { getCategoryStyle } from '../lib/designTokens';
import { getPriorityBadgeVariant, getEnergyBadgeVariant } from '../lib/badgeUtils';

const TasksPage: React.FC = () => {
  const toast = useToast();
  const [selectedTab, setSelectedTab] = useState<TaskStatus>('NEXT');

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<Category | ''>('');
  const [energyFilter, setEnergyFilter] = useState<Energy | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');

  // Build filters object
  const filters: any = { status: selectedTab };
  if (categoryFilter) filters.category = categoryFilter;
  if (energyFilter) filters.energyRequired = energyFilter;
  if (priorityFilter) filters.priority = priorityFilter;

  // React Query hooks
  const { tasks = [], isLoading: loading } = useFlatTasks(filters);
  const createTaskMutation = useCreateTask();
  const activateTaskMutation = useActivateTask();
  const completeTaskMutation = useCompleteTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  // Local UI state only
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Action handlers
  const handleActivateTask = async (task: Task) => {
    try {
      const response = await activateTaskMutation.mutateAsync(task.id);
      toast.showSuccess(`Task activated!\nFocus Mode: ${response.focusMode}\nTimer: ${response.timeryProject}`);
      setSelectedTask(null);
    } catch (err) {
      toast.showError('Failed to activate task');
      console.error('Error activating task:', err);
    }
  };

  const handleCompleteTask = async (completionData: any) => {
    if (!taskToComplete) return;
    try {
      await completeTaskMutation.mutateAsync({
        id: taskToComplete.id,
        request: completionData,
      });
      toast.showSuccess('Task completed successfully!');
      setTaskToComplete(null);
      setSelectedTask(null);
    } catch (err) {
      toast.showError('Failed to complete task');
      console.error('Error completing task:', err);
    }
  };

  const handleEditTask = async (taskData: Partial<Task>) => {
    if (!taskToEdit) return;
    try {
      await updateTaskMutation.mutateAsync({
        id: taskToEdit.id,
        updates: taskData,
      });
      toast.showSuccess('Task updated successfully!');
      setTaskToEdit(null);
      setSelectedTask(null);
    } catch (err) {
      toast.showError('Failed to update task');
      console.error('Error updating task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    try {
      await deleteTaskMutation.mutateAsync(taskId);
      toast.showSuccess('Task deleted successfully!');
      setSelectedTask(null);
    } catch (err) {
      toast.showError('Failed to delete task');
      console.error('Error deleting task:', err);
    }
  };

  return (
    <div className="space-y-24">
      {/* Header */}
      <Card padding="large">
        <div className="flex justify-between items-center">
          <h1 className="text-h1 text-ink">Tasks</h1>
          <Button variant="primary" onClick={() => setShowNewTaskModal(true)}>
            New Task
          </Button>
        </div>

        {/* Tabs */}
        <div className="mt-24 flex space-x-4 border-b border-fog">
          {(['NEXT', 'WAITING', 'ACTIVE', 'DONE'] as TaskStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setSelectedTab(status)}
              className={`px-16 py-8 font-medium text-body transition-standard border-b-2 ${
                selectedTab === status
                  ? 'border-action text-action'
                  : 'border-transparent text-slate hover:text-ink'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="mt-16 flex flex-wrap gap-12">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as Category | '')}
            className="px-12 py-8 border border-stone rounded-default text-small bg-snow focus:outline-none focus:ring-2 focus:ring-action focus:border-action"
          >
              <option value="">All Categories</option>
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

          <select
            value={energyFilter}
            onChange={(e) => setEnergyFilter(e.target.value as Energy | '')}
            className="px-12 py-8 border border-stone rounded-default text-small bg-snow focus:outline-none focus:ring-2 focus:ring-action focus:border-action"
          >
            <option value="">All Energy Levels</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as Priority | '')}
            className="px-12 py-8 border border-stone rounded-default text-small bg-snow focus:outline-none focus:ring-2 focus:ring-action focus:border-action"
          >
            <option value="">All Priorities</option>
            <option value="MUST">Must</option>
            <option value="SHOULD">Should</option>
            <option value="COULD">Could</option>
            <option value="MAYBE">Maybe</option>
          </select>
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-64">
          <div className="animate-spin rounded-full h-48 w-48 border-b-4 border-action"></div>
        </div>
      ) : tasks.length === 0 ? (
        <Card padding="large">
          <div className="text-center py-32">
            <p className="text-slate text-body mb-8">No tasks found</p>
            <p className="text-slate text-small">Try adjusting your filters or create a new task</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
          {tasks.map((task: Task) => (
            <Card
              key={task.id}
              padding="medium"
              className="hover:shadow-e02 transition-shadow duration-micro"
            >
              <h3
                className="font-semibold text-ink mb-12 cursor-pointer hover:text-action transition-colors duration-micro"
                onClick={() => setSelectedTask(task)}
              >
                {task.name}
              </h3>

              <div className="flex flex-wrap gap-8 mb-12">
                <Badge variant={getCategoryStyle(task.category).bg === 'bg-sky' ? 'sky' : getCategoryStyle(task.category).bg === 'bg-lavender' ? 'lavender' : getCategoryStyle(task.category).bg === 'bg-mint' ? 'mint' : getCategoryStyle(task.category).bg === 'bg-blush' ? 'blush' : getCategoryStyle(task.category).bg === 'bg-sun' ? 'sun' : 'neutral'} size="small">
                  {task.category}
                </Badge>
                <Badge variant={getEnergyBadgeVariant(task.energyRequired)} size="small">
                  {task.energyRequired}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-small text-slate mb-12">
                <div className="flex items-center space-x-12">
                  <Badge variant={getPriorityBadgeVariant(task.priority)} size="small">
                    {task.priority}
                  </Badge>
                  <span className="flex items-center text-micro">
                    <svg className="w-12 h-12 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatDuration(task.duration)}
                  </span>
                </div>
              </div>

              {task.dueDate && (
                <div className="mb-12 text-micro text-slate">
                  Due: {new Date(task.dueDate).toLocaleDateString()}
                </div>
              )}

              <TaskActions
                task={task}
                onActivate={() => handleActivateTask(task)}
                onComplete={() => setTaskToComplete(task)}
                onEdit={() => setTaskToEdit(task)}
                onDelete={() => handleDeleteTask(task.id)}
                compact
                loading={
                  activateTaskMutation.isPending ||
                  completeTaskMutation.isPending ||
                  updateTaskMutation.isPending ||
                  deleteTaskMutation.isPending
                }
              />
            </Card>
          ))}
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-24 z-50">
          <div className="bg-cloud rounded-modal max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-eglass border border-fog">
            <div className="p-32">
              <div className="flex justify-between items-start mb-16">
                <h2 className="text-h2 text-ink">{selectedTask.name}</h2>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-slate hover:text-ink transition-colors duration-micro"
                >
                  <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-16">
                <div className="flex flex-wrap gap-8">
                  <Badge variant={getCategoryStyle(selectedTask.category).bg === 'bg-sky' ? 'sky' : getCategoryStyle(selectedTask.category).bg === 'bg-lavender' ? 'lavender' : getCategoryStyle(selectedTask.category).bg === 'bg-mint' ? 'mint' : getCategoryStyle(selectedTask.category).bg === 'bg-blush' ? 'blush' : getCategoryStyle(selectedTask.category).bg === 'bg-sun' ? 'sun' : 'neutral'}>
                    {selectedTask.category}
                  </Badge>
                  <Badge variant={getEnergyBadgeVariant(selectedTask.energyRequired)}>
                    {selectedTask.energyRequired} Energy
                  </Badge>
                  <Badge variant={getPriorityBadgeVariant(selectedTask.priority)}>
                    {selectedTask.priority}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-16 text-body">
                  <div>
                    <span className="font-medium text-ink">Duration:</span>
                    <span className="ml-8 text-slate">{formatDuration(selectedTask.duration)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-ink">Context:</span>
                    <span className="ml-8 text-slate">{selectedTask.context}</span>
                  </div>
                  {selectedTask.dueDate && (
                    <div>
                      <span className="font-medium text-ink">Due Date:</span>
                      <span className="ml-8 text-slate">
                        {new Date(selectedTask.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {selectedTask.scheduledStart && (
                    <div>
                      <span className="font-medium text-ink">Scheduled:</span>
                      <span className="ml-8 text-slate">
                        {new Date(selectedTask.scheduledStart).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-fog pt-16">
                  <h3 className="text-h3 text-ink mb-8">Definition of Done</h3>
                  <p className="text-body text-ink whitespace-pre-wrap">{selectedTask.definitionOfDone}</p>
                </div>

                <div className="border-t border-fog pt-16 text-micro text-slate">
                  <div>Created: {new Date(selectedTask.createdAt).toLocaleString()}</div>
                  <div>Updated: {new Date(selectedTask.updatedAt).toLocaleString()}</div>
                  {selectedTask.activatedAt && (
                    <div>Activated: {new Date(selectedTask.activatedAt).toLocaleString()}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Task Modal */}
      {showNewTaskModal && (
        <TaskModal
          mode="create"
          onClose={() => setShowNewTaskModal(false)}
          onSave={async (taskData) => {
            try {
              await createTaskMutation.mutateAsync(taskData);
              toast.showSuccess('Task created successfully!');
              setShowNewTaskModal(false);
            } catch (err) {
              toast.showError('Failed to create task');
              console.error('Error creating task:', err);
            }
          }}
        />
      )}

      {/* Edit Task Modal */}
      {taskToEdit && (
        <TaskModal
          mode="edit"
          task={taskToEdit}
          onClose={() => setTaskToEdit(null)}
          onSave={handleEditTask}
        />
      )}

      {/* Complete Task Modal */}
      {taskToComplete && (
        <CompleteTaskModal
          task={taskToComplete}
          onClose={() => setTaskToComplete(null)}
          onComplete={handleCompleteTask}
        />
      )}
    </div>
  );
};

export default TasksPage;
