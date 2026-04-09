export interface MealItem {
  id: string;
  name: string;
  calories: number;
  protein?: number;
}

export interface Meal {
  id: string;
  name: string;
  time: string; // HH:mm
  calories: number;
  protein?: number; // grams
  items?: MealItem[]; // optional food items; when present, calories/protein are summed from these
  completed: boolean;
  templateId?: string; // set when added from a saved meal template; used to propagate template edits
}

export interface WorkoutDay {
  gym:    boolean;
  cardio: boolean;
  walk:   boolean;
  notes:  string;
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
  content: string;
  isMarkdown?: boolean; // default true for backwards compat
}

// A daily log stores the actual eaten state per day (separate from templates)
export interface DailyLog {
  date: string;       // YYYY-MM-DD
  planId: string;     // which template was used
  meals: Meal[];      // snapshot with completed state
}

export interface SavedMealTemplate {
  id: string;
  name: string;
  time: string;
  calories: number;
  protein?: number;
  items?: MealItem[];
}

export interface ChartSegment {
  id: string;
  label: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  color: string;
}

export interface ChartMilestone {
  id: string;
  label: string;
  date: string; // YYYY-MM-DD
  targetWeight?: number; // kg — when set, on-track analysis is shown
}

export interface UserData {
  weightHistory: WeightEntry[];
  dayPlans: Record<string, DayPlan>;
  activePlanId: string;
  weekSchedule: Record<number, string>; // 0=Sun … 6=Sat → planId
  workoutSchedule?: Record<number, WorkoutDay>; // 0=Sun … 6=Sat
  savedMealTemplates?: SavedMealTemplate[];
  tdee?: number; // user-overridable TDEE (kcal/day)
  documents: Document[];
  dailyLogs: Record<string, DailyLog>; // key: YYYY-MM-DD
  simCart?: SimCartData;
  chartSegments?: ChartSegment[];
  chartMilestones?: ChartMilestone[];
}

// ─── SimCart Types ────────────────────────────────────────────────────────────

export type SimMealSlotType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface SimFoodItem {
  id: string;
  name: string;
}

export interface SimMealItem {
  id: string;
  name: string;
  quantity?: string;
}

export interface SimMealEntry {
  id: string;
  slotType: SimMealSlotType;
  snackIndex?: number; // 1, 2, 3... for snacks
  addedAt: string;     // ISO — when the slot button was pressed
  items: SimMealItem[];
  savedMealId?: string;
}

export interface SimSavedMeal {
  id: string;
  name: string;
  items: SimMealItem[];
  createdAt: string;
}

export interface SimDailyLog {
  date: string; // YYYY-MM-DD
  entries: SimMealEntry[]; // stored in display order
}

export interface SimCartData {
  foodItems: SimFoodItem[];            // global food library (autocomplete)
  savedMeals: SimSavedMeal[];          // named meal library
  dailyLogs: Record<string, SimDailyLog>; // YYYY-MM-DD → log
}

// ─────────────────────────────────────────────────────────────────────────────

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
