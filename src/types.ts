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

export interface UserData {
  weightHistory: WeightEntry[];
  dayPlans: Record<string, DayPlan>;
  activePlanId: string;
  documents: Document[];
}
