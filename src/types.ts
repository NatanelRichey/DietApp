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
  documents: Document[];
  dailyLogs: Record<string, DailyLog>; // key: YYYY-MM-DD
}
