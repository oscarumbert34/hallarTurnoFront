import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { BookingPage } from './booking.page';
import { BookingService } from './booking.service';

describe('BookingPage', () => {
  let fixture: ComponentFixture<BookingPage>;
  let bookingService: {
    getBusiness: ReturnType<typeof vi.fn>;
    createBooking: ReturnType<typeof vi.fn>;
    searchAvailability: ReturnType<typeof vi.fn>;
  };
  let route: {
    snapshot: {
      queryParamMap: ReturnType<typeof convertToParamMap>;
    };
  };

  beforeEach(async () => {
    bookingService = {
      getBusiness: vi.fn(() => of({ id: 'business-1', name: 'Turnos SA' })),
      createBooking: vi.fn(),
      searchAvailability: vi.fn(() => of([])),
    };
    route = {
      snapshot: {
        queryParamMap: convertToParamMap({
          businessId: 'business-1',
          businessName: 'Turnos SA',
          branchId: 'branch-1',
          branchName: 'Centro',
          serviceId: 'service-1',
          serviceName: 'Corte',
          slotId: 'slot-1',
          startsAt: '2026-08-17T10:00:00',
          price: '1200',
        }),
      },
    };

    await TestBed.configureTestingModule({
      imports: [BookingPage],
      providers: [
        { provide: BookingService, useValue: bookingService },
        { provide: ActivatedRoute, useValue: route },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingPage);
    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should create a booking without requiring login', () => {
    bookingService.createBooking.mockReturnValue(
      of({
        id: 'booking-1',
        businessName: 'Turnos SA',
        serviceName: 'Corte',
        startsAt: '2026-08-17T10:00:00',
        status: 'CONFIRMED',
      }),
    );
    const component = fixture.componentInstance as unknown as {
      customerForm: {
        setValue: (value: { customerName: string; customerPhone: string }) => void;
      };
      confirmBooking: () => void;
    };

    component.customerForm.setValue({
      customerName: 'Juan Gonzalez',
      customerPhone: '+54 11 5555-5555',
    });
    component.confirmBooking();

    expect(bookingService.createBooking).toHaveBeenCalledWith({
      businessId: 'business-1',
      branchId: 'branch-1',
      serviceOfferingId: 'service-1',
      resourceId: undefined,
      date: '2026-08-17',
      startsAt: '10:00',
      customerName: 'Juan Gonzalez',
      customerPhone: '+54 11 5555-5555',
    });
  });

  it('should recover the selected slot from storage when route params are missing', () => {
    route.snapshot.queryParamMap = convertToParamMap({});
    sessionStorage.setItem(
      'turnero.selectedSlot',
      JSON.stringify({
        businessId: 'business-1',
        businessName: 'Turnos SA',
        branchId: 'branch-1',
        branchName: 'Centro',
        serviceId: 'service-1',
        serviceName: 'Corte',
        slotId: 'slot-1',
        startsAt: '2026-08-17T10:00:00',
      }),
    );

    fixture = TestBed.createComponent(BookingPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Turnos SA');
    expect(fixture.nativeElement.textContent).toContain('Corte');
  });

  it('should show reservation times in 24-hour format', () => {
    const component = fixture.componentInstance as unknown as {
      dateLabel: (value: string) => string;
    };
    const label = component.dateLabel('2026-08-17T15:00:00');

    expect(label).toContain('15:00');
    expect(label).not.toMatch(/AM|PM/i);
  });
});
