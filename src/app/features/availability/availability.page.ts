import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { BusinessDashboardService } from '../business-dashboard/business-dashboard.service';
import { Branch, Resource, ServiceCatalogItem } from '../business-dashboard/dashboard.models';
import { AvailabilityDayOverview, AvailabilityOverview } from './availability.models';
import { AvailabilityOverviewService } from './availability.service';
import { AvailabilityStoryService } from './availability-story.service';

@Component({
  selector: 'app-availability-page',
  imports: [FormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatSelectModule],
  templateUrl: './availability.page.html',
  styleUrl: './availability.page.scss',
})
export class AvailabilityPage implements OnInit {
  private readonly dashboard = inject(BusinessDashboardService);
  private readonly availability = inject(AvailabilityOverviewService);
  private readonly stories = inject(AvailabilityStoryService);
  private readonly router = inject(Router);

  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly businessName = signal('Mi negocio');
  protected readonly branches = signal<Branch[]>([]);
  protected readonly services = signal<ServiceCatalogItem[]>([]);
  protected readonly resources = signal<Resource[]>([]);
  protected readonly overview = signal<AvailabilityOverview | null>(null);
  protected readonly selectedBranchId = signal('');
  protected readonly selectedServiceId = signal('');
  protected readonly selectedResourceId = signal('');
  protected readonly selectedDate = signal('');
  protected readonly expandedDates = signal<Set<string>>(new Set());
  protected readonly weekStart = signal(this.startOfWeek(new Date()));

  protected readonly compatibleServices = computed(() => {
    const branchId = this.selectedBranchId();
    return this.services().filter((service) => !service.branchId || service.branchId === branchId);
  });
  protected readonly compatibleResources = computed(() => {
    const branchId = this.selectedBranchId();
    const serviceId = this.selectedServiceId();
    return this.resources().filter(
      (resource) =>
        resource.active &&
        resource.branchId === branchId &&
        (!serviceId || resource.serviceOfferingIds.includes(serviceId)),
    );
  });
  protected readonly weekLabel = computed(() => {
    const start = this.weekStart();
    const end = this.addDays(start, 6);
    const formatter = new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'short',
    });
    return `${formatter.format(start)} - ${formatter.format(end)}`;
  });
  protected readonly selectedDay = computed(() => {
    const days = this.overview()?.days ?? [];
    return days.find((day) => day.date === this.selectedDate()) ?? days[0] ?? null;
  });

  ngOnInit(): void {
    forkJoin({
      branches: this.dashboard.listBranches(),
      services: this.dashboard.listServices(),
      resources: this.dashboard.listResources(),
      businessName: this.dashboard.getBusinessName(),
    }).subscribe({
      next: ({ branches, services, resources, businessName }) => {
        this.branches.set(branches.filter((branch) => branch.active));
        this.services.set(services.filter((service) => service.active));
        this.resources.set(resources);
        this.businessName.set(businessName);
        this.selectedBranchId.set(this.branches()[0]?.id ?? '');
        this.applyServiceDefault();
        this.applyResourceDefault();
        this.load();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar las opciones de disponibilidad.');
      },
    });
  }

  protected branchChanged(branchId: string): void {
    this.selectedBranchId.set(branchId);
    this.applyServiceDefault();
    this.applyResourceDefault();
    this.load();
  }

  protected serviceChanged(serviceId: string): void {
    this.selectedServiceId.set(serviceId);
    this.applyResourceDefault();
    this.load();
  }

  protected resourceChanged(resourceId: string): void {
    this.selectedResourceId.set(resourceId);
    this.load();
  }

  protected moveWeek(days: number): void {
    this.weekStart.set(this.addDays(this.weekStart(), days));
    this.load();
  }

  protected currentWeek(): void {
    this.weekStart.set(this.startOfWeek(new Date()));
    this.load();
  }

  protected toggleDay(date: string): void {
    const dates = new Set(this.expandedDates());
    dates.has(date) ? dates.delete(date) : dates.add(date);
    this.expandedDates.set(dates);
    this.selectedDate.set(date);
  }

  protected visibleSlots(day: AvailabilityDayOverview) {
    return this.expandedDates().has(day.date) ? day.slots : day.slots.slice(0, 4);
  }

  protected dayName(date: string): string {
    return new Intl.DateTimeFormat('es-AR', { weekday: 'long' }).format(this.parseDate(date));
  }

  protected dayNumber(date: string): string {
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'short',
    }).format(this.parseDate(date));
  }

  protected time(value: string): string {
    return value.slice(0, 5);
  }

  protected createBooking(day: AvailabilityDayOverview, startsAt: string): void {
    void this.router.navigate(['/bookings'], {
      queryParams: {
        date: day.date,
        startTime: this.time(startsAt),
        branchId: this.selectedBranchId(),
        serviceOfferingId: this.selectedServiceId(),
        resourceId: this.selectedResourceId() || undefined,
      },
    });
  }

  protected downloadDay(): void {
    const day = this.selectedDay();
    if (day) this.stories.downloadDay(day, this.storyContext());
  }

  protected downloadWeek(): void {
    const overview = this.overview();
    if (overview) this.stories.downloadWeek(overview, this.storyContext());
  }

  private load(): void {
    const branchId = this.selectedBranchId();
    const serviceOfferingId = this.selectedServiceId();
    if (!branchId || !serviceOfferingId) {
      this.loading.set(false);
      this.overview.set(null);
      return;
    }

    const from = this.iso(this.weekStart());
    const to = this.iso(this.addDays(this.weekStart(), 6));
    this.loading.set(true);
    this.error.set('');
    this.availability
      .overview({
        branchId,
        serviceOfferingId,
        resourceId: this.selectedResourceId() || undefined,
        from,
        to,
      })
      .subscribe({
        next: (overview) => {
          this.overview.set(overview);
          this.selectedDate.set(
            overview.days.find((day) => day.status === 'AVAILABLE')?.date ??
              overview.days[0]?.date ??
              '',
          );
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar la disponibilidad. Intentá nuevamente.');
          this.loading.set(false);
        },
      });
  }

  private applyServiceDefault(): void {
    const services = this.compatibleServices();
    if (!services.some((service) => service.id === this.selectedServiceId())) {
      this.selectedServiceId.set(services[0]?.id ?? '');
    }
  }

  private applyResourceDefault(): void {
    const resources = this.compatibleResources();
    this.selectedResourceId.set(resources.length === 1 ? resources[0].id : '');
  }

  private storyContext() {
    return {
      businessName: this.businessName(),
      branchName:
        this.branches().find((branch) => branch.id === this.selectedBranchId())?.name ?? '',
      serviceName:
        this.services().find((service) => service.id === this.selectedServiceId())?.name ?? '',
    };
  }

  private startOfWeek(date: Date): Date {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const offset = (copy.getDay() + 6) % 7;
    copy.setDate(copy.getDate() - offset);
    return copy;
  }

  private addDays(date: Date, days: number): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  }

  private iso(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
}
