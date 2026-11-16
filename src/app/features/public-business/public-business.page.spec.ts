import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { BookingService } from '../booking/booking.service';
import { VirtualQueueService } from '../virtual-queue/virtual-queue.service';
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
    listPublicProducts: ReturnType<typeof vi.fn>;
    listAvailabilitySlots: ReturnType<typeof vi.fn>;
  };
  const navigate = vi.fn();
  const open = vi.fn();
  beforeEach(() => {
    api = {
      getPublicBusiness: vi.fn(() => of(business)),
      listPublicServices: vi.fn(() => of([service])),
      listPublicProducts: vi.fn(() => of([])),
      listAvailabilitySlots: vi.fn(() =>
        of({ offset: 0, limit: 10, totalAvailableSlots: 0, hasMore: false, slots: [] }),
      ),
    };
    TestBed.configureTestingModule({
      imports: [PublicBusinessPageComponent],
      providers: [
        { provide: BookingService, useValue: api },
        {
          provide: VirtualQueueService,
          useValue: { getByBranch: vi.fn(() => throwError(() => ({ status: 404 }))) },
        },
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
    const loginLink = fixture.nativeElement.querySelector('a.login-link') as HTMLAnchorElement;
    expect(loginLink.textContent).toContain('Acceso comercios');
    const buttons = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    buttons.find((button) => button.textContent?.includes('Reservar turno'))!.click();
    expect(navigate).toHaveBeenCalledWith(['/', 'centro', 'search'], {
      queryParams: { businessId: 'business-1', source: 'public' },
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
  it('shows products only when the public catalog has active entries and supports quantities', () => {
    api.getPublicBusiness.mockReturnValue(of({ ...business, whatsapp: '1124541101', productsEnabled: true }));
    api.listPublicProducts.mockReturnValue(
      of([
        {
          id: 'product-1',
          businessId: business.id,
          name: 'Shampoo',
          description: 'Nutritivo',
          price: 2500,
          imageUrl: null,
          active: true,
        },
      ]),
    );
    const fixture = TestBed.createComponent(PublicBusinessPageComponent);
    fixture.detectChanges();
    expect(api.listPublicProducts).toHaveBeenCalledWith(business.id);
    const productTab = [...fixture.nativeElement.querySelectorAll('.catalog-tabs button')].find(
      (button: Element) => button.textContent?.trim() === 'Productos',
    ) as HTMLButtonElement;
    expect(productTab).toBeTruthy();
    productTab.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Shampoo');
    expect(fixture.nativeElement.textContent).toContain('Sin fotografía');
    (fixture.nativeElement.querySelector('.add-product') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.product-card').classList).toContain('selected');
    expect(fixture.nativeElement.querySelector('.quantity strong').textContent.trim()).toBe('1');
    expect(fixture.nativeElement.textContent).toContain('1 producto');
    expect(fixture.nativeElement.textContent).toContain('$ 2.500');

    const whatsappOpen = vi.spyOn(window, 'open').mockImplementation(() => null);
    (fixture.nativeElement.querySelector('.product-whatsapp') as HTMLButtonElement).click();
    const url = whatsappOpen.mock.calls[0][0] as string;
    expect(new URL(url).searchParams.get('text')).toContain('1 x Shampoo — $ 2.500');
    expect(whatsappOpen).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/5491124541101'),
      '_blank',
      'noopener',
    );
    whatsappOpen.mockRestore();
  });

  it('does not offer WhatsApp when the business has no configured number', () => {
    api.getPublicBusiness.mockReturnValue(of({ ...business, productsEnabled: true }));
    api.listPublicProducts.mockReturnValue(
      of([
        {
          id: 'product-1',
          businessId: business.id,
          name: 'Shampoo',
          description: null,
          price: 2500,
          imageUrl: null,
          active: true,
        },
      ]),
    );
    const fixture = TestBed.createComponent(PublicBusinessPageComponent);
    fixture.detectChanges();
    const tabs = [
      ...fixture.nativeElement.querySelectorAll('.catalog-tabs button'),
    ] as HTMLButtonElement[];
    tabs.find((button) => button.textContent?.trim() === 'Productos')!.click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.add-product') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.product-whatsapp')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('no tiene un WhatsApp configurado');
  });
  it('does not request or show products when the feature is disabled', () => {
    api.getPublicBusiness.mockReturnValue(of({ ...business, productsEnabled: false }));
    const fixture = TestBed.createComponent(PublicBusinessPageComponent);
    fixture.detectChanges();
    expect(api.listPublicProducts).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Productos');
  });
  it('shows services without booking actions when the business uses virtual queue', () => {
    api.getPublicBusiness.mockReturnValue(of({ ...business, virtualQueueEnabled: true }));
    const fixture = TestBed.createComponent(PublicBusinessPageComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Consulta');
    expect(fixture.nativeElement.textContent).not.toContain('Reservar turno');
    expect(fixture.nativeElement.textContent).not.toContain('¿Cómo reservar un turno?');
    const buttons = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    expect(buttons.some((button) => button.textContent?.trim() === 'Reservar')).toBe(false);
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
