import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../shared/api-base-url.token';
import { AuthService } from '../auth/auth.service';
import { BusinessDashboardService } from './business-dashboard.service';

describe('BusinessDashboardService', () => {
  const businessId = 'e0482e03-8902-46ba-a9e2-04994f601afe';
  let service: BusinessDashboardService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        BusinessDashboardService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
        { provide: AuthService, useValue: { businessId } },
      ],
    });

    service = TestBed.inject(BusinessDashboardService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('should create a branch through the business API', () => {
    const payload = {
      name: 'Centro',
      address: 'Calle 1',
      locality: 'Los Polvorines',
      province: 'Buenos Aires',
      country: 'Argentina',
      latitude: -35.6037,
      longitude: -58.3816,
      zoneId: 'America/Argentina/Buenos_Aires',
      weeklySchedule: [
        {
          dayOfWeek: 'MONDAY' as const,
          intervals: [{ opensAt: '09:00', closesAt: '14:00' }],
        },
      ],
      active: true,
    };

    service.createBranch(payload).subscribe((branch) => {
      expect(branch.id).toBe('branch-1');
    });

    const request = httpTesting.expectOne(`/api/businesses/${businessId}/branches`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'Centro',
      address: 'Calle 1',
      locality: 'Los Polvorines',
      province: 'Buenos Aires',
      country: 'Argentina',
      latitude: -35.6037,
      longitude: -58.3816,
      zoneId: 'America/Argentina/Buenos_Aires',
      status: 'ACTIVE',
      weeklySchedule: [
        {
          dayOfWeek: 'MONDAY',
          intervals: [{ opensAt: '09:00', closesAt: '14:00' }],
        },
      ],
    });

    request.flush({ id: 'branch-1', status: 'ACTIVE', ...payload });
  });

  it('should list branches from paginated API responses', () => {
    service.listBranches().subscribe((branches) => {
      expect(branches).toEqual([
        {
          id: 'branch-1',
          name: 'Centro',
          address: 'Calle 1',
          locality: 'Los Polvorines',
          province: 'Buenos Aires',
          country: 'Argentina',
          latitude: -35.6037,
          longitude: -58.3816,
          zoneId: 'America/Argentina/Buenos_Aires',
          weeklySchedule: [],
          active: true,
        },
      ]);
    });

    const request = httpTesting.expectOne(`/api/businesses/${businessId}/branches`);
    expect(request.request.method).toBe('GET');

    request.flush({
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      results: [
        {
          id: 'branch-1',
          name: 'Centro',
          address: 'Calle 1',
          locality: 'Los Polvorines',
          province: 'Buenos Aires',
          country: 'Argentina',
          latitude: -35.6037,
          longitude: -58.3816,
          zoneId: 'America/Argentina/Buenos_Aires',
          weeklySchedule: [],
          status: 'ACTIVE',
        },
      ],
    });
  });

  it('should create a service offering through the business API', () => {
    const payload = {
      name: 'Corte',
      branchId: 'branch-1',
      durationMinutes: 30,
      price: 1200,
      active: true,
    };

    service.createService(payload).subscribe((serviceOffering) => {
      expect(serviceOffering.id).toBe('service-1');
      expect(serviceOffering.branchId).toBe('branch-1');
    });

    const request = httpTesting.expectOne(`/api/businesses/${businessId}/service-offerings`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'Corte',
      branchId: 'branch-1',
      durationMinutes: 30,
      price: 1200,
      status: 'ACTIVE',
    });

    request.flush({
      id: 'service-1',
      name: 'Corte',
      branchId: 'branch-1',
      durationMinutes: 30,
      price: 1200,
      status: 'ACTIVE',
    });
  });

  it('should read service branches from alternate API response shapes', () => {
    service.listServices().subscribe((services) => {
      expect(services.map((item) => item.branchId)).toEqual(['branch-1', 'branch-2', 'branch-3']);
    });

    const request = httpTesting.expectOne(`/api/businesses/${businessId}/service-offerings`);
    request.flush({
      results: [
        {
          id: 'service-1',
          name: 'Corte',
          branchId: 'branch-1',
          durationMinutes: 30,
          status: 'ACTIVE',
        },
        {
          id: 'service-2',
          name: 'Color',
          branch: { id: 'branch-2' },
          durationMinutes: 45,
          status: 'ACTIVE',
        },
        {
          id: 'service-3',
          name: 'Peinado',
          branches: [{ id: 'branch-3' }],
          durationMinutes: 60,
          status: 'ACTIVE',
        },
      ],
    });
  });

  it('should list only active service offerings', () => {
    service.listServices().subscribe((services) => {
      expect(services.map((item) => item.id)).toEqual(['service-active']);
    });

    const request = httpTesting.expectOne(`/api/businesses/${businessId}/service-offerings`);
    request.flush({
      results: [
        {
          id: 'service-active',
          name: 'Corte',
          branchId: 'branch-1',
          durationMinutes: 30,
          status: 'ACTIVE',
        },
        {
          id: 'service-inactive',
          name: 'Color',
          branchId: 'branch-1',
          durationMinutes: 45,
          status: 'INACTIVE',
        },
      ],
    });
  });

  it('should update and delete service offerings through the service endpoint', () => {
    const payload = {
      name: 'Corte',
      branchId: 'branch-1',
      durationMinutes: 30,
      price: 1200,
      active: true,
    };

    service.updateService('service-1', payload).subscribe((serviceOffering) => {
      expect(serviceOffering.id).toBe('service-1');
    });

    const updateRequest = httpTesting.expectOne('/api/service-offerings/service-1');
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body).toEqual({
      name: 'Corte',
      branchId: 'branch-1',
      durationMinutes: 30,
      price: 1200,
      status: 'ACTIVE',
    });
    updateRequest.flush({ id: 'service-1', ...payload, status: 'ACTIVE' });

    service.deleteService('service-1').subscribe();

    const deleteRequest = httpTesting.expectOne('/api/service-offerings/service-1');
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush(null);
  });

  it('should create a resource through the branch API', () => {
    const payload = {
      name: 'Sandra',
      branchId: 'branch-1',
      serviceOfferingIds: ['service-1'],
      weeklySchedule: [
        {
          dayOfWeek: 'MONDAY' as const,
          intervals: [{ startsAt: '09:00', endsAt: '18:00' }],
        },
      ],
      active: true,
    };

    service.createResource(payload).subscribe((resource) => {
      expect(resource.id).toBe('resource-1');
    });

    const request = httpTesting.expectOne('/api/branches/branch-1/resources');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      visibleName: 'Sandra',
      type: 'EMPLOYEE',
      status: 'ACTIVE',
      serviceOfferingIds: ['service-1'],
      weeklySchedule: [
        {
          dayOfWeek: 'MONDAY',
          intervals: [{ startsAt: '09:00', endsAt: '18:00' }],
        },
      ],
      absences: [],
    });

    request.flush({
      id: 'resource-1',
      branchId: 'branch-1',
      visibleName: 'Sandra',
      type: 'EMPLOYEE',
      status: 'ACTIVE',
      serviceOfferingIds: ['service-1'],
      weeklySchedule: [
        {
          dayOfWeek: 'MONDAY',
          intervals: [{ startsAt: '09:00', endsAt: '18:00' }],
        },
      ],
      absences: [],
    });
  });

  it('should update and delete resources through the resource API', () => {
    const payload = {
      name: 'Sandra',
      branchId: 'branch-1',
      serviceOfferingIds: ['service-1', 'service-2'],
      weeklySchedule: [
        {
          dayOfWeek: 'TUESDAY' as const,
          intervals: [{ startsAt: '10:00', endsAt: '16:00' }],
        },
      ],
      active: false,
    };

    service.updateResource('resource-1', payload).subscribe((resource) => {
      expect(resource.id).toBe('resource-1');
      expect(resource.active).toBe(false);
    });

    const updateRequest = httpTesting.expectOne('/api/resources/resource-1');
    expect(updateRequest.request.method).toBe('PUT');
    expect(updateRequest.request.body).toEqual({
      visibleName: 'Sandra',
      type: 'EMPLOYEE',
      status: 'INACTIVE',
      serviceOfferingIds: ['service-1', 'service-2'],
      weeklySchedule: [
        {
          dayOfWeek: 'TUESDAY',
          intervals: [{ startsAt: '10:00', endsAt: '16:00' }],
        },
      ],
      absences: [],
    });

    updateRequest.flush({
      id: 'resource-1',
      branchId: 'branch-1',
      visibleName: 'Sandra',
      type: 'EMPLOYEE',
      status: 'INACTIVE',
      serviceOfferingIds: ['service-1', 'service-2'],
      weeklySchedule: [
        {
          dayOfWeek: 'TUESDAY',
          intervals: [{ startsAt: '10:00', endsAt: '16:00' }],
        },
      ],
      absences: [],
    });

    service.deleteResource('branch-1', 'resource-1').subscribe();

    const deleteRequest = httpTesting.expectOne('/api/resources/resource-1');
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush(null);
  });

  it('should request bookings by selected date', () => {
    service.listBookings('2026-08-17').subscribe((bookings) => {
      expect(bookings[0].customerName).toBe('Juan Perez');
      expect(bookings[0].customerPhone).toBe('+54 11 5555-1234');
      expect(bookings[0].serviceName).toBe('Afeitar barba');
      expect(bookings[0].branchId).toBe('branch-1');
      expect(bookings[1].customerName).toBe('Maria Gomez');
      expect(bookings[1].customerPhone).toBe('1133334444');
    });

    const request = httpTesting.expectOne(
      `/api/businesses/${businessId}/bookings?date=2026-08-17&page=0&size=20`,
    );
    expect(request.request.method).toBe('GET');

    request.flush({
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      results: [
        {
          id: 'booking-1',
          customerId: 'customer-1',
          customerName: 'Juan Perez',
          customerPhone: '+54 11 5555-1234',
          serviceName: 'Afeitar barba',
          resourceName: 'Felipe Fernandez',
          branchId: 'branch-1',
          startsAt: '2026-08-26T15:00:00Z',
          status: 'CONFIRMED',
        },
        {
          id: 'booking-2',
          customerNameSnapshot: 'Maria Gomez',
          customerPhoneSnapshot: '1133334444',
          serviceName: 'Corte',
          branchId: 'branch-1',
          startsAt: '2026-08-26T16:00:00Z',
          status: 'CONFIRMED',
        },
      ],
    });
  });

  it('should expose booking pagination metadata', () => {
    service.listBookingsPage('2026-08-17', 1, 50).subscribe((page) => {
      expect(page.page).toBe(1);
      expect(page.size).toBe(50);
      expect(page.maxSize).toBe(50);
      expect(page.totalElements).toBe(75);
      expect(page.totalPages).toBe(2);
      expect(page.hasMore).toBe(false);
      expect(page.results[0].id).toBe('booking-51');
    });

    const request = httpTesting.expectOne(
      `/api/businesses/${businessId}/bookings?date=2026-08-17&page=1&size=50`,
    );
    expect(request.request.method).toBe('GET');

    request.flush({
      page: 1,
      size: 50,
      maxSize: 50,
      totalElements: 75,
      totalPages: 2,
      hasMore: false,
      sort: 'startsAt:asc,id:asc',
      results: [
        {
          id: 'booking-51',
          customerName: 'Juan Perez',
          customerPhone: '+54 11 5555-1234',
          serviceName: 'Afeitar barba',
          branchName: 'Centro',
          startsAt: '2026-08-17T15:00:00',
          status: 'CONFIRMED',
        },
      ],
    });
  });

  it('should cancel bookings through the cancel endpoint', () => {
    service.cancelBooking('booking-1').subscribe((booking) => {
      expect(booking.status).toBe('CANCELLED');
    });

    const request = httpTesting.expectOne('/api/bookings/booking-1/cancel');
    expect(request.request.method).toBe('POST');

    request.flush({
      id: 'booking-1',
      customerName: 'Cliente',
      serviceName: 'Corte',
      startsAt: '2026-08-17T10:00:00',
      status: 'CANCELLED',
    });
  });
});
