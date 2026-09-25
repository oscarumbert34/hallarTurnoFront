import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { BookingService } from '../booking/booking.service';
import { PublicBusinessPageComponent } from './public-business.page';

describe('PublicBusinessPageComponent', () => {
  const branch = {
    id: 'branch-1',
    name: 'Centro',
    address: 'Calle 1',
    city: 'San Miguel',
    province: 'Buenos Aires',
  };
  const business = {
    id: 'business-1',
    slug: 'centro',
    name: 'Centro',
    shortDescription: null,
    aboutUs: 'Sobre el negocio',
    phone: null,
    email: null,
    branches: [branch, { ...branch, id: 'branch-2' }],
  };
  const service = {
    id: 'service-1',
    name: 'Consulta',
    description: null,
    durationMinutes: 30,
    price: 15000,
    currency: 'ARS',
  };
  let api: {
    getPublicBusiness: ReturnType<typeof vi.fn>;
    listPublicServices: ReturnType<typeof vi.fn>;
    listAvailabilitySlots: ReturnType<typeof vi.fn>;
  };
  const navigate = vi.fn();
  const open = vi.fn();
  beforeEach(() => {
    api = {
      getPublicBusiness: vi.fn(() => of(business)),
      listPublicServices: vi.fn(() => of([service])),
      listAvailabilitySlots: vi.fn(() =>
        of({ offset: 0, limit: 10, totalAvailableSlots: 0, hasMore: false, slots: [] }),
      ),
    };
    TestBed.configureTestingModule({
      imports: [PublicBusinessPageComponent],
      providers: [
        { provide: BookingService, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ slug: 'centro' })) },
        },
        { provide: Router, useValue: { navigate } },
        { provide: MatDialog, useValue: { open } },
      ],
    });
  });
  it('selects the first branch, displays its city and opens the service dialog', () => {
    const fixture = TestBed.createComponent(PublicBusinessPageComponent);
    fixture.detectChanges();
    expect(api.getPublicBusiness).toHaveBeenCalledWith('centro');
    expect(api.listPublicServices).toHaveBeenCalledWith('centro', 'branch-1');
    expect(fixture.nativeElement.textContent).toContain('San Miguel');
    const buttons = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    buttons.find((button) => button.textContent?.includes('Reservar turno'))!.click();
    expect(navigate).toHaveBeenCalledWith(['/', 'centro', 'search'], {
      queryParams: { businessId: 'business-1' },
    });
    buttons.find((button) => button.textContent?.trim() === 'Reservar')!.click();
    expect(open).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ data: { business, branch, service } }),
    );
  });
  it('discards services from an earlier branch', () => {
    const pending = new Subject<any[]>();
    api.listPublicServices.mockReturnValueOnce(pending).mockReturnValueOnce(of([]));
    const fixture = TestBed.createComponent(PublicBusinessPageComponent);
    fixture.detectChanges();
    const inputs = fixture.nativeElement.querySelectorAll('input');
    inputs[1].dispatchEvent(new Event('change'));
    pending.next([service]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No hay servicios disponibles');
    expect(fixture.nativeElement.textContent).not.toContain('Consulta');
  });
  it('shows a public not-found state', () => {
    api.getPublicBusiness.mockReturnValue(throwError(() => ({ status: 404 })));
    const fixture = TestBed.createComponent(PublicBusinessPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No encontramos este negocio');
  });
  it('loads today slots for the default service', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 25, 10, 0));
    api.listAvailabilitySlots.mockReturnValue(
      of({
        offset: 0,
        limit: 10,
        totalAvailableSlots: 1,
        hasMore: false,
        slots: [
          {
            id: 'slot-1',
            startsAt: '2026-09-25T11:00:00',
            endsAt: '2026-09-25T11:30:00',
            resourceId: 'professional-1',
            resourceName: 'Ana',
          },
        ],
      }),
    );

    const fixture = TestBed.createComponent(PublicBusinessPageComponent);
    fixture.detectChanges();

    expect(api.listAvailabilitySlots).toHaveBeenCalledWith(
      { branchId: branch.id, serviceId: service.id },
      expect.objectContaining({
        businessId: business.id,
        branchId: branch.id,
        service: service.name,
        date: '2026-09-25',
        timeFrom: '10:00',
        timeTo: '23:59',
      }),
      { offset: 0, limit: 10 },
    );
    expect(fixture.nativeElement.textContent).toContain('11:00');
    expect(fixture.nativeElement.textContent).toContain('Ana');
    fixture.destroy();
    vi.useRealTimers();
  });
  it.each([
    ['BARBERSHOP', 'content_cut'],
    ['HAIRDRESSER', 'content_cut'],
    ['BEAUTY', 'auto_awesome'],
    ['HEALTH', 'monitor_heart'],
    ['FITNESS', 'fitness_center'],
    ['WELLNESS', 'self_improvement'],
    ['PET_SERVICES', 'pets'],
    ['EDUCATION', 'school'],
    ['PROFESSIONAL_SERVICES', 'business_center'],
    ['OTHERS', 'storefront'],
    ['UNKNOWN', 'storefront'],
    [undefined, 'storefront'],
  ])('uses the category icon for %s', (category, expectedIcon) => {
    api.getPublicBusiness.mockReturnValue(of({ ...business, category }));
    const fixture = TestBed.createComponent(PublicBusinessPageComponent);
    fixture.detectChanges();
    const icons = [...fixture.nativeElement.querySelectorAll('.avatar mat-icon')];
    expect(icons[0]?.textContent?.trim()).toBe(expectedIcon);
    const aboutIcon = fixture.nativeElement.querySelector('.about-category-icon mat-icon');
    expect(aboutIcon?.textContent?.trim()).toBe(expectedIcon);
  });
});
