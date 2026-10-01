import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from '../../shared/api-url.service';
import { AuthService } from '../auth/auth.service';
import { EmailAddon, EmailPreferencesRequest, EmailStatus } from './business-emails.models';

@Injectable({ providedIn: 'root' })
export class BusinessEmailsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly auth = inject(AuthService);

  getStatus(): Observable<EmailStatus> {
    return this.http.get<EmailStatus>(this.endpoint);
  }

  updatePreferences(preferences: EmailPreferencesRequest): Observable<EmailStatus> {
    return this.http.put<EmailStatus>(`${this.endpoint}/preferences`, preferences);
  }

  selectAddon(addon: EmailAddon): Observable<EmailStatus> {
    return this.http.put<EmailStatus>(`${this.endpoint}/addon`, {
      addon,
      reason: 'Selección desde Mis correos',
    });
  }

  private get endpoint(): string {
    const businessId = this.auth.businessId;
    if (!businessId) throw new Error('Authenticated session has no businessId');
    return this.apiUrl.build(`/businesses/${businessId}/emails`);
  }
}
