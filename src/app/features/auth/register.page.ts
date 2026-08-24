import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { finalize } from 'rxjs';
import { authErrorMessage } from './auth-errors';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-register-page',
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
          <mat-card-title>Crear cuenta</mat-card-title>
          <mat-card-subtitle>Registro basico para el MVP</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline">
              <mat-label>Nombre</mat-label>
              <input matInput autocomplete="name" formControlName="name" />
              @if (form.controls.name.hasError('required')) {
                <mat-error>El nombre es obligatorio.</mat-error>
              } @else if (form.controls.name.hasError('minlength')) {
                <mat-error>Debe tener al menos 2 caracteres.</mat-error>
              }
            </mat-form-field>

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
                autocomplete="new-password"
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

            <button mat-flat-button type="submit" [disabled]="form.invalid || isSubmitting">
              Registrarme
            </button>
          </form>
        </mat-card-content>

        <mat-card-actions>
          <a mat-button routerLink="/auth/login">Ya tengo cuenta</a>
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
  `,
})
export class RegisterPage {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);

  protected errorMessage = '';
  protected isSubmitting = false;
  protected readonly form = this.formBuilder.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
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
      .register(this.form.getRawValue())
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => this.router.navigate(['/auth/login'], { queryParams: { registered: true } }),
        error: (error) => (this.errorMessage = authErrorMessage(error)),
      });
  }
}
