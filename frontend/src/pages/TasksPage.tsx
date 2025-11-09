import React, { useState, useEffect } from 'react';
import { getTasks, createTask, activateTask, completeTask, updateTask, deleteTask } from '../lib/api';
import type { Task, TaskStatus, Category, Energy, Priority } from '../types';
import { useToast } from '../contexts/ToastContext';
import TaskModal from '../components/TaskModal';
import CompleteTaskModal from '../components/CompleteTaskModal';
import TaskActions from '../components/TaskActions';

const TasksPage: React.FC = () => {
  const toast = useToast();
  const [selectedTab, setSelectedTab] = useState<TaskStatus>('NEXT');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<Category | ''>('');
  const [energyFilter, setEnergyFilter] = useState<Energy | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');

  useEffect(() => {
    fetchTasks();
  }, [selectedTab, categoryFilter, energyFilter, priorityFilter]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const filters: any = { status: selectedTab };
      if (categoryFilter) filters.category = categoryFilter;
      if (energyFilter) filters.energyRequired = energyFilter;
      if (priorityFilter) filters.priority = priorityFilter;

      const data = await getTasks(filters);
      setTasks(data);
    } catch (err) {
      toast.showError('Failed to load tasks. Please try again.');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'MUST': return 'bg-red-100 text-red-800';
      case 'SHOULD': return 'bg-orange-100 text-orange-800';
      case 'COULD': return 'bg-yellow-100 text-yellow-800';
      case 'MAYBE': return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: Category) => {
    const colors: Record<Category, string> = {
      SCHOOL: 'bg-blue-100 text-blue-800',
      MUSIC: 'bg-purple-100 text-purple-800',
      FITNESS: 'bg-green-100 text-green-800',
      GAMING: 'bg-indigo-100 text-indigo-800',
      NUTRITION: 'bg-lime-100 text-lime-800',
      HYGIENE: 'bg-cyan-100 text-cyan-800',
      PET: 'bg-pink-100 text-pink-800',
      SOCIAL: 'bg-fuchsia-100 text-fuchsia-800',
      PERSONAL: 'bg-violet-100 text-violet-800',
      ADMIN: 'bg-slate-100 text-slate-800',
    };
    return colors[category];
  };

  const getEnergyColor = (energy: Energy) => {
    switch (energy) {
      case 'HIGH': return 'bg-red-50 text-red-700 border border-red-200';
      case 'MEDIUM': return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'LOW': return 'bg-green-50 text-green-700 border border-green-200';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Action handlers
  const handleActivateTask = async (task: Task) => {
    try {
      setActionLoading(true);
      const response = await activateTask(task.id);
      toast.showSuccess(`Task activated!\nFocus Mode: ${response.focusMode}\nTimer: ${response.timeryProject}`);
      await fetchTasks();
      setSelectedTask(null);
    } catch (err) {
      toast.showError('Failed to activate task');
      console.error('Error activating task:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteTask = async (completionData: any) => {
    if (!taskToComplete) return;
    try {
      setActionLoading(true);
      await completeTask(taskToComplete.id, completionData);
      toast.showSuccess('Task completed successfully!');
      setTaskToComplete(null);
      await fetchTasks();
      setSelectedTask(null);
    } catch (err) {
      toast.showError('Failed to complete task');
      console.error('Error completing task:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditTask = async (taskData: Partial<Task>) => {
    if (!taskToEdit) return;
    try {
      setActionLoading(true);
      await updateTask(taskToEdit.id, taskData);
      toast.showSuccess('Task updated successfully!');
      setTaskToEdit(null);
      await fetchTasks();
      setSelectedTask(null);
    } catch (err) {
      toast.showError('Failed to update task');
      console.error('Error updating task:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    try {
      setActionLoading(true);
      await deleteTask(taskId);
      toast.showSuccess('Task deleted successfully!');
      await fetchTasks();
      setSelectedTask(null);
    } catch (err) {
      toast.showError('Failed to delete task');
      console.error('Error deleting task:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
            <button
              onClick={() => setShowNewTaskModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              New Task
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex space-x-1 border-b">
            {(['NEXT', 'WAITING', 'ACTIVE', 'DONE'] as TaskStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setSelectedTab(status)}
                className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                  selectedTab === status
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as Category | '')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Energy Levels</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as Priority | '')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="MUST">Must</option>
              <option value="SHOULD">Should</option>
              <option value="COULD">Could</option>
              <option value="MAYBE">Maybe</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No tasks found</p>
            <p className="text-gray-400 text-sm mt-2">Try adjusting your filters or create a new task</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <h3
                  className="font-semibold text-gray-900 mb-3 cursor-pointer hover:text-blue-600"
                  onClick={() => setSelectedTask(task)}
                >
                  {task.name}
                </h3>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(task.category)}`}>
                    {task.category}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEnergyColor(task.energyRequired)}`}>
                    {task.energyRequired}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                  <div className="flex items-center space-x-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {formatDuration(task.duration)}
                    </span>
                  </div>
                </div>

                {task.dueDate && (
                  <div className="mb-3 text-xs text-gray-500">
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
                  loading={actionLoading}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{selectedTask.name}</h2>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(selectedTask.category)}`}>
                    {selectedTask.category}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEnergyColor(selectedTask.energyRequired)}`}>
                    {selectedTask.energyRequired} Energy
                  </span>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${getPriorityColor(selectedTask.priority)}`}>
                    {selectedTask.priority}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Duration:</span>
                    <span className="ml-2 text-gray-600">{formatDuration(selectedTask.duration)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Context:</span>
                    <span className="ml-2 text-gray-600">{selectedTask.context}</span>
                  </div>
                  {selectedTask.dueDate && (
                    <div>
                      <span className="font-medium text-gray-700">Due Date:</span>
                      <span className="ml-2 text-gray-600">
                        {new Date(selectedTask.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {selectedTask.scheduledStart && (
                    <div>
                      <span className="font-medium text-gray-700">Scheduled:</span>
                      <span className="ml-2 text-gray-600">
                        {new Date(selectedTask.scheduledStart).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Definition of Done</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedTask.definitionOfDone}</p>
                </div>

                <div className="border-t pt-4 text-xs text-gray-500">
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
            await createTask(taskData);
            setShowNewTaskModal(false);
            await fetchTasks();
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
