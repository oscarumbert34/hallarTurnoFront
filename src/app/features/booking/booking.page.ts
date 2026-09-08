import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { UiStateComponent } from '../../shared/ui-state.component';
import { AuthService } from '../auth/auth.service';
import { bookingErrorMessage } from './booking-error';
import { AvailabilitySearch, CustomerBooking, SelectedSlot } from './booking.models';
import { BookingService } from './booking.service';

@Component({
  selector: 'app-booking-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
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
        <p>Revisa el turno seleccionado y confirma cuando estés listo.</p>
      </header>

      <app-ui-state [loading]="loading()" [error]="errorMessage()" />

      @if (selectedSlot(); as selectedSlot) {
        <mat-card appearance="outlined">
          <mat-card-header>
            <mat-card-title>{{ selectedSlot.businessName }}</mat-card-title>
            <mat-card-subtitle>{{ selectedSlot.branchName }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
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

              <mat-form-field appearance="outline" class="field-with-hint">
                <mat-label>Teléfono</mat-label>
                <input matInput formControlName="customerPhone" maxlength="10" />
                <mat-hint
                  >Ingresa 10 dígitos sin 0, 15, espacios ni guiones. Ejemplo: 1124546622.</mat-hint
                >
                @if (customerForm.controls.customerPhone.hasError('required')) {
                  <mat-error>Ingresa tu teléfono.</mat-error>
                } @else {
                  <mat-error>Usa el formato 1124546622.</mat-error>
                }
              </mat-form-field>

              @if (customerContactLookupLoading()) {
                <p class="customer-lookup" role="status">Buscando datos del cliente...</p>
              }

              @if (emailRequired()) {
                <mat-checkbox class="customer-skip-contact" formControlName="skipCustomerContact">
                  No tengo el email del cliente
                </mat-checkbox>

                @if (!skipCustomerContact()) {
                  <mat-form-field appearance="outline" class="field-with-hint">
                    <mat-label>Email</mat-label>
                    <input
                      matInput
                      type="email"
                      autocomplete="email"
                      formControlName="customerEmail"
                      maxlength="160"
                    />
                    <mat-hint>Lo necesitamos para registrar este cliente nuevo.</mat-hint>
                    @if (customerForm.controls.customerEmail.hasError('required')) {
                      <mat-error>Ingresa un email.</mat-error>
                    } @else {
                      <mat-error>Ingresa un email válido.</mat-error>
                    }
                  </mat-form-field>
                }
              }
            </form>

            @if (confirmedBooking(); as confirmedBooking) {
              <p class="success" role="status">Reserva confirmada.</p>
            }
          </mat-card-content>
          <mat-card-actions>
            @if (!confirmedBooking()) {
              <button
                mat-flat-button
                class="confirm-booking"
                type="button"
                [disabled]="customerForm.invalid || saving() || !canConfirmCustomer()"
                (click)="confirmBooking()"
              >
                Confirmar turno
              </button>
            }
            <a mat-button [routerLink]="searchRoute">Buscar otro</a>
          </mat-card-actions>
        </mat-card>
      } @else {
        <mat-card appearance="outlined">
          <mat-card-content>
            <p>Elegí un turno desde el buscador para continuar.</p>
          </mat-card-content>
          <mat-card-actions>
            <a mat-flat-button [routerLink]="searchRoute">Ir al buscador</a>
          </mat-card-actions>
        </mat-card>
      }
    </section>
  `,
  styleUrl: './booking.page.scss',
})
export class BookingPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly bookingService = inject(BookingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  protected readonly searchRoute = this.authService.isAuthenticated ? '/search' : '/public-search';

  protected readonly selectedSlot = signal<SelectedSlot | null>(null);
  protected readonly confirmedBooking = signal<CustomerBooking | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly customerContactLookupStatus = signal<CustomerContactLookupStatus>('idle');
  protected readonly customerContactLookupLoading = computed(
    () => this.customerContactLookupStatus() === 'loading',
  );
  protected readonly canConfirmCustomer = computed(() => {
    const phoneControl = this.customerForm.controls.customerPhone;

    return (
      phoneControl.invalid ||
      this.customerContactLookupStatus() === 'existing' ||
      this.customerContactLookupStatus() === 'new'
    );
  });
  protected readonly emailRequired = signal(false);
  protected readonly skipCustomerContact = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly customerForm = this.formBuilder.nonNullable.group({
    customerName: ['', [Validators.required, Validators.maxLength(120)]],
    customerPhone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
    customerEmail: ['', [Validators.maxLength(160), Validators.email]],
    skipCustomerContact: [false],
  });

  ngOnInit(): void {
    this.selectedSlot.set(this.slotFromRoute());
    const selectedSlot = this.selectedSlot();
    this.watchSkipCustomerContact();

    if (selectedSlot) {
      this.watchCustomerPhone(selectedSlot.businessId);
    }
  }

  protected confirmBooking(): void {
    const selectedSlot = this.selectedSlot();

    if (!selectedSlot || this.confirmedBooking()) {
      return;
    }

    if (this.customerForm.invalid || !this.canConfirmCustomer()) {
      this.customerForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    const { date, time } = this.bookingDateTime(selectedSlot.startsAt);
    const customer = this.customerForm.getRawValue();
    const customerEmail = customer.customerEmail.trim();
    const skipCustomerContact = this.emailRequired() && customer.skipCustomerContact;

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
        skipCustomerContact: skipCustomerContact ? true : null,
        ...(this.emailRequired() && !skipCustomerContact && customerEmail ? { customerEmail } : {}),
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
      hour12: false,
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

  private watchCustomerPhone(businessId: string): void {
    this.customerForm.controls.customerPhone.valueChanges
      .pipe(
        debounceTime(300),
        map((phone) => phone.trim()),
        distinctUntilChanged(),
        tap(() => {
          this.errorMessage.set('');
          this.setEmailRequired(false);
          this.customerContactLookupStatus.set('idle');
        }),
        switchMap((phone) => {
          if (this.customerForm.controls.customerPhone.invalid) {
            return of<'idle' | 'existing' | 'new' | 'error'>('idle');
          }

          this.customerContactLookupStatus.set('loading');

          return this.bookingService.searchCustomerContact(businessId, phone).pipe(
            map((response) => (response.emailRequired ? ('new' as const) : ('existing' as const))),
            catchError(() => of('error' as const)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((status) => {
        this.customerContactLookupStatus.set(status);

        if (status === 'new') {
          this.setEmailRequired(true);
          return;
        }

        if (status === 'error') {
          this.errorMessage.set(
            'No pudimos consultar si se requiere email. Intenta de nuevo en unos segundos.',
          );
        }
      });
  }

  private watchSkipCustomerContact(): void {
    this.customerForm.controls.skipCustomerContact.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((skipCustomerContact) => {
        this.skipCustomerContact.set(skipCustomerContact);
        this.updateCustomerEmailValidators();
      });
  }

  private setEmailRequired(emailRequired: boolean): void {
    this.emailRequired.set(emailRequired);

    if (!emailRequired) {
      this.customerForm.controls.skipCustomerContact.setValue(false, { emitEvent: false });
      this.skipCustomerContact.set(false);
    }

    this.updateCustomerEmailValidators();
  }

  private updateCustomerEmailValidators(): void {
    const emailControl = this.customerForm.controls.customerEmail;

    if (this.emailRequired() && !this.skipCustomerContact()) {
      emailControl.setValidators([
        Validators.required,
        Validators.maxLength(160),
        Validators.email,
      ]);
    } else {
      emailControl.setValue('', { emitEvent: false });
      emailControl.setValidators([Validators.maxLength(160), Validators.email]);
    }

    emailControl.updateValueAndValidity({ emitEvent: false });
  }

  private refreshSearchAfterConflict(): void {
    const rawSearch = this.route.snapshot.queryParamMap.get('search');

    if (!rawSearch) {
      return;
    }

    const parsedSearch = JSON.parse(rawSearch) as AvailabilitySearch;

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

type CustomerContactLookupStatus = 'idle' | 'loading' | 'existing' | 'new' | 'error';
