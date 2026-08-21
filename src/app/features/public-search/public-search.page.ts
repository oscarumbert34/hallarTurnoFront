import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { provideNativeDateAdapter } from '@angular/material/core';
import { UiStateComponent } from '../../shared/ui-state.component';
import { bookingErrorMessage } from '../booking/booking-error';
import {
  AvailabilityPage,
  AvailabilitySlot,
  BusinessAvailability,
  BusinessSummary,
  ServiceOfferingSummary,
} from '../booking/booking.models';
import { BookingService } from '../booking/booking.service';

@Component({
  selector: 'app-public-search-page',
  imports: [
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    UiStateComponent,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <section class="search-page">
      <header>
        <h1>Buscar turno</h1>
        <p>Encontrá disponibilidad por servicio, fecha y zona.</p>
      </header>

      <mat-card appearance="outlined">
        <mat-card-content>
          <form class="search-form" [formGroup]="form" (ngSubmit)="search()">
            <mat-form-field appearance="outline">
              <mat-label>Negocio</mat-label>
              <input
                matInput
                formControlName="business"
                [matAutocomplete]="businessAutocomplete"
                placeholder="Barbería, centro médico"
              />
              <mat-autocomplete
                #businessAutocomplete="matAutocomplete"
                (optionSelected)="selectBusiness($event.option.value)"
              >
                @for (business of filteredBusinesses(); track business.id) {
                  <mat-option [value]="business.name">{{ business.name }}</mat-option>
                } @empty {
                  <mat-option disabled>No hay negocios disponibles</mat-option>
                }
              </mat-autocomplete>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Servicio</mat-label>
              <input
                matInput
                formControlName="service"
                [matAutocomplete]="serviceAutocomplete"
                placeholder="Corte, consulta, limpieza"
              />
              <mat-autocomplete #serviceAutocomplete="matAutocomplete">
                @for (service of filteredServiceOfferings(); track service.id) {
                  <mat-option [value]="service.name">{{ service.name }}</mat-option>
                } @empty {
                  <mat-option disabled>No hay servicios disponibles</mat-option>
                }
              </mat-autocomplete>
              <mat-error>Indica el servicio.</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Fecha</mat-label>
              <input
                matInput
                [matDatepicker]="searchDatePicker"
                formControlName="date"
                (dateChange)="setSearchDate($event.value)"
              />
              <mat-datepicker-toggle matIconSuffix [for]="searchDatePicker" />
              <mat-datepicker #searchDatePicker />
              <mat-error>Indica la fecha.</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Zona</mat-label>
              <input matInput formControlName="zone" placeholder="Centro, Palermo, online" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Desde</mat-label>
              <input matInput type="time" formControlName="timeFrom" />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Hasta</mat-label>
              <input matInput type="time" formControlName="timeTo" />
            </mat-form-field>

            <button mat-flat-button type="submit" [disabled]="form.invalid || loading()">
              Buscar
            </button>
          </form>
        </mat-card-content>
      </mat-card>

      <app-ui-state [loading]="loading()" [error]="errorMessage()" />

      <section class="results" aria-label="Negocios con disponibilidad">
        @for (
          business of results();
          track business.businessId + business.branchId + business.serviceId
        ) {
          <mat-card appearance="outlined" class="result-card">
            <mat-card-header>
              <mat-card-title>{{ business.businessName }}</mat-card-title>
              <mat-card-subtitle
                >{{ business.branchName }} · {{ business.address }}</mat-card-subtitle
              >
            </mat-card-header>
            <mat-card-content>
              <div class="service-line">
                <strong>{{ business.serviceName }}</strong>
                <span>{{ business.durationMinutes }} min</span>
                <span class="price">{{ priceLabel(business.price) }}</span>
              </div>

              <div class="slots" aria-label="Turnos disponibles">
                @for (slot of business.slots; track slot.id) {
                  <button mat-stroked-button type="button" (click)="selectSlot(business, slot)">
                    {{ timeLabel(slot.startsAt) }}
                  </button>
                } @empty {
                  <p>No hay horarios disponibles para este negocio.</p>
                }
              </div>

              @if (showLoadMoreSlots(business)) {
                <div class="card-actions">
                  <button
                    mat-stroked-button
                    class="load-more-slots"
                    type="button"
                    [disabled]="slotLoading(business)"
                    (click)="loadMoreSlots(business)"
                  >
                    {{ slotLoading(business) ? 'Cargando...' : 'Ver mas horarios' }}
                  </button>
                </div>
              }
            </mat-card-content>
          </mat-card>
        } @empty {
          @if (searched() && !loading()) {
            <p class="empty">No encontramos disponibilidad con esos filtros.</p>
          }
        }

        @if (showLoadMoreServices()) {
          <div class="load-more">
            <button
              mat-flat-button
              class="load-more-services"
              type="button"
              [disabled]="loadingMoreServices()"
              (click)="loadMoreServices()"
            >
              {{ loadingMoreServices() ? 'Cargando...' : 'Ver mas servicios' }}
            </button>
          </div>
        }
      </section>
    </section>
  `,
  styleUrl: './public-search.page.scss',
})
export class PublicSearchPage implements OnInit {
  private readonly servicesPageLimit = 10;
  private readonly slotsPageLimit = 10;
  private readonly bookingService = inject(BookingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  protected readonly businesses = signal<BusinessSummary[]>([]);
  protected readonly serviceOfferings = signal<ServiceOfferingSummary[]>([]);
  protected readonly selectedBusinessId = signal('');
  protected readonly loading = signal(false);
  protected readonly loadingMoreServices = signal(false);
  protected readonly searched = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly results = signal<BusinessAvailability[]>([]);
  protected readonly currentSearch = signal<ReturnType<
    PublicSearchPage['availabilitySearch']
  > | null>(null);
  protected readonly nextOffset = signal(0);
  protected readonly hasMore = signal(false);
  protected readonly slotPagination = signal<Record<string, SlotPaginationState>>({});
  protected readonly form = this.formBuilder.nonNullable.group({
    business: [''],
    service: ['', Validators.required],
    date: [new Date() as Date | string, Validators.required],
    zone: [''],
    timeFrom: ['09:00'],
    timeTo: ['18:00'],
  });

  ngOnInit(): void {
    const stored = sessionStorage.getItem('turnero.search');

    if (stored) {
      const search = JSON.parse(stored);

      this.form.patchValue({
        ...search,
        date: this.dateInputValue(search.date),
      });
      this.syncBusinessSelection(this.form.controls.business.value);
    }

    this.form.controls.business.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        const previousBusinessId = this.selectedBusinessId();

        this.syncBusinessSelection(value);

        if (this.selectedBusinessId() !== previousBusinessId) {
          this.syncServiceOfferings();
        }
      });

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.resetPagination();
    });

    this.loadBusinesses();
  }

  protected search(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const search = this.availabilitySearch();
    this.loading.set(true);
    this.searched.set(true);
    this.errorMessage.set('');
    this.results.set([]);
    this.currentSearch.set(search);
    this.nextOffset.set(0);
    this.hasMore.set(false);
    this.slotPagination.set({});
    sessionStorage.setItem('turnero.search', JSON.stringify(search));

    this.bookingService
      .searchAvailability(search, {
        offset: 0,
        limit: this.servicesPageLimit,
        maxSlotsPerService: this.slotsPageLimit,
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (page) => this.applyAvailabilityPage(page, false),
        error: (error) => this.errorMessage.set(bookingErrorMessage(error)),
      });
  }

  protected loadMoreServices(): void {
    const search = this.currentSearch();

    if (!search || !this.showLoadMoreServices()) {
      return;
    }

    this.loadingMoreServices.set(true);
    this.errorMessage.set('');

    this.bookingService
      .searchAvailability(search, {
        offset: this.nextOffset(),
        limit: this.servicesPageLimit,
        maxSlotsPerService: this.slotsPageLimit,
      })
      .pipe(finalize(() => this.loadingMoreServices.set(false)))
      .subscribe({
        next: (page) => this.applyAvailabilityPage(page, true),
        error: (error) => this.errorMessage.set(bookingErrorMessage(error)),
      });
  }

  protected loadMoreSlots(business: BusinessAvailability): void {
    const search = this.currentSearch();

    if (!search || !this.showLoadMoreSlots(business)) {
      return;
    }

    const key = this.availabilityKey(business);
    const state = this.slotState(business);

    this.setSlotState(key, { ...state, loading: true });
    this.errorMessage.set('');

    this.bookingService
      .listAvailabilitySlots(business, search, {
        offset: state.nextOffset,
        limit: this.slotsPageLimit,
      })
      .pipe(finalize(() => this.setSlotState(key, { ...this.slotState(business), loading: false })))
      .subscribe({
        next: (page) => {
          this.appendSlots(business, page.slots);
          this.setSlotState(key, {
            nextOffset: page.offset + page.limit,
            hasMore: page.hasMore,
            loading: false,
          });
        },
        error: (error) => this.errorMessage.set(bookingErrorMessage(error)),
      });
  }

  protected filteredBusinesses(): BusinessSummary[] {
    const query = this.form.controls.business.value.trim().toLowerCase();

    if (!query) {
      return this.businesses();
    }

    return this.businesses().filter((business) => business.name.toLowerCase().includes(query));
  }

  protected filteredServiceOfferings(): ServiceOfferingSummary[] {
    const query = this.form.controls.service.value.trim().toLowerCase();

    if (!query) {
      return this.serviceOfferings();
    }

    return this.serviceOfferings().filter((service) => service.name.toLowerCase().includes(query));
  }

  protected selectBusiness(name: string): void {
    this.syncBusinessSelection(name);
    this.syncServiceOfferings();
  }

  protected setSearchDate(value: Date | null): void {
    if (!value) {
      return;
    }

    this.form.controls.date.setValue(value);
  }

  protected selectSlot(business: BusinessAvailability, slot: AvailabilitySlot): void {
    const selectedSlot = {
      businessId: business.businessId,
      businessName: business.businessName,
      branchId: business.branchId,
      branchName: business.branchName,
      serviceId: business.serviceId,
      serviceName: business.serviceName,
      slotId: slot.id,
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      resourceId: slot.resourceId,
      resourceName: slot.resourceName,
      price: business.price,
    };

    sessionStorage.setItem('turnero.selectedSlot', JSON.stringify(selectedSlot));

    this.router.navigate(['/booking'], {
      queryParams: {
        businessId: selectedSlot.businessId,
        businessName: selectedSlot.businessName,
        branchId: selectedSlot.branchId,
        branchName: selectedSlot.branchName,
        serviceId: selectedSlot.serviceId,
        serviceName: selectedSlot.serviceName,
        slotId: selectedSlot.slotId,
        startsAt: selectedSlot.startsAt,
        endsAt: selectedSlot.endsAt,
        resourceId: selectedSlot.resourceId,
        resourceName: selectedSlot.resourceName,
        price: selectedSlot.price,
        search: JSON.stringify({
          ...this.form.getRawValue(),
          date: this.dateValue(this.form.controls.date.value),
        }),
      },
    });
  }

  protected priceLabel(price: number | undefined): string {
    return price === undefined || price === null ? 'Precio a consultar' : `$ ${price}`;
  }

  protected timeLabel(value: string): string {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  protected showLoadMoreServices(): boolean {
    return this.searched() && !this.loading() && this.hasMore();
  }

  protected showLoadMoreSlots(business: BusinessAvailability): boolean {
    return this.slotState(business).hasMore;
  }

  protected slotLoading(business: BusinessAvailability): boolean {
    return this.slotState(business).loading;
  }

  private availabilitySearch() {
    return {
      ...this.form.getRawValue(),
      date: this.dateValue(this.form.controls.date.value),
      businessId: this.selectedBusinessId(),
    };
  }

  private applyAvailabilityPage(page: AvailabilityPage, append: boolean): void {
    const results = append ? this.mergeAvailability(this.results(), page.results) : page.results;

    this.results.set(results);
    this.nextOffset.set(page.offset + page.limit);
    this.hasMore.set(page.hasMore);
    this.syncSlotPagination(results, append);
  }

  private mergeAvailability(
    currentResults: BusinessAvailability[],
    nextResults: BusinessAvailability[],
  ): BusinessAvailability[] {
    const merged = currentResults.map((business) => ({
      ...business,
      slots: [...business.slots],
    }));

    for (const next of nextResults) {
      const existing = merged.find(
        (business) =>
          business.businessId === next.businessId &&
          business.branchId === next.branchId &&
          business.serviceId === next.serviceId,
      );

      if (!existing) {
        merged.push({
          ...next,
          slots: [...next.slots],
        });
        continue;
      }

      const existingSlotIds = new Set(existing.slots.map((slot) => slot.id));
      existing.slots.push(...next.slots.filter((slot) => !existingSlotIds.has(slot.id)));
    }

    return merged;
  }

  private appendSlots(business: BusinessAvailability, slots: AvailabilitySlot[]): void {
    const key = this.availabilityKey(business);

    this.results.update((results) =>
      results.map((result) => {
        if (this.availabilityKey(result) !== key) {
          return result;
        }

        const existingSlotIds = new Set(result.slots.map((slot) => slot.id));

        return {
          ...result,
          slots: [...result.slots, ...slots.filter((slot) => !existingSlotIds.has(slot.id))],
        };
      }),
    );
  }

  private syncSlotPagination(results: BusinessAvailability[], append: boolean): void {
    const current = append ? this.slotPagination() : {};
    const nextState = { ...current };

    for (const result of results) {
      const key = this.availabilityKey(result);

      if (nextState[key]) {
        continue;
      }

      nextState[key] = {
        nextOffset: result.slots.length,
        hasMore: result.slots.length >= this.slotsPageLimit,
        loading: false,
      };
    }

    this.slotPagination.set(nextState);
  }

  private slotState(business: BusinessAvailability): SlotPaginationState {
    return (
      this.slotPagination()[this.availabilityKey(business)] ?? {
        nextOffset: business.slots.length,
        hasMore: business.slots.length >= this.slotsPageLimit,
        loading: false,
      }
    );
  }

  private setSlotState(key: string, state: SlotPaginationState): void {
    this.slotPagination.update((pagination) => ({
      ...pagination,
      [key]: state,
    }));
  }

  private availabilityKey(
    business: Pick<BusinessAvailability, 'businessId' | 'branchId' | 'serviceId'>,
  ): string {
    return `${business.businessId}:${business.branchId}:${business.serviceId}`;
  }

  private resetPagination(): void {
    if (!this.searched()) {
      return;
    }

    this.currentSearch.set(null);
    this.nextOffset.set(0);
    this.hasMore.set(false);
    this.slotPagination.set({});
    this.results.set([]);
    this.searched.set(false);
    this.errorMessage.set('');
  }

  private dateValue(value: Date | string): string {
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    }

    return value;
  }

  private dateInputValue(value: Date | string): Date | string {
    if (value instanceof Date) {
      return value;
    }

    const [year, month, day] = value.split('-').map(Number);

    if (!year || !month || !day) {
      return value;
    }

    return new Date(year, month - 1, day);
  }

  private loadBusinesses(): void {
    this.bookingService.listBusinesses().subscribe({
      next: (businesses) => {
        this.businesses.set(businesses);
        this.syncBusinessSelection(this.form.controls.business.value);
        this.syncServiceOfferings();
      },
      error: () => this.businesses.set([]),
    });
  }

  private syncServiceOfferings(): void {
    const businessId = this.selectedBusinessId();

    if (!businessId) {
      this.serviceOfferings.set([]);
      return;
    }

    this.loadServiceOfferings(businessId);
  }

  private loadServiceOfferings(businessId: string): void {
    this.bookingService.listServiceOfferings(businessId).subscribe({
      next: (serviceOfferings) => this.serviceOfferings.set(serviceOfferings),
      error: () => this.serviceOfferings.set([]),
    });
  }

  private syncBusinessSelection(name: string): void {
    const normalizedName = name.trim().toLowerCase();
    const selected = this.businesses().find(
      (business) => business.name.trim().toLowerCase() === normalizedName,
    );

    this.selectedBusinessId.set(selected?.id ?? '');
  }
}

interface SlotPaginationState {
  nextOffset: number;
  hasMore: boolean;
  loading: boolean;
}
