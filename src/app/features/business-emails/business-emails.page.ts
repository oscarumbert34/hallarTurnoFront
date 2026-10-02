import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { UiStateComponent } from '../../shared/ui-state.component';
import {
  AUTOMATION_ORDER, automationCanEnable, EmailAddon, EmailAutomationType,
  EmailPreferencesRequest, EmailStatus, preferencesFromStatus,
} from './business-emails.models';
import { BusinessEmailsService } from './business-emails.service';

interface AddonOption { value: EmailAddon; title: string; price: string; quota: string; features: string[]; }

@Component({
  selector: 'app-business-emails-page',
  imports: [DatePipe, DecimalPipe, MatButtonModule, MatCardModule, MatIconModule, MatProgressBarModule, MatSlideToggleModule, UiStateComponent],
  template: `
    <main class="emails-page turnero-screen">
      <header class="page-header">
        <div><span class="eyebrow">COMUNICACIONES</span><h1>Mis correos</h1><p>Elegí qué mensajes recibe tu negocio y cuáles reciben tus clientes.</p></div>
        <button mat-stroked-button type="button" (click)="load()" [disabled]="loading()"><mat-icon aria-hidden="true">refresh</mat-icon> Actualizar</button>
      </header>
      <app-ui-state [loading]="loading()" [error]="loadError()" />

      @if (status(); as emailStatus) {
        @if (emailStatus.status === 'TRIAL') {
          <section class="trial-banner" [class.last-day]="trialDaysRemaining() <= 1" aria-live="polite">
            <mat-icon aria-hidden="true">auto_awesome</mat-icon>
            <div><strong>Estás probando Pro + Correos Completos</strong><p>
              @if (trialDaysRemaining() > 1) { Te quedan {{ trialDaysRemaining() }} días. La prueba termina el {{ emailStatus.trialEndsAt | date: 'd/MM/yyyy' }}. }
              @else if (trialDaysRemaining() === 1) { Es el último día de tu prueba. }
              @else { Tu prueba está vencida y el cambio puede estar procesándose. }
              Al finalizar volvés a Básico sin complemento, salvo que elijas uno. No hay cobro automático.
            </p></div>
            <button mat-flat-button type="button" (click)="scrollToPlans()">Elegir complemento</button>
          </section>
        }

        @if (quotaLevel() !== 'normal') {
          <section class="notice" [class.danger]="quotaLevel() === 'exhausted'" role="status">
            <mat-icon aria-hidden="true">{{ quotaLevel() === 'exhausted' ? 'error' : 'warning' }}</mat-icon>
            <div><strong>{{ quotaNoticeTitle() }}</strong><p>{{ quotaNoticeText() }} Las reservas continúan normalmente aunque un correo no pueda enviarse.</p></div>
            <button mat-button type="button" (click)="scrollToPlans()">Ver opciones</button>
          </section>
        }
        @if (emailStatus.recentFailures > 0) {
          <section class="notice" role="status">
            <mat-icon aria-hidden="true">mark_email_unread</mat-icon>
            <div><strong>Algunos correos no pudieron enviarse</strong><p>Hubo {{ emailStatus.recentFailures }} {{ emailStatus.recentFailures === 1 ? 'fallo' : 'fallos' }} en los últimos 7 días. Tus reservas no fueron afectadas y no se descontó cupo por esos intentos.</p></div>
            <button mat-button type="button" (click)="load()">Revisar estado</button>
          </section>
        }

        <section class="summary-grid" aria-label="Estado del servicio de correos">
          <mat-card appearance="outlined" class="current-plan">
            <mat-card-header><mat-icon mat-card-avatar aria-hidden="true">mail</mat-icon><mat-card-title>{{ addonName(emailStatus.addon) }}</mat-card-title><mat-card-subtitle>Complemento actual · Plan {{ planName(emailStatus.basePlan) }}</mat-card-subtitle></mat-card-header>
            <mat-card-content>
              @if (emailStatus.pendingAddon) { <p class="scheduled-change">Cambio a {{ addonName(emailStatus.pendingAddon) }} programado para el {{ emailStatus.periodEndsAt | date: 'd/MM/yyyy' }}.</p> }
              <p>El período se reinicia el {{ emailStatus.periodEndsAt | date: 'd/MM/yyyy' }}.</p>
            </mat-card-content>
          </mat-card>
          <mat-card appearance="outlined" class="usage-card">
            <mat-card-header><mat-card-title>Consumo mensual</mat-card-title><mat-card-subtitle>{{ emailStatus.usage.used | number }} de {{ emailStatus.usage.limit | number }} correos</mat-card-subtitle></mat-card-header>
            <mat-card-content>
              <mat-progress-bar mode="determinate" [value]="usagePercent()" [attr.aria-label]="usagePercent() + '% del cupo utilizado'" />
              <div class="usage-numbers"><strong>{{ emailStatus.usage.remaining | number }} disponibles</strong><span>{{ usagePercent() }}% utilizado</span></div>
              @if (emailStatus.usage.growthAgendaLimit > 0) {
                <div class="included-quota"><mat-icon aria-hidden="true">redeem</mat-icon><span>Resúmenes incluidos en Crecimiento: <strong>{{ emailStatus.usage.growthAgendaUsed }} de {{ emailStatus.usage.growthAgendaLimit }}</strong></span></div>
              }
            </mat-card-content>
          </mat-card>
        </section>

        <section class="section-block" aria-labelledby="automations-title">
          <header><div><span class="eyebrow">PREFERENCIAS</span><h2 id="automations-title">Automatizaciones</h2><p>Activarlas o desactivarlas no cambia tu complemento.</p></div>
            <button mat-flat-button type="button" (click)="savePreferences()" [disabled]="savingPreferences() || !preferencesDirty()">{{ savingPreferences() ? 'Guardando…' : 'Guardar cambios' }}</button>
          </header>
          @if (preferencesMessage()) { <p class="feedback" [class.error]="preferencesError()" role="status">{{ preferencesMessage() }}</p> }
          <div class="automation-list">
            @for (type of automationOrder; track type) {
              <article>
                <div class="automation-icon"><mat-icon aria-hidden="true">{{ automationIcon(type) }}</mat-icon></div>
                <div class="automation-copy"><strong>{{ automationName(type) }}</strong><p>{{ automationDescription(type) }}</p>@if (!canEnable(type)) { <small>{{ requiredAddonText(type) }}</small> }</div>
                <mat-slide-toggle [checked]="preferenceValue(type)" [disabled]="!canEnable(type) || savingPreferences()" (change)="setPreference(type, $event.checked)"><span class="visually-hidden">{{ automationName(type) }}</span></mat-slide-toggle>
              </article>
            }
          </div>
        </section>

        <section class="section-block plans" id="email-plans" aria-labelledby="plans-title">
          <header><div><span class="eyebrow">COMPLEMENTO</span><h2 id="plans-title">Elegí el nivel de correos</h2><p>Los cambios a un nivel superior son inmediatos; los inferiores comienzan el próximo período.</p></div></header>
          @if (addonMessage()) { <p class="feedback" [class.error]="addonError()" role="status">{{ addonMessage() }}</p> }
          <div class="plan-grid">
            @for (option of addonOptions; track option.value) {
              <mat-card appearance="outlined" [class.selected]="emailStatus.addon === option.value">
                <mat-card-header><mat-card-title>{{ option.title }}</mat-card-title><mat-card-subtitle>{{ option.price }}</mat-card-subtitle></mat-card-header>
                <mat-card-content><strong class="quota">{{ option.quota }}</strong><ul>@for (feature of option.features; track feature) { <li><mat-icon aria-hidden="true">check</mat-icon>{{ feature }}</li> }</ul>
                  @if (emailStatus.usage.growthAgendaLimit > 0) { <p class="growth-note">Los 30 resúmenes incluidos en Crecimiento no descuentan de este cupo.</p> }
                </mat-card-content>
                <mat-card-actions><button mat-flat-button type="button" [disabled]="changingAddon() || emailStatus.addon === option.value || emailStatus.pendingAddon === option.value" (click)="selectAddon(option.value)">{{ emailStatus.addon === option.value ? 'Actual' : emailStatus.pendingAddon === option.value ? 'Programado' : 'Elegir' }}</button></mat-card-actions>
              </mat-card>
            }
          </div>
          <p class="no-charge"><mat-icon aria-hidden="true">info</mat-icon>En este MVP no se realiza ningún cobro ni renovación automática.</p>
        </section>
      } @else if (!loading() && !loadError()) {
        <section class="empty-state"><mat-icon aria-hidden="true">mail_off</mat-icon><h2>Todavía no hay una configuración de correos</h2><p>Cuando esté disponible vas a poder administrarla desde acá.</p></section>
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
  protected readonly changingAddon = signal(false);
  protected readonly preferences = signal<EmailPreferencesRequest | null>(null);
  protected readonly savedPreferences = signal<EmailPreferencesRequest | null>(null);
  protected readonly preferencesMessage = signal('');
  protected readonly preferencesError = signal(false);
  protected readonly addonMessage = signal('');
  protected readonly addonError = signal(false);
  protected readonly automationOrder = AUTOMATION_ORDER;
  protected readonly addonOptions: AddonOption[] = [
    { value: 'NONE', title: 'Sin complemento', price: '$0', quota: 'Sin cupo adicional', features: ['Beneficios incluidos en tu plan base'] },
    { value: 'ESSENTIAL', title: 'Esenciales', price: '+$1.500 / mes', quota: 'Hasta 400 correos', features: ['Confirmación y reprogramación al cliente', 'Resumen diario al comercio'] },
    { value: 'COMPLETE', title: 'Completos', price: '+$3.000 / mes', quota: 'Hasta 1.300 correos', features: ['Todo lo de Esenciales', 'Recordatorio y acción antes del turno', 'Aviso de cancelación al comercio'] },
  ];
  protected readonly usagePercent = computed(() => { const usage = this.status()?.usage; return usage?.limit ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0; });
  protected readonly quotaLevel = computed<'normal' | 'warning' | 'critical' | 'exhausted'>(() => { const percent = this.usagePercent(); if (percent >= 100) return 'exhausted'; if (percent >= 95) return 'critical'; if (percent >= 80) return 'warning'; return 'normal'; });
  protected readonly preferencesDirty = computed(() => JSON.stringify(this.preferences()) !== JSON.stringify(this.savedPreferences()));
  protected readonly trialDaysRemaining = computed(() => { const end = this.status()?.trialEndsAt; return end ? Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / 86_400_000)) : 0; });

  ngOnInit(): void { this.load(); }
  protected load(): void { this.loading.set(true); this.loadError.set(''); this.service.getStatus().pipe(finalize(() => this.loading.set(false))).subscribe({ next: (status) => this.applyStatus(status), error: () => this.loadError.set('No pudimos cargar la configuración de correos. Intentá nuevamente.') }); }
  protected canEnable(type: EmailAutomationType): boolean { const status = this.status(); return !!status && automationCanEnable(status, type); }
  protected preferenceValue(type: EmailAutomationType): boolean { const preferences = this.preferences(); return preferences ? preferences[this.preferenceKey(type)] : false; }
  protected setPreference(type: EmailAutomationType, enabled: boolean): void { const preferences = this.preferences(); if (!preferences) return; this.preferences.set({ ...preferences, [this.preferenceKey(type)]: enabled }); this.preferencesMessage.set(''); }
  protected savePreferences(): void { const preferences = this.preferences(); if (!preferences) return; this.savingPreferences.set(true); this.preferencesMessage.set(''); this.preferencesError.set(false); this.service.updatePreferences(preferences).pipe(finalize(() => this.savingPreferences.set(false))).subscribe({ next: (status) => { this.applyStatus(status); this.preferencesMessage.set('Preferencias guardadas.'); }, error: () => { this.preferencesError.set(true); this.preferencesMessage.set('No pudimos guardar. Tus cambios siguen acá para que vuelvas a intentarlo.'); } }); }
  protected selectAddon(addon: EmailAddon): void { const current = this.status(); if (!current) return; const downgrade = this.addonRank(addon) < this.addonRank(current.addon); const effective = downgrade ? `el ${this.formatDate(current.periodEndsAt)}` : 'de inmediato'; if (!window.confirm(`El cambio a ${this.addonName(addon)} será efectivo ${effective}. En este MVP no se realizará ningún cobro. ¿Continuar?`)) return; this.changingAddon.set(true); this.addonMessage.set(''); this.addonError.set(false); this.service.selectAddon(addon).pipe(finalize(() => this.changingAddon.set(false))).subscribe({ next: (status) => { this.applyStatus(status); this.addonMessage.set(downgrade ? `Cambio programado para ${this.formatDate(status.periodEndsAt)}.` : 'Complemento actualizado.'); }, error: () => { this.addonError.set(true); this.addonMessage.set('No pudimos cambiar el complemento. Intentá nuevamente.'); } }); }
  protected scrollToPlans(): void { document.getElementById('email-plans')?.scrollIntoView({ behavior: 'smooth' }); }
  protected addonName(addon: EmailAddon): string { return ({ NONE: 'Sin complemento', ESSENTIAL: 'Correos Esenciales', COMPLETE: 'Correos Completos' })[addon]; }
  protected planName(plan: EmailStatus['basePlan']): string { return ({ BASIC: 'Básico', GROWTH: 'Crecimiento', PRO: 'Pro' })[plan]; }
  protected automationName(type: EmailAutomationType): string { return ({ BOOKING_CONFIRMATION: 'Confirmación y reprogramación al cliente', BOOKING_RESCHEDULE: 'Aviso de reprogramación', BUSINESS_DAILY_AGENDA: 'Resumen diario al comercio', BOOKING_REMINDER_ACTION: 'Recordatorio y acción', BUSINESS_CANCELLATION: 'Aviso de cancelación' })[type]; }
  protected automationDescription(type: EmailAutomationType): string { return ({ BOOKING_CONFIRMATION: 'Se envía al crear una reserva y cuando cambia la fecha o el horario.', BOOKING_RESCHEDULE: 'Informa al cliente cuando cambia la fecha o el horario.', BUSINESS_DAILY_AGENDA: 'Recibí la agenda del día por correo.', BOOKING_REMINDER_ACTION: 'Le recuerda el turno al cliente y le permite actuar.', BUSINESS_CANCELLATION: 'Te avisa cuando un cliente cancela.' })[type]; }
  protected automationIcon(type: EmailAutomationType): string { return ({ BOOKING_CONFIRMATION: 'mark_email_read', BOOKING_RESCHEDULE: 'event_repeat', BUSINESS_DAILY_AGENDA: 'today', BOOKING_REMINDER_ACTION: 'notifications_active', BUSINESS_CANCELLATION: 'event_busy' })[type]; }
  protected requiredAddonText(type: EmailAutomationType): string { return type === 'BUSINESS_DAILY_AGENDA' ? 'Disponible con Esenciales, Completos o el beneficio de Crecimiento.' : type === 'BOOKING_CONFIRMATION' || type === 'BOOKING_RESCHEDULE' ? 'Requiere Correos Esenciales o Completos.' : 'Requiere Correos Completos.'; }
  protected quotaNoticeTitle(): string { return this.quotaLevel() === 'exhausted' ? 'Alcanzaste el cupo mensual' : this.quotaLevel() === 'critical' ? 'Tu cupo está casi agotado' : 'Ya usaste el 80% de tu cupo'; }
  protected quotaNoticeText(): string { const remaining = this.status()?.usage.remaining ?? 0; return this.quotaLevel() === 'exhausted' ? 'Los nuevos correos se omitirán hasta el próximo período o hasta ampliar el complemento.' : `Te quedan ${remaining} correos disponibles en este período.`; }
  private applyStatus(status: EmailStatus): void { this.status.set(status); const preferences = preferencesFromStatus(status); this.preferences.set(preferences); this.savedPreferences.set(preferences); }
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
  private addonRank(addon: EmailAddon): number { return ({ NONE: 0, ESSENTIAL: 1, COMPLETE: 2 })[addon]; }
  private formatDate(value: string): string { return new Intl.DateTimeFormat('es-AR').format(new Date(value)); }
}
