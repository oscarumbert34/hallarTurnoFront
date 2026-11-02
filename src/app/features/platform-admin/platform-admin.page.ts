import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { UiStateComponent } from '../../shared/ui-state.component';
import { dashboardErrorMessage } from '../business-dashboard/dashboard-error';
import { PlatformAdminService, PlatformBusiness } from './platform-admin.service';

@Component({
  selector: 'app-platform-admin-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
    UiStateComponent,
  ],
  template: `
    <section class="platform-admin turnero-screen">
      <header>
        <div>
          <span class="eyebrow">Administración restringida</span>
          <h1>Usuarios de comercios</h1>
          <p>Actualizá el correo con el que el propietario accede a HallarTurno.</p>
        </div>
      </header>

      <app-ui-state [loading]="loading()" [error]="error()" />

      <mat-form-field class="search" appearance="outline">
        <mat-label>Buscar comercio</mat-label>
        <mat-icon matPrefix aria-hidden="true">search</mat-icon>
        <input matInput [value]="query()" (input)="query.set($any($event.target).value)" />
      </mat-form-field>

      <div class="summary">
        <strong>{{ filteredBusinesses().length }}</strong>
        <span>{{ filteredBusinesses().length === 1 ? 'comercio' : 'comercios' }}</span>
      </div>

      <div class="business-list">
        @for (business of filteredBusinesses(); track business.id) {
          <mat-card appearance="outlined" [class.editing]="editingId() === business.id">
            <mat-card-content>
              <div class="business-copy">
                <div class="title-line">
                  <h2>{{ business.name }}</h2>
                  <span class="status">{{ business.status }}</span>
                </div>
                <span>/{{ business.slug }}</span>
                <small>Propietario: {{ business.ownerEmail }}</small>
              </div>

              @if (editingId() === business.id) {
                <form [formGroup]="emailForm" (ngSubmit)="save(business)">
                  <mat-form-field appearance="outline">
                    <mat-label>Email de acceso del propietario</mat-label>
                    <mat-icon matPrefix aria-hidden="true">mail</mat-icon>
                    <input matInput type="email" maxlength="320" formControlName="email" />
                    <mat-error>Ingresá un email válido.</mat-error>
                  </mat-form-field>
                  <div class="actions">
                    <button
                      mat-flat-button
                      type="submit"
                      [disabled]="emailForm.invalid || saving()"
                    >
                      {{ saving() ? 'Guardando…' : 'Guardar' }}
                    </button>
                    <button mat-button type="button" [disabled]="saving()" (click)="cancel()">
                      Cancelar
                    </button>
                  </div>
                </form>
              } @else {
                <div class="email-display">
                  <div>
                    <span>Email de acceso del propietario</span>
                    <strong>{{ business.ownerEmail }}</strong>
                  </div>
                  <button mat-stroked-button type="button" (click)="edit(business)">
                    <mat-icon aria-hidden="true">edit</mat-icon>Modificar
                  </button>
                </div>
              }
            </mat-card-content>
          </mat-card>
        } @empty {
          @if (!loading()) {
            <mat-card class="empty" appearance="outlined">
              <mat-icon aria-hidden="true">storefront</mat-icon>
              <h2>No encontramos comercios</h2>
              <p>Probá con otro nombre, slug o correo.</p>
            </mat-card>
          }
        }
      </div>
    </section>
  `,
  styleUrl: './platform-admin.page.scss',
})
export class PlatformAdminPage implements OnInit {
  private readonly service = inject(PlatformAdminService);
  private readonly fb = inject(FormBuilder);
  protected readonly businesses = signal<PlatformBusiness[]>([]);
  protected readonly query = signal('');
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly editingId = signal<string | null>(null);
  protected readonly emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(320)]],
  });
  protected readonly filteredBusinesses = computed(() => {
    const query = this.query().trim().toLowerCase();
    if (!query) return this.businesses();
    return this.businesses().filter((business) =>
      [business.name, business.slug, business.contactEmail, business.ownerEmail]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(query)),
    );
  });

  ngOnInit(): void {
    this.service
      .listBusinesses()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (businesses) => this.businesses.set(businesses),
        error: (error: unknown) => this.error.set(dashboardErrorMessage(error)),
      });
  }

  protected edit(business: PlatformBusiness): void {
    this.editingId.set(business.id);
    this.emailForm.setValue({ email: business.ownerEmail });
    this.error.set('');
  }

  protected cancel(): void {
    this.editingId.set(null);
    this.emailForm.reset({ email: '' });
  }

  protected save(business: PlatformBusiness): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.service
      .updateBusinessEmail(business.id, this.emailForm.controls.email.value.trim())
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (updated) => {
          this.businesses.update((items) =>
            items.map((item) => (item.id === updated.id ? updated : item)),
          );
          this.cancel();
        },
        error: (error: unknown) => this.error.set(dashboardErrorMessage(error)),
      });
  }
}
