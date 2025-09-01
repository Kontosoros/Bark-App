export interface UserModel {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}

export interface NoteModel {
  id?: string;
  title: string;
  description: string;
  created_at: string | null;
  note_date?: string;
  reminder_from: Date | null;
  reminder_to: Date | null;
  calendar?: string | null;
  note_color?: string | null;
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
export interface Calendar {
  id?: string;
  title: string;
  description: string;
  color: string;

  showEye?: boolean;
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
