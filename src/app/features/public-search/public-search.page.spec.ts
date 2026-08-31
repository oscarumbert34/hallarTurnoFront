import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { BookingService } from '../booking/booking.service';
import { PublicSearchPage } from './public-search.page';

describe('PublicSearchPage', () => {
  let fixture: ComponentFixture<PublicSearchPage>;
  let bookingService: {
    listBusinesses: ReturnType<typeof vi.fn>;
    listBranches: ReturnType<typeof vi.fn>;
    listServiceOfferings: ReturnType<typeof vi.fn>;
    searchAvailability: ReturnType<typeof vi.fn>;
    listAvailabilitySlots: ReturnType<typeof vi.fn>;
  };
  let router: {
    navigate: ReturnType<typeof vi.fn>;
  };
  let route: {
    snapshot: {
      data: Record<string, unknown>;
    };
  };
  let authService: {
    businessId: string | null;
  };

  beforeEach(async () => {
    sessionStorage.clear();
    bookingService = {
      listBusinesses: vi.fn(() =>
        of([
          {
            id: 'business-1',
            name: 'Turnos SA',
          },
        ]),
      ),
      listBranches: vi.fn(() =>
        of([
          {
            id: 'branch-1',
            name: 'Centro',
            address: 'Calle 1',
            locality: 'Palermo',
          },
        ]),
      ),
      listServiceOfferings: vi.fn(() =>
        of([
          {
            id: 'service-1',
            name: 'Corte',
            branchId: 'branch-1',
            durationMinutes: 30,
            price: 1200,
          },
        ]),
      ),
      searchAvailability: vi.fn(() =>
        of({
          offset: 0,
          limit: 10,
          totalAvailableSlots: 1,
          hasMore: false,
          results: [
            {
              businessId: 'business-1',
              businessName: 'Turnos SA',
              branchId: 'branch-1',
              branchName: 'Centro',
              address: 'Calle 1',
              serviceId: 'service-1',
              serviceName: 'Corte',
              price: 1200,
              durationMinutes: 30,
              slots: [
                {
                  id: 'slot-1',
                  startsAt: '2026-08-17T10:00:00',
                  endsAt: '2026-08-17T10:30:00',
                },
              ],
            },
          ],
        }),
      ),
      listAvailabilitySlots: vi.fn(() =>
        of({
          serviceOfferingId: 'service-1',
          branchId: 'branch-1',
          offset: 10,
          limit: 10,
          totalAvailableSlots: 11,
          hasMore: false,
          slots: [
            {
              id: 'slot-2',
              startsAt: '2026-08-17T11:00:00',
              endsAt: '2026-08-17T11:30:00',
            },
          ],
        }),
      ),
    };
    router = { navigate: vi.fn() };
    route = { snapshot: { data: {} } };
    authService = { businessId: 'business-1' };

    await TestBed.configureTestingModule({
      imports: [PublicSearchPage],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: BookingService, useValue: bookingService },
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicSearchPage);
    fixture.detectChanges();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should search availability and render results', () => {
    const component = fixture.componentInstance as unknown as {
      form: {
        patchValue: (value: {
          business?: string;
          service: string;
          date: string;
          branchId?: string;
        }) => void;
      };
      search: () => void;
    };

    component.form.patchValue({ service: 'Corte', date: '2026-08-17' });
    component.search();
    fixture.detectChanges();

    expect(bookingService.searchAvailability).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Turnos SA');
  });

  it('should use the logged business and hide the business filter in scoped mode', () => {
    route.snapshot.data = { businessScoped: true };
    bookingService.listBusinesses.mockClear();
    bookingService.listBranches.mockClear();
    bookingService.listServiceOfferings.mockClear();

    fixture = TestBed.createComponent(PublicSearchPage);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      form: {
        patchValue: (value: { service: string; date: string; branchId?: string }) => void;
      };
      search: () => void;
    };

    expect(bookingService.listBusinesses).not.toHaveBeenCalled();
    expect(bookingService.listBranches).toHaveBeenCalledWith('business-1');
    expect(bookingService.listServiceOfferings).toHaveBeenCalledWith('business-1');
    expect(fixture.nativeElement.textContent).not.toContain('Negocio');

    component.form.patchValue({ service: 'Corte', date: '2026-08-17' });
    component.search();

    expect(bookingService.searchAvailability).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'business-1',
      }),
      { offset: 0, limit: 10, maxSlotsPerService: 10 },
    );
  });

  it('should hide loading when the availability response completes', () => {
    const availability = new Subject<unknown>();
    bookingService.searchAvailability.mockReturnValueOnce(availability.asObservable());
    const component = fixture.componentInstance as unknown as {
      form: {
        patchValue: (value: {
          business?: string;
          service: string;
          date: string;
          branchId?: string;
        }) => void;
      };
      search: () => void;
    };

    component.form.patchValue({ service: 'Corte', date: '2026-08-17' });
    component.search();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cargando...');

    availability.next({
      offset: 0,
      limit: 10,
      totalAvailableSlots: 1,
      hasMore: false,
      results: [
        {
          businessId: 'business-1',
          businessName: 'Turnos SA',
          branchId: 'branch-1',
          branchName: 'Centro',
          address: 'Calle 1',
          serviceId: 'service-1',
          serviceName: 'Corte',
          durationMinutes: 30,
          slots: [],
        },
      ],
    });
    availability.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Cargando...');
    expect(fixture.nativeElement.textContent).toContain('Turnos SA');
  });

  it('should navigate to booking when a slot is selected', () => {
    const component = fixture.componentInstance as unknown as {
      form: {
        patchValue: (value: {
          business?: string;
          service: string;
          date: string;
          branchId?: string;
        }) => void;
      };
      search: () => void;
    };

    component.form.patchValue({ service: 'Corte', date: '2026-08-17' });
    component.search();
    fixture.detectChanges();

    const slotButton = Array.from<HTMLButtonElement>(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((button) => button.textContent?.includes('10:00'));

    slotButton?.click();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/booking'],
      expect.objectContaining({
        queryParams: expect.objectContaining({
          businessId: 'business-1',
          branchId: 'branch-1',
          serviceId: 'service-1',
          slotId: 'slot-1',
          startsAt: '2026-08-17T10:00:00',
        }),
      }),
    );
    expect(sessionStorage.getItem('turnero.selectedSlot')).toContain('slot-1');
  });

  it('should show the resource name when rendering available slots', () => {
    bookingService.searchAvailability.mockReturnValueOnce(
      of({
        offset: 0,
        limit: 10,
        totalAvailableSlots: 2,
        hasMore: false,
        results: [
          {
            businessId: 'business-1',
            businessName: 'Turnos SA',
            branchId: 'branch-1',
            branchName: 'Centro',
            address: 'Calle 1',
            serviceId: 'service-1',
            serviceName: 'Corte',
            durationMinutes: 30,
            slots: [
              {
                id: 'slot-1',
                startsAt: '2026-08-17T10:00:00',
                endsAt: '2026-08-17T10:30:00',
                resourceName: 'Ana',
              },
              {
                id: 'slot-2',
                startsAt: '2026-08-17T10:00:00',
                endsAt: '2026-08-17T10:30:00',
                resourceName: 'Luis',
              },
            ],
          },
        ],
      }),
    );
    const component = fixture.componentInstance as unknown as {
      form: {
        patchValue: (value: { service: string; date: string }) => void;
      };
      search: () => void;
    };

    component.form.patchValue({ service: 'Corte', date: '2026-08-17' });
    component.search();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ana');
    expect(fixture.nativeElement.textContent).toContain('Luis');
  });

  it('should show available slot times in 24-hour format', () => {
    const component = fixture.componentInstance as unknown as {
      timeLabel: (value: string) => string;
    };
    const label = component.timeLabel('2026-08-17T15:00:00');

    expect(label).toBe('15:00');
    expect(label).not.toMatch(/AM|PM/i);
  });

  it('should use native time pickers with 24-hour visible values for the time filters', () => {
    const timeFields = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('mat-form-field'),
    ).filter((field) => ['Desde', 'Hasta'].some((label) => field.textContent?.includes(label)));

    expect(timeFields).toHaveLength(2);
    expect(timeFields.every((field) => field.querySelector('input[readonly]'))).toBe(true);
    expect(timeFields.every((field) => field.querySelector('input[type="time"]'))).toBe(true);
    expect(timeFields.every((field) => field.querySelector('.clock-icon'))).toBe(true);
    expect(
      timeFields.map((field) => field.querySelector<HTMLInputElement>('input[readonly]')?.value),
    ).toEqual(['09:00', '18:00']);
  });

  it('should search with the selected business id', () => {
    const component = fixture.componentInstance as unknown as {
      form: {
        patchValue: (value: {
          business?: string;
          service: string;
          date: string;
          branchId?: string;
        }) => void;
      };
      search: () => void;
    };

    component.form.patchValue({
      business: 'Turnos SA',
      branchId: 'branch-1',
      service: 'Corte',
      date: '2026-08-17',
    });
    component.search();

    expect(bookingService.searchAvailability).toHaveBeenCalledWith(
      expect.objectContaining({
        business: 'Turnos SA',
        businessId: 'business-1',
        branchId: 'branch-1',
      }),
      { offset: 0, limit: 10, maxSlotsPerService: 10 },
    );
  });

  it('should not request availability again when filters did not change', () => {
    const component = fixture.componentInstance as unknown as {
      form: {
        patchValue: (value: {
          business?: string;
          service: string;
          date: string;
          branchId?: string;
        }) => void;
      };
      search: () => void;
    };

    component.form.patchValue({
      business: 'Turnos SA',
      branchId: 'branch-1',
      service: 'Corte',
      date: '2026-08-17',
    });
    component.search();
    component.search();

    expect(bookingService.searchAvailability).toHaveBeenCalledTimes(1);
  });

  it('should keep the selected calendar day when setting the search date', () => {
    const component = fixture.componentInstance as unknown as {
      form: {
        controls: {
          date: {
            value: Date;
          };
        };
      };
      setSearchDate: (value: Date) => void;
    };

    component.setSearchDate(new Date(2026, 7, 17));

    expect(component.form.controls.date.value.getFullYear()).toBe(2026);
    expect(component.form.controls.date.value.getMonth()).toBe(7);
    expect(component.form.controls.date.value.getDate()).toBe(17);
  });

  it('should send the selected calendar day as a local date string', () => {
    const component = fixture.componentInstance as unknown as {
      form: {
        patchValue: (value: {
          business?: string;
          service?: string;
          date?: Date;
          branchId?: string;
        }) => void;
      };
      search: () => void;
    };

    component.form.patchValue({ service: 'Corte', date: new Date(2026, 7, 28) });
    component.search();

    expect(bookingService.searchAvailability).toHaveBeenCalledWith(
      expect.objectContaining({
        date: '2026-08-28',
      }),
      { offset: 0, limit: 10, maxSlotsPerService: 10 },
    );
  });

  it('should store native time picker selections as 24-hour strings', () => {
    const component = fixture.componentInstance as unknown as {
      form: {
        patchValue: (value: { service?: string; date?: string }) => void;
      };
      setTimeFilter: (controlName: 'timeFrom' | 'timeTo', event: Event) => void;
      search: () => void;
    };

    component.setTimeFilter('timeFrom', { target: { value: '15:30' } } as unknown as Event);
    component.setTimeFilter('timeTo', { target: { value: '20:00' } } as unknown as Event);
    component.form.patchValue({
      service: 'Corte',
      date: '2026-08-17',
    });
    component.search();

    expect(bookingService.searchAvailability).toHaveBeenCalledWith(
      expect.objectContaining({
        timeFrom: '15:30',
        timeTo: '20:00',
      }),
      { offset: 0, limit: 10, maxSlotsPerService: 10 },
    );
  });

  it('should request the next 10 services and append them when loading more services', () => {
    bookingService.searchAvailability
      .mockReturnValueOnce(
        of({
          offset: 0,
          limit: 10,
          totalAvailableSlots: 12,
          hasMore: true,
          results: [
            {
              businessId: 'business-1',
              businessName: 'Turnos SA',
              branchId: 'branch-1',
              branchName: 'Centro',
              address: 'Calle 1',
              serviceId: 'service-1',
              serviceName: 'Corte',
              durationMinutes: 30,
              slots: [
                { id: 'slot-1', startsAt: '2026-08-17T10:00:00', endsAt: '2026-08-17T10:30:00' },
              ],
            },
          ],
        }),
      )
      .mockReturnValueOnce(
        of({
          offset: 10,
          limit: 10,
          totalAvailableSlots: 12,
          hasMore: false,
          results: [
            {
              businessId: 'business-1',
              businessName: 'Turnos SA',
              branchId: 'branch-1',
              branchName: 'Centro',
              address: 'Calle 1',
              serviceId: 'service-2',
              serviceName: 'Color',
              durationMinutes: 30,
              slots: [
                { id: 'slot-2', startsAt: '2026-08-17T11:00:00', endsAt: '2026-08-17T11:30:00' },
              ],
            },
          ],
        }),
      );
    const component = fixture.componentInstance as unknown as {
      form: {
        patchValue: (value: { service: string; date: string; branchId?: string }) => void;
      };
      search: () => void;
      loadMoreServices: () => void;
    };

    component.form.patchValue({ service: 'Corte', date: '2026-08-17' });
    component.search();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ver más servicios');

    component.loadMoreServices();
    fixture.detectChanges();

    expect(bookingService.searchAvailability).toHaveBeenLastCalledWith(
      expect.objectContaining({
        service: 'Corte',
        date: '2026-08-17',
      }),
      { offset: 10, limit: 10, maxSlotsPerService: 10 },
    );
    expect(fixture.nativeElement.textContent).toContain('10:00');
    expect(fixture.nativeElement.textContent).toContain('11:00');
    expect(fixture.nativeElement.textContent).toContain('Color');
    expect(fixture.nativeElement.textContent).not.toContain('Ver más servicios');
  });

  it('should request and append more slots for a single service', () => {
    const firstSlots = Array.from({ length: 10 }, (_, index) => ({
      id: `slot-${index}`,
      startsAt: `2026-08-17T${String(9 + index).padStart(2, '0')}:00:00`,
      endsAt: `2026-08-17T${String(9 + index).padStart(2, '0')}:30:00`,
    }));
    bookingService.searchAvailability.mockReturnValueOnce(
      of({
        offset: 0,
        limit: 10,
        totalAvailableSlots: 10,
        hasMore: false,
        results: [
          {
            businessId: 'business-1',
            businessName: 'Turnos SA',
            branchId: 'branch-1',
            branchName: 'Centro',
            address: 'Calle 1',
            serviceId: 'service-1',
            serviceName: 'Corte',
            durationMinutes: 30,
            slots: firstSlots,
          },
        ],
      }),
    );
    bookingService.listAvailabilitySlots.mockReturnValueOnce(
      of({
        serviceOfferingId: 'service-1',
        branchId: 'branch-1',
        offset: 10,
        limit: 10,
        totalAvailableSlots: 11,
        hasMore: false,
        slots: [
          {
            id: 'slot-10',
            startsAt: '2026-08-17T19:00:00',
            endsAt: '2026-08-17T19:30:00',
          },
        ],
      }),
    );
    const component = fixture.componentInstance as unknown as {
      form: {
        patchValue: (value: { service: string; date: string; branchId?: string }) => void;
      };
      results: () => Array<{
        businessId: string;
        branchId: string;
        serviceId: string;
        slots: unknown[];
      }>;
      search: () => void;
      loadMoreSlots: (business: unknown) => void;
    };

    component.form.patchValue({ service: 'Corte', date: '2026-08-17' });
    component.search();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Ver más horarios');

    component.loadMoreSlots(component.results()[0]);
    fixture.detectChanges();

    expect(bookingService.listAvailabilitySlots).toHaveBeenCalledWith(
      expect.objectContaining({
        branchId: 'branch-1',
        serviceId: 'service-1',
      }),
      expect.objectContaining({
        date: '2026-08-17',
        service: 'Corte',
      }),
      { offset: 10, limit: 10 },
    );
    expect(fixture.nativeElement.textContent).toContain('19:00');
    expect(fixture.nativeElement.textContent).not.toContain('Ver más horarios');
  });

  it('should load service offerings for the service autocomplete', () => {
    const component = fixture.componentInstance as unknown as {
      form: {
        patchValue: (value: {
          business?: string;
          service?: string;
          date?: string;
          branchId?: string;
        }) => void;
      };
    };

    expect(bookingService.listServiceOfferings).not.toHaveBeenCalled();
    expect(bookingService.listBranches).not.toHaveBeenCalled();

    component.form.patchValue({ business: 'Turnos SA' });
    fixture.detectChanges();

    expect(bookingService.listServiceOfferings).toHaveBeenCalledWith('business-1');
    expect(bookingService.listBranches).toHaveBeenCalledWith('business-1');
    expect(fixture.nativeElement.textContent).toContain('Servicio');
    expect(fixture.nativeElement.textContent).toContain('Sucursal');
  });

  it('should require selecting a service option and filter services by selected branch', () => {
    bookingService.listBranches.mockReturnValueOnce(
      of([
        {
          id: 'branch-1',
          name: 'Centro',
          address: 'Calle 1',
          locality: 'Palermo',
        },
        {
          id: 'branch-2',
          name: 'Norte',
          address: 'Calle 2',
          locality: 'Belgrano',
        },
      ]),
    );
    bookingService.listServiceOfferings.mockReturnValueOnce(
      of([
        {
          id: 'service-1',
          name: 'Corte',
          branchId: 'branch-1',
          durationMinutes: 30,
          price: 1200,
        },
        {
          id: 'service-2',
          name: 'Color',
          branchId: 'branch-2',
          durationMinutes: 45,
          price: 2500,
        },
      ]),
    );
    const component = fixture.componentInstance as unknown as {
      form: {
        patchValue: (value: { business?: string; branchId?: string; service?: string }) => void;
        controls: {
          service: {
            value: string;
          };
        };
      };
      filteredServiceOfferings: () => Array<{ id: string }>;
    };

    component.form.patchValue({ business: 'Turnos SA' });
    fixture.detectChanges();

    const serviceField = Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('mat-form-field'),
    ).find((field) => field.textContent?.includes('Servicio'));

    expect(serviceField?.querySelector('mat-select')).toBeTruthy();
    expect(serviceField?.querySelector('input')).toBeFalsy();
    expect(component.filteredServiceOfferings().map((service) => service.id)).toEqual([
      'service-1',
      'service-2',
    ]);

    component.form.patchValue({ branchId: 'branch-1' });

    expect(component.filteredServiceOfferings().map((service) => service.id)).toEqual([
      'service-1',
    ]);

    component.form.patchValue({ branchId: 'branch-2', service: 'Color' });

    expect(component.form.controls.service.value).toBe('Color');

    component.form.patchValue({ branchId: 'branch-1' });

    expect(component.form.controls.service.value).toBe('');
  });
});
