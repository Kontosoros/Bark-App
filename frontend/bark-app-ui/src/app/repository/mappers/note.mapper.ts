import {
  Calendar,
  CalendarModel,
  Note,
  NoteModel,
  User,
  UserModel,
} from '../models/note.model';

export function dtoUserRegistry(user: any): UserModel {
  return {
    username: user.name,
    email: user.email,
    password: user.password,
    confirm_password: user.confirmPassword,
  };
}

export function dtoNote(note: any): NoteModel {
  return {
    title: note.title,
    description: note.description,
    created_at: note.createdAt,
    note_date: note.note_date,
    reminder_from: note.reminderFrom ? new Date(note.reminderFrom) : null,
    reminder_to: note.reminderTo ? new Date(note.reminderTo) : null,
    calendar: note.calendarId,
    note_color: note.backgroundColor,
  };
}
export function mapUser(user: any): User {
  return {
    userName: user.username,
    
  };
}

export function mapNote(note: any): Note {
  return {
    id: note.id,
    title: note.title,
    description: note.description,
    createdAt: note.created_at,
    date: note.note_date,
    reminderFrom: note.reminder_from,
    reminderTo: note.reminder_to,
    calendarId: note.calendar,
    backgroundColor: note.note_color,
  };
}

export function mapCalendar(calendar: CalendarModel): Calendar {
  return {
    ...calendar,
  };
}
