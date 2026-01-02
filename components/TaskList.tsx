import React, { useState } from 'react';
import { CheckCircle2, Circle, Calendar, Plus, Trash2, Pencil, X, Check, Filter, User } from 'lucide-react';
import { Task, Frequency } from '../types';
import { Button } from './Button';
import { isTaskVisibleOnDate } from '../services/storage';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onAdd: (task: Omit<Task, 'id' | 'createdAt' | 'isDoneToday' | 'createdBy'>) => void;
  onUpdate: (task: Task) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, onToggle, onAdd, onUpdate }) => {
  const [viewMode, setViewMode] = useState<'today' | 'all'>('today');
  const [isAdding, setIsAdding] = useState(false);
  
  // New Task State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newFreq, setNewFreq] = useState<Frequency>(Frequency.DAILY);
  const [newScheduledDate, setNewScheduledDate] = useState('');
  const [newWeekDay, setNewWeekDay] = useState<number>(1); // Default Monday
  const [newMonthDay, setNewMonthDay] = useState<number>(1); // Default 1st

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editFreq, setEditFreq] = useState<Frequency>(Frequency.DAILY);
  const [editScheduledDate, setEditScheduledDate] = useState('');
  const [editWeekDay, setEditWeekDay] = useState<number>(1);
  const [editMonthDay, setEditMonthDay] = useState<number>(1);

  const WEEK_DAYS = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  const resetForm = () => {
    setNewTitle('');
    setNewDesc('');
    setNewFreq(Frequency.DAILY);
    setNewScheduledDate('');
    setNewWeekDay(1);
    setNewMonthDay(1);
    setIsAdding(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    onAdd({
      title: newTitle,
      description: newDesc,
      frequency: newFreq,
      scheduledDate: newFreq === Frequency.ONCE ? newScheduledDate : undefined,
      weekDay: newFreq === Frequency.WEEKLY ? Number(newWeekDay) : undefined,
      monthDay: newFreq === Frequency.MONTHLY ? Number(newMonthDay) : undefined,
    });
    
    resetForm();
  };

  const startEditing = (task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditDesc(task.description);
    setEditFreq(task.frequency);
    setEditScheduledDate(task.scheduledDate || '');
    setEditWeekDay(task.weekDay !== undefined ? task.weekDay : 1);
    setEditMonthDay(task.monthDay !== undefined ? task.monthDay : 1);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEditing = (originalTask: Task) => {
    if (!editTitle.trim()) return;
    
    onUpdate({
        ...originalTask,
        title: editTitle,
        description: editDesc,
        frequency: editFreq,
        scheduledDate: editFreq === Frequency.ONCE ? editScheduledDate : undefined,
        weekDay: editFreq === Frequency.WEEKLY ? Number(editWeekDay) : undefined,
        monthDay: editFreq === Frequency.MONTHLY ? Number(editMonthDay) : undefined,
    });
    setEditingId(null);
  };

  // Filter Tasks based on View Mode
  const filteredTasks = tasks.filter(task => {
    if (viewMode === 'all') return true;
    // Today Mode: Use the visibility helper
    return isTaskVisibleOnDate(task, new Date());
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Sort by done status (not done first), then title
    if (a.isDoneToday === b.isDoneToday) {
      return a.title.localeCompare(b.title);
    }
    return a.isDoneToday ? 1 : -1;
  });

  const renderSchedulingInputs = (
    freq: Frequency, 
    scheduledDate: string, setScheduledDate: (v: string) => void,
    weekDay: number, setWeekDay: (v: number) => void,
    monthDay: number, setMonthDay: (v: number) => void
  ) => {
    if (freq === Frequency.ONCE) {
      return (
        <div className="mt-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Scheduled Date</label>
            <input 
                type="date"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
        </div>
      );
    }
    if (freq === Frequency.WEEKLY) {
      return (
        <div className="mt-2">
             <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Repeats On</label>
             <select
                value={weekDay}
                onChange={(e) => setWeekDay(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
             >
                {WEEK_DAYS.map(day => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                ))}
             </select>
        </div>
      );
    }
    if (freq === Frequency.MONTHLY) {
        return (
            <div className="mt-2">
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Day of Month (1-31)</label>
                <input 
                    type="number"
                    min="1"
                    max="31"
                    value={monthDay}
                    onChange={(e) => setMonthDay(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
            </div>
        );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-slate-100">
        <div className="flex justify-between items-center mb-4">
            <div>
                <h2 className="text-lg font-semibold text-slate-800">Your Tasks</h2>
                <p className="text-sm text-slate-500">
                    {viewMode === 'today' ? "Scheduled for Today" : "All Tasks"}
                </p>
            </div>
            <div className="flex bg-slate-100 rounded-lg p-1">
                <button 
                    onClick={() => setViewMode('today')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'today' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Today
                </button>
                <button 
                    onClick={() => setViewMode('all')}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    All
                </button>
            </div>
        </div>
        
        <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "secondary" : "primary"} size="sm" className="w-full">
            {isAdding ? "Cancel" : <><Plus size={16} className="mr-2"/> Add Task</>}
        </Button>
      </div>

      {isAdding && (
        <div className="p-6 bg-slate-50 border-b border-slate-100 animate-in slide-in-from-top-4 duration-300">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Title</label>
                    <input 
                        autoFocus
                        type="text" 
                        value={newTitle} 
                        onChange={(e) => setNewTitle(e.target.value)} 
                        className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder:text-slate-400"
                        placeholder="e.g., Read 30 mins"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Description (Optional)</label>
                    <input 
                        type="text" 
                        value={newDesc} 
                        onChange={(e) => setNewDesc(e.target.value)} 
                        className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none placeholder:text-slate-400"
                        placeholder="Details..."
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Frequency</label>
                    <div className="flex flex-wrap gap-2">
                        {Object.values(Frequency).map((f) => (
                            <button
                                key={f}
                                type="button"
                                onClick={() => setNewFreq(f)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium border ${
                                    newFreq === f 
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
                
                {renderSchedulingInputs(newFreq, newScheduledDate, setNewScheduledDate, newWeekDay, setNewWeekDay, newMonthDay, setNewMonthDay)}

                <div className="pt-2">
                    <Button type="submit" className="w-full">Create Task</Button>
                </div>
            </form>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-2">
        {sortedTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-center px-4">
                <Calendar size={48} className="mb-2 opacity-20"/>
                <p>
                    {viewMode === 'today' 
                        ? "No tasks scheduled for today." 
                        : "No tasks yet. Create one to get started."}
                </p>
                {viewMode === 'today' && (
                    <button onClick={() => setViewMode('all')} className="text-xs text-indigo-600 mt-2 hover:underline">
                        View all tasks
                    </button>
                )}
            </div>
        ) : (
            <ul className="space-y-2">
            {sortedTasks.map((task) => (
                <li 
                    key={task.id} 
                    className={`group flex items-start gap-3 p-4 rounded-lg transition-all border ${
                        task.isDoneToday 
                        ? 'bg-slate-50 border-slate-100' 
                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                    }`}
                >
                    {editingId === task.id ? (
                        <div className="w-full space-y-3">
                            <input 
                                type="text" 
                                value={editTitle} 
                                onChange={(e) => setEditTitle(e.target.value)} 
                                className="w-full px-2 py-1 bg-white text-slate-900 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium placeholder:text-slate-400"
                                placeholder="Task Title"
                            />
                            <input 
                                type="text" 
                                value={editDesc} 
                                onChange={(e) => setEditDesc(e.target.value)} 
                                className="w-full px-2 py-1 bg-white text-slate-900 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-xs placeholder:text-slate-400"
                                placeholder="Description"
                            />
                             <div className="flex flex-wrap gap-2">
                                {Object.values(Frequency).map((f) => (
                                    <button
                                        key={f}
                                        type="button"
                                        onClick={() => setEditFreq(f)}
                                        className={`px-2 py-1 rounded text-xs font-medium border ${
                                            editFreq === f 
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                            : 'bg-white border-slate-200 text-slate-600'
                                        }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                            
                            {renderSchedulingInputs(editFreq, editScheduledDate, setEditScheduledDate, editWeekDay, setEditWeekDay, editMonthDay, setEditMonthDay)}

                            <div className="flex gap-2 justify-end mt-2">
                                <Button size="sm" variant="ghost" onClick={cancelEditing}>
                                    <X size={14} className="mr-1"/> Cancel
                                </Button>
                                <Button size="sm" onClick={() => saveEditing(task)}>
                                    <Check size={14} className="mr-1"/> Save
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <button 
                                onClick={() => onToggle(task.id)}
                                className={`mt-0.5 flex-shrink-0 transition-colors ${
                                    task.isDoneToday ? 'text-green-500' : 'text-slate-300 hover:text-indigo-500'
                                }`}
                                title={!isTaskVisibleOnDate(task, new Date()) ? "This task is not scheduled for today, but you can still check it." : "Toggle Status"}
                            >
                                {task.isDoneToday ? <CheckCircle2 size={24} className="fill-current" /> : <Circle size={24} />}
                            </button>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                     <h3 className={`font-medium truncate ${task.isDoneToday ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                        {task.title}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <div className="flex flex-col items-end">
                                            <span className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full uppercase ${
                                            task.frequency === Frequency.ONCE 
                                            ? 'bg-amber-100 text-amber-700' 
                                            : 'bg-slate-100 text-slate-400'
                                            }`}>
                                                {task.frequency}
                                            </span>
                                            {/* Info tag for scheduling */}
                                            {task.frequency === Frequency.WEEKLY && task.weekDay !== undefined && (
                                                <span className="text-[10px] text-slate-400 mt-0.5">
                                                    {WEEK_DAYS.find(d => d.value === task.weekDay)?.label}
                                                </span>
                                            )}
                                            {task.frequency === Frequency.MONTHLY && task.monthDay !== undefined && (
                                                <span className="text-[10px] text-slate-400 mt-0.5">
                                                    Day {task.monthDay}
                                                </span>
                                            )}
                                            {task.frequency === Frequency.ONCE && task.scheduledDate && (
                                                <span className="text-[10px] text-slate-400 mt-0.5">
                                                    {task.scheduledDate}
                                                </span>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => startEditing(task)}
                                            className="text-slate-300 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Edit Task"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                    </div>
                                </div>
                                
                                {task.description && (
                                    <p className={`text-sm mt-0.5 truncate ${task.isDoneToday ? 'text-slate-300' : 'text-slate-500'}`}>
                                        {task.description}
                                    </p>
                                )}
                                
                                {task.createdBy && (
                                    <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                        <User size={10} /> Added by {task.createdBy}
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </li>
            ))}
            </ul>
        )}
      </div>
    </div>
  );
};
