import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UiStateComponent } from '../../shared/ui-state.component';
import { dashboardErrorMessage } from '../business-dashboard/dashboard-error';
import { PlatformAdminService, PlatformBusiness } from './platform-admin.service';

@Component({
  selector: 'app-platform-admin-page',
  imports: [
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    UiStateComponent,
  ],
  template: `
    <section class="platform-admin turnero-screen">
      <header>
        <div>
          <span class="eyebrow">Administración restringida</span>
          <h1>Usuarios de comercios</h1>
          <p>Administrá el correo, la contraseña y los bloqueos de los propietarios.</p>
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
                @if (isLocked(business)) {
                  <small class="lock-status">
                    <mat-icon aria-hidden="true">lock_clock</mat-icon>
                    Bloqueado temporalmente hasta {{ business.ownerLockedUntil | date: 'dd/MM/yyyy HH:mm' }}
                  </small>
                }
              </div>

              <div class="feature-flags" aria-label="Funcionalidades habilitadas">
                <div>
                  <strong>Funcionalidades</strong>
                  <small>Controlá qué módulos puede utilizar este comercio.</small>
                </div>
                <mat-slide-toggle
                  [checked]="business.features.productsEnabled"
                  [disabled]="saving()"
                  (change)="saveFeatures(business, $event.checked, business.features.virtualQueueEnabled)"
                >Productos</mat-slide-toggle>
                <mat-slide-toggle
                  [checked]="business.features.virtualQueueEnabled"
                  [disabled]="saving()"
                  (change)="saveFeatures(business, business.features.productsEnabled, $event.checked)"
                >Fila virtual</mat-slide-toggle>
              </div>

              @if (editingId() === business.id) {
                <form [formGroup]="emailForm" (ngSubmit)="saveEmail(business)">
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

                <form [formGroup]="passwordForm" (ngSubmit)="savePassword(business)">
                  <h3>Nueva contraseña</h3>
                  <p class="form-help">
                    Al guardarla se desbloquea la cuenta y se reinician los intentos fallidos.
                  </p>
                  <div class="password-fields">
                    <mat-form-field appearance="outline">
                      <mat-label>Contraseña nueva</mat-label>
                      <input
                        matInput
                        [type]="showPassword() ? 'text' : 'password'"
                        maxlength="72"
                        autocomplete="new-password"
                        formControlName="password"
                      />
                      <button
                        mat-icon-button
                        matSuffix
                        type="button"
                        (click)="showPassword.set(!showPassword())"
                        [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                      >
                        <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                      </button>
                      <mat-error>Usá 12 caracteres con mayúscula, minúscula, número y símbolo.</mat-error>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Repetir contraseña</mat-label>
                      <input
                        matInput
                        [type]="showPassword() ? 'text' : 'password'"
                        maxlength="72"
                        autocomplete="new-password"
                        formControlName="confirmation"
                      />
                      @if (passwordForm.controls.confirmation.hasError('mismatch')) {
                        <mat-error>Las contraseñas no coinciden.</mat-error>
                      }
                    </mat-form-field>
                  </div>
                  <div class="actions password-actions">
                    <button mat-stroked-button type="button" [disabled]="saving()" (click)="generatePassword()">
                      <mat-icon aria-hidden="true">password</mat-icon>Generar contraseña segura
                    </button>
                    <button mat-flat-button type="submit" [disabled]="passwordForm.invalid || saving()">
                      {{ saving() ? 'Guardando…' : 'Cambiar contraseña' }}
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
  protected readonly showPassword = signal(false);
  protected readonly emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(320)]],
  });
  protected readonly passwordForm = this.fb.nonNullable.group({
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(12),
        Validators.maxLength(72),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/),
      ],
    ],
    confirmation: ['', [Validators.required]],
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
    this.passwordForm.reset({ password: '', confirmation: '' });
    this.showPassword.set(false);
  }

  protected saveEmail(business: PlatformBusiness): void {
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

  protected generatePassword(): void {
    const password = this.secureRandomPassword(18);
    this.passwordForm.setValue({ password, confirmation: password });
    this.showPassword.set(true);
  }

  protected savePassword(business: PlatformBusiness): void {
    this.validatePasswordConfirmation();
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.service
      .updateBusinessPassword(business.id, this.passwordForm.controls.password.value)
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

  protected saveFeatures(
    business: PlatformBusiness,
    productsEnabled: boolean,
    virtualQueueEnabled: boolean,
  ): void {
    this.saving.set(true);
    this.error.set('');
    this.service
      .updateBusinessFeatures(business.id, { productsEnabled, virtualQueueEnabled })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (updated) => this.replaceBusiness(updated),
        error: (error: unknown) => this.error.set(dashboardErrorMessage(error)),
      });
  }

  private replaceBusiness(updated: PlatformBusiness): void {
    this.businesses.update((items) => items.map((item) => (item.id === updated.id ? updated : item)));
  }

  protected isLocked(business: PlatformBusiness): boolean {
    return !!business.ownerLockedUntil && new Date(business.ownerLockedUntil).getTime() > Date.now();
  }

  private validatePasswordConfirmation(): void {
    const confirmation = this.passwordForm.controls.confirmation;
    if (confirmation.value !== this.passwordForm.controls.password.value) {
      confirmation.setErrors({ ...(confirmation.errors ?? {}), mismatch: true });
    } else if (confirmation.hasError('mismatch')) {
      const errors = { ...(confirmation.errors ?? {}) };
      delete errors['mismatch'];
      confirmation.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  private secureRandomPassword(length: number): string {
    const groups = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%&*+-_='];
    const all = groups.join('');
    const characters = groups.map((group) => this.randomCharacter(group));
    while (characters.length < length) characters.push(this.randomCharacter(all));
    for (let index = characters.length - 1; index > 0; index--) {
      const swapIndex = this.randomIndex(index + 1);
      [characters[index], characters[swapIndex]] = [characters[swapIndex], characters[index]];
    }
    return characters.join('');
  }

  private randomCharacter(source: string): string {
    return source[this.randomIndex(source.length)];
  }

  private randomIndex(maximum: number): number {
    const limit = Math.floor(0x100000000 / maximum) * maximum;
    const value = new Uint32Array(1);
    do crypto.getRandomValues(value); while (value[0] >= limit);
    return value[0] % maximum;
  }
}
