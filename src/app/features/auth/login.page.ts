import { AfterViewInit, Component, ElementRef, inject, ViewChild } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { finalize } from 'rxjs';
import { AuthService } from './auth.service';
import { authErrorMessage } from './auth-errors';
import { GoogleIdentityService } from './google-identity.service';

@Component({
  selector: 'app-login-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  template: `
    <section class="auth-shell">
      <mat-card appearance="outlined" class="auth-card">
        <mat-card-header>
          <mat-card-title>Ingresar</mat-card-title>
          <mat-card-subtitle>Acceso a HallarTurno</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" autocomplete="email" formControlName="email" />
              @if (form.controls.email.hasError('required')) {
                <mat-error>El email es obligatorio.</mat-error>
              } @else if (form.controls.email.hasError('email')) {
                <mat-error>Ingresa un email válido.</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Contraseña</mat-label>
              <input
                matInput
                type="password"
                autocomplete="current-password"
                formControlName="password"
              />
              @if (form.controls.password.hasError('required')) {
                <mat-error>La contrasena es obligatoria.</mat-error>
              } @else if (form.controls.password.hasError('minlength')) {
                <mat-error>Debe tener al menos 8 caracteres.</mat-error>
              }
            </mat-form-field>

            @if (errorMessage) {
              <p class="form-error" role="alert">{{ errorMessage }}</p>
            }

            <button
              mat-flat-button
              class="login-button"
              type="submit"
              [disabled]="form.invalid || isSubmitting"
            >
              Ingresar
            </button>

            <div class="auth-divider"><span>o</span></div>
            <div #googleButton class="google-button" aria-label="Continuar con Google"></div>
            @if (googleErrorMessage) {
              <p class="form-error" role="alert">{{ googleErrorMessage }}</p>
            }
          </form>
        </mat-card-content>

        <mat-card-actions>
          <a mat-button routerLink="/auth/register">Crear cuenta</a>
        </mat-card-actions>
      </mat-card>
    </section>
  `,
  styles: `
    .auth-shell {
      display: grid;
      min-height: calc(100dvh - 180px);
      place-items: center;
    }

    .auth-card {
      width: min(100%, 420px);
    }

    form {
      display: grid;
      gap: 16px;
      padding-top: 16px;
    }

    .form-error {
      margin: 0;
      color: var(--mat-sys-error);
    }

    .login-button {
      --mat-button-filled-container-color: #0866f5;
      --mat-button-filled-label-text-color: white;
    }

    .auth-divider {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--mat-sys-on-surface-variant);
    }

    .auth-divider::before,
    .auth-divider::after {
      content: '';
      height: 1px;
      flex: 1;
      background: var(--mat-sys-outline-variant);
    }

    .google-button {
      display: flex;
      min-height: 44px;
      justify-content: center;
    }
  `,
})
export class LoginPage implements AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly googleIdentity = inject(GoogleIdentityService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected errorMessage = '';
  protected googleErrorMessage = '';
  protected isSubmitting = false;
  @ViewChild('googleButton', { static: true }) private googleButton!: ElementRef<HTMLElement>;
  protected readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected submit(): void {
    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.isSubmitting = true;

    this.authService
      .login(this.form.getRawValue())
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => this.router.navigateByUrl(this.returnUrl()),
        error: (error) => (this.errorMessage = authErrorMessage(error)),
      });
  }

  ngAfterViewInit(): void {
    this.googleIdentity
      .renderButton(this.googleButton.nativeElement, (credential) => this.loginWithGoogle(credential))
      .catch(() => {
        this.googleErrorMessage = 'No pudimos cargar el acceso con Google.';
      });
  }

  private loginWithGoogle(credential: string): void {
    if (this.isSubmitting) {
      return;
    }
    this.errorMessage = '';
    this.googleErrorMessage = '';
    this.isSubmitting = true;
    this.authService
      .loginWithGoogle(credential)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => this.router.navigateByUrl(this.returnUrl()),
        error: (error) => (this.googleErrorMessage = authErrorMessage(error, 'google')),
      });
  }

  private returnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    return returnUrl?.startsWith('/')
      ? this.authService.withBusinessSlug(returnUrl)
      : this.authService.nextUrlForRole();
  }
}
