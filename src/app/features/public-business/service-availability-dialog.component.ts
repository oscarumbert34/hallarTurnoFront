import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Subscription } from 'rxjs';
import { BookingService } from '../booking/booking.service';
import { AvailabilitySlot } from '../booking/booking.models';
import { navigateToBooking } from '../booking/booking-navigation';
import { PublicBranch, PublicBusiness, PublicService } from './public-business.models';

export interface ServiceAvailabilityDialogData {
  business: PublicBusiness;
  branch: PublicBranch;
  service: PublicService;
}

@Component({
  selector: 'app-service-availability-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <h2 mat-dialog-title>{{ data.service.name }}</h2>
    <mat-dialog-content>
      <p>{{ data.branch.name }}</p>
      <mat-form-field appearance="outline">
        <mat-label>Seleccioná una fecha</mat-label>
        <input
          matInput
          [matDatepicker]="picker"
          [min]="today"
          [value]="date()"
          (dateChange)="changeDate($event.value)"
        />
        <mat-datepicker-toggle matIconSuffix [for]="picker" />
        <mat-datepicker #picker />
      </mat-form-field>
      <h3>Horarios disponibles</h3>
      @if (loading()) {
        <p role="status">Cargando horarios...</p>
      }
      @if (error()) {
        <p role="alert">{{ error() }}</p>
        <button mat-button (click)="load()">Reintentar</button>
      }
      <div class="slots">
        @for (slot of slots(); track slot.id) {
          <button mat-stroked-button [disabled]="loading()" (click)="selectSlot(slot)">
            {{ slot.startsAt.slice(11, 16) }}
            @if (slot.resourceName) {
              <span>{{ slot.resourceName }}</span>
            }
          </button>
        }
      </div>
      @if (!loading() && !error() && !slots().length) {
        <p role="status">No encontramos turnos disponibles para esta fecha.</p>
      }
      @if (hasMore()) {
        <button mat-button [disabled]="loading()" (click)="load(true)">Ver más horarios</button>
      }
      <button mat-button (click)="nextDay()">Día siguiente</button>
    </mat-dialog-content>
    <mat-dialog-actions align="end"
      ><button mat-button mat-dialog-close>Cerrar</button></mat-dialog-actions
    >
  `,
  styles: `
    mat-form-field {
      width: 100%;
    }
    .slots {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .slots button {
      height: auto;
      min-height: 56px;
      padding: 12px;
    }
    .slots span {
      display: block;
      font-size: 12px;
    }
  `,
})
export class ServiceAvailabilityDialogComponent implements OnInit {
  protected readonly data = inject<ServiceAvailabilityDialogData>(MAT_DIALOG_DATA);
  private readonly api = inject(BookingService);
  private readonly router = inject(Router);
  private readonly dialogRef = inject(MatDialogRef<ServiceAvailabilityDialogComponent>);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  private offset = 0;
  protected readonly today = new Date(new Date().setHours(0, 0, 0, 0));
  protected readonly date = signal(this.today);
  protected readonly slots = signal<AvailabilitySlot[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly hasMore = signal(false);

  ngOnInit(): void {
    this.load();
  }

  protected changeDate(date: Date | null): void {
    this.request?.unsubscribe();
    this.slots.set([]);
    this.hasMore.set(false);
    if (!date || isNaN(date.getTime()) || date < this.today) {
      this.loading.set(false);
      this.error.set('Seleccioná una fecha válida a partir de hoy.');
      return;
    }
    this.date.set(date);
    this.load();
  }

  protected nextDay(): void {
    const next = new Date(this.date());
    next.setDate(next.getDate() + 1);
    this.changeDate(next);
  }

  private search() {
    const date = this.date();
    return {
      businessId: this.data.business.id,
      business: this.data.business.name,
      branchId: this.data.branch.id,
      service: this.data.service.name,
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      timeFrom: '00:00',
      timeTo: '23:59',
    };
  }

  protected load(append = false): void {
    this.request?.unsubscribe();
    if (!append) {
      this.offset = 0;
      this.slots.set([]);
      this.hasMore.set(false);
    }
    this.loading.set(true);
    this.error.set('');
    this.request = this.api
      .listAvailabilitySlots(
        { branchId: this.data.branch.id, serviceId: this.data.service.id },
        this.search(),
        { offset: this.offset, limit: 10 },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.slots.update((slots) => (append ? [...slots, ...page.slots] : page.slots));
          this.offset = page.offset + page.limit;
          this.hasMore.set(page.hasMore);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No pudimos consultar los horarios. Intentá nuevamente.');
          this.loading.set(false);
        },
      });
  }

  protected selectSlot(slot: AvailabilitySlot): void {
    const { business, branch, service } = this.data;
    this.dialogRef.close();
    navigateToBooking(
      this.router,
      {
        businessId: business.id,
        businessName: business.name,
        depositEnabled: business.depositEnabled ?? false,
        branchId: branch.id,
        branchName: branch.name,
        address: branch.address,
        zone: branch.city,
        serviceId: service.id,
        serviceName: service.name,
        price: service.price,
        durationMinutes: service.durationMinutes,
        slots: [],
      },
      slot,
      this.search(),
    );
  }
}
