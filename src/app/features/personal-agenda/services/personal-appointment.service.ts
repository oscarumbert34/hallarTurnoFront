import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../shared/api-base-url.token';
import { PersonalAppointment, PersonalAppointmentInput } from '../models/personal-appointment.model';

@Injectable({ providedIn: 'root' })
export class PersonalAppointmentService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly endpoint = `${this.apiBaseUrl}/personal-appointments`;

  list(): Observable<PersonalAppointment[]> {
    return this.http.get<PersonalAppointment[]>(this.endpoint);
  }

  get(id: number): Observable<PersonalAppointment> {
    return this.http.get<PersonalAppointment>(`${this.endpoint}/${id}`);
  }

  create(input: PersonalAppointmentInput): Observable<PersonalAppointment> {
    return this.http.post<PersonalAppointment>(this.endpoint, input);
  }

  update(id: number, input: PersonalAppointmentInput): Observable<PersonalAppointment> {
    return this.http.put<PersonalAppointment>(`${this.endpoint}/${id}`, input);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${id}`);
  }
}
