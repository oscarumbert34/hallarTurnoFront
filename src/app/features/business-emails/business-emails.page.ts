import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UiStateComponent } from '../../shared/ui-state.component';
import {
  AUTOMATION_ORDER,
  automationCanEnable,
  EmailAutomationType,
  EmailPreferencesRequest,
  EmailStatus,
  preferencesFromStatus,
} from './business-emails.models';
import { BusinessEmailsService } from './business-emails.service';

@Component({
  selector: 'app-business-emails-page',
  imports: [MatButtonModule, MatIconModule, MatSlideToggleModule, UiStateComponent],
  template: `
    <main class="emails-page turnero-screen">
      <header class="page-header">
        <div>
          <span class="eyebrow">COMUNICACIONES</span>
          <h1>Mis correos</h1>
          <p>Configurá qué mensajes recibe tu negocio y cuáles reciben tus clientes.</p>
        </div>
        <button mat-stroked-button type="button" (click)="load()" [disabled]="loading()">
          <mat-icon aria-hidden="true">refresh</mat-icon> Actualizar
        </button>
      </header>
      <app-ui-state [loading]="loading()" [error]="loadError()" />

      @if (status(); as emailStatus) {
        @if (emailStatus.recentFailures > 0) {
          <section class="notice" role="status">
            <mat-icon aria-hidden="true">mark_email_unread</mat-icon>
            <div>
              <strong>Algunos correos no pudieron enviarse</strong>
              <p>
                Hubo {{ emailStatus.recentFailures }}
                {{ emailStatus.recentFailures === 1 ? 'fallo' : 'fallos' }} en los últimos 7 días.
                Tus reservas no fueron afectadas.
              </p>
            </div>
            <button mat-button type="button" (click)="load()">Revisar estado</button>
          </section>
        }

        <section class="section-block" aria-labelledby="automations-title">
          <header>
            <div>
              <span class="eyebrow">PREFERENCIAS</span>
              <h2 id="automations-title">Automatizaciones</h2>
              <p>Activá o desactivá los mensajes que querés enviar.</p>
            </div>
            <button
              mat-flat-button
              type="button"
              (click)="savePreferences()"
              [disabled]="savingPreferences() || !preferencesDirty()"
            >
              {{ savingPreferences() ? 'Guardando…' : 'Guardar cambios' }}
            </button>
          </header>
          @if (preferencesMessage()) {
            <p class="feedback" [class.error]="preferencesError()" role="status">
              {{ preferencesMessage() }}
            </p>
          }
          <div class="automation-list">
            @for (type of automationOrder; track type) {
              <article>
                <div class="automation-icon">
                  <mat-icon aria-hidden="true">{{ automationIcon(type) }}</mat-icon>
                </div>
                <div class="automation-copy">
                  <strong>{{ automationName(type) }}</strong>
                  <p>{{ automationDescription(type) }}</p>
                  @if (!canEnable(type)) {
                    <small>{{ requiredAddonText(type) }}</small>
                  }
                </div>
                <mat-slide-toggle
                  [checked]="preferenceValue(type)"
                  [disabled]="!canEnable(type) || savingPreferences()"
                  (change)="setPreference(type, $event.checked)"
                  ><span class="visually-hidden">{{ automationName(type) }}</span></mat-slide-toggle
                >
              </article>
            }
          </div>
        </section>
      } @else if (!loading() && !loadError()) {
        <section class="empty-state">
          <mat-icon aria-hidden="true">mail_off</mat-icon>
          <h2>Todavía no hay una configuración de correos</h2>
          <p>Cuando esté disponible vas a poder administrarla desde acá.</p>
        </section>
      }
    </main>
  `,
  styleUrl: './business-emails.page.scss',
})
export class BusinessEmailsPage implements OnInit {
  private readonly service = inject(BusinessEmailsService);
  protected readonly status = signal<EmailStatus | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal('');
  protected readonly savingPreferences = signal(false);
  protected readonly preferences = signal<EmailPreferencesRequest | null>(null);
  protected readonly savedPreferences = signal<EmailPreferencesRequest | null>(null);
  protected readonly preferencesMessage = signal('');
  protected readonly preferencesError = signal(false);
  protected readonly automationOrder = AUTOMATION_ORDER;
  protected readonly preferencesDirty = computed(
    () => JSON.stringify(this.preferences()) !== JSON.stringify(this.savedPreferences()),
  );

  ngOnInit(): void {
    this.load();
  }
  protected load(): void {
    this.loading.set(true);
    this.loadError.set('');
    this.service
      .getStatus()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (status) => this.applyStatus(status),
        error: () =>
          this.loadError.set('No pudimos cargar la configuración de correos. Intentá nuevamente.'),
      });
  }
  protected canEnable(type: EmailAutomationType): boolean {
    const status = this.status();
    return !!status && automationCanEnable(status, type);
  }
  protected preferenceValue(type: EmailAutomationType): boolean {
    const preferences = this.preferences();
    return preferences ? preferences[this.preferenceKey(type)] : false;
  }
  protected setPreference(type: EmailAutomationType, enabled: boolean): void {
    const preferences = this.preferences();
    if (!preferences) return;
    this.preferences.set({ ...preferences, [this.preferenceKey(type)]: enabled });
    this.preferencesMessage.set('');
  }
  protected savePreferences(): void {
    const preferences = this.preferences();
    if (!preferences) return;
    this.savingPreferences.set(true);
    this.preferencesMessage.set('');
    this.preferencesError.set(false);
    this.service
      .updatePreferences(preferences)
      .pipe(finalize(() => this.savingPreferences.set(false)))
      .subscribe({
        next: (status) => {
          this.applyStatus(status);
          this.preferencesMessage.set('Preferencias guardadas.');
        },
        error: () => {
          this.preferencesError.set(true);
          this.preferencesMessage.set(
            'No pudimos guardar. Tus cambios siguen acá para que vuelvas a intentarlo.',
          );
        },
      });
  }
  protected automationName(type: EmailAutomationType): string {
    return {
      BOOKING_CONFIRMATION: 'Confirmación y reprogramación al cliente',
      BOOKING_RESCHEDULE: 'Aviso de reprogramación',
      BUSINESS_DAILY_AGENDA: 'Resumen diario al comercio',
      BOOKING_REMINDER_ACTION: 'Recordatorio y acción',
      BUSINESS_CANCELLATION: 'Aviso de cancelación',
    }[type];
  }
  protected automationDescription(type: EmailAutomationType): string {
    return {
      BOOKING_CONFIRMATION: 'Se envía al crear una reserva y cuando cambia la fecha o el horario.',
      BOOKING_RESCHEDULE: 'Informa al cliente cuando cambia la fecha o el horario.',
      BUSINESS_DAILY_AGENDA: 'Recibí la agenda del día por correo.',
      BOOKING_REMINDER_ACTION: 'Le recuerda el turno al cliente y le permite actuar.',
      BUSINESS_CANCELLATION: 'Te avisa cuando un cliente cancela.',
    }[type];
  }
  protected automationIcon(type: EmailAutomationType): string {
    return {
      BOOKING_CONFIRMATION: 'mark_email_read',
      BOOKING_RESCHEDULE: 'event_repeat',
      BUSINESS_DAILY_AGENDA: 'today',
      BOOKING_REMINDER_ACTION: 'notifications_active',
      BUSINESS_CANCELLATION: 'event_busy',
    }[type];
  }
  protected requiredAddonText(_type: EmailAutomationType): string {
    return 'Esta automatización no está disponible por el momento.';
  }
  private applyStatus(status: EmailStatus): void {
    this.status.set(status);
    const preferences = preferencesFromStatus(status);
    this.preferences.set(preferences);
    this.savedPreferences.set(preferences);
  }
  private preferenceKey(type: EmailAutomationType): keyof EmailPreferencesRequest {
    const keys: Record<EmailAutomationType, keyof EmailPreferencesRequest> = {
      BOOKING_CONFIRMATION: 'confirmationEnabled',
      BOOKING_RESCHEDULE: 'confirmationEnabled',
      BUSINESS_DAILY_AGENDA: 'dailyAgendaEnabled',
      BOOKING_REMINDER_ACTION: 'reminderActionEnabled',
      BUSINESS_CANCELLATION: 'cancellationEnabled',
    };
    return keys[type];
  }
}
