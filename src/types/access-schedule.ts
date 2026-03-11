export interface AccessScheduleItem {
  id: string;
  schedule_id: string;
  day_of_week: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  created_at?: string;
}

export interface AccessSchedule {
  id: string;
  name: string;
  description?: string;
  notification_minutes: number;
  items: AccessScheduleItem[];
  created_at?: string;
  updated_at?: string;
}
