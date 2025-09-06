import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {
  mapAIPrediction,
  mapUser,
  mapUserRegistry,
} from '../repository/mappers/note.mapper';
import { User, UserModel } from '../repository/models/note.model';
import { map, Observable, pipe } from 'rxjs';

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
    const dto = mapUserRegistry(user);
    return this.http
      .post(`${this.apiUrl}/main/user/register/`, dto)
      .pipe(map((res) => mapUser(res)));
  }

  deleteNote(id: string | undefined): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/main/notes/delete/${id}/`,
      this.getHeaders()
    );
  }

  analyzeAudio(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post(
        `${this.apiUrl}/main/ai/analyze/`,
        formData,
        this.getHeadersForFileUpload()
      )
      .pipe(map((res) => mapAIPrediction(res)));
  }

  private getHeadersForFileUpload() {
    const token = localStorage.getItem('access');
    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type for FormData, let browser set it
      }),
    };
  }
}
