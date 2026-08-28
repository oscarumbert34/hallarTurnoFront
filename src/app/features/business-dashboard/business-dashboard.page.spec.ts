import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
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
        of([
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
        ]),
      ),
      listServices: vi.fn(() =>
        of([
          {
            id: 'service-1',
            name: 'Corte',
            branchId: 'branch-1',
            durationMinutes: 30,
            price: 1200,
            active: true,
          },
          {
            id: 'service-2',
            name: 'Color',
            branchId: 'branch-2',
            durationMinutes: 45,
            price: 2500,
            active: true,
          },
        ]),
      ),
      listResources: vi.fn(() => of([])),
      listBookings: vi.fn(() => of([])),
      listBookingsPage: vi.fn(() =>
        of({
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
          hasMore: false,
          results: [],
        }),
      ),
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
      providers: [
        { provide: BusinessDashboardService, useValue: dashboardService },
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BusinessDashboardPage);
    fixture.detectChanges();
  });

  it('should load dashboard data on init', () => {
    expect(dashboardService.listBranches).toHaveBeenCalled();
    expect(dashboardService.listServices).toHaveBeenCalled();
    expect(dashboardService.listResources).toHaveBeenCalled();
    expect(dashboardService.listBookingsPage).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Centro');
  });

  it('should keep entity forms collapsed until create or edit is selected', () => {
    const component = fixture.componentInstance as unknown as {
      branchFormExpanded: () => boolean;
      serviceFormExpanded: () => boolean;
      resourceFormExpanded: () => boolean;
      startCreateBranch: () => void;
      startCreateService: () => void;
      startCreateResource: () => void;
      resetBranchForm: () => void;
      resetServiceForm: () => void;
      resetResourceForm: () => void;
    };

    expect(component.branchFormExpanded()).toBe(false);
    expect(component.serviceFormExpanded()).toBe(false);
    expect(component.resourceFormExpanded()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Crear sucursal');

    component.startCreateBranch();
    component.startCreateService();
    component.startCreateResource();

    expect(component.branchFormExpanded()).toBe(true);
    expect(component.serviceFormExpanded()).toBe(true);
    expect(component.resourceFormExpanded()).toBe(true);

    component.resetBranchForm();
    component.resetServiceForm();
    component.resetResourceForm();

    expect(component.branchFormExpanded()).toBe(false);
    expect(component.serviceFormExpanded()).toBe(false);
    expect(component.resourceFormExpanded()).toBe(false);
  });

  it('should expand the matching form when editing an existing entity', () => {
    const component = fixture.componentInstance as unknown as {
      branchFormExpanded: () => boolean;
      serviceFormExpanded: () => boolean;
      resourceFormExpanded: () => boolean;
      editingBranchId: () => string;
      editingServiceId: () => string;
      editingResourceId: () => string;
      editBranch: (branch: {
        id: string;
        name: string;
        address: string;
        locality: string;
        province: string;
        country: string;
        latitude: number;
        longitude: number;
        zoneId: string;
        weeklySchedule: [];
        active: boolean;
      }) => void;
      editService: (service: {
        id: string;
        name: string;
        branchId: string;
        durationMinutes: number;
        price: number;
        active: boolean;
      }) => void;
      editResource: (resource: {
        id: string;
        name: string;
        branchId: string;
        serviceOfferingIds: string[];
        weeklySchedule: [];
        active: boolean;
      }) => void;
    };

    component.editBranch({
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
    });
    component.editService({
      id: 'service-1',
      name: 'Corte',
      branchId: 'branch-1',
      durationMinutes: 30,
      price: 1200,
      active: true,
    });
    component.editResource({
      id: 'resource-1',
      name: 'Sandra',
      branchId: 'branch-1',
      serviceOfferingIds: ['service-1'],
      weeklySchedule: [],
      active: true,
    });

    expect(component.branchFormExpanded()).toBe(true);
    expect(component.serviceFormExpanded()).toBe(true);
    expect(component.resourceFormExpanded()).toBe(true);
    expect(component.editingBranchId()).toBe('branch-1');
    expect(component.editingServiceId()).toBe('service-1');
    expect(component.editingResourceId()).toBe('resource-1');
  });

  it('should create a branch and refresh dashboard data', () => {
    dashboardService.createBranch.mockReturnValue(
      of({
        id: 'branch-2',
        name: 'Norte',
        address: 'Calle 2',
        locality: 'Los Polvorines',
        province: 'Buenos Aires',
        country: 'Argentina',
        latitude: -35.6037,
        longitude: -58.3816,
        zoneId: 'America/Argentina/Buenos_Aires',
        weeklySchedule: [],
        active: true,
      }),
    );

    const component = fixture.componentInstance as unknown as {
      branchForm: {
        setValue: (value: {
          name: string;
          address: string;
          locality: string;
          province: string;
          country: string;
          latitude: number;
          longitude: number;
          zoneId: string;
          active: boolean;
        }) => void;
      };
      saveBranch: () => void;
    };

    component.branchForm.setValue({
      name: 'Norte',
      address: 'Calle 2',
      locality: 'Los Polvorines',
      province: 'Buenos Aires',
      country: 'Argentina',
      latitude: -35.6037,
      longitude: -58.3816,
      zoneId: 'America/Argentina/Buenos_Aires',
      active: true,
    });
    component.saveBranch();

    expect(dashboardService.createBranch).toHaveBeenCalledWith({
      name: 'Norte',
      address: 'Calle 2',
      locality: 'Los Polvorines',
      province: 'Buenos Aires',
      country: 'Argentina',
      latitude: -35.6037,
      longitude: -58.3816,
      zoneId: 'America/Argentina/Buenos_Aires',
      weeklySchedule: [
        {
          day: 'MONDAY',
          timeRanges: [{ start: '09:00', end: '14:00' }],
        },
        {
          day: 'TUESDAY',
          timeRanges: [{ start: '09:00', end: '14:00' }],
        },
        {
          day: 'WEDNESDAY',
          timeRanges: [{ start: '09:00', end: '14:00' }],
        },
        {
          day: 'THURSDAY',
          timeRanges: [{ start: '09:00', end: '14:00' }],
        },
        {
          day: 'FRIDAY',
          timeRanges: [{ start: '09:00', end: '14:00' }],
        },
        {
          day: 'SATURDAY',
          timeRanges: [{ start: '09:00', end: '14:00' }],
        },
      ],
      active: true,
    });
    expect(dashboardService.listBranches).toHaveBeenCalledTimes(2);
  });

  it('should create a branch with the selected weekly schedule', () => {
    dashboardService.createBranch.mockReturnValue(
      of({
        id: 'branch-2',
        name: 'Norte',
        address: 'Calle 2',
        locality: 'Los Polvorines',
        province: 'Buenos Aires',
        country: 'Argentina',
        latitude: -35.6037,
        longitude: -58.3816,
        zoneId: 'America/Argentina/Buenos_Aires',
        weeklySchedule: [],
        active: true,
      }),
    );

    const component = fixture.componentInstance as unknown as {
      branchForm: {
        setValue: (value: {
          name: string;
          address: string;
          locality: string;
          province: string;
          country: string;
          latitude: number;
          longitude: number;
          zoneId: string;
          active: boolean;
        }) => void;
      };
      setBranchScheduleDayActive: (dayOfWeek: string, active: boolean) => void;
      setBranchScheduleTime: (
        dayOfWeek: string,
        field: 'opensAt' | 'closesAt',
        event: Event,
        rangeIndex?: number,
      ) => void;
      addBranchScheduleRange: (dayOfWeek: string) => void;
      saveBranch: () => void;
    };

    component.branchForm.setValue({
      name: 'Norte',
      address: 'Calle 2',
      locality: 'Los Polvorines',
      province: 'Buenos Aires',
      country: 'Argentina',
      latitude: -35.6037,
      longitude: -58.3816,
      zoneId: 'America/Argentina/Buenos_Aires',
      active: true,
    });

    for (const day of ['TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']) {
      component.setBranchScheduleDayActive(day, false);
    }
    component.setBranchScheduleTime('MONDAY', 'opensAt', {
      target: { value: '10:30' },
    } as unknown as Event);
    component.setBranchScheduleTime('MONDAY', 'closesAt', {
      target: { value: '16:00' },
    } as unknown as Event);
    component.addBranchScheduleRange('MONDAY');
    component.setBranchScheduleTime(
      'MONDAY',
      'opensAt',
      {
        target: { value: '17:00' },
      } as unknown as Event,
      1,
    );
    component.setBranchScheduleTime(
      'MONDAY',
      'closesAt',
      {
        target: { value: '20:00' },
      } as unknown as Event,
      1,
    );
    component.saveBranch();

    expect(dashboardService.createBranch).toHaveBeenCalledWith(
      expect.objectContaining({
        weeklySchedule: [
          {
            day: 'MONDAY',
            timeRanges: [
              { start: '10:30', end: '16:00' },
              { start: '17:00', end: '20:00' },
            ],
          },
        ],
      }),
    );
  });

  it('should create a service for the selected branch', () => {
    dashboardService.createService.mockReturnValue(
      of({
        id: 'service-2',
        name: 'Manicura',
        branchId: 'branch-1',
        durationMinutes: 45,
        price: 3000,
        active: true,
      }),
    );

    const component = fixture.componentInstance as unknown as {
      serviceForm: {
        setValue: (value: {
          name: string;
          branchId: string;
          durationMinutes: number;
          price: number;
          active: boolean;
        }) => void;
      };
      saveService: () => void;
    };

    component.serviceForm.setValue({
      name: 'Manicura',
      branchId: 'branch-1',
      durationMinutes: 45,
      price: 3000,
      active: true,
    });
    component.saveService();

    expect(dashboardService.createService).toHaveBeenCalledWith({
      name: 'Manicura',
      branchId: 'branch-1',
      durationMinutes: 45,
      price: 3000,
      active: true,
    });
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
            day: 'MONDAY',
            timeRanges: [{ start: '09:00', end: '18:00' }],
          },
          {
            day: 'TUESDAY',
            timeRanges: [{ start: '09:00', end: '18:00' }],
          },
          {
            day: 'WEDNESDAY',
            timeRanges: [{ start: '09:00', end: '18:00' }],
          },
          {
            day: 'THURSDAY',
            timeRanges: [{ start: '09:00', end: '18:00' }],
          },
          {
            day: 'FRIDAY',
            timeRanges: [{ start: '09:00', end: '18:00' }],
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
          day: 'MONDAY',
          timeRanges: [{ start: '09:00', end: '18:00' }],
        },
        {
          day: 'TUESDAY',
          timeRanges: [{ start: '09:00', end: '18:00' }],
        },
        {
          day: 'WEDNESDAY',
          timeRanges: [{ start: '09:00', end: '18:00' }],
        },
        {
          day: 'THURSDAY',
          timeRanges: [{ start: '09:00', end: '18:00' }],
        },
        {
          day: 'FRIDAY',
          timeRanges: [{ start: '09:00', end: '18:00' }],
        },
        {
          day: 'SATURDAY',
          timeRanges: [],
        },
        {
          day: 'SUNDAY',
          timeRanges: [],
        },
      ],
      active: true,
    });
  });

  it('should filter resource services by the selected branch', () => {
    const component = fixture.componentInstance as unknown as {
      resourceForm: {
        controls: {
          branchId: {
            setValue: (value: string) => void;
          };
          serviceOfferingIds: {
            setValue: (value: string[]) => void;
            value: string[];
          };
        };
      };
      resourceServices: () => Array<{ id: string; branchId: string }>;
    };

    component.resourceForm.controls.branchId.setValue('branch-1');

    expect(component.resourceServices().map((service) => service.id)).toEqual(['service-1']);

    component.resourceForm.controls.serviceOfferingIds.setValue(['service-1', 'service-2']);
    component.resourceForm.controls.branchId.setValue('branch-2');

    expect(component.resourceServices().map((service) => service.id)).toEqual(['service-2']);
    expect(component.resourceForm.controls.serviceOfferingIds.value).toEqual(['service-2']);
  });

  it('should create a resource with multiple time ranges per day', () => {
    dashboardService.createResource.mockReturnValue(
      of({
        id: 'resource-1',
        name: 'Sandra',
        branchId: 'branch-1',
        serviceOfferingIds: ['service-1'],
        weeklySchedule: [],
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
      setScheduleDayActive: (dayOfWeek: string, active: boolean) => void;
      setScheduleTime: (
        dayOfWeek: string,
        field: 'startsAt' | 'endsAt',
        event: Event,
        rangeIndex?: number,
      ) => void;
      addScheduleRange: (dayOfWeek: string) => void;
      saveResource: () => void;
    };

    component.resourceForm.setValue({
      name: 'Sandra',
      branchId: 'branch-1',
      serviceOfferingIds: ['service-1'],
      active: true,
    });

    for (const day of ['TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']) {
      component.setScheduleDayActive(day, false);
    }
    component.setScheduleTime('MONDAY', 'startsAt', {
      target: { value: '09:00' },
    } as unknown as Event);
    component.setScheduleTime('MONDAY', 'endsAt', {
      target: { value: '13:00' },
    } as unknown as Event);
    component.addScheduleRange('MONDAY');
    component.setScheduleTime(
      'MONDAY',
      'startsAt',
      {
        target: { value: '16:00' },
      } as unknown as Event,
      1,
    );
    component.setScheduleTime(
      'MONDAY',
      'endsAt',
      {
        target: { value: '20:00' },
      } as unknown as Event,
      1,
    );
    component.saveResource();

    expect(dashboardService.createResource).toHaveBeenCalledWith(
      expect.objectContaining({
        weeklySchedule: [
          {
            day: 'MONDAY',
            timeRanges: [
              { start: '09:00', end: '13:00' },
              { start: '16:00', end: '20:00' },
            ],
          },
          {
            day: 'TUESDAY',
            timeRanges: [],
          },
          {
            day: 'WEDNESDAY',
            timeRanges: [],
          },
          {
            day: 'THURSDAY',
            timeRanges: [],
          },
          {
            day: 'FRIDAY',
            timeRanges: [],
          },
          {
            day: 'SATURDAY',
            timeRanges: [],
          },
          {
            day: 'SUNDAY',
            timeRanges: [],
          },
        ],
      }),
    );
  });

  it('should hide loading when dashboard data finishes loading', async () => {
    const branches = new Subject<unknown[]>();
    dashboardService.listBranches.mockReturnValueOnce(branches.asObservable());
    dashboardService.listServices.mockReturnValueOnce(of([]));
    dashboardService.listResources.mockReturnValueOnce(of([]));

    fixture = TestBed.createComponent(BusinessDashboardPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cargando...');

    branches.next([
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
    branches.complete();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Cargando...');
    expect(fixture.nativeElement.textContent).toContain('Centro');
  });

  it('should format booking rows without exposing technical ids', () => {
    const component = fixture.componentInstance as unknown as {
      bookingTitle: (booking: { customerName: string; serviceName: string }) => string;
      bookingBranchName: (booking: { branchId?: string; branchName?: string }) => string;
      bookingResourceName: (booking: { resourceName?: string }) => string;
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
    expect(component.dateTimeLabel('2026-08-26T15:00:00')).toContain('15:00');
    expect(component.dateTimeLabel('2026-08-26T15:00:00')).not.toMatch(/AM|PM/i);
    expect(component.bookingBranchName({ branchId: 'branch-1' })).toBe('Centro');
    expect(component.bookingResourceName({ resourceName: 'Sandra' })).toBe('Sandra');
    expect(component.bookingResourceName({})).toBe('Sin recurso');
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
    dashboardService.listBookingsPage.mockClear();
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

    expect(dashboardService.listBookingsPage).toHaveBeenCalledWith('2026-08-28', 0, 20, '', '', '');
  });

  it('should request bookings with the selected branch filter', () => {
    dashboardService.listBookingsPage.mockClear();
    const component = fixture.componentInstance as unknown as {
      bookingForm: {
        controls: {
          branchId: {
            setValue: (value: string) => void;
          };
          date: {
            setValue: (value: Date) => void;
          };
        };
      };
      loadBookings: () => void;
    };

    component.bookingForm.controls.date.setValue(new Date(2026, 7, 25));
    component.bookingForm.controls.branchId.setValue('branch-1');
    component.loadBookings();

    expect(dashboardService.listBookingsPage).toHaveBeenCalledWith(
      '2026-08-25',
      0,
      20,
      'branch-1',
      '',
      '',
    );
  });

  it('should request bookings with the selected resource filter', () => {
    dashboardService.listBookingsPage.mockClear();
    const component = fixture.componentInstance as unknown as {
      bookingForm: {
        controls: {
          branchId: {
            setValue: (value: string) => void;
          };
          date: {
            setValue: (value: Date) => void;
          };
          resourceId: {
            setValue: (value: string) => void;
          };
          serviceOfferingId: {
            setValue: (value: string) => void;
          };
        };
      };
      resources: {
        set: (
          value: Array<{
            id: string;
            name: string;
            branchId: string;
            serviceOfferingIds: string[];
            weeklySchedule: [];
            active: boolean;
          }>,
        ) => void;
      };
      bookingResources: () => Array<{ id: string }>;
      loadBookings: () => void;
    };

    component.resources.set([
      {
        id: 'resource-1',
        name: 'Sandra',
        branchId: 'branch-1',
        serviceOfferingIds: ['service-1'],
        weeklySchedule: [],
        active: true,
      },
      {
        id: 'resource-2',
        name: 'Luis',
        branchId: 'branch-1',
        serviceOfferingIds: ['service-2'],
        weeklySchedule: [],
        active: true,
      },
      {
        id: 'resource-3',
        name: 'Marta',
        branchId: 'branch-2',
        serviceOfferingIds: ['service-1'],
        weeklySchedule: [],
        active: true,
      },
    ]);

    component.bookingForm.controls.date.setValue(new Date(2026, 7, 25));
    component.bookingForm.controls.branchId.setValue('branch-1');
    component.bookingForm.controls.serviceOfferingId.setValue('service-1');
    component.bookingForm.controls.resourceId.setValue('resource-1');
    component.loadBookings();

    expect(component.bookingResources().map((resource) => resource.id)).toEqual(['resource-1']);
    expect(dashboardService.listBookingsPage).toHaveBeenCalledWith(
      '2026-08-25',
      0,
      20,
      'branch-1',
      'resource-1',
      'service-1',
    );
  });

  it('should request bookings with the selected service filter', () => {
    dashboardService.listBookingsPage.mockClear();
    const component = fixture.componentInstance as unknown as {
      bookingForm: {
        controls: {
          branchId: {
            setValue: (value: string) => void;
          };
          date: {
            setValue: (value: Date) => void;
          };
          serviceOfferingId: {
            setValue: (value: string) => void;
          };
        };
      };
      services: {
        set: (
          value: Array<{
            id: string;
            name: string;
            branchId: string;
            durationMinutes: number;
            active: boolean;
          }>,
        ) => void;
      };
      bookingServices: () => Array<{ id: string }>;
      loadBookings: () => void;
    };

    component.services.set([
      {
        id: 'service-1',
        name: 'Corte',
        branchId: 'branch-1',
        durationMinutes: 30,
        active: true,
      },
      {
        id: 'service-2',
        name: 'Color',
        branchId: 'branch-2',
        durationMinutes: 45,
        active: true,
      },
    ]);

    component.bookingForm.controls.date.setValue(new Date(2026, 7, 25));
    component.bookingForm.controls.branchId.setValue('branch-1');
    component.bookingForm.controls.serviceOfferingId.setValue('service-1');
    component.loadBookings();

    expect(component.bookingServices().map((service) => service.id)).toEqual(['service-1']);
    expect(dashboardService.listBookingsPage).toHaveBeenCalledWith(
      '2026-08-25',
      0,
      20,
      'branch-1',
      '',
      'service-1',
    );
  });

  it('should expose customer name and phone for booking rows', () => {
    const component = fixture.componentInstance as unknown as {
      bookingTitle: (booking: { customerName: string; serviceName: string }) => string;
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
    expect(component.bookingCustomerPhone({})).toBe('Sin teléfono');
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
