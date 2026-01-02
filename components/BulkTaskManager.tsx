import React, { useState } from 'react';
import { BulkTask } from '../types';
import { addBulkTask, toggleBulkSubTask, deleteBulkTask } from '../services/storage';
import { Button } from './Button';
import { Plus, Trash2, CheckSquare, Layers, X, ChevronDown, ChevronUp } from 'lucide-react';

interface BulkTaskManagerProps {
  bulkTasks: BulkTask[];
  onUpdate: () => void;
}

export const BulkTaskManager: React.FC<BulkTaskManagerProps> = ({ bulkTasks, onUpdate }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  
  // Manage list of inputs dynamically
  const [subItems, setSubItems] = useState<string[]>(['']);
  
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    // Filter out empty items
    const items = subItems
      .map(i => i.trim())
      .filter(i => i.length > 0);

    if (items.length === 0) return;

    await addBulkTask(newTitle, items);
    
    // Reset form
    setNewTitle('');
    setSubItems(['']);
    setIsCreating(false);
    onUpdate();
  };

  const handleToggleSubTask = async (bulkTaskId: string, subTaskId: string) => {
    await toggleBulkSubTask(bulkTaskId, subTaskId);
    onUpdate();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
        await deleteBulkTask(id);
        onUpdate();
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedTaskId(expandedTaskId === id ? null : id);
  };

  // --- Dynamic Input Handlers ---
  const handleItemChange = (index: number, value: string) => {
    const updated = [...subItems];
    updated[index] = value;
    setSubItems(updated);
  };

  const addItemInput = () => {
    setSubItems([...subItems, '']);
  };

  const removeItemInput = (index: number) => {
    if (subItems.length === 1) {
        setSubItems(['']); // Don't remove the last input, just clear it
        return;
    }
    const updated = subItems.filter((_, i) => i !== index);
    setSubItems(updated);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <Layers className="text-indigo-600" size={20}/>
            <h2 className="text-lg font-semibold text-slate-800">Bulk Tasks</h2>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)} variant={isCreating ? "secondary" : "primary"} size="sm">
            {isCreating ? "Cancel" : <><Plus size={16} className="mr-2"/> New Project</>}
        </Button>
      </div>

      {isCreating && (
        <div className="p-6 bg-slate-50 border-b border-slate-100 animate-in slide-in-from-top-4 duration-300">
            <form onSubmit={handleCreate} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Project Name</label>
                    <input 
                        autoFocus
                        type="text" 
                        value={newTitle} 
                        onChange={(e) => setNewTitle(e.target.value)} 
                        className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400"
                        placeholder="e.g., Website Redesign, Physics Project"
                    />
                </div>
                
                <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Project Items</label>
                    <div className="space-y-2">
                        {subItems.map((item, index) => (
                            <div key={index} className="flex gap-2 items-center group">
                                <div className="flex-1">
                                    <input 
                                        type="text" 
                                        value={item} 
                                        onChange={(e) => handleItemChange(index, e.target.value)} 
                                        className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400"
                                        placeholder={`Item ${index + 1}`}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                addItemInput();
                                            }
                                        }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeItemInput(index)}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                    tabIndex={-1}
                                    title="Remove item"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={addItemInput}
                        className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                    >
                        <Plus size={16} /> Add another item
                    </button>
                </div>

                <div className="pt-2">
                    <Button type="submit" className="w-full">Create Project</Button>
                </div>
            </form>
        </div>
      )}

      <div className="divide-y divide-slate-100">
        {bulkTasks.length === 0 && !isCreating && (
             <div className="p-8 text-center text-slate-400">
                <p>No bulk tasks found. Start a new project.</p>
             </div>
        )}
        
        {bulkTasks.map(task => {
            const completedCount = task.subTasks.filter(st => st.isCompleted).length;
            const totalCount = task.subTasks.length;
            const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const isExpanded = expandedTaskId === task.id;

            return (
                <div key={task.id} className="transition-colors hover:bg-slate-50/50">
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-semibold text-lg text-slate-900">{task.title}</h3>
                                <p className="text-sm text-slate-500">
                                    {completedCount} of {totalCount} items completed ({percent}%)
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleDelete(task.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                    title="Delete Project"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <button 
                                    onClick={() => toggleExpand(task.id)}
                                    className="p-2 text-slate-300 hover:text-indigo-600 transition-colors bg-slate-100 rounded-md"
                                >
                                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Simple Linear Progress Bar instead of huge chart */}
                        <div className="w-full bg-slate-200 rounded-full h-2.5 mt-2">
                            <div 
                                className={`h-2.5 rounded-full transition-all duration-500 ${percent === 100 ? 'bg-green-500' : 'bg-indigo-600'}`}
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Expandable List */}
                    {isExpanded && (
                        <div className="px-6 pb-6 pt-0 border-t border-slate-100 bg-slate-50/30">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider py-4">
                                Project Items
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                                {task.subTasks.map(subTask => (
                                    <label 
                                        key={subTask.id} 
                                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                                            subTask.isCompleted 
                                            ? 'bg-indigo-50 border-indigo-100' 
                                            : 'bg-white border-slate-200 hover:border-indigo-300'
                                        }`}
                                    >
                                        <input 
                                            type="checkbox"
                                            className="hidden"
                                            checked={subTask.isCompleted}
                                            onChange={() => handleToggleSubTask(task.id, subTask.id)}
                                        />
                                        <div className={`w-5 h-5 rounded border mr-3 flex items-center justify-center transition-colors ${
                                            subTask.isCompleted 
                                            ? 'bg-indigo-600 border-indigo-600' 
                                            : 'bg-white border-slate-300'
                                        }`}>
                                            {subTask.isCompleted && <CheckSquare size={12} className="text-white" />}
                                        </div>
                                        <span className={`text-sm ${subTask.isCompleted ? 'text-indigo-900 font-medium' : 'text-slate-700'}`}>
                                            {subTask.title}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        })}
      </div>
    </div>
  );
};