import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../shared/api-base-url.token';
import { PlatformAdminService } from './platform-admin.service';

describe('PlatformAdminService', () => {
  let service: PlatformAdminService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PlatformAdminService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    });
    service = TestBed.inject(PlatformAdminService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('checks server-side access and updates its visibility state', () => {
    service.checkAccess().subscribe((response) => expect(response.allowed).toBe(true));
    const request = http.expectOne('/api/platform-admin/access');
    expect(request.request.method).toBe('GET');
    request.flush({ allowed: true });
    expect(service.allowed()).toBe(true);
  });

  it('lists businesses and changes the owner login email', () => {
    service.listBusinesses().subscribe();
    const list = http.expectOne('/api/platform-admin/businesses');
    expect(list.request.method).toBe('GET');
    list.flush([]);

    service.updateBusinessEmail('business-1', 'nuevo@example.com').subscribe();
    const update = http.expectOne('/api/platform-admin/businesses/business-1/email');
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body).toEqual({ email: 'nuevo@example.com' });
    update.flush({ id: 'business-1', ownerEmail: 'nuevo@example.com' });

    service.updateBusinessPassword('business-1', 'Segura#2026Password').subscribe();
    const passwordUpdate = http.expectOne('/api/platform-admin/businesses/business-1/password');
    expect(passwordUpdate.request.method).toBe('PATCH');
    expect(passwordUpdate.request.body).toEqual({ password: 'Segura#2026Password' });
    passwordUpdate.flush({ id: 'business-1', ownerEmail: 'nuevo@example.com' });

    service.updateBusinessFeatures('business-1', { productsEnabled: true, virtualQueueEnabled: false }).subscribe();
    const featuresUpdate = http.expectOne('/api/platform-admin/businesses/business-1/features');
    expect(featuresUpdate.request.method).toBe('PATCH');
    expect(featuresUpdate.request.body).toEqual({ productsEnabled: true, virtualQueueEnabled: false });
    featuresUpdate.flush({ id: 'business-1', features: { productsEnabled: true, virtualQueueEnabled: false } });
  });
});
