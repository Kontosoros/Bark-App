export interface UserModel {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface AIPrediction {
  timestamp: string;
  prediction: string;
  confidence: number;
}
export interface CalendarModel {
  id?: string;
  title: string;
  description: string;
  color: string;
}
export interface User {
  userName: string;
}

export interface Note {
  date?: string;
  title: string;
  id?: string;
  description: string;
  createdAt: string | null;
  backgroundColor?: string;
  reminderFrom: string | null;
  reminderTo: string | null;
  calendarId?: string;
}
