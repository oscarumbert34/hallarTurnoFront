import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap } from 'rxjs';
import { ApiUrlService } from '../../shared/api-url.service';

export interface PlatformBusiness {
  id: string;
  name: string;
  slug: string;
  contactEmail: string | null;
  ownerEmail: string;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class PlatformAdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  readonly allowed = signal(false);

  checkAccess(): Observable<{ allowed: boolean }> {
    return this.http.get<{ allowed: boolean }>(this.apiUrl.build('/platform-admin/access')).pipe(
      tap((response) => this.allowed.set(response.allowed)),
      catchError(() => {
        this.allowed.set(false);
        return of({ allowed: false });
      }),
    );
  }

  listBusinesses(): Observable<PlatformBusiness[]> {
    return this.http.get<PlatformBusiness[]>(this.apiUrl.build('/platform-admin/businesses'));
  }

  updateBusinessEmail(businessId: string, email: string): Observable<PlatformBusiness> {
    return this.http.patch<PlatformBusiness>(
      this.apiUrl.build(`/platform-admin/businesses/${businessId}/email`),
      { email },
    );
  }
}
