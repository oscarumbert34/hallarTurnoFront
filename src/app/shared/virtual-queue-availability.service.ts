import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { AuthService } from '../features/auth/auth.service';
import { ApiUrlService } from './api-url.service';

@Injectable({ providedIn: 'root' })
export class VirtualQueueAvailabilityService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly auth = inject(AuthService);
  private readonly enabledState = signal(false);

  readonly enabled = this.enabledState.asReadonly();

  refresh(): Observable<boolean> {
    const businessId = this.auth.businessId;
    if (!businessId) {
      this.enabledState.set(false);
      return of(false);
    }

    return this.http
      .get<{ virtualQueueEnabled?: boolean }>(
        this.apiUrl.build(`/businesses/${businessId}/configuration`),
      )
      .pipe(
        map((configuration) => configuration.virtualQueueEnabled === true),
        tap((enabled) => this.enabledState.set(enabled)),
        catchError(() => {
          this.enabledState.set(false);
          return of(false);
        }),
      );
  }

  setEnabled(enabled: boolean): void {
    this.enabledState.set(enabled);
  }
}
