import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from '../../shared/api-url.service';
import { SKIP_AUTH } from '../auth/auth.interceptor';
import { AppointmentAction } from './appointment-action.models';

@Injectable({ providedIn: 'root' })
export class AppointmentActionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);

  get(token: string): Observable<AppointmentAction> {
    return this.http.get<AppointmentAction>(this.actionUrl(token), {
      context: this.publicContext(),
    });
  }

  confirm(token: string): Observable<AppointmentAction> {
    return this.http.post<AppointmentAction>(`${this.actionUrl(token)}/confirm`, null, {
      context: this.publicContext(),
    });
  }

  cancel(token: string): Observable<AppointmentAction> {
    return this.http.post<AppointmentAction>(`${this.actionUrl(token)}/cancel`, null, {
      context: this.publicContext(),
    });
  }

  private actionUrl(token: string): string {
    return this.apiUrl.build(`/public/appointments/actions/${encodeURIComponent(token)}`);
  }

  private publicContext(): HttpContext {
    return new HttpContext().set(SKIP_AUTH, true);
  }
}
