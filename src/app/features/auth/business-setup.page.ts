import { Component, inject, OnInit } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { finalize } from 'rxjs';
import { authErrorMessage } from './auth-errors';
import { AuthService } from './auth.service';
import { BusinessCategory } from './auth.models';

@Component({
  selector: 'app-business-setup-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  template: `
    <section class="setup-shell">
      <mat-card appearance="outlined" class="setup-card">
        <mat-card-header>
          <mat-card-title>Creá tu empresa</mat-card-title>
          <mat-card-subtitle>
            Completá estos datos una sola vez para comenzar a configurar tu agenda.
          </mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Nombre de la empresa</mat-label>
              <input matInput formControlName="name" autocomplete="organization" />
              @if (form.controls.name.hasError('required')) {
                <mat-error>El nombre es obligatorio.</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Categoría</mat-label>
              <mat-select formControlName="category">
                @for (category of categories; track category.value) {
                  <mat-option [value]="category.value">{{ category.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Email de contacto</mat-label>
              <input matInput type="email" formControlName="contactEmail" autocomplete="email" />
              @if (form.controls.contactEmail.hasError('email')) {
                <mat-error>Ingresá un email válido.</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>WhatsApp</mat-label>
              <input matInput formControlName="whatsapp" placeholder="+54911..." />
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Teléfono</mat-label>
              <input matInput type="tel" formControlName="phone" autocomplete="tel" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Instagram</mat-label>
              <input matInput formControlName="instagram" placeholder="https://instagram.com/..." />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Descripción breve</mat-label>
              <textarea matInput rows="2" maxlength="500" formControlName="shortDescription"></textarea>
              <mat-hint align="end">{{ form.controls.shortDescription.value.length }}/500</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Acerca de la empresa</mat-label>
              <textarea matInput rows="4" maxlength="5000" formControlName="aboutUs"></textarea>
              <mat-hint align="end">{{ form.controls.aboutUs.value.length }}/5000</mat-hint>
            </mat-form-field>

            <mat-checkbox formControlName="depositEnabled" class="full-width">
              Habilitar señas para las reservas
            </mat-checkbox>

            @if (errorMessage) {
              <p class="form-error full-width" role="alert">{{ errorMessage }}</p>
            }

            <button
              mat-flat-button
              class="submit-button full-width"
              type="submit"
              [disabled]="form.invalid || isSubmitting"
            >
              {{ isSubmitting ? 'Creando empresa…' : 'Crear empresa y continuar' }}
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </section>
  `,
  styles: `
    .setup-shell {
      box-sizing: border-box;
      display: grid;
      min-height: 100dvh;
      place-items: center;
      padding: 32px 16px;
      background: var(--mat-sys-surface-container-low);
    }

    .setup-card {
      width: min(100%, 760px);
    }

    form {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      padding-top: 24px;
    }

    .full-width {
      grid-column: 1 / -1;
    }

    .submit-button {
      min-height: 48px;
      --mat-button-filled-container-color: #0866f5;
      --mat-button-filled-label-text-color: white;
    }

    .form-error {
      margin: 0;
      color: var(--mat-sys-error);
    }

    @media (max-width: 640px) {
      form {
        grid-template-columns: 1fr;
      }

      form > * {
        grid-column: 1;
      }
    }
  `,
})
export class BusinessSetupPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);

  protected errorMessage = '';
  protected isSubmitting = false;
  protected readonly categories: ReadonlyArray<{ value: BusinessCategory; label: string }> = [
    { value: 'BARBERSHOP', label: 'Barbería' },
    { value: 'HAIRDRESSER', label: 'Peluquería' },
    { value: 'BEAUTY', label: 'Belleza' },
    { value: 'WELLNESS', label: 'Bienestar' },
    { value: 'HEALTH', label: 'Salud' },
    { value: 'FITNESS', label: 'Actividad física' },
    { value: 'PET_SERVICES', label: 'Servicios para mascotas' },
    { value: 'EDUCATION', label: 'Educación' },
    { value: 'PROFESSIONAL_SERVICES', label: 'Servicios profesionales' },
    { value: 'OTHERS', label: 'Otros' },
  ];
  protected readonly form = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(160)]],
    category: this.formBuilder.control<BusinessCategory>('OTHERS', Validators.required),
    shortDescription: ['', Validators.maxLength(500)],
    aboutUs: ['', Validators.maxLength(5000)],
    whatsapp: ['', Validators.maxLength(40)],
    instagram: ['', Validators.maxLength(255)],
    phone: ['', Validators.maxLength(40)],
    contactEmail: [this.authService.email, Validators.email],
    depositEnabled: false,
  });

  ngOnInit(): void {
    if (this.authService.businessId) {
      void this.router.navigateByUrl(this.authService.withBusinessSlug('/business-dashboard'));
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.isSubmitting || this.authService.businessId) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;
    this.authService
      .createBusiness(this.form.getRawValue())
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () =>
          this.router.navigateByUrl(this.authService.withBusinessSlug('/business-dashboard')),
        error: (error) => (this.errorMessage = authErrorMessage(error)),
      });
  }
}
