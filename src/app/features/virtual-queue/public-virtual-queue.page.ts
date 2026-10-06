import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { interval, startWith, switchMap } from 'rxjs';
import { UiStateComponent } from '../../shared/ui-state.component';
import { PublicQueueEntry, VirtualQueue } from './virtual-queue.models';
import { VirtualQueueService } from './virtual-queue.service';
import { normalizePhone, PHONE_PATTERN } from '../../shared/phone-validation';

@Component({
  selector: 'app-public-virtual-queue-page',
  imports: [DatePipe, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule,
    ReactiveFormsModule, UiStateComponent],
  template: `
    <main class="queue-public">
      <header class="queue-brand">
        <a href="/" aria-label="HallarTurno inicio"><img src="hallarturno-logo.png" alt="HallarTurno" /></a>
        <span>Fila virtual</span>
      </header>
      <section class="queue-content">
        <app-ui-state [loading]="loading()" [error]="error()" />
        @if (queue(); as currentQueue) {
          <div class="business-heading">
            <p class="eyebrow">{{ currentQueue.businessName }}</p>
            <h1>{{ currentQueue.branchName }}</h1>
            <span class="status" [class.open]="currentQueue.status === 'OPEN'">
              {{ currentQueue.status === 'OPEN' ? 'Fila abierta' : 'Fila cerrada' }}
            </span>
          </div>

          @if (trackingEntryId()) {
            @if (entry(); as currentEntry) {
            <section class="live-summary" aria-label="Resumen actual de la fila">
              <div class="summary-card serving-summary">
                <mat-icon aria-hidden="true">support_agent</mat-icon>
                <div><span>Atendiendo ahora</span><strong>{{ currentEntry.beingServed }} {{ currentEntry.beingServed === 1 ? 'persona' : 'personas' }}</strong></div>
              </div>
            </section>
            <mat-card class="position-card">
              <mat-card-content>
                <div class="position-heading">
                  <span><mat-icon aria-hidden="true">person</mat-icon>Tu lugar en la fila</span>
                  <b>#{{ currentEntry.position }}</b>
                </div>
                <strong>{{ currentEntry.position }}</strong>
                @if (currentEntry.status === 'WAITING') {
                  <div class="people-flow" aria-label="Representación visual de la fila">
                    @if (currentEntry.beingServed > 0) {
                      <div class="people-group serving-people">
                        <div class="figures">
                          @for (_ of personSlots(currentEntry.beingServed); track $index) { <mat-icon aria-hidden="true">person</mat-icon> }
                          @if (remainingPeople(currentEntry.beingServed) > 0) { <b>+{{ remainingPeople(currentEntry.beingServed) }}</b> }
                        </div>
                        <span>Atendiendo ahora</span>
                      </div>
                    }
                    @if (currentEntry.waitingAhead > 0) {
                      <div class="people-group ahead-people">
                        <div class="figures">
                          @for (_ of personSlots(currentEntry.waitingAhead); track $index) { <mat-icon aria-hidden="true">person</mat-icon> }
                          @if (remainingPeople(currentEntry.waitingAhead) > 0) { <b>+{{ remainingPeople(currentEntry.waitingAhead) }}</b> }
                        </div>
                        <span>Antes que vos</span>
                      </div>
                    }
                    <div class="people-group you-people">
                      <div class="you-label">Vos</div>
                      <div class="figures"><mat-icon aria-hidden="true">person</mat-icon></div>
                      <span>Tu lugar</span>
                    </div>
                    @if (waitingBehind(currentQueue, currentEntry) > 0) {
                      <div class="people-group behind-people">
                        <div class="figures">
                          @for (_ of personSlots(waitingBehind(currentQueue, currentEntry)); track $index) { <mat-icon aria-hidden="true">person</mat-icon> }
                          @if (remainingPeople(waitingBehind(currentQueue, currentEntry)) > 0) { <b>+{{ remainingPeople(waitingBehind(currentQueue, currentEntry)) }}</b> }
                        </div>
                        <span>Después de vos</span>
                      </div>
                    }
                  </div>
                }
                <h2>{{ entryStatus(currentEntry.status) }}</h2>
                @if (currentEntry.status === 'WAITING') {
                  @if (currentEntry.waitingAhead === 0) {
                    <p class="next-up">Sos el próximo</p>
                  } @else {
                    <p>{{ currentEntry.waitingAhead }} {{ currentEntry.waitingAhead === 1 ? 'persona está' : 'personas están' }} esperando antes que vos</p>
                  }
                  @if (currentEntry.beingServed > 0) {
                    <p class="being-served">Ahora {{ currentEntry.beingServed === 1 ? 'están atendiendo a una persona' : 'están atendiendo a ' + currentEntry.beingServed + ' personas en simultáneo' }}</p>
                  }
                }
                <small>Actualizado {{ currentEntry.updatedAt | date: 'HH:mm:ss' }}</small>
              </mat-card-content>
            </mat-card>
            @if (currentEntry.status === 'WAITING') {
              <div class="keep-link-open">
                <mat-icon aria-hidden="true">schedule</mat-icon>
                <div><strong>Tu lugar se actualiza automáticamente</strong><span>Mantené abierto o guardá este enlace para consultar tu turno.</span></div>
              </div>
            }
            }
          } @else {
            <mat-card class="join-card">
              <mat-card-content>
                <div class="waiting-count"><strong>{{ currentQueue.waitingCount }}</strong><span>personas esperando</span></div>
                @if (currentQueue.status === 'OPEN') {
                  <form [formGroup]="form" (ngSubmit)="join()">
                    <mat-form-field appearance="outline">
                      <mat-label>Tu nombre</mat-label>
                      <input matInput formControlName="customerName" autocomplete="name" />
                      <mat-error>Ingresá tu nombre.</mat-error>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Tu teléfono</mat-label>
                      <input matInput formControlName="phone" maxlength="10" inputmode="tel" autocomplete="tel"
                        (paste)="normalizePastedPhone($event)" (blur)="normalizeCustomerPhone()" />
                      <mat-hint>Ingresá 10 dígitos. Ejemplo: 1124546622.</mat-hint>
                      @if (form.controls.phone.hasError('required')) {
                        <mat-error>Ingresá tu teléfono.</mat-error>
                      } @else {
                        <mat-error>Usá el formato 1124546622.</mat-error>
                      }
                    </mat-form-field>
                    <button mat-flat-button type="submit" [disabled]="submitting()">Unirme a la fila</button>
                  </form>
                  <p class="privacy">Usaremos tus datos únicamente para gestionar tu lugar en esta fila.</p>
                } @else {
                  <p class="closed-copy">En este momento no se están recibiendo nuevas personas.</p>
                }
              </mat-card-content>
            </mat-card>
          }
        }
      </section>
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100dvh; background: linear-gradient(160deg, #edf7ff, #f9fbff 55%, #eefaf6); color: #10213b; }
    .queue-public { min-height: 100dvh; }
    .queue-brand { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid #dce7f3; background: rgb(255 255 255 / 88%); }
    .queue-brand img { display: block; width: 174px; max-width: 52vw; }
    .queue-brand span { color: #54708f; font-weight: 700; }
    .queue-content { width: min(100% - 32px, 560px); margin: 0 auto; padding: 48px 0 72px; }
    .business-heading { margin-bottom: 24px; text-align: center; }
    .eyebrow { margin: 0 0 6px; color: #0876ed; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; }
    h1 { margin: 0 0 16px; font-size: clamp(2rem, 9vw, 3.25rem); letter-spacing: -.045em; }
    .status { display: inline-flex; padding: 7px 13px; border-radius: 999px; background: #f1f3f6; color: #5e6876; font-weight: 750; }
    .status.open { background: #dcf8e9; color: #08733c; }
    mat-card { border: 1px solid #dce7f3; border-radius: 24px; box-shadow: 0 18px 55px rgb(36 72 115 / 12%); }
    mat-card-content { padding: 28px !important; }
    .waiting-count { display: grid; justify-items: center; margin-bottom: 26px; }
    .waiting-count strong { color: #0876ed; font-size: 3rem; line-height: 1; }
    .waiting-count span { margin-top: 6px; color: #5a6d82; }
    form { display: grid; }
    form button { min-height: 48px; border-radius: 14px; font-weight: 800; }
    .privacy, .closed-copy { margin: 18px 0 0; color: #66788c; line-height: 1.45; text-align: center; }
    .position-card { text-align: center; }
    .live-summary { margin-bottom: 14px; }
    .summary-card { display: flex; align-items: center; gap: 13px; padding: 18px; border: 1px solid #dce7f3; border-radius: 20px; background: rgb(255 255 255 / 82%); box-shadow: 0 10px 30px rgb(36 72 115 / 8%); }
    .summary-card > mat-icon { display: grid; width: 44px; height: 44px; flex: 0 0 44px; place-items: center; border-radius: 14px; font-size: 27px; }
    .summary-card div { display: grid; gap: 3px; }
    .summary-card span { color: #51667d; font-size: .82rem; font-weight: 800; }
    .summary-card strong { font-size: 1.35rem; line-height: 1.1; }
    .serving-summary { background: linear-gradient(145deg, #f2fff9, #e9faf3); }
    .serving-summary > mat-icon, .serving-summary strong { color: #079660; }
    .serving-summary > mat-icon { background: #d7f8e9; }
    .position-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .position-heading span { display: flex; align-items: center; gap: 8px; color: #233a55; font-weight: 850; }
    .position-heading mat-icon { width: 30px; height: 30px; padding: 6px; border-radius: 10px; background: #e9e5ff; color: #5d3ac6; font-size: 20px; }
    .position-heading b { padding: 6px 10px; border-radius: 999px; background: #f0edff; color: #5d3ac6; }
    .position-card p { margin: 8px 0; color: #5a6d82; }
    .position-card .next-up { color: #08733c; font-weight: 800; }
    .position-card .being-served { color: #3f607e; font-size: .92rem; }
    .position-card strong { display: block; color: #0876ed; font-size: 5rem; line-height: 1; }
    .position-card h2 { margin: 18px 0 8px; }
    .position-card small { color: #8090a2; }
    .keep-link-open { display: flex; align-items: center; gap: 13px; margin-top: 14px; padding: 17px 19px; border: 1px solid #d7efe2; border-radius: 20px; background: #f0fcf6; }
    .keep-link-open mat-icon { color: #079660; }
    .keep-link-open div { display: grid; gap: 2px; }
    .keep-link-open strong { color: #244338; font-size: .92rem; }
    .keep-link-open span { color: #627d72; font-size: .82rem; }
    .people-flow { display: flex; align-items: end; justify-content: center; gap: 13px; margin: 18px 0 22px; overflow-x: auto; padding: 36px 3px 5px; }
    .people-group { position: relative; display: grid; flex: 0 0 auto; justify-items: center; gap: 5px; }
    .people-group::after { width: 100%; height: 2px; border-radius: 2px; background: currentColor; content: ''; opacity: .35; }
    .figures { display: flex; align-items: end; justify-content: center; min-height: 39px; }
    .figures mat-icon { width: 30px; height: 38px; margin-inline: -3px; font-size: 38px; }
    .figures b { align-self: center; margin-left: 5px; font-size: .78rem; }
    .people-group span { font-size: .7rem; font-weight: 800; white-space: nowrap; }
    .serving-people { color: #10aa70; }
    .ahead-people { color: #e18b13; }
    .you-people { color: #6440d1; }
    .you-people .figures mat-icon { width: 37px; height: 47px; font-size: 47px; }
    .you-label { position: absolute; top: -25px; padding: 3px 9px; border-radius: 999px; background: #6440d1; color: #fff; font-size: .7rem; }
    .behind-people { color: #aebdce; }
    @media (max-width: 460px) {
      .summary-card { padding: 14px; }
      .people-flow { justify-content: flex-start; gap: 9px; }
      .figures mat-icon { width: 26px; font-size: 34px; }
    }
  `,
})
export class PublicVirtualQueuePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly service = inject(VirtualQueueService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly branchId = this.route.snapshot.paramMap.get('branch') ?? '';
  private readonly businessSlug = this.route.snapshot.paramMap.get('business') ?? '';
  protected readonly trackingEntryId = signal<string | null>(this.route.snapshot.paramMap.get('entry'));
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly error = signal('');
  protected readonly queue = signal<VirtualQueue | null>(null);
  protected readonly entry = signal<PublicQueueEntry | null>(null);
  protected readonly form = this.fb.nonNullable.group({
    customerName: ['', [Validators.required, Validators.maxLength(160)]],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
  });

  protected normalizePastedPhone(event: ClipboardEvent): void {
    const pastedValue = event.clipboardData?.getData('text') ?? '';
    const normalizedValue = normalizePhone(pastedValue);
    if (normalizedValue === pastedValue) return;
    event.preventDefault();
    this.form.controls.phone.setValue(normalizedValue);
  }

  protected normalizeCustomerPhone(): void {
    const control = this.form.controls.phone;
    const normalizedValue = normalizePhone(control.value);
    if (normalizedValue !== control.value) control.setValue(normalizedValue);
  }

  ngOnInit(): void {
    interval(5000).pipe(startWith(0), switchMap(() => this.service.getByBranch(this.branchId)),
      takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (queue) => {
        if (this.businessSlug && queue.businessSlug !== this.businessSlug) {
          this.error.set('El enlace de esta fila no es válido.');
          return;
        }
        this.queue.set(queue); this.loading.set(false); this.error.set(''); this.loadTrackedEntry(queue.id);
      },
      error: (error) => { this.loading.set(false); this.error.set(this.errorMessage(error)); },
    });
  }

  protected join(): void {
    if (this.form.invalid || this.submitting()) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true); this.error.set('');
    const value = this.form.getRawValue();
    this.service.join(this.branchId, value.customerName, value.phone).subscribe({
      next: (entry) => {
        this.entry.set(entry);
        this.submitting.set(false);
        void this.router.navigate(['/fila', this.businessSlug, this.branchId, 'espera', entry.id], {
          replaceUrl: true,
        });
      },
      error: (error) => { this.error.set(this.errorMessage(error)); this.submitting.set(false); },
    });
  }

  protected entryStatus(status: string): string {
    return ({ WAITING: 'Estás en espera', CALLED: '¡Es tu turno!', SERVING: 'Te están atendiendo', COMPLETED: 'Atención finalizada', ABSENT: 'Marcado como ausente' } as Record<string, string>)[status] ?? status;
  }

  protected personSlots(count: number): number[] {
    return Array.from({ length: Math.min(Math.max(count, 0), 4) }, (_, index) => index);
  }

  protected remainingPeople(count: number): number {
    return Math.max(count - 4, 0);
  }

  protected waitingBehind(queue: VirtualQueue, entry: PublicQueueEntry): number {
    return Math.max(queue.waitingCount - entry.waitingAhead - 1, 0);
  }

  private loadTrackedEntry(queueId: string): void {
    const entryId = this.trackingEntryId();
    if (!entryId) return;
    this.service.getStatus(queueId, entryId).subscribe({
      next: (status) => { this.entry.set(status); this.error.set(''); },
      error: () => {
        this.entry.set(null);
        this.error.set('El enlace de seguimiento no es válido.');
      },
    });
  }
  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 404) return 'La fila todavía no fue abierta.';
    return error instanceof HttpErrorResponse && error.error?.message ? error.error.message : 'No pudimos consultar la fila. Intentá nuevamente.';
  }
}
