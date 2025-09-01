import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  dtoNote,
  dtoUserRegistry,
  mapCalendar,
  mapNote,
  mapUser,
} from '../repository/mappers/note.mapper';
import {
  Calendar,
  Note,
  NoteModel,
  User,
  UserModel,
} from '../repository/models/note.model';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = environment.apiBaseUrl;
  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = localStorage.getItem('access');

    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }),
    };
  }
  register(user: UserModel): Observable<User> {
    const dto = dtoUserRegistry(user);
    return this.http
      .post(`${this.apiUrl}/main/user/register/`, dto)
      .pipe(map((res) => mapUser(res)));
  }

  saveNote(note: Note): Observable<Note> {
    const dto = dtoNote(note);
    return this.http
      .post(`${this.apiUrl}/main/notes/`, dto, this.getHeaders())
      .pipe(map((res) => mapNote(res)));
  }

  deleteNote(id: string | undefined): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/main/notes/delete/${id}/`,
      this.getHeaders()
    );
  }

  getNotes(): Observable<Note[]> {
    return this.http
      .get<NoteModel[]>(`${this.apiUrl}/main/notes/`, this.getHeaders())
      .pipe(map((res) => res.map((note) => mapNote(note))));
  }

  createCalendar(calendar: Calendar) {
    return this.http.post(
      `${this.apiUrl}/main/calendars/`,
      calendar,
      this.getHeaders()
    );
  }

  getCalendars(): Observable<Calendar[]> {
    return this.http
      .get<Calendar[]>(`${this.apiUrl}/main/all-calendars/`, this.getHeaders())
      .pipe(map((res) => res.map((calendar) => mapCalendar(calendar))));
  }

  updateNote(note: Note) {
    const dto = dtoNote(note);
    return this.http.put(
      `${this.apiUrl}/main/notes/update/${note.id}/`,
      dto,
      this.getHeaders()
    );
  }

  deleteCalendar(id: number | undefined): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/main/calendars/delete/${id}/`,
      this.getHeaders()
    );
  }
  updateCalendar(calendar: Calendar) {
    return this.http.put(
      `${this.apiUrl}/main/calendars/update/${calendar.id}/`,
      calendar,
      this.getHeaders()
    );
  }
  getUsers(): Observable<string[]> {
    return this.http.get<string[]>(
      `${this.apiUrl}/main/users/`,
      this.getHeaders()
    );
  }
}
