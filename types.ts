export enum Frequency {
  DAILY = 'Daily',
  WEEKLY = 'Weekly',
  MONTHLY = 'Monthly',
  ONCE = 'Once',
}

export interface Task {
  id: string;
  title: string;
  description: string;
  frequency: Frequency;
  createdAt: string; // ISO Date string
  createdBy: string; // Username of creator
  isDoneToday: boolean; // Computed property
  
  // Scheduling fields
  scheduledDate?: string; 
  weekDay?: number; 
  monthDay?: number; 
}

export interface CompletionRecord {
  taskId: string;
  completedAt: string; 
  dateKey: string; 
  completedBy?: string; // Username
}

export interface DailyPerformance {
  date: string; 
  formattedDate: string; 
  completionRate: number; 
  totalTasks: number;
  completedTasks: number;
}

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string; 
  completedBy?: string;
}

export interface BulkTask {
  id: string;
  title: string;
  createdAt: string;
  createdBy: string;
  subTasks: SubTask[];
}

export interface ActivityLog {
  id: string;
  user: string;
  action: 'CREATED' | 'COMPLETED' | 'UPDATED' | 'DELETED' | 'UNDO';
  targetType: 'TASK' | 'PROJECT';
  targetTitle: string;
  timestamp: string;
}
