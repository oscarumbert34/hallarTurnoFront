import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { BusinessDashboardPage } from './business-dashboard.page';
import { BusinessDashboardService } from './business-dashboard.service';

describe('BusinessDashboardPage', () => {
  let fixture: ComponentFixture<BusinessDashboardPage>;
  let dashboardService: BusinessDashboardServiceMock;

  beforeEach(async () => {
    dashboardService = {
      listBranches: vi.fn(() =>
        of([{ id: 'branch-1', name: 'Centro', address: 'Calle 1', active: true }]),
      ),
      listServices: vi.fn(() =>
        of([{ id: 'service-1', name: 'Corte', durationMinutes: 30, price: 1200, active: true }]),
      ),
      listResources: vi.fn(() => of([])),
      listBookings: vi.fn(() => of([])),
      createBranch: vi.fn(),
      updateBranch: vi.fn(),
      deleteBranch: vi.fn(),
      createService: vi.fn(),
      updateService: vi.fn(),
      deleteService: vi.fn(),
      createResource: vi.fn(),
      updateResource: vi.fn(),
      deleteResource: vi.fn(),
      cancelBooking: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [BusinessDashboardPage],
      providers: [{ provide: BusinessDashboardService, useValue: dashboardService }],
    }).compileComponents();

    fixture = TestBed.createComponent(BusinessDashboardPage);
    fixture.detectChanges();
  });

  it('should load dashboard data on init', () => {
    expect(dashboardService.listBranches).toHaveBeenCalled();
    expect(dashboardService.listServices).toHaveBeenCalled();
    expect(dashboardService.listResources).toHaveBeenCalled();
    expect(dashboardService.listBookings).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Centro');
  });

  it('should create a branch and refresh dashboard data', () => {
    dashboardService.createBranch.mockReturnValue(
      of({ id: 'branch-2', name: 'Norte', address: 'Calle 2', phone: '', active: true }),
    );

    const component = fixture.componentInstance as unknown as {
      branchForm: {
        setValue: (value: {
          name: string;
          address: string;
          phone: string;
          active: boolean;
        }) => void;
      };
      saveBranch: () => void;
    };

    component.branchForm.setValue({
      name: 'Norte',
      address: 'Calle 2',
      phone: '',
      active: true,
    });
    component.saveBranch();

    expect(dashboardService.createBranch).toHaveBeenCalledWith({
      name: 'Norte',
      address: 'Calle 2',
      phone: '',
      active: true,
    });
    expect(dashboardService.listBranches).toHaveBeenCalledTimes(2);
  });

  it('should create a resource with selected service offerings', () => {
    dashboardService.createResource.mockReturnValue(
      of({
        id: 'resource-1',
        name: 'Sandra',
        branchId: 'branch-1',
        serviceOfferingIds: ['service-1'],
        weeklySchedule: [
          {
            dayOfWeek: 'MONDAY',
            intervals: [{ startsAt: '09:00', endsAt: '18:00' }],
          },
          {
            dayOfWeek: 'TUESDAY',
            intervals: [{ startsAt: '09:00', endsAt: '18:00' }],
          },
          {
            dayOfWeek: 'WEDNESDAY',
            intervals: [{ startsAt: '09:00', endsAt: '18:00' }],
          },
          {
            dayOfWeek: 'THURSDAY',
            intervals: [{ startsAt: '09:00', endsAt: '18:00' }],
          },
          {
            dayOfWeek: 'FRIDAY',
            intervals: [{ startsAt: '09:00', endsAt: '18:00' }],
          },
        ],
        active: true,
      }),
    );

    const component = fixture.componentInstance as unknown as {
      resourceForm: {
        setValue: (value: {
          name: string;
          branchId: string;
          serviceOfferingIds: string[];
          active: boolean;
        }) => void;
      };
      saveResource: () => void;
    };

    component.resourceForm.setValue({
      name: 'Sandra',
      branchId: 'branch-1',
      serviceOfferingIds: ['service-1'],
      active: true,
    });
    component.saveResource();

    expect(dashboardService.createResource).toHaveBeenCalledWith({
      name: 'Sandra',
      branchId: 'branch-1',
      serviceOfferingIds: ['service-1'],
      weeklySchedule: [
        {
          dayOfWeek: 'MONDAY',
          intervals: [{ startsAt: '09:00', endsAt: '18:00' }],
        },
        {
          dayOfWeek: 'TUESDAY',
          intervals: [{ startsAt: '09:00', endsAt: '18:00' }],
        },
        {
          dayOfWeek: 'WEDNESDAY',
          intervals: [{ startsAt: '09:00', endsAt: '18:00' }],
        },
        {
          dayOfWeek: 'THURSDAY',
          intervals: [{ startsAt: '09:00', endsAt: '18:00' }],
        },
        {
          dayOfWeek: 'FRIDAY',
          intervals: [{ startsAt: '09:00', endsAt: '18:00' }],
        },
      ],
      active: true,
    });
  });

  it('should hide loading when dashboard data finishes loading', async () => {
    const branches = new Subject<unknown[]>();
    dashboardService.listBranches.mockReturnValueOnce(branches.asObservable());
    dashboardService.listServices.mockReturnValueOnce(of([]));
    dashboardService.listResources.mockReturnValueOnce(of([]));

    fixture = TestBed.createComponent(BusinessDashboardPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cargando...');

    branches.next([{ id: 'branch-1', name: 'Centro', address: 'Calle 1', active: true }]);
    branches.complete();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Cargando...');
    expect(fixture.nativeElement.textContent).toContain('Centro');
  });

  it('should format booking rows without exposing technical ids', () => {
    const component = fixture.componentInstance as unknown as {
      bookingTitle: (booking: {
        customerName: string;
        serviceName: string;
      }) => string;
      bookingBranchName: (booking: { branchId?: string; branchName?: string }) => string;
      dateTimeLabel: (value: string) => string;
      statusLabel: (status: string) => string;
    };

    expect(
      component.bookingTitle({
        customerName: 'Sin nombre',
        serviceName: 'Afeitar barba',
      }),
    ).toBe('Afeitar barba');
    expect(component.dateTimeLabel('2026-08-26T15:00:00Z')).toContain('2026');
    expect(component.dateTimeLabel('2026-08-26T15:00:00Z')).not.toContain('T15:00:00Z');
    expect(component.bookingBranchName({ branchId: 'branch-1' })).toBe('Centro');
    expect(component.statusLabel('CONFIRMED')).toBe('Confirmada');
  });

  it('should keep the selected calendar day when setting the booking date', () => {
    const component = fixture.componentInstance as unknown as {
      bookingForm: {
        controls: {
          date: {
            value: Date;
          };
        };
      };
      setBookingDate: (value: Date) => void;
    };

    component.setBookingDate(new Date(2026, 7, 17));

    expect(component.bookingForm.controls.date.value.getFullYear()).toBe(2026);
    expect(component.bookingForm.controls.date.value.getMonth()).toBe(7);
    expect(component.bookingForm.controls.date.value.getDate()).toBe(17);
  });

  it('should request bookings with the selected calendar day as a local date string', () => {
    dashboardService.listBookings.mockClear();
    const component = fixture.componentInstance as unknown as {
      bookingForm: {
        controls: {
          date: {
            setValue: (value: Date) => void;
          };
        };
      };
      loadBookings: () => void;
    };

    component.bookingForm.controls.date.setValue(new Date(2026, 7, 28));
    component.loadBookings();

    expect(dashboardService.listBookings).toHaveBeenCalledWith('2026-08-28');
  });

  it('should expose customer name and phone for booking rows', () => {
    const component = fixture.componentInstance as unknown as {
      bookingTitle: (booking: {
        customerName: string;
        serviceName: string;
      }) => string;
      bookingCustomerPhone: (booking: { customerPhone?: string }) => string;
    };

    expect(
      component.bookingTitle({
        customerName: 'Juan Perez',
        serviceName: 'Masajes',
      }),
    ).toBe('Juan Perez · Masajes');
    expect(component.bookingCustomerPhone({ customerPhone: '+54 11 5555-1234' })).toBe(
      '+54 11 5555-1234',
    );
    expect(component.bookingCustomerPhone({})).toBe('Sin telefono');
  });

  it('should filter cancelled bookings from the active booking view', () => {
    const component = fixture.componentInstance as unknown as {
      bookings: {
        set: (
          value: Array<{
            id: string;
            customerName: string;
            serviceName: string;
            startsAt: string;
            status: string;
          }>,
        ) => void;
      };
      bookingForm: {
        controls: {
          status: {
            setValue: (value: 'ACTIVE' | 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'ALL') => void;
          };
        };
      };
      filteredBookings: () => Array<{ id: string }>;
    };

    component.bookings.set([
      {
        id: 'booking-active',
        customerName: 'Juan Perez',
        serviceName: 'Masajes',
        startsAt: '2026-08-22T12:00:00Z',
        status: 'CONFIRMED',
      },
      {
        id: 'booking-cancelled',
        customerName: 'Maria Gomez',
        serviceName: 'Masajes',
        startsAt: '2026-08-22T13:00:00Z',
        status: 'CANCELLED',
      },
    ]);

    expect(component.filteredBookings().map((booking) => booking.id)).toEqual(['booking-active']);

    component.bookingForm.controls.status.setValue('ALL');

    expect(component.filteredBookings().map((booking) => booking.id)).toEqual([
      'booking-active',
      'booking-cancelled',
    ]);
  });
});

type BusinessDashboardServiceMock = {
  [Key in keyof BusinessDashboardService]: ReturnType<typeof vi.fn>;
};
