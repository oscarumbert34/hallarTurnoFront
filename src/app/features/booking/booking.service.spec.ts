import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../shared/api-base-url.token';
import { BookingService } from './booking.service';

describe('BookingService', () => {
  let service: BookingService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        BookingService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    });

    service = TestBed.inject(BookingService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should search public availability with filters', () => {
    service
      .searchAvailability({
        service: 'Corte',
        date: '2026-08-17',
        zone: 'Centro',
        timeFrom: '09:00',
        timeTo: '18:00',
      })
      .subscribe((results) => {
        expect(results.length).toBe(1);
        expect(results[0].businessName).toBe('Barberia pepito');
        expect(results[0].serviceName).toBe('Corte de pelo');
        expect(results[0].slots[0].id).toBe('service-1-resource-1-09:00:00');
      });

    const request = httpTesting.expectOne(
      '/api/public/availability?date=2026-08-17&locality=Centro&startsFrom=09:00&startsTo=18:00',
    );

    expect(request.request.method).toBe('GET');
    request.flush({
      page: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
      results: [
        {
          id: 'business-1',
          name: 'Barberia pepito',
          branches: [
            {
              id: 'branch-1',
              name: 'Sucursal Centro',
              address: 'Calle 1',
              locality: 'Centro',
              services: [
                {
                  id: 'service-1',
                  name: 'Corte de pelo',
                  durationMinutes: 30,
                  price: 5000,
                  slots: [
                    {
                      startsAt: '09:00:00',
                      endsAt: '09:30:00',
                      resourceId: 'resource-1',
                      resourceName: 'Juan Perez',
                    },
                  ],
                },
                {
                  id: 'service-2',
                  name: 'Afeitar barba',
                  durationMinutes: 15,
                  price: 2000,
                  slots: [],
                },
              ],
            },
          ],
        },
      ],
    });
  });

  it('should search public availability with a selected business', () => {
    service
      .searchAvailability({
        business: 'Barberia pepito',
        businessId: 'business-1',
        service: 'Corte',
        date: '2026-08-17',
        zone: 'Centro',
        timeFrom: '09:00',
        timeTo: '18:00',
      })
      .subscribe((results) => {
        expect(results).toEqual([]);
      });

    const request = httpTesting.expectOne(
      '/api/public/availability?date=2026-08-17&locality=Centro&startsFrom=09:00&startsTo=18:00&businessId=business-1',
    );

    expect(request.request.method).toBe('GET');
    request.flush({
      page: 0,
      size: 10,
      totalElements: 0,
      totalPages: 0,
      results: [],
    });
  });

  it('should list businesses for the search autocomplete', () => {
    service.listBusinesses().subscribe((businesses) => {
      expect(businesses).toEqual([
        {
          id: 'business-1',
          name: 'Barberia pepito',
          shortDescription: 'Cortes y barba',
          status: 'ACTIVE',
        },
      ]);
    });

    const request = httpTesting.expectOne('/api/businesses');

    expect(request.request.method).toBe('GET');
    request.flush([
      {
        id: 'business-1',
        name: 'Barberia pepito',
        shortDescription: 'Cortes y barba',
        status: 'ACTIVE',
      },
    ]);
  });

  it('should list service offerings for the search autocomplete', () => {
    service.listServiceOfferings('business-1').subscribe((serviceOfferings) => {
      expect(serviceOfferings).toEqual([
        {
          id: 'service-1',
          name: 'Corte de pelo',
          durationMinutes: 30,
          price: 5000,
          status: 'ACTIVE',
        },
      ]);
    });

    const request = httpTesting.expectOne('/api/businesses/business-1/service-offerings');

    expect(request.request.method).toBe('GET');
    request.flush({
      results: [
        {
          id: 'service-1',
          name: 'Corte de pelo',
          durationMinutes: 30,
          price: 5000,
          status: 'ACTIVE',
        },
      ],
    });
  });

  it('should create a booking', () => {
    const payload = {
      businessId: 'business-1',
      branchId: 'branch-1',
      serviceOfferingId: 'service-1',
      resourceId: 'resource-1',
      date: '2026-08-17',
      startsAt: '10:00',
      customerName: 'Juan Gonzalez',
      customerPhone: '+54 11 5555-5555',
    };

    service.createBooking(payload).subscribe((booking) => expect(booking.id).toBe('booking-1'));

    const request = httpTesting.expectOne('/api/public/bookings');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({
      id: 'booking-1',
      businessName: 'Turnos SA',
      serviceName: 'Corte',
      startsAt: '2026-08-17T10:00:00',
      status: 'CONFIRMED',
    });
  });

});
