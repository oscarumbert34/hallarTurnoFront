import {
  Component,
  computed,
  DestroyRef,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { BookingService } from '../booking/booking.service';
import {
  BusinessCategory,
  PublicBranch,
  PublicBusiness,
  PublicService,
} from './public-business.models';
import { ServiceAvailabilityDialogComponent } from './service-availability-dialog.component';
import { AnalyticsService } from '../../shared/analytics.service';
import { AvailabilitySlot } from '../booking/booking.models';

@Component({
  selector: 'app-public-business-page',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './public-business.page.html',
  styleUrl: './public-business.page.scss',
})
export class PublicBusinessPageComponent implements OnInit {
  private readonly api = inject(BookingService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly analytics = inject(AnalyticsService);
  private businessRequest?: Subscription;
  private servicesRequest?: Subscription;
  private todayAvailabilityRequest?: Subscription;
  protected readonly business = signal<PublicBusiness | null>(null);
  protected readonly selectedBranch = signal<PublicBranch | null>(null);
  protected readonly services = signal<PublicService[]>([]);
  protected readonly loading = signal(true);
  protected readonly servicesLoading = signal(false);
  protected readonly error = signal('');
  protected readonly servicesError = signal('');
  protected readonly selectedTodayServiceId = signal('');
  protected readonly selectedProfessionalId = signal('');
  protected readonly todaySlots = signal<AvailabilitySlot[]>([]);
  protected readonly todaySlotsLoading = signal(false);
  protected readonly todaySlotsError = signal('');
  protected readonly validatingSlotId = signal('');
  protected readonly selectedTodaySlot = signal<AvailabilitySlot | null>(null);
  protected readonly selectedTodayService = computed(
    () => this.services().find((service) => service.id === this.selectedTodayServiceId()) ?? null,
  );
  protected readonly professionals = computed(() => {
    const unique = new Map<string, string>();
    for (const slot of this.todaySlots()) {
      if (slot.resourceId && slot.resourceName) unique.set(slot.resourceId, slot.resourceName);
    }
    return [...unique].map(([id, name]) => ({ id, name }));
  });
  protected readonly visibleTodaySlots = computed(() => {
    const professionalId = this.selectedProfessionalId();
    return professionalId
      ? this.todaySlots().filter((slot) => slot.resourceId === professionalId)
      : this.todaySlots();
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.businessRequest?.unsubscribe();
      this.servicesRequest?.unsubscribe();
      this.todayAvailabilityRequest?.unsubscribe();
      this.business.set(null);
      this.selectedBranch.set(null);
      this.services.set([]);
      this.loading.set(true);
      this.error.set('');
      this.businessRequest = this.api
        .getPublicBusiness(params.get('slug') ?? '')
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (business) => {
            this.business.set(business);
            this.analytics.event('business_page_view', this.businessAnalyticsParams(business));
            this.loading.set(false);
            if (business.branches[0]) this.selectBranch(business.branches[0]);
          },
          error: (error) => {
            this.loading.set(false);
            this.error.set(
              error.status === 404
                ? 'No encontramos este negocio o ya no está disponible.'
                : 'No pudimos cargar el negocio. Intentá nuevamente más tarde.',
            );
          },
        });
    });
  }

  protected localities(): string {
    return [
      ...new Set(
        this.business()
          ?.branches.map((branch) => branch.city)
          .filter(Boolean),
      ),
    ].join(' · ');
  }

  protected selectBranch(branch: PublicBranch): void {
    this.servicesRequest?.unsubscribe();
    this.todayAvailabilityRequest?.unsubscribe();
    this.selectedBranch.set(branch);
    this.services.set([]);
    this.resetTodayAvailability();
    this.servicesLoading.set(true);
    this.servicesError.set('');
    const includedServices = this.business()?.services;
    if (includedServices) {
      this.services.set(includedServices);
      this.servicesLoading.set(false);
      this.selectInitialTodayService();
      return;
    }
    this.servicesRequest = this.api
      .listPublicServices(this.business()!.slug, branch.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (services) => {
          this.services.set(services);
          this.servicesLoading.set(false);
          this.selectInitialTodayService();
        },
        error: () => {
          this.servicesLoading.set(false);
          this.servicesError.set(
            'No pudimos cargar los servicios. Volvé a seleccionar la sucursal para reintentar.',
          );
        },
      });
  }

  protected price(service: PublicService): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: service.currency,
    }).format(service.price);
  }

  protected selectTodayService(serviceId: string): void {
    this.selectedTodayServiceId.set(serviceId);
    this.selectedProfessionalId.set('');
    this.selectedTodaySlot.set(null);
    this.loadTodayAvailability();
  }

  protected selectProfessional(resourceId: string): void {
    this.selectedProfessionalId.set(resourceId);
    const first = resourceId
      ? this.todaySlots().find((slot) => slot.resourceId === resourceId)
      : this.todaySlots()[0];
    this.selectedTodaySlot.set(first ?? null);
  }

  protected selectTodaySlot(slot: AvailabilitySlot): void {
    this.selectedTodaySlot.set(slot);
  }

  protected slotTime(slot: AvailabilitySlot): string {
    return slot.startsAt.slice(11, 16);
  }

  protected actOnTodaySlot(slot: AvailabilitySlot): void {
    const service = this.selectedTodayService();
    const branch = this.selectedBranch();
    if (!service || !branch || this.validatingSlotId()) return;

    this.validatingSlotId.set(slot.id);
    this.todaySlotsError.set('');
    this.api
      .listAvailabilitySlots(
        { branchId: branch.id, serviceId: service.id },
        this.todaySearch(service),
        { offset: 0, limit: 10 },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          const current = page.slots.find(
            (candidate) =>
              candidate.startsAt === slot.startsAt && candidate.resourceId === slot.resourceId,
          );
          this.validatingSlotId.set('');
          if (!current || !this.isFutureSlot(current)) {
            this.todaySlots.update((slots) => slots.filter((item) => item.id !== slot.id));
            this.todaySlotsError.set('Ese horario ya no está disponible. Actualizamos los turnos.');
            return;
          }
          this.openWhatsapp(current, service, branch);
        },
        error: () => {
          this.validatingSlotId.set('');
          this.todaySlotsError.set('No pudimos validar el horario. Intentá nuevamente.');
        },
      });
  }

  @HostListener('document:visibilitychange')
  protected refreshTodayOnReturn(): void {
    if (document.visibilityState === 'visible' && this.selectedTodayService()) {
      this.loadTodayAvailability();
    }
  }

  protected reserve(): void {
    this.analytics.event('business_booking_click', {
      ...this.businessAnalyticsParams(this.business()!),
      source: 'GENERAL_BUTTON',
    });
    sessionStorage.setItem(
      'turnero.businessAnalytics',
      JSON.stringify({
        businessId: this.business()!.id,
        category: this.business()!.category ?? 'OTHERS',
      }),
    );
    void this.router.navigate(['/', this.business()!.slug, 'search'], {
      queryParams: { businessId: this.business()!.id },
    });
  }

  protected scrollToServices(): void {
    document
      .getElementById('services-title')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected whatsappUrl(value: string): string {
    return `https://wa.me/${value.replace(/\D/g, '')}`;
  }

  protected instagramUrl(value: string): string {
    const handle = value.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '');
    return `https://instagram.com/${handle.replace(/\/$/, '')}`;
  }

  protected categoryIcon(category: BusinessCategory | string | null | undefined): string {
    const icons: Record<BusinessCategory, string> = {
      BARBERSHOP: 'content_cut',
      HAIRDRESSER: 'content_cut',
      BEAUTY: 'auto_awesome',
      HEALTH: 'monitor_heart',
      FITNESS: 'fitness_center',
      WELLNESS: 'self_improvement',
      PET_SERVICES: 'pets',
      EDUCATION: 'school',
      PROFESSIONAL_SERVICES: 'business_center',
      OTHERS: 'storefront',
    };

    return icons[category as BusinessCategory] ?? icons.OTHERS;
  }

  protected googleMapsUrl(branch: PublicBranch): string {
    const address = [branch.address, branch.city, branch.province, branch.country]
      .filter(Boolean)
      .join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }

  protected openingHours(branch: PublicBranch): string[] {
    const labels: Record<string, string> = {
      MONDAY: 'Lun',
      TUESDAY: 'Mar',
      WEDNESDAY: 'Mié',
      THURSDAY: 'Jue',
      FRIDAY: 'Vie',
      SATURDAY: 'Sáb',
      SUNDAY: 'Dom',
    };
    const groups: Array<{ first: string; last: string; times: string }> = [];
    let previousDayWasOpen = false;

    for (const schedule of branch.openingHours ?? []) {
      if (!schedule.timeRanges.length) {
        previousDayWasOpen = false;
        continue;
      }
      const day = labels[schedule.day] ?? schedule.day;
      const times = schedule.timeRanges
        .map((range) => `${range.start.slice(0, 5)}–${range.end.slice(0, 5)}`)
        .join(', ');
      const previous = groups.at(-1);

      if (previousDayWasOpen && previous?.times === times) previous.last = day;
      else groups.push({ first: day, last: day, times });
      previousDayWasOpen = true;
    }

    return groups.map(
      ({ first, last, times }) => `${first === last ? first : `${first} a ${last}`} · ${times}`,
    );
  }

  protected openAvailability(service: PublicService): void {
    this.analytics.event('business_booking_click', {
      ...this.businessAnalyticsParams(this.business()!),
      source: 'SERVICE_BUTTON',
      service_id: service.id,
    });
    this.dialog.open(ServiceAvailabilityDialogComponent, {
      data: {
        business: this.business()!,
        branch: this.selectedBranch()!,
        service,
      },
      width: '600px',
      maxWidth: '96vw',
      maxHeight: '94dvh',
      autoFocus: 'first-heading',
    });
  }

  private selectInitialTodayService(): void {
    const first = this.services()[0];
    if (first) this.selectTodayService(first.id);
  }

  private resetTodayAvailability(): void {
    this.selectedTodayServiceId.set('');
    this.selectedProfessionalId.set('');
    this.todaySlots.set([]);
    this.selectedTodaySlot.set(null);
    this.todaySlotsLoading.set(false);
    this.todaySlotsError.set('');
  }

  private loadTodayAvailability(): void {
    const service = this.selectedTodayService();
    const branch = this.selectedBranch();
    if (!service || !branch) return;
    this.todayAvailabilityRequest?.unsubscribe();
    this.todaySlots.set([]);
    this.todaySlotsLoading.set(true);
    this.todaySlotsError.set('');
    this.todayAvailabilityRequest = this.api
      .listAvailabilitySlots(
        { branchId: branch.id, serviceId: service.id },
        this.todaySearch(service),
        { offset: 0, limit: 10 },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          const slots = page.slots.filter((slot) => this.isFutureSlot(slot));
          this.todaySlots.set(slots);
          this.selectedTodaySlot.set(slots[0] ?? null);
          if (
            this.selectedProfessionalId() &&
            !slots.some((slot) => slot.resourceId === this.selectedProfessionalId())
          ) {
            this.selectedProfessionalId.set('');
          }
          this.todaySlotsLoading.set(false);
        },
        error: () => {
          this.todaySlotsLoading.set(false);
          this.todaySlotsError.set('No pudimos cargar los turnos de hoy. Intentá nuevamente.');
        },
      });
  }

  private todaySearch(service: PublicService) {
    const now = new Date();
    return {
      businessId: this.business()!.id,
      business: this.business()!.name,
      branchId: this.selectedBranch()!.id,
      service: service.name,
      date: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
      timeFrom: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      timeTo: '23:59',
    };
  }

  private isFutureSlot(slot: AvailabilitySlot): boolean {
    return new Date(slot.startsAt).getTime() > Date.now();
  }

  private openWhatsapp(slot: AvailabilitySlot, service: PublicService, branch: PublicBranch): void {
    const business = this.business()!;
    const phone = business.whatsapp || business.phone;
    if (!phone) {
      this.todaySlotsError.set('Este negocio no tiene un número de WhatsApp disponible.');
      return;
    }
    const professional = slot.resourceName ? `\nProfesional: ${slot.resourceName}` : '';
    const message = `Hola ${business.name}, quiero consultar por este turno:\nServicio: ${service.name}\nFecha: ${this.todaySearch(service).date}\nHora: ${this.slotTime(slot)}\nSucursal: ${branch.name}${professional}`;
    window.open(
      `${this.whatsappUrl(phone)}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener',
    );
  }

  private businessAnalyticsParams(business: PublicBusiness): Record<string, unknown> {
    return {
      business_id: business.id,
      business_slug: business.slug,
      business_category: business.category ?? 'OTHERS',
    };
  }
}
