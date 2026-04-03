export interface Meal {
  id: string;
  name: string;
  time: string; // HH:mm
  calories: number;
  completed: boolean;
}

export interface DayPlan {
  type: 'Typical' | 'Shabbat' | string;
  meals: Meal[];
  guidelines: string;
}

export interface WeightEntry {
  date: string; // ISO
  weight: number;
}

export interface Document {
  id: string;
  name: string;
  content: string; // Markdown
}

// A daily log stores the actual eaten state per day (separate from templates)
export interface DailyLog {
  date: string;       // YYYY-MM-DD
  planId: string;     // which template was used
  meals: Meal[];      // snapshot with completed state
}

export interface UserData {
  weightHistory: WeightEntry[];
  dayPlans: Record<string, DayPlan>;
  activePlanId: string;
  weekSchedule: Record<number, string>; // 0=Sun … 6=Sat → planId
  documents: Document[];
  dailyLogs: Record<string, DailyLog>; // key: YYYY-MM-DD
}

export type BugStatus = 'pending' | 'solved' | 'archived';

export interface BugReport {
  id: string;
  report: string;
  deviceInfo: {
    viewportWidth: number;
    viewportHeight: number;
    userAgent: string;
    url: string;
  };
  imageUrl: string;
  user: string;
  timestamp: string;
  status: BugStatus;
}
