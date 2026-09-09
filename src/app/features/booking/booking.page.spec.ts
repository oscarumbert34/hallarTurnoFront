import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { convertToParamMap } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { BookingPage } from './booking.page';
import { BookingService } from './booking.service';

describe('BookingPage', () => {
  let fixture: ComponentFixture<BookingPage>;
  let bookingService: {
    searchCustomerContact: ReturnType<typeof vi.fn>;
    createBooking: ReturnType<typeof vi.fn>;
    searchAvailability: ReturnType<typeof vi.fn>;
  };
  let authService: {
    isAuthenticated: boolean;
  };
  let route: {
    snapshot: {
      queryParamMap: ReturnType<typeof convertToParamMap>;
    };
  };

  beforeEach(async () => {
    bookingService = {
      searchCustomerContact: vi.fn(() =>
        of({
          emailRequired: false,
        }),
      ),
      createBooking: vi.fn(),
      searchAvailability: vi.fn(() => of([])),
    };
    authService = {
      isAuthenticated: false,
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
        { provide: AuthService, useValue: authService },
        { provide: ActivatedRoute, useValue: route },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingPage);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('should create a booking without requiring login', async () => {
    vi.useFakeTimers();
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
        setValue: (value: {
          customerName: string;
          customerPhone: string;
          customerEmail: string;
          skipCustomerContact: boolean;
        }) => void;
      };
      confirmBooking: () => void;
    };

    component.customerForm.setValue({
      customerName: 'Juan Gonzalez',
      customerPhone: '1124546622',
      customerEmail: '',
      skipCustomerContact: false,
    });
    await vi.advanceTimersByTimeAsync(300);
    component.confirmBooking();

    expect(bookingService.createBooking).toHaveBeenCalledWith({
      businessId: 'business-1',
      branchId: 'branch-1',
      serviceOfferingId: 'service-1',
      resourceId: undefined,
      date: '2026-08-17',
      startsAt: '10:00',
      customerName: 'Juan Gonzalez',
      customerPhone: '1124546622',
      skipCustomerContact: null,
    });
  });

  it('should normalize a phone copied from WhatsApp when it is pasted', () => {
    const component = fixture.componentInstance as unknown as {
      customerForm: { controls: { customerPhone: { value: string } } };
      normalizePastedPhone: (event: ClipboardEvent) => void;
    };
    const preventDefault = vi.fn();
    component.normalizePastedPhone({
      clipboardData: { getData: () => '+54 9 11 65684041' },
      preventDefault,
    } as unknown as ClipboardEvent);

    expect(preventDefault).toHaveBeenCalled();
    expect(component.customerForm.controls.customerPhone.value).toBe('1165684041');
  });

  it('should leave an already valid phone unchanged when it is pasted', () => {
    const component = fixture.componentInstance as unknown as {
      normalizePastedPhone: (event: ClipboardEvent) => void;
    };
    const preventDefault = vi.fn();
    component.normalizePastedPhone({
      clipboardData: { getData: () => '1165684041' },
      preventDefault,
    } as unknown as ClipboardEvent);

    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('should require and send customerEmail when emailRequired is true', async () => {
    vi.useFakeTimers();
    authService.isAuthenticated = true;
    bookingService.searchCustomerContact.mockReturnValue(of({ emailRequired: true }));
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
        patchValue: (value: {
          customerName?: string;
          customerPhone?: string;
          customerEmail?: string;
          skipCustomerContact?: boolean;
        }) => void;
      };
      emailRequired: () => boolean;
      confirmBooking: () => void;
    };

    component.customerForm.patchValue({
      customerName: 'Juan Gonzalez',
      customerPhone: '1124546622',
    });
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    expect(bookingService.searchCustomerContact).toHaveBeenCalledWith('business-1', '1124546622');
    expect(component.emailRequired()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Email');

    component.confirmBooking();

    expect(bookingService.createBooking).not.toHaveBeenCalled();

    component.customerForm.patchValue({ customerEmail: 'juan@example.com' });
    component.confirmBooking();

    expect(bookingService.createBooking).toHaveBeenCalledWith({
      businessId: 'business-1',
      branchId: 'branch-1',
      serviceOfferingId: 'service-1',
      resourceId: undefined,
      date: '2026-08-17',
      startsAt: '10:00',
      customerName: 'Juan Gonzalez',
      customerPhone: '1124546622',
      customerEmail: 'juan@example.com',
      skipCustomerContact: null,
    });
  });

  it('should skip customer contact creation when a new customer has no email', async () => {
    vi.useFakeTimers();
    authService.isAuthenticated = true;
    bookingService.searchCustomerContact.mockReturnValue(of({ emailRequired: true }));
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
        patchValue: (value: {
          customerName?: string;
          customerPhone?: string;
          customerEmail?: string;
          skipCustomerContact?: boolean;
        }) => void;
      };
      confirmBooking: () => void;
    };

    component.customerForm.patchValue({
      customerName: 'Juan Gonzalez',
      customerPhone: '1124546622',
    });
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No tengo el email del cliente');

    component.customerForm.patchValue({ skipCustomerContact: true });
    fixture.detectChanges();
    component.confirmBooking();

    expect(bookingService.createBooking).toHaveBeenCalledWith({
      businessId: 'business-1',
      branchId: 'branch-1',
      serviceOfferingId: 'service-1',
      resourceId: undefined,
      date: '2026-08-17',
      startsAt: '10:00',
      customerName: 'Juan Gonzalez',
      customerPhone: '1124546622',
      skipCustomerContact: true,
    });
  });

  it.each([true, false])(
    'should look up existing customers with authenticated=%s',
    async (authenticated) => {
      vi.useFakeTimers();
      authService.isAuthenticated = authenticated;
      const component = fixture.componentInstance as unknown as {
        customerForm: {
          patchValue: (value: {
            customerName?: string;
            customerPhone?: string;
            customerEmail?: string;
            skipCustomerContact?: boolean;
          }) => void;
        };
      };

      component.customerForm.patchValue({
        customerName: 'Juan Gonzalez',
        customerPhone: '1124546622',
      });
      await vi.advanceTimersByTimeAsync(300);
      fixture.detectChanges();

      expect(bookingService.searchCustomerContact).toHaveBeenCalledWith('business-1', '1124546622');
      expect(fixture.nativeElement.textContent).not.toContain('No tengo el email del cliente');
    },
  );

  it('should block confirmation when the email requirement cannot be retrieved', async () => {
    vi.useFakeTimers();
    bookingService.searchCustomerContact.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );
    const component = fixture.componentInstance as unknown as {
      customerForm: { patchValue: (value: { customerName: string; customerPhone: string }) => void };
      confirmBooking: () => void;
    };
    component.customerForm.patchValue({ customerName: 'Juan', customerPhone: '1124546622' });
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
    component.confirmBooking();
    expect(bookingService.createBooking).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('No pudimos');
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

  it('should return to the private search when the business user is authenticated', () => {
    authService.isAuthenticated = true;
    fixture = TestBed.createComponent(BookingPage);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      searchRoute: string;
    };

    expect(component.searchRoute).toBe('/search');
  });
});
