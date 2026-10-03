import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, Clock, Plus, ArrowLeft, ClipboardList } from 'lucide-react';
import Navbar from '../components/Navbar';
import { getMyTasks, createTask, completeTask } from '../api/tasks';
import { Button } from '../components/ui/button';

export default function MyTasksPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [filter, setFilter] = useState<'pending' | 'completed' | 'all'>('pending');

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', 'me'],
    queryFn: getMyTasks
  });

  const tasks: any[] = data?.tasks || [];

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      toast.success('Task created!');
      setTitle('');
      setDueDate('');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['tasks', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['employeeSummary'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create task')
  });

  const completeMutation = useMutation({
    mutationFn: completeTask,
    onSuccess: () => {
      toast.success('Task marked complete!');
      queryClient.invalidateQueries({ queryKey: ['tasks', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['employeeSummary'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update task')
  });

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending') return t.status === 'pending';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const doneCount = tasks.filter((t) => t.status === 'completed').length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Task title is required');
      return;
    }
    createMutation.mutate({ title: title.trim(), dueDate: dueDate || null });
  };

  const formatDue = (date: string | null) => {
    if (!date) return null;
    const d = new Date(date);
    const now = new Date();
    const isOverdue = d < now;
    const formatted = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    return { formatted, isOverdue };
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            <NavLink
              to="/dashboard"
              className="h-9 w-9 flex items-center justify-center rounded-xl bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </NavLink>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                <ClipboardList className="w-3 h-3" />
                <span>My Tasks</span>
              </div>
              <h1 className="text-xl font-extrabold text-white">Task List</h1>
            </div>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Task</span>
          </button>
        </div>

        {/* Quick Add Form */}
        {showForm && (
          <div className="bg-[#131c31] border border-indigo-500/30 rounded-2xl p-5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <h3 className="text-sm font-bold text-white mb-4">Add New Task</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Task Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Collect ID proof from Rahul Sharma..."
                  className="w-full h-10 px-3 rounded-xl bg-[#0b0f19] border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Due Date (optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10 px-3 rounded-xl bg-[#0b0f19] border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Task'}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowForm(false)}
                  variant="outline"
                  className="h-10 px-4 text-xs rounded-xl border-slate-700 text-slate-400"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Stats + Filter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#131c31] border border-slate-800/80 rounded-xl">
            {(['pending', 'completed', 'all'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === tab
                    ? tab === 'pending'
                      ? 'bg-indigo-600 text-white'
                      : tab === 'completed'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'pending' ? `Pending (${pendingCount})` : tab === 'completed' ? `Done (${doneCount})` : `All (${tasks.length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-[#131c31] animate-pulse" />
              ))}
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-[#131c31] rounded-2xl border border-slate-800/80">
              <div className="text-4xl">
                {filter === 'completed' ? '🎉' : '📋'}
              </div>
              <h4 className="text-sm font-bold text-slate-200">
                {filter === 'completed' ? 'No completed tasks yet' : 'No pending tasks — nice work!'}
              </h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {filter === 'pending'
                  ? 'You have no outstanding tasks. Use the "+ New Task" button to add one.'
                  : 'Tasks you complete will appear here.'}
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const due = formatDue(task.dueDate);
              const isDone = task.status === 'completed';

              return (
                <div
                  key={task._id}
                  className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${
                    isDone
                      ? 'border-slate-800/40 bg-[#131c31]/60 opacity-60'
                      : due?.isOverdue
                      ? 'border-red-500/30 bg-red-500/5'
                      : 'border-slate-800/80 bg-[#131c31] hover:border-slate-700'
                  }`}
                >
                  {/* Complete Button */}
                  <button
                    onClick={() => !isDone && completeMutation.mutate(task._id)}
                    disabled={isDone || completeMutation.isPending}
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      isDone
                        ? 'border-emerald-500 bg-emerald-500'
                        : 'border-slate-600 hover:border-emerald-500'
                    }`}
                    title={isDone ? 'Completed' : 'Mark as complete'}
                  >
                    {isDone && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </button>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isDone ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                      {task.title}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      {due && (
                        <span className={`flex items-center gap-1 text-[11px] font-mono ${
                          isDone ? 'text-slate-500' : due.isOverdue ? 'text-red-400 font-bold' : 'text-slate-400'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {due.isOverdue && !isDone ? 'Overdue: ' : ''}
                          {due.formatted}
                        </span>
                      )}
                      {task.createdBy?.name && task.createdBy._id !== task.owner && (
                        <span className="text-[11px] text-slate-500">
                          Assigned by {task.createdBy.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  {!isDone && due?.isOverdue && (
                    <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                      OVERDUE
                    </span>
                  )}
                  {isDone && (
                    <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      DONE
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
