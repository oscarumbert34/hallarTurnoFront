import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../shared/api-base-url.token';
import { AuthService } from '../auth/auth.service';
import { AvailabilityOverviewService } from './availability.service';

describe('AvailabilityOverviewService', () => {
  let service: AvailabilityOverviewService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AvailabilityOverviewService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        { provide: AuthService, useValue: { businessId: 'business-1' } },
      ],
    });
    service = TestBed.inject(AvailabilityOverviewService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests one bounded weekly overview with the selected filters', () => {
    service
      .overview({
        branchId: 'branch-1',
        serviceOfferingId: 'service-1',
        resourceId: 'resource-1',
        from: '2026-11-09',
        to: '2026-11-15',
      })
      .subscribe();

    const request = http.expectOne(
      (candidate) => candidate.url === '/api/businesses/business-1/availability/overview',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('branchId')).toBe('branch-1');
    expect(request.request.params.get('serviceOfferingId')).toBe('service-1');
    expect(request.request.params.get('resourceId')).toBe('resource-1');
    expect(request.request.params.get('from')).toBe('2026-11-09');
    expect(request.request.params.get('to')).toBe('2026-11-15');
    request.flush({ days: [] });
  });
});
