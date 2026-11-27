import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../../shared/api-base-url.token';
import { AgendaShare } from '../models/agenda-share.model';

@Injectable({ providedIn: 'root' })
export class AgendaSharingService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${inject(API_BASE_URL)}/personal-agenda/sharing`;
  list(): Observable<AgendaShare[]> { return this.http.get<AgendaShare[]>(this.endpoint); }
  invite(email: string): Observable<AgendaShare> { return this.http.post<AgendaShare>(`${this.endpoint}/invitations`, { email }); }
  accept(id: number): Observable<AgendaShare> { return this.http.post<AgendaShare>(`${this.endpoint}/invitations/${id}/accept`, {}); }
  reject(id: number): Observable<AgendaShare> { return this.http.post<AgendaShare>(`${this.endpoint}/invitations/${id}/reject`, {}); }
  cancel(id: number): Observable<void> { return this.http.delete<void>(`${this.endpoint}/invitations/${id}`); }
  unlink(id: number): Observable<void> { return this.http.delete<void>(`${this.endpoint}/links/${id}`); }
}
