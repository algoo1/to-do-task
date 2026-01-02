import React, { useState, useEffect, useCallback } from 'react';
import { Dashboard } from './components/Dashboard';
import { TaskList } from './components/TaskList';
import { BulkTaskManager } from './components/BulkTaskManager';
import { Login } from './components/Login';
import { getTasks, addTask, toggleTaskStatus, updateTask, getBulkTasks, initializeDatabase, APP_VERSION } from './services/storage';
import { checkSession, logout, getCurrentUser } from './services/auth';
import { Task, BulkTask } from './types';
import { LayoutDashboard, CheckSquare, LogOut, User as UserIcon, Database } from 'lucide-react';
import { Button } from './components/Button';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bulkTasks, setBulkTasks] = useState<BulkTask[]>([]);
  const [refreshKey, setRefreshKey] = useState(0); 

  useEffect(() => {
    // Initialize DB schema checks
    initializeDatabase();
    
    // Check session on mount
    const verifySession = async () => {
        const hasSession = await checkSession();
        setIsAuthenticated(hasSession);
        setIsAuthLoading(false);
    };
    verifySession();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
        if (isAuthenticated) {
            const fetchedTasks = await getTasks();
            setTasks(fetchedTasks);
            const fetchedBulk = await getBulkTasks();
            setBulkTasks(fetchedBulk);
        }
    };
    fetchData();
  }, [refreshKey, isAuthenticated]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await logout();
    setIsAuthenticated(false);
  };

  const handleAddTask = async (newTask: Omit<Task, 'id' | 'createdAt' | 'isDoneToday' | 'createdBy'>) => {
    await addTask(newTask);
    setRefreshKey(prev => prev + 1);
  };

  const handleToggleTask = async (id: string) => {
    await toggleTaskStatus(id);
    setRefreshKey(prev => prev + 1);
  };

  const handleUpdateTask = async (task: Task) => {
    await updateTask(task);
    setRefreshKey(prev => prev + 1);
  };

  const handleBulkUpdate = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
                T
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 hidden sm:block">TaskFlow <span className="text-indigo-600">Analytics</span></h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
                <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
                    <UserIcon size={14} />
                </div>
                <span className="text-sm font-medium text-slate-600">{getCurrentUser() || 'User'}</span>
             </div>
             <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-red-600">
                <LogOut size={18} className="mr-2" /> Logout
             </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
          {/* Left Column: Dashboard (Charts) */}
          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-center gap-2 mb-2">
                <LayoutDashboard className="text-indigo-600" size={20}/>
                <h2 className="text-lg font-semibold text-slate-800">Performance Overview</h2>
            </div>
            {/* Key is used to force re-animation of chart on data update */}
            <Dashboard key={`dash-${refreshKey}`} bulkTasks={bulkTasks} />
          </div>

          {/* Right Column: Task List & Bulk Tasks */}
          <div className="lg:col-span-4 space-y-8">
             <div className="flex flex-col h-[500px]">
                 <div className="flex items-center gap-2 mb-4">
                    <CheckSquare className="text-indigo-600" size={20}/>
                    <h2 className="text-lg font-semibold text-slate-800">Task Manager</h2>
                </div>
                <TaskList 
                    tasks={tasks} 
                    onToggle={handleToggleTask} 
                    onAdd={handleAddTask} 
                    onUpdate={handleUpdateTask}
                />
            </div>

            <div className="pt-2">
                 {/* Bulk Task Manager handles its own header */}
                <BulkTaskManager 
                    bulkTasks={bulkTasks} 
                    onUpdate={handleBulkUpdate} 
                />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center text-xs text-slate-400">
          <p>© 2024 TaskFlow Analytics. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <Database size={12} />
            <span>App Version {APP_VERSION}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;