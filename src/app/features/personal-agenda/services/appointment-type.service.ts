import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../shared/api-base-url.token';
import { AppointmentType } from '../models/appointment-type.model';

@Injectable({ providedIn: 'root' })
export class AppointmentTypeService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  list(): Observable<AppointmentType[]> {
    return this.http.get<AppointmentType[]>(`${this.apiBaseUrl}/personal-appointment-types`);
  }
}
