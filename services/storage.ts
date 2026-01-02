import { Task, CompletionRecord, DailyPerformance, Frequency, BulkTask, SubTask, ActivityLog } from '../types';
import { getCurrentUser } from './auth';
import { supabase } from './supabase';

export const APP_VERSION = '1.2';
export const DB_SCHEMA_VERSION = 3;

// --- DATABASE INITIALIZATION ---
export const initializeDatabase = () => {
  // Supabase is initialized in services/supabase.ts
  console.log("Supabase Client Initialized");
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

// --- ACTIVITY LOGGING ---

export const getActivities = async (): Promise<ActivityLog[]> => {
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

export const getCompletions = async (): Promise<CompletionRecord[]> => {
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
  // Retrieve task details for log
  const { data: task } = await supabase.from('tasks').select('title').eq('id', taskId).single();
  const taskTitle = task?.title || 'Unknown Task';

  const user = getCurrentUser() || 'User';
  const todayKey = getDateKey();
  
  // Check if completed
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
  // Get current status
  const { data: current } = await supabase.from('sub_tasks').select('*').eq('id', subTaskId).single();
  if (!current) return;

  const newStatus = !current.is_completed;
  const user = getCurrentUser() || 'User';
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
  const { data: project } = await supabase.from('bulk_tasks').select('title').eq('id', bulkTaskId).single();
  
  // Supabase CASCADE delete handles sub_tasks if configured, but let's be safe or assume schema handles it
  await supabase.from('bulk_tasks').delete().eq('id', bulkTaskId);
  
  if (project) {
    logActivity('DELETED', 'PROJECT', project.title);
  }
}
