import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { finalize } from 'rxjs';
import { customerAuthErrorMessage } from './customer-auth.errors';
import { CustomerAuthService } from './customer-auth.service';
import { customerAuthStyles } from './customer-auth.styles';

@Component({
  selector: 'app-customer-login-page',
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
          <mat-card-title>Ingresar como cliente</mat-card-title>
          <mat-card-subtitle>Accedé a tu cuenta de HallarTurno</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" autocomplete="email" formControlName="email" />
              @if (form.controls.email.hasError('required')) {
                <mat-error>El email es obligatorio.</mat-error>
              } @else if (form.controls.email.hasError('email')) {
                <mat-error>Ingresá un email válido.</mat-error>
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
                <mat-error>La contraseña es obligatoria.</mat-error>
              } @else if (form.controls.password.hasError('minlength')) {
                <mat-error>Debe tener al menos 8 caracteres.</mat-error>
              }
            </mat-form-field>

            @if (errorMessage) {
              <p class="form-error" role="alert">{{ errorMessage }}</p>
            }

            <button
              mat-flat-button
              class="submit-button"
              type="submit"
              [disabled]="form.invalid || isSubmitting"
            >
              Ingresar
            </button>
          </form>
        </mat-card-content>

        <mat-card-actions>
          <a mat-button routerLink="/customer/register">Crear cuenta de cliente</a>
        </mat-card-actions>
      </mat-card>
    </section>
  `,
  styles: customerAuthStyles,
})
export class CustomerLoginPage {
  private readonly customerAuth = inject(CustomerAuthService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected errorMessage = '';
  protected isSubmitting = false;
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
    this.customerAuth
      .login(this.form.getRawValue())
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => this.router.navigateByUrl(this.destination()),
        error: (error) => (this.errorMessage = customerAuthErrorMessage(error)),
      });
  }

  private destination(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    return returnUrl?.startsWith('/') && !returnUrl.startsWith('//')
      ? returnUrl
      : '/customer/agenda';
  }
}
