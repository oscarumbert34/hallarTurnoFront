import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { interval, startWith } from 'rxjs';
import { UiStateComponent } from '../../shared/ui-state.component';
import { BusinessDashboardService } from '../business-dashboard/business-dashboard.service';
import { Branch } from '../business-dashboard/dashboard.models';
import { PublicQueueEntry, QueueEntry, VirtualQueue, VirtualQueueEntryStatus } from './virtual-queue.models';
import { VirtualQueueService } from './virtual-queue.service';
import { normalizePhone, PHONE_PATTERN } from '../../shared/phone-validation';

@Component({
  selector: 'app-admin-virtual-queue-page',
  imports: [DatePipe, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule,
    ReactiveFormsModule, UiStateComponent],
  template: `
    <section class="queue-admin turnero-screen">
      <header>
        <div><p class="eyebrow">Operación en vivo</p><h1>Fila virtual</h1><p>Gestioná la fila sin mezclarla con la agenda de turnos.</p></div>
        @if (queue(); as currentQueue) {
          <span class="status" [class.open]="currentQueue.status === 'OPEN'">{{ currentQueue.status === 'OPEN' ? 'Abierta' : 'Cerrada' }}</span>
        }
      </header>
      <app-ui-state [loading]="loading()" [error]="error()" />
      <mat-card class="controls">
        <mat-card-content>
          <mat-form-field appearance="outline">
            <mat-label>Sucursal</mat-label>
            <mat-select [formControl]="branchControl">
              @for (branch of branches(); track branch.id) { <mat-option [value]="branch.id">{{ branch.name }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <div class="actions">
            <button mat-flat-button type="button" (click)="openQueue()" [disabled]="busy() || !branchControl.value || queue()?.status === 'OPEN'">
              <mat-icon aria-hidden="true">play_arrow</mat-icon>Abrir fila
            </button>
            <button mat-stroked-button type="button" (click)="closeQueue()" [disabled]="busy() || queue()?.status !== 'OPEN'">
              <mat-icon aria-hidden="true">stop</mat-icon>Cerrar fila
            </button>
          </div>
          @if (queue(); as currentQueue) {
            <div class="public-link">
              <span>Link público</span>
              <code>{{ publicUrl(currentQueue) }}</code>
              <button mat-button type="button" (click)="copyLink(currentQueue)">Copiar</button>
            </div>
          }
        </mat-card-content>
      </mat-card>

      @if (queue(); as currentQueue) {
        @if (currentQueue.status === 'OPEN') {
          <mat-card class="add-customer">
            <mat-card-content>
              <div class="add-heading">
                <mat-icon aria-hidden="true">person_add</mat-icon>
                <div><h2>Agregar una persona</h2><p>Cargala desde el negocio y compartile su enlace de seguimiento.</p></div>
              </div>
              <form [formGroup]="customerForm" (ngSubmit)="addPerson(currentQueue)">
                <mat-form-field appearance="outline">
                  <mat-label>Nombre</mat-label>
                  <input matInput formControlName="customerName" autocomplete="off" />
                  <mat-error>Ingresá el nombre.</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Teléfono (opcional)</mat-label>
                  <input matInput formControlName="phone" maxlength="10" inputmode="tel" autocomplete="off"
                    (paste)="normalizePastedPhone($event)" (blur)="normalizeCustomerPhone()" />
                  <mat-hint>10 dígitos. Ejemplo: 1124546622.</mat-hint>
                  <mat-error>Usá el formato 1124546622.</mat-error>
                </mat-form-field>
                <button mat-flat-button type="submit" [disabled]="busy()">Agregar a la fila</button>
              </form>
              @if (createdTracking(); as tracking) {
                <div class="tracking-link">
                  <span>Enlace de seguimiento de {{ tracking.customerName }}</span>
                  <code>{{ tracking.url }}</code>
                  <button mat-button type="button" (click)="copyUrl(tracking.url, tracking.entryId)">
                    {{ copiedEntryId() === tracking.entryId ? 'Copiado' : 'Copiar enlace' }}
                  </button>
                </div>
              }
            </mat-card-content>
          </mat-card>
        }
        <div class="summary"><strong>{{ waitingCount() }}</strong><span>en espera</span><small>La lista se actualiza automáticamente.</small></div>
        <section class="entries" aria-live="polite">
          @for (entry of entries(); track entry.id) {
            <mat-card class="entry-card" [class.done]="!isActive(entry.status)">
              <mat-card-content>
                <div class="position">#{{ entry.position }}</div>
                <div class="person"><strong>{{ entry.customerName }}</strong>@if (entry.phone) { <a [href]="'tel:' + entry.phone">{{ entry.phone }}</a> } @else { <span>Sin teléfono</span> }<small>Ingresó {{ entry.createdAt | date: 'HH:mm' }}</small></div>
                <span class="entry-status">{{ statusLabel(entry.status) }}</span>
                <div class="entry-actions">
                  <button mat-button type="button" (click)="copyTrackingLink(currentQueue, entry)">
                    <mat-icon aria-hidden="true">link</mat-icon>{{ copiedEntryId() === entry.id ? 'Copiado' : 'Copiar seguimiento' }}
                  </button>
                  @for (next of nextStatuses(entry.status); track next) {
                    <button mat-stroked-button type="button" (click)="changeStatus(entry, next)" [disabled]="busy()">{{ actionLabel(next) }}</button>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          } @empty {
            <div class="empty"><mat-icon aria-hidden="true">groups</mat-icon><h2>Todavía no hay personas</h2><p>Cuando alguien se una desde el link público, aparecerá acá.</p></div>
          }
        </section>
      }
    </section>
  `,
  styles: `
    :host { display: block; }
    .queue-admin { width: min(1120px, calc(100% - 32px)); margin: 0 auto; padding: 38px 0 80px; }
    header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
    h1 { margin: 3px 0 6px; color: #10213b; font-size: clamp(2rem, 5vw, 3rem); letter-spacing: -.04em; }
    header p { margin: 0; color: #61758c; }
    .eyebrow { color: #0876ed !important; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    .status { padding: 8px 14px; border-radius: 999px; background: #eef0f3; color: #657180; font-weight: 800; }
    .status.open { background: #dcf8e9; color: #08733c; }
    mat-card { border: 1px solid #dde7f2; border-radius: 20px; box-shadow: none; }
    .controls mat-card-content { display: grid; grid-template-columns: minmax(220px, 1fr) auto; align-items: center; gap: 16px; padding: 22px !important; }
    .controls mat-form-field { margin-bottom: -22px; }
    .actions { display: flex; gap: 10px; }
    .public-link { display: grid; grid-column: 1 / -1; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 12px; padding-top: 14px; border-top: 1px solid #e4ebf3; }
    .public-link span { color: #65768a; font-weight: 700; }
    .public-link code { overflow: hidden; color: #174a79; text-overflow: ellipsis; white-space: nowrap; }
    .add-customer { margin-top: 18px; }
    .add-customer mat-card-content { padding: 22px !important; }
    .add-heading { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
    .add-heading mat-icon { color: #0876ed; }
    .add-heading h2, .add-heading p { margin: 0; }
    .add-heading p { margin-top: 3px; color: #65768a; }
    .add-customer form { display: grid; grid-template-columns: 1fr 1fr auto; align-items: start; gap: 12px; }
    .add-customer form button { min-height: 56px; }
    .tracking-link { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 12px; padding-top: 14px; border-top: 1px solid #e4ebf3; }
    .tracking-link span { color: #08733c; font-weight: 800; }
    .tracking-link code { overflow: hidden; color: #174a79; text-overflow: ellipsis; white-space: nowrap; }
    .summary { display: flex; align-items: baseline; gap: 9px; margin: 32px 2px 16px; }
    .summary strong { color: #0876ed; font-size: 2.4rem; }
    .summary span { color: #283e58; font-size: 1.1rem; font-weight: 800; }
    .summary small { margin-left: auto; color: #78899b; }
    .entries { display: grid; gap: 12px; }
    .entry-card mat-card-content { display: grid; grid-template-columns: 70px minmax(160px, 1fr) auto auto; align-items: center; gap: 18px; padding: 18px 22px !important; }
    .entry-card.done { opacity: .6; }
    .position { color: #0876ed; font-size: 1.55rem; font-weight: 900; }
    .person { display: grid; gap: 3px; }
    .person strong { font-size: 1.05rem; }
    .person a { color: #456887; text-decoration: none; }
    .person small { color: #8291a1; }
    .entry-status { padding: 6px 10px; border-radius: 999px; background: #eef5fc; color: #28577e; font-size: .82rem; font-weight: 800; }
    .entry-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 7px; }
    .empty { padding: 54px 20px; color: #6f8194; text-align: center; }
    .empty mat-icon { width: 44px; height: 44px; font-size: 44px; }
    .empty h2 { margin: 10px 0 5px; color: #2d4058; }
    .empty p { margin: 0; }
    @media (max-width: 760px) {
      .controls mat-card-content { grid-template-columns: 1fr; }
      .actions { display: grid; grid-template-columns: 1fr 1fr; }
      .public-link { grid-template-columns: 1fr auto; }
      .public-link span { grid-column: 1 / -1; }
      .add-customer form { grid-template-columns: 1fr; }
      .tracking-link { grid-template-columns: 1fr auto; }
      .tracking-link span { grid-column: 1 / -1; }
      .entry-card mat-card-content { grid-template-columns: 54px 1fr; }
      .entry-status { justify-self: start; }
      .entry-actions { justify-content: flex-start; }
      .summary small { display: none; }
    }
  `,
})
export class AdminVirtualQueuePage implements OnInit {
  private readonly dashboard = inject(BusinessDashboardService);
  private readonly service = inject(VirtualQueueService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  protected readonly branches = signal<Branch[]>([]);
  protected readonly queue = signal<VirtualQueue | null>(null);
  protected readonly entries = signal<QueueEntry[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly createdTracking = signal<{ entryId: string; customerName: string; url: string } | null>(null);
  protected readonly copiedEntryId = signal<string | null>(null);
  protected readonly branchControl = new FormControl('', { nonNullable: true });
  protected readonly customerForm = this.fb.nonNullable.group({
    customerName: ['', [Validators.required, Validators.maxLength(160)]],
    phone: ['', [Validators.pattern(PHONE_PATTERN)]],
  });

  protected normalizePastedPhone(event: ClipboardEvent): void {
    const pastedValue = event.clipboardData?.getData('text') ?? '';
    const normalizedValue = normalizePhone(pastedValue);
    if (normalizedValue === pastedValue) return;
    event.preventDefault();
    this.customerForm.controls.phone.setValue(normalizedValue);
  }

  protected normalizeCustomerPhone(): void {
    const control = this.customerForm.controls.phone;
    const normalizedValue = normalizePhone(control.value);
    if (normalizedValue !== control.value) control.setValue(normalizedValue);
  }

  ngOnInit(): void {
    this.dashboard.listBranches().subscribe({
      next: (branches) => { this.branches.set(branches); this.loading.set(false); if (branches[0]) this.branchControl.setValue(branches[0].id); },
      error: () => { this.loading.set(false); this.error.set('No pudimos cargar las sucursales.'); },
    });
    this.branchControl.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.loadQueue());
    interval(5000).pipe(startWith(0), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.queue()?.status === 'OPEN') this.loadEntries();
    });
  }

  protected openQueue(): void { const id = this.branchControl.value; if (!id) return; this.run(() => this.service.open(id)); }
  protected closeQueue(): void { const id = this.branchControl.value; if (!id) return; this.run(() => this.service.close(id)); }
  protected waitingCount(): number { return this.entries().filter((entry) => entry.status === 'WAITING').length; }
  protected isActive(status: VirtualQueueEntryStatus): boolean { return ['WAITING', 'CALLED', 'SERVING'].includes(status); }
  protected nextStatuses(status: VirtualQueueEntryStatus): VirtualQueueEntryStatus[] {
    if (status === 'WAITING') return ['SERVING', 'ABSENT'];
    if (status === 'CALLED') return ['SERVING', 'ABSENT'];
    if (status === 'SERVING') return ['COMPLETED', 'ABSENT'];
    return [];
  }
  protected actionLabel(status: VirtualQueueEntryStatus): string { return ({ CALLED: 'Llamar', SERVING: 'Atender', COMPLETED: 'Finalizar', ABSENT: 'Ausente' } as Record<string, string>)[status] ?? status; }
  protected statusLabel(status: VirtualQueueEntryStatus): string { return ({ WAITING: 'En espera', CALLED: 'Llamado', SERVING: 'Atendiendo', COMPLETED: 'Finalizado', ABSENT: 'Ausente' })[status]; }
  protected changeStatus(entry: QueueEntry, status: VirtualQueueEntryStatus): void {
    const queue = this.queue(); if (!queue) return; this.busy.set(true);
    this.service.updateStatus(queue.id, entry.id, status).subscribe({ next: () => { this.busy.set(false); this.loadEntries(); }, error: (error) => { this.busy.set(false); this.error.set(this.message(error)); } });
  }
  protected publicUrl(queue: VirtualQueue): string { return `${location.origin}/fila/${queue.businessSlug}/${queue.branchId}`; }
  protected copyLink(queue: VirtualQueue): void { navigator.clipboard.writeText(this.publicUrl(queue)); }
  protected copyUrl(url: string, entryId: string): void {
    navigator.clipboard.writeText(url).then(() => {
      this.copiedEntryId.set(entryId);
      window.setTimeout(() => { if (this.copiedEntryId() === entryId) this.copiedEntryId.set(null); }, 2000);
    }).catch(() => this.error.set('No pudimos copiar el enlace. Seleccionalo y copialo manualmente.'));
  }
  protected copyTrackingLink(queue: VirtualQueue, entry: QueueEntry): void {
    this.copyUrl(this.trackingUrl(queue, entry), entry.id);
  }
  protected addPerson(queue: VirtualQueue): void {
    if (this.customerForm.invalid || this.busy()) { this.customerForm.markAllAsTouched(); return; }
    const customer = this.customerForm.getRawValue();
    this.busy.set(true); this.error.set(''); this.createdTracking.set(null);
    this.service.addEntry(queue.id, customer.customerName, customer.phone).subscribe({
      next: (entry: PublicQueueEntry) => {
        this.createdTracking.set({ entryId: entry.id, customerName: customer.customerName.trim(), url: this.trackingUrl(queue, entry) });
        this.customerForm.reset();
        this.busy.set(false);
        this.loadEntries();
      },
      error: (error) => { this.busy.set(false); this.error.set(this.message(error)); },
    });
  }

  private loadQueue(): void {
    const id = this.branchControl.value; if (!id) return;
    this.loading.set(true); this.error.set('');
    this.service.getByBranch(id).subscribe({
      next: (queue) => {
        this.queue.set(queue);
        this.loading.set(false);
        if (queue.status === 'OPEN') this.loadEntries(); else this.entries.set([]);
      },
      error: (error) => { this.loading.set(false); this.entries.set([]); if (error instanceof HttpErrorResponse && error.status === 404) { this.queue.set(null); return; } this.error.set(this.message(error)); },
    });
  }
  private loadEntries(): void { const queue = this.queue(); if (!queue || queue.status !== 'OPEN') { this.entries.set([]); return; } this.service.entries(queue.id).subscribe({ next: (entries) => this.entries.set(this.sortEntries(entries)), error: (error) => this.error.set(this.message(error)) }); }
  private sortEntries(entries: QueueEntry[]): QueueEntry[] {
    return [...entries].sort((left, right) => {
      const activeDifference = Number(!this.isActive(left.status)) - Number(!this.isActive(right.status));
      return activeDifference || left.position - right.position;
    });
  }
  private trackingUrl(queue: VirtualQueue, entry: Pick<PublicQueueEntry, 'id'>): string { return `${this.publicUrl(queue)}/espera/${entry.id}`; }
  private run(action: () => import('rxjs').Observable<VirtualQueue>): void { this.busy.set(true); this.error.set(''); action().subscribe({ next: (queue) => { this.queue.set(queue); this.busy.set(false); this.loadEntries(); }, error: (error) => { this.busy.set(false); this.error.set(this.message(error)); } }); }
  private message(error: unknown): string { return error instanceof HttpErrorResponse && error.error?.message ? error.error.message : 'No pudimos actualizar la fila.'; }
}
