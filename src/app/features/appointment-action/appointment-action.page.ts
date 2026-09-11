import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { finalize } from 'rxjs';
import { AppointmentAction } from './appointment-action.models';
import { AppointmentActionService } from './appointment-action.service';

type ActionResult = 'confirmed' | 'cancelled' | null;

@Component({
  selector: 'app-appointment-action-page',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <section class="appointment-action-page">
      <article class="appointment-card" aria-live="polite">
        @if (loading()) {
          <div class="state-message">
            <span class="spinner" aria-hidden="true"></span>
            <p>Cargando tu turno…</p>
          </div>
        } @else if (errorMessage()) {
          <div class="state-message error-state">
            <mat-icon aria-hidden="true">event_busy</mat-icon>
            <h1>No pudimos gestionar tu turno</h1>
            <p>{{ errorMessage() }}</p>
            @if (canRetry()) {
              <button mat-stroked-button type="button" (click)="loadAppointment()">
                Intentar nuevamente
              </button>
            }
          </div>
        } @else if (appointment(); as appointment) {
          @if (actionResult() === 'confirmed') {
            <div class="state-message success-state">
              <mat-icon aria-hidden="true">check_circle</mat-icon>
              <h1>Tu turno fue confirmado</h1>
              <p>
                Te esperamos el {{ formattedDate(appointment.date) }} a las {{ appointment.time }}.
              </p>
            </div>
          } @else if (actionResult() === 'cancelled') {
            <div class="state-message cancelled-state">
              <mat-icon aria-hidden="true">event_busy</mat-icon>
              <h1>Tu turno fue cancelado</h1>
            </div>
          } @else {
            <header>
              <span class="eyebrow">Tu turno</span>
              <h1>{{ appointment.businessName }}</h1>
              <p class="service-name">{{ appointment.serviceName }}</p>
            </header>

            <div class="appointment-time">
              <mat-icon aria-hidden="true">calendar_today</mat-icon>
              <div>
                <strong>{{ formattedDate(appointment.date) }}</strong>
                <span>{{ appointment.time }} hs</span>
              </div>
            </div>

            @if (!appointment.tokenValid) {
              <div class="managed-state">
                <p>Este turno ya fue gestionado.</p>
                <strong>{{ statusLabel(appointment.status) }}</strong>
              </div>
            } @else if (confirmingCancellation()) {
              <div class="cancel-confirmation">
                <strong>¿Seguro que querés cancelar este turno?</strong>
                <div class="confirmation-actions">
                  <button
                    mat-button
                    type="button"
                    [disabled]="submitting()"
                    (click)="closeCancel()"
                  >
                    Volver
                  </button>
                  <button
                    mat-flat-button
                    class="danger-button"
                    type="button"
                    [disabled]="submitting()"
                    (click)="cancel()"
                  >
                    {{ submitting() ? 'Cancelando…' : 'Sí, cancelar' }}
                  </button>
                </div>
              </div>
            } @else {
              @if (actionError()) {
                <p class="action-error" role="alert">{{ actionError() }}</p>
              }
              <div class="primary-actions">
                <button mat-flat-button type="button" [disabled]="submitting()" (click)="confirm()">
                  {{ submitting() ? 'Confirmando…' : 'Confirmar turno' }}
                </button>
                <button
                  mat-stroked-button
                  type="button"
                  [disabled]="submitting()"
                  (click)="openCancel()"
                >
                  Cancelar turno
                </button>
              </div>
            }
          }
        }
      </article>
    </section>
  `,
  styleUrl: './appointment-action.page.scss',
})
export class AppointmentActionPage implements OnInit {
  private readonly api = inject(AppointmentActionService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private token = '';

  protected readonly appointment = signal<AppointmentAction | null>(null);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly confirmingCancellation = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly actionError = signal('');
  protected readonly canRetry = signal(false);
  protected readonly actionResult = signal<ActionResult>(null);

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.token = params.get('token') ?? '';
      this.loadAppointment();
    });
  }

  protected loadAppointment(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.canRetry.set(false);
    this.api
      .get(this.token)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (appointment) => this.appointment.set(appointment),
        error: (error) => this.handleLoadError(error),
      });
  }

  protected confirm(): void {
    this.submit('confirmed');
  }

  protected openCancel(): void {
    this.actionError.set('');
    this.confirmingCancellation.set(true);
  }

  protected closeCancel(): void {
    this.confirmingCancellation.set(false);
  }

  protected cancel(): void {
    this.submit('cancelled');
  }

  protected formattedDate(date: string): string {
    const [year, month, day] = date.split('-').map(Number);
    if (!year || !month || !day) return date;

    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
      .format(new Date(year, month - 1, day))
      .replace(',', '');
  }

  protected statusLabel(status: AppointmentAction['status']): string {
    if (status === 'CONFIRMED') return 'Turno confirmado';
    if (status === 'CANCELLED') return 'Turno cancelado';
    return 'Turno pendiente de confirmación';
  }

  private submit(result: Exclude<ActionResult, null>): void {
    if (this.submitting() || !this.appointment()?.tokenValid) return;

    this.submitting.set(true);
    this.actionError.set('');
    const request =
      result === 'confirmed' ? this.api.confirm(this.token) : this.api.cancel(this.token);
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (appointment) => {
          this.appointment.set(appointment);
          this.actionResult.set(result);
          this.confirmingCancellation.set(false);
        },
        error: (error) => this.handleActionError(error),
      });
  }

  private handleLoadError(error: unknown): void {
    const status =
      error instanceof HttpErrorResponse
        ? error.status
        : Number((error as { status?: number })?.status);
    if (status === 404) {
      this.errorMessage.set('El enlace no es válido. Revisá que esté completo.');
      return;
    }
    if (status === 410) {
      this.errorMessage.set('Este enlace venció y ya no permite gestionar el turno.');
      return;
    }
    this.canRetry.set(true);
    this.errorMessage.set('Ocurrió un problema al cargar el turno. Intentá nuevamente.');
  }

  private handleActionError(error: unknown): void {
    const status =
      error instanceof HttpErrorResponse
        ? error.status
        : Number((error as { status?: number })?.status);
    if (status === 409) {
      this.confirmingCancellation.set(false);
      this.loadAppointment();
      return;
    }
    if (status === 410) {
      this.confirmingCancellation.set(false);
      this.errorMessage.set('Este enlace venció y ya no permite gestionar el turno.');
      return;
    }
    this.actionError.set('No pudimos realizar la acción. Intentá nuevamente.');
  }
}
