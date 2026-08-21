import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UiStateComponent } from '../../shared/ui-state.component';
import { bookingErrorMessage } from './booking-error';
import { BusinessDetail, CustomerBooking, SelectedSlot } from './booking.models';
import { BookingService } from './booking.service';

@Component({
  selector: 'app-booking-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    RouterLink,
    UiStateComponent,
  ],
  template: `
    <section class="booking-page">
      <header>
        <h1>Reserva</h1>
        <p>Revisa el turno seleccionado y confirma cuando estes listo.</p>
      </header>

      <app-ui-state [loading]="loading()" [error]="errorMessage()" />

      @if (selectedSlot(); as selectedSlot) {
        <mat-card appearance="outlined">
          <mat-card-header>
            <mat-card-title>{{ selectedSlot.businessName }}</mat-card-title>
            <mat-card-subtitle>{{ selectedSlot.branchName }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (businessDetail(); as businessDetail) {
              <p>
                {{ businessDetail.description || businessDetail.address || 'Detalle del comercio' }}
              </p>
            }

            <dl class="summary">
              <div>
                <dt>Servicio</dt>
                <dd>{{ selectedSlot.serviceName }}</dd>
              </div>
              <div>
                <dt>Fecha y hora</dt>
                <dd>{{ dateLabel(selectedSlot.startsAt) }}</dd>
              </div>
              <div>
                <dt>Profesional/recurso</dt>
                <dd>{{ selectedSlot.resourceName || 'A asignar' }}</dd>
              </div>
              <div>
                <dt>Precio</dt>
                <dd>{{ priceLabel(selectedSlot.price) }}</dd>
              </div>
            </dl>

            <form class="customer-form" [formGroup]="customerForm">
              <mat-form-field appearance="outline">
                <mat-label>Nombre y apellido</mat-label>
                <input matInput formControlName="customerName" maxlength="120" />
                <mat-error>Indica tu nombre.</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Telefono</mat-label>
                <input matInput formControlName="customerPhone" maxlength="40" />
                <mat-error>Ingresa un telefono valido.</mat-error>
              </mat-form-field>
            </form>

            @if (confirmedBooking(); as confirmedBooking) {
              <p class="success" role="status">Reserva confirmada.</p>
            }
          </mat-card-content>
          <mat-card-actions>
            <button
              mat-flat-button
              type="button"
              [disabled]="customerForm.invalid || saving()"
              (click)="confirmBooking()"
            >
              Confirmar turno
            </button>
            <a mat-button routerLink="/public-search">Buscar otro</a>
          </mat-card-actions>
        </mat-card>
      } @else {
        <mat-card appearance="outlined">
          <mat-card-content>
            <p>Elegí un turno desde el buscador para continuar.</p>
          </mat-card-content>
          <mat-card-actions>
            <a mat-flat-button routerLink="/public-search">Ir al buscador</a>
          </mat-card-actions>
        </mat-card>
      }
    </section>
  `,
  styleUrl: './booking.page.scss',
})
export class BookingPage implements OnInit {
  private readonly bookingService = inject(BookingService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);

  protected readonly selectedSlot = signal<SelectedSlot | null>(null);
  protected readonly businessDetail = signal<BusinessDetail | null>(null);
  protected readonly confirmedBooking = signal<CustomerBooking | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly customerForm = this.formBuilder.nonNullable.group({
    customerName: ['', [Validators.required, Validators.maxLength(120)]],
    customerPhone: [
      '',
      [Validators.required, Validators.maxLength(40), Validators.pattern(/^[0-9+()\-\s]{6,40}$/)],
    ],
  });

  ngOnInit(): void {
    this.selectedSlot.set(this.slotFromRoute());
    const selectedSlot = this.selectedSlot();

    if (selectedSlot) {
      this.loadBusinessDetail(selectedSlot.businessId);
    }
  }

  protected confirmBooking(): void {
    const selectedSlot = this.selectedSlot();

    if (!selectedSlot) {
      return;
    }

    if (this.customerForm.invalid) {
      this.customerForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    const { date, time } = this.bookingDateTime(selectedSlot.startsAt);
    const customer = this.customerForm.getRawValue();

    this.bookingService
      .createBooking({
        businessId: selectedSlot.businessId,
        branchId: selectedSlot.branchId,
        serviceOfferingId: selectedSlot.serviceId,
        resourceId: selectedSlot.resourceId,
        date,
        startsAt: time,
        customerName: customer.customerName.trim(),
        customerPhone: customer.customerPhone.trim(),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (booking) => {
          this.confirmedBooking.set(booking);
        },
        error: (error) => {
          this.errorMessage.set(bookingErrorMessage(error));

          if (error instanceof HttpErrorResponse && error.status === 409) {
            this.refreshSearchAfterConflict();
          }
        },
      });
  }

  protected priceLabel(price: number | undefined): string {
    return price === undefined || price === null ? 'Precio a consultar' : `$ ${price}`;
  }

  protected dateLabel(value: string): string {
    return new Date(value).toLocaleString([], {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  protected bookingDateTime(value: string): { date: string; time: string } {
    const [date, rawTime = ''] = value.split('T');
    const [hour = '', minute = ''] = rawTime.split(':');

    return {
      date,
      time: hour && minute ? `${hour}:${minute}` : rawTime,
    };
  }

  private loadBusinessDetail(businessId: string): void {
    this.loading.set(true);

    this.bookingService
      .getBusiness(businessId)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (detail) => this.businessDetail.set(detail),
        error: () => this.businessDetail.set(null),
      });
  }

  private refreshSearchAfterConflict(): void {
    const rawSearch = this.route.snapshot.queryParamMap.get('search');

    if (!rawSearch) {
      return;
    }

    const parsedSearch = JSON.parse(rawSearch) as {
      service: string;
      date: string;
      zone: string;
      timeFrom: string;
      timeTo: string;
    };

    this.bookingService.searchAvailability(parsedSearch, { offset: 0, limit: 10 }).subscribe({
      next: (page) => {
        sessionStorage.setItem('turnero.lastAvailability', JSON.stringify(page.results));
      },
      error: () => undefined,
    });
  }

  private slotFromRoute(): SelectedSlot | null {
    const params = this.route.snapshot.queryParamMap;
    const businessId = params.get('businessId');
    const branchId = params.get('branchId');
    const serviceId = params.get('serviceId');
    const slotId = params.get('slotId');
    const startsAt = params.get('startsAt');

    if (!businessId || !branchId || !serviceId || !slotId || !startsAt) {
      return this.storedSlot();
    }

    const price = params.get('price');

    return {
      businessId,
      businessName: params.get('businessName') ?? 'Comercio',
      branchId,
      branchName: params.get('branchName') ?? 'Sucursal',
      serviceId,
      serviceName: params.get('serviceName') ?? 'Servicio',
      slotId,
      startsAt,
      endsAt: params.get('endsAt') ?? undefined,
      resourceId: params.get('resourceId') ?? undefined,
      resourceName: params.get('resourceName') ?? undefined,
      price: price ? Number(price) : undefined,
    };
  }

  private storedSlot(): SelectedSlot | null {
    const stored = sessionStorage.getItem('turnero.selectedSlot');

    if (!stored) {
      return null;
    }

    try {
      const slot = JSON.parse(stored) as SelectedSlot;

      return slot.businessId && slot.branchId && slot.serviceId && slot.slotId && slot.startsAt
        ? slot
        : null;
    } catch {
      sessionStorage.removeItem('turnero.selectedSlot');
      return null;
    }
  }
}
