import { Task, CompletionRecord, DailyPerformance, Frequency, BulkTask, SubTask, ActivityLog } from '../types';
import { getCurrentUser, isOfflineMode } from './auth';
import { supabase } from './supabase';

export const APP_VERSION = '1.3';
export const DB_SCHEMA_VERSION = 3;

// --- DATABASE INITIALIZATION ---
export const initializeDatabase = () => {
  console.log("Storage Initialized. Offline Mode:", isOfflineMode());
};

// Helper to generate a date key YYYY-MM-DD
export const getDateKey = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0];
};

// Check if a task is scheduled for a specific date
export const isTaskVisibleOnDate = (task: Task, date: Date): boolean => {
  const dateKey = getDateKey(date);
  
  switch (task.frequency) {
    case Frequency.DAILY:
      return true;
    case Frequency.WEEKLY:
      return task.weekDay !== undefined && date.getDay() === task.weekDay;
    case Frequency.MONTHLY:
      return task.monthDay !== undefined && date.getDate() === task.monthDay;
    case Frequency.ONCE:
      return task.scheduledDate === dateKey;
    default:
      return true;
  }
};

// --- LOCAL STORAGE HELPERS (OFFLINE MODE) ---
const LS_KEYS = {
    TASKS: 'tf_local_tasks',
    COMPLETIONS: 'tf_local_completions',
    BULK: 'tf_local_bulk',
    SUBTASKS: 'tf_local_subtasks',
    ACTIVITY: 'tf_local_activity'
};

const getLocal = <T>(key: string): T[] => {
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
        return [];
    }
};

const setLocal = (key: string, data: any[]) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// --- ACTIVITY LOGGING ---

export const getActivities = async (): Promise<ActivityLog[]> => {
  if (isOfflineMode()) {
      return getLocal<ActivityLog>(LS_KEYS.ACTIVITY).sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ).slice(0, 50);
  }

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(50);
    
  if (error) {
      console.error(error);
      return [];
  }

  return data.map((r: any) => ({
      id: r.id,
      user: r.user_name,
      action: r.action,
      targetType: r.target_type,
      targetTitle: r.target_title,
      timestamp: r.timestamp
  }));
};

const logActivity = async (
  action: ActivityLog['action'], 
  targetType: ActivityLog['targetType'], 
  targetTitle: string
) => {
  const user = getCurrentUser() || 'Unknown';
  const newLog = {
      id: crypto.randomUUID(),
      user_name: user,
      user: user, // local compatibility
      action,
      target_type: targetType,
      targetType, // local compatibility
      target_title: targetTitle,
      targetTitle, // local compatibility
      timestamp: new Date().toISOString()
  };

  if (isOfflineMode()) {
      const logs = getLocal<ActivityLog>(LS_KEYS.ACTIVITY);
      logs.push(newLog as any);
      setLocal(LS_KEYS.ACTIVITY, logs);
      return;
  }
  
  // Fire and forget
  await supabase.from('activity_log').insert([{
      user_name: user,
      action,
      target_type: targetType,
      target_title: targetTitle,
      timestamp: new Date().toISOString()
  }]);
};

// --- TASKS ---

export const getTasks = async (): Promise<Task[]> => {
  if (isOfflineMode()) {
      const tasks = getLocal<Task>(LS_KEYS.TASKS);
      const completions = await getCompletions();
      return tasks.map(t => ({
          ...t,
          isDoneToday: checkTaskStatus(t.id, completions)
      }));
  }

  const { data: tasks, error } = await supabase.from('tasks').select('*');
  if (error) {
      console.error(error);
      return [];
  }
  
  const completions = await getCompletions();
  
  return tasks.map((t: any) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    frequency: t.frequency as Frequency,
    createdAt: t.created_at,
    createdBy: t.created_by,
    scheduledDate: t.scheduled_date,
    weekDay: t.week_day,
    monthDay: t.month_day,
    isDoneToday: checkTaskStatus(t.id, completions)
  }));
};

export const addTask = async (task: Omit<Task, 'id' | 'createdAt' | 'isDoneToday' | 'createdBy'>): Promise<Task | null> => {
  const user = getCurrentUser() || 'User';

  if (isOfflineMode()) {
      const newTask: Task = {
          id: crypto.randomUUID(),
          title: task.title,
          description: task.description,
          frequency: task.frequency,
          createdAt: new Date().toISOString(),
          createdBy: user,
          scheduledDate: task.scheduledDate,
          weekDay: task.weekDay,
          monthDay: task.monthDay,
          isDoneToday: false
      };
      const tasks = getLocal<Task>(LS_KEYS.TASKS);
      tasks.push(newTask);
      setLocal(LS_KEYS.TASKS, tasks);
      logActivity('CREATED', 'TASK', task.title);
      return newTask;
  }
  
  const { data, error } = await supabase.from('tasks').insert([{
      title: task.title, 
      description: task.description, 
      frequency: task.frequency, 
      created_by: user,
      scheduled_date: task.scheduledDate || null, 
      week_day: task.weekDay !== undefined ? task.weekDay : null, 
      month_day: task.monthDay !== undefined ? task.monthDay : null
  }]).select().single();
  
  if (error || !data) {
      console.error(error);
      return null;
  }
  
  logActivity('CREATED', 'TASK', task.title);
  
  return {
      id: data.id,
      title: data.title,
      description: data.description,
      frequency: data.frequency as Frequency,
      createdAt: data.created_at,
      createdBy: data.created_by,
      scheduledDate: data.scheduled_date,
      weekDay: data.week_day,
      monthDay: data.month_day,
      isDoneToday: false
  };
};

export const updateTask = async (task: Task): Promise<void> => {
  if (isOfflineMode()) {
      const tasks = getLocal<Task>(LS_KEYS.TASKS);
      const index = tasks.findIndex(t => t.id === task.id);
      if (index !== -1) {
          tasks[index] = { ...tasks[index], ...task };
          setLocal(LS_KEYS.TASKS, tasks);
          logActivity('UPDATED', 'TASK', task.title);
      }
      return;
  }

  await supabase.from('tasks').update({
      title: task.title,
      description: task.description,
      frequency: task.frequency,
      scheduled_date: task.scheduledDate || null,
      week_day: task.weekDay !== undefined ? task.weekDay : null,
      month_day: task.monthDay !== undefined ? task.monthDay : null
  }).eq('id', task.id);
  
  logActivity('UPDATED', 'TASK', task.title);
};

export const deleteTask = async (taskId: string): Promise<void> => {
    if (isOfflineMode()) {
        // 1. Remove Task
        const tasks = getLocal<Task>(LS_KEYS.TASKS);
        const taskToDelete = tasks.find(t => t.id === taskId);
        const updatedTasks = tasks.filter(t => t.id !== taskId);
        setLocal(LS_KEYS.TASKS, updatedTasks);

        // 2. Remove associated completions (Clean up)
        const completions = getLocal<CompletionRecord>(LS_KEYS.COMPLETIONS);
        const updatedCompletions = completions.filter(c => c.taskId !== taskId);
        setLocal(LS_KEYS.COMPLETIONS, updatedCompletions);

        if (taskToDelete) {
            logActivity('DELETED', 'TASK', taskToDelete.title);
        }
        return;
    }

    // Supabase (Postgres with Cascade should handle completions, but being explicit is safer)
    // Fetch title first for logging
    const { data: task } = await supabase.from('tasks').select('title').eq('id', taskId).single();
    
    // Delete task (Foreign keys on 'completions' should be set to ON DELETE CASCADE in SQL, 
    // but if not, this might fail unless we delete completions first. 
    // Assuming standard schema setup or strict mode, let's just delete the task.)
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    
    if (error) {
        console.error("Error deleting task:", error);
    } else if (task) {
        logActivity('DELETED', 'TASK', task.title);
    }
};

export const getCompletions = async (): Promise<CompletionRecord[]> => {
  if (isOfflineMode()) {
      return getLocal<CompletionRecord>(LS_KEYS.COMPLETIONS);
  }

  const { data, error } = await supabase.from('completions').select('*');
  if (error) return [];

  return data.map((c: any) => ({
      taskId: c.task_id,
      completedAt: c.completed_at,
      dateKey: c.date_key,
      completedBy: c.completed_by
  }));
};

const checkTaskStatus = (taskId: string, completions: CompletionRecord[]): boolean => {
  const todayKey = getDateKey(new Date());
  const record = completions.find(c => c.taskId === taskId && c.dateKey === todayKey);
  return !!record;
};

export const toggleTaskStatus = async (taskId: string): Promise<void> => {
  const user = getCurrentUser() || 'User';
  const todayKey = getDateKey();
  
  let taskTitle = 'Unknown Task';

  if (isOfflineMode()) {
      const tasks = getLocal<Task>(LS_KEYS.TASKS);
      const task = tasks.find(t => t.id === taskId);
      taskTitle = task?.title || 'Unknown Task';

      const completions = getLocal<CompletionRecord>(LS_KEYS.COMPLETIONS);
      const existingIndex = completions.findIndex(c => c.taskId === taskId && c.dateKey === todayKey);

      if (existingIndex !== -1) {
          // UNDO
          completions.splice(existingIndex, 1);
          setLocal(LS_KEYS.COMPLETIONS, completions);
          logActivity('UNDO', 'TASK', taskTitle);
      } else {
          // DO
          completions.push({
              taskId,
              dateKey: todayKey,
              completedAt: new Date().toISOString(),
              completedBy: user
          });
          setLocal(LS_KEYS.COMPLETIONS, completions);
          logActivity('COMPLETED', 'TASK', taskTitle);
      }
      return;
  }

  // Supabase implementation
  const { data: task } = await supabase.from('tasks').select('title').eq('id', taskId).single();
  taskTitle = task?.title || 'Unknown Task';

  const { data: existing } = await supabase
    .from('completions')
    .select('id')
    .eq('task_id', taskId)
    .eq('date_key', todayKey)
    .single();

  if (existing) {
    // UNDO
    await supabase.from('completions').delete().eq('id', existing.id);
    logActivity('UNDO', 'TASK', taskTitle);
  } else {
    // DO
    await supabase.from('completions').insert([{
        task_id: taskId,
        date_key: todayKey,
        completed_by: user
    }]);
    logActivity('COMPLETED', 'TASK', taskTitle);
  }
};

export const getPerformanceHistory = async (days: number = 30): Promise<DailyPerformance[]> => {
  const history: DailyPerformance[] = [];
  const tasks = await getTasks();
  const completions = await getCompletions();
  const bulkTasks = await getBulkTasks();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = getDateKey(d);
    
    const visibleTasks = tasks.filter(t => isTaskVisibleOnDate(t, d));
    const recurringTotal = visibleTasks.length;
    
    const recurringDone = visibleTasks.filter(t => {
      return completions.some(c => c.taskId === t.id && c.dateKey === dateKey);
    }).length;

    let bulkDoneOnDate = 0;
    bulkTasks.forEach(bt => {
      bt.subTasks.forEach(st => {
         if (st.isCompleted && st.completedAt && getDateKey(new Date(st.completedAt)) === dateKey) {
           bulkDoneOnDate++;
         }
      });
    });

    const total = recurringTotal + bulkDoneOnDate;
    const completed = recurringDone + bulkDoneOnDate;
    
    history.push({
        date: dateKey,
        formattedDate: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        totalTasks: total,
        completedTasks: completed
    });
  }
  return history;
};

// --- BULK TASK FUNCTIONS ---

export const getBulkTasks = async (): Promise<BulkTask[]> => {
  if (isOfflineMode()) {
      const bulk = getLocal<any>(LS_KEYS.BULK);
      const subs = getLocal<any>(LS_KEYS.SUBTASKS);
      
      return bulk.map((b: any) => ({
        ...b,
        subTasks: subs.filter((s: any) => s.bulkTaskId === b.id)
      }));
  }

  const { data: bulkRows } = await supabase.from('bulk_tasks').select('*');
  const { data: subRows } = await supabase.from('sub_tasks').select('*');

  if (!bulkRows) return [];
  const subs = subRows || [];

  return bulkRows.map((b: any) => ({
      id: b.id,
      title: b.title,
      createdAt: b.created_at,
      createdBy: b.created_by,
      subTasks: subs
        .filter((s: any) => s.bulk_task_id === b.id)
        .map((s: any) => ({
            id: s.id,
            title: s.title,
            isCompleted: s.is_completed,
            completedAt: s.completed_at,
            completedBy: s.completed_by
        }))
  }));
};

export const addBulkTask = async (title: string, subTaskTitles: string[]): Promise<void> => {
  const user = getCurrentUser() || 'User';

  if (isOfflineMode()) {
      const bulkId = crypto.randomUUID();
      const newBulk = {
          id: bulkId,
          title,
          createdAt: new Date().toISOString(),
          createdBy: user
      };
      const bulkList = getLocal(LS_KEYS.BULK);
      bulkList.push(newBulk);
      setLocal(LS_KEYS.BULK, bulkList);

      const subList = getLocal(LS_KEYS.SUBTASKS);
      subTaskTitles.forEach(t => {
          subList.push({
              id: crypto.randomUUID(),
              bulkTaskId: bulkId,
              title: t,
              isCompleted: false,
              completedAt: null,
              completedBy: null
          });
      });
      setLocal(LS_KEYS.SUBTASKS, subList);
      logActivity('CREATED', 'PROJECT', title);
      return;
  }

  // 1. Create Bulk Task
  const { data: bulkTask, error } = await supabase.from('bulk_tasks').insert([{
      title,
      created_by: user
  }]).select().single();

  if (error || !bulkTask) {
      console.error("Error creating bulk task", error);
      return;
  }

  // 2. Create Sub Tasks
  const subTasksPayload = subTaskTitles.map(t => ({
      bulk_task_id: bulkTask.id,
      title: t,
      is_completed: false
  }));

  await supabase.from('sub_tasks').insert(subTasksPayload);
  
  logActivity('CREATED', 'PROJECT', title);
};

export const toggleBulkSubTask = async (bulkTaskId: string, subTaskId: string): Promise<void> => {
  const user = getCurrentUser() || 'User';

  if (isOfflineMode()) {
      const subs = getLocal<any>(LS_KEYS.SUBTASKS);
      const sub = subs.find(s => s.id === subTaskId);
      if (sub) {
          const newStatus = !sub.isCompleted;
          sub.isCompleted = newStatus;
          sub.completedAt = newStatus ? new Date().toISOString() : null;
          sub.completedBy = newStatus ? user : null;
          setLocal(LS_KEYS.SUBTASKS, subs);

          // Get project title
          const bulk = getLocal<any>(LS_KEYS.BULK).find(b => b.id === bulkTaskId);
          logActivity(newStatus ? 'COMPLETED' : 'UNDO', 'PROJECT', `${bulk?.title || 'Project'}: ${sub.title}`);
      }
      return;
  }

  // Get current status
  const { data: current } = await supabase.from('sub_tasks').select('*').eq('id', subTaskId).single();
  if (!current) return;

  const newStatus = !current.is_completed;
  const completedAt = newStatus ? new Date().toISOString() : null;
  const completedBy = newStatus ? user : null;

  await supabase.from('sub_tasks').update({
      is_completed: newStatus,
      completed_at: completedAt,
      completed_by: completedBy
  }).eq('id', subTaskId);
  
  // Get project title for log
  const { data: project } = await supabase.from('bulk_tasks').select('title').eq('id', bulkTaskId).single();
  const subTaskTitle = current.title;
  
  logActivity(
    newStatus ? 'COMPLETED' : 'UNDO', 
    'PROJECT', 
    `${project?.title || 'Project'}: ${subTaskTitle}`
  );
};

export const deleteBulkTask = async (bulkTaskId: string): Promise<void> => {
  if (isOfflineMode()) {
      const bulkList = getLocal<any>(LS_KEYS.BULK);
      const updatedBulk = bulkList.filter(b => b.id !== bulkTaskId);
      setLocal(LS_KEYS.BULK, updatedBulk);
      
      // Cleanup subs
      const subList = getLocal<any>(LS_KEYS.SUBTASKS);
      const updatedSubs = subList.filter(s => s.bulkTaskId !== bulkTaskId);
      setLocal(LS_KEYS.SUBTASKS, updatedSubs);

      logActivity('DELETED', 'PROJECT', 'Project Deleted');
      return;
  }

  const { data: project } = await supabase.from('bulk_tasks').select('title').eq('id', bulkTaskId).single();
  
  await supabase.from('bulk_tasks').delete().eq('id', bulkTaskId);
  
  if (project) {
    logActivity('DELETED', 'PROJECT', project.title);
  }
};