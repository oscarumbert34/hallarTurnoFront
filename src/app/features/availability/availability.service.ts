import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from '../../shared/api-url.service';
import { AuthService } from '../auth/auth.service';
import { AvailabilityOverview } from './availability.models';

@Injectable({ providedIn: 'root' })
export class AvailabilityOverviewService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly auth = inject(AuthService);

  overview(filters: {
    branchId: string;
    serviceOfferingId: string;
    resourceId?: string;
    from: string;
    to: string;
  }): Observable<AvailabilityOverview> {
    const businessId = this.auth.businessId;
    if (!businessId) throw new Error('Authenticated session has no businessId');

    let params = new HttpParams()
      .set('branchId', filters.branchId)
      .set('serviceOfferingId', filters.serviceOfferingId)
      .set('from', filters.from)
      .set('to', filters.to);
    if (filters.resourceId) params = params.set('resourceId', filters.resourceId);

    return this.http.get<AvailabilityOverview>(
      this.apiUrl.build(`/businesses/${businessId}/availability/overview`),
      { params },
    );
  }
}
