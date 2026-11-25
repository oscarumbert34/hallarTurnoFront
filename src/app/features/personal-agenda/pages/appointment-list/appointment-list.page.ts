import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, of, switchMap, timer } from 'rxjs';
import { AppointmentCardComponent } from '../../components/appointment-card/appointment-card.component';
import { PersonalAppointment } from '../../models/personal-appointment.model';
import { PersonalAppointmentService } from '../../services/personal-appointment.service';
import { AppointmentRecurrenceService } from '../../services/appointment-recurrence.service';
import { MatDialog } from '@angular/material/dialog';
import { RecurrenceScope, RecurrenceScopeDialogComponent } from '../../components/recurrence-scope-dialog/recurrence-scope-dialog.component';
import { NotificationSettingsComponent } from '../../notifications/components/notification-settings/notification-settings.component';
import { AgendaNotification, PersonalPushNotificationService } from '../../notifications/services/personal-push-notification.service';

interface AppointmentGroup { day: Date; appointments: PersonalAppointment[]; }
type AgendaFilter = 'upcoming' | 'week' | 'all';

@Component({
  selector: 'app-appointment-list-page',
  imports: [AppointmentCardComponent, MatButtonModule, MatIconModule, NotificationSettingsComponent, RouterLink],
  template: `
    <main class="agenda-shell">
      <header>
        <div class="topbar">
          <a class="brand" routerLink="/customer/agenda"><mat-icon>event_available</mat-icon>HallarTurno</a>
          <div class="topbar-actions">
            <button mat-icon-button class="notification-bell" aria-label="Notificaciones" title="Ver notificaciones" [attr.aria-expanded]="notificationsOpen()" (click)="toggleNotifications()">
              <mat-icon>notifications</mat-icon>
              @if (unreadNotifications() > 0) { <span class="notification-badge">{{ notificationLabel() }}</span> }
            </button>
            <button mat-icon-button aria-label="Mi perfil"><mat-icon>account_circle</mat-icon></button>
            @if (notificationsOpen()) {
              <section class="notification-panel" aria-label="Notificaciones de Mi agenda">
                <div class="notification-panel-header"><strong>Notificaciones</strong>@if (inboxNotifications().length) { <button type="button" (click)="markNotificationsRead()">Marcar todas</button> }</div>
                @if (notificationsLoading()) { <p class="notification-empty">Cargando…</p> }
                @else if (!inboxNotifications().length) { <p class="notification-empty">No tenés notificaciones nuevas.</p> }
                @else {
                  <div class="notification-list">
                    @for (notification of inboxNotifications(); track notification.occurrenceKey + notification.reminderType) {
                      <button type="button" class="notification-item" (click)="readNotification(notification)">
                        <mat-icon>notifications_active</mat-icon><span><strong>{{ notification.title }}</strong><small>{{ notification.body }}</small><time>{{ notificationTime(notification.sentAt) }}</time></span>
                      </button>
                    }
                  </div>
                }
              </section>
            }
          </div>
        </div>
        <div class="heading"><div><h1>Mi agenda</h1><p>Mis próximos turnos</p></div><span class="hero-icon"><mat-icon>calendar_month</mat-icon></span></div>
        <nav class="filters" aria-label="Filtrar agenda">
          <button [class.active]="filter() === 'upcoming'" (click)="filter.set('upcoming')">Próximos</button>
          <button [class.active]="filter() === 'week'" (click)="filter.set('week')">Esta semana</button>
          <button [class.active]="filter() === 'all'" (click)="filter.set('all')">Todos</button>
        </nav>
      </header>

      <app-personal-notification-settings />

      @if (loading()) { <section class="state">Cargando tu agenda…</section> }
      @else if (errorMessage()) { <section class="state error">{{ errorMessage() }}<button mat-button (click)="load()">Reintentar</button></section> }
      @else if (!filteredGroups().length) {
        <section class="state empty"><mat-icon>event_note</mat-icon><h2>Tu agenda está vacía</h2><p>Agregá tu primer turno para tenerlo siempre a mano.</p></section>
      } @else {
        <section class="groups">
          @for (group of filteredGroups(); track group.day.toISOString()) {
            <div class="group"><h2><mat-icon>calendar_today</mat-icon>{{ dayLabel(group.day) }}</h2>
              @for (appointment of group.appointments; track appointment.id) {
                <app-personal-appointment-card [appointment]="appointment" (edit)="edit($event)" (remove)="remove($event)" />
              }
            </div>
          }
        </section>
      }

      <a mat-flat-button class="add-button" routerLink="new"><mat-icon>add</mat-icon>Agregar turno</a>
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100dvh; background: #eaf3ff; }
    .agenda-shell { box-sizing: border-box; width: min(100%, 560px); min-height: 100dvh; margin: auto; padding: 20px 24px 112px; background: linear-gradient(155deg, #fff 0%, #f4f8ff 55%, #edf5ff 100%); box-shadow: 0 0 34px rgba(26, 72, 135, .16); }
    .topbar { display: flex; align-items: center; justify-content: space-between; }
    .topbar button { color: #075ecf; }
    .topbar-actions { position: relative; display: flex; align-items: center; gap: 2px; }
    .notification-bell { position: relative; }
    .notification-badge { position: absolute; top: 1px; right: 0; display: grid; place-items: center; min-width: 17px; height: 17px; padding: 0 4px; border: 2px solid #fff; border-radius: 10px; background: #e11d48; color: #fff; font-size: .65rem; font-weight: 800; line-height: 1; box-sizing: border-box; }
    .notification-panel { position: absolute; z-index: 10; top: 48px; right: 0; width: min(340px, calc(100vw - 40px)); overflow: hidden; border: 1px solid #d5e4f8; border-radius: 16px; background: #fff; box-shadow: 0 16px 40px rgba(12, 48, 99, .22); }
    .notification-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 10px; color: #102a56; }
    .notification-panel-header button { border: 0; background: transparent; color: #086ddc; font: inherit; font-size: .78rem; font-weight: 700; cursor: pointer; }
    .notification-list { display: grid; max-height: 330px; overflow: auto; }
    .notification-item { display: grid; grid-template-columns: 28px 1fr; gap: 10px; width: 100%; padding: 13px 16px; border: 0; border-top: 1px solid #edf2f8; background: #f8fbff; color: #152747; text-align: left; cursor: pointer; }
    .notification-item:hover { background: #edf6ff; }.notification-item mat-icon { color: #0877ed; font-size: 22px; }.notification-item span { display: grid; gap: 3px; }.notification-item strong { font-size: .88rem; }.notification-item small { color: #526078; font-size: .82rem; }.notification-item time { color: #758197; font-size: .7rem; }
    .notification-empty { margin: 0; padding: 24px 16px; color: #657086; text-align: center; font-size: .85rem; }
    .brand { display: inline-flex; align-items: center; gap: 8px; color: #0d3272; font-size: 1.22rem; font-weight: 800; text-decoration: none; }
    .brand mat-icon { color: #0877ed; }
    .heading { display: flex; align-items: center; justify-content: space-between; margin: 20px 8px 18px; }
    h1 { margin: 0; color: #071531; font-size: clamp(2rem, 8vw, 2.65rem); line-height: 1; }
    p { margin: 7px 0 0; color: #59657a; font-size: 1rem; }
    .hero-icon { position: relative; display: grid; place-items: center; width: 112px; height: 78px; border-radius: 52% 35% 50% 42%; background: linear-gradient(145deg, #dcecff, #cce3ff); color: #0877ed; }
    .hero-icon::after { position: absolute; top: -10px; right: 8px; color: #0877ed; font-size: 1.55rem; content: '\u02ca  \u02ca'; transform: rotate(18deg); }
    .hero-icon mat-icon { width: 50px; height: 50px; font-size: 50px; filter: drop-shadow(0 5px 5px rgba(0, 92, 200, .2)); }
    .filters { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
    .filters button { min-height: 38px; border: 0; border-radius: 22px; background: #e8f1fd; color: #17243c; font: inherit; cursor: pointer; }
    .filters button.active { background: linear-gradient(135deg, #087af1, #075cc8); color: white; font-weight: 700; box-shadow: 0 5px 12px rgba(10, 103, 218, .22); }
    .groups, .group { display: grid; gap: 8px; }
    .group { margin-bottom: 8px; }
    .group h2 { display: flex; align-items: center; gap: 8px; margin: 0; padding: 6px 11px; border-radius: 9px; background: linear-gradient(90deg, #e9f3ff, #dcecff); color: #0c3982; font-size: .92rem; }
    .group h2 mat-icon { width: 18px; height: 18px; color: #0877ed; font-size: 18px; }
    .state { display: grid; justify-items: center; gap: 8px; padding: 60px 20px; color: #56627a; text-align: center; }
    .state mat-icon { width: 52px; height: 52px; color: #7aa9e8; font-size: 52px; }
    .state h2 { margin: 8px 0 0; color: #14264b; }.error { color: #b42318; }
    .add-button { position: fixed; z-index: 2; right: max(24px, calc((100vw - 512px) / 2)); bottom: 20px; left: max(24px, calc((100vw - 512px) / 2)); height: 58px; border-radius: 16px; background: linear-gradient(135deg, #087af1, #0756bd); color: #fff; font-size: 1.05rem; font-weight: 800; box-shadow: 0 12px 30px rgba(20, 95, 193, .3); }
    @media (max-width: 420px) { .agenda-shell { padding-inline: 14px; }.heading { margin-inline: 3px; }.hero-icon { width: 88px; }.filters { gap: 7px; }.add-button { right: 14px; left: 14px; } }
  `,
})
export class AppointmentListPage implements OnInit {
  private readonly service = inject(PersonalAppointmentService);
  private readonly router = inject(Router);
  private readonly recurrenceService = inject(AppointmentRecurrenceService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(PersonalPushNotificationService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly groups = signal<AppointmentGroup[]>([]);
  protected readonly filter = signal<AgendaFilter>('upcoming');
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly unreadNotifications = signal(0);
  protected readonly notificationsOpen = signal(false);
  protected readonly notificationsLoading = signal(false);
  protected readonly inboxNotifications = signal<AgendaNotification[]>([]);
  protected readonly notificationLabel = computed(() => this.unreadNotifications() > 99 ? '99+' : String(this.unreadNotifications()));
  protected readonly filteredGroups = computed(() => {
    const filter = this.filter();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + (7 - ((today.getDay() + 6) % 7)));
    return this.groups()
      .map((group) => ({
        ...group,
        appointments: group.appointments.filter((appointment) => {
          const at = new Date(appointment.appointmentAt);
          if (filter === 'all') return true;
          if (filter === 'week') return at >= today && at < weekEnd;
          return at >= now;
        }),
      }))
      .filter((group) => group.appointments.length > 0);
  });

  ngOnInit(): void { this.load();this.pollUnreadNotifications(); }

  protected markNotificationsRead(): void {
    if (!this.unreadNotifications()) return;
    this.notifications.markAllRead().subscribe({next:()=>{this.unreadNotifications.set(0);this.inboxNotifications.set([]);}});
  }

  protected toggleNotifications(): void {const open=!this.notificationsOpen();this.notificationsOpen.set(open);if(open)this.loadNotifications();}
  protected readNotification(notification:AgendaNotification):void{this.notifications.markRead(notification).subscribe({next:()=>{const remaining=this.inboxNotifications().filter(item=>item.occurrenceKey!==notification.occurrenceKey||item.reminderType!==notification.reminderType);this.inboxNotifications.set(remaining);this.unreadNotifications.set(remaining.length);}});}
  protected notificationTime(value:string):string{return new Intl.DateTimeFormat('es-AR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(value));}

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.service.list().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (items) => this.groups.set(this.group(items)),
      error: () => this.errorMessage.set('No pudimos cargar tus turnos.'),
    });
  }

  protected edit(item: PersonalAppointment): void {
    if (item.recurring && item.recurrenceId && item.originalOccurrenceDate) {
      this.dialog.open(RecurrenceScopeDialogComponent,{data:{operation:'edit'}}).afterClosed().subscribe((scope:RecurrenceScope|undefined)=>{
        if (scope === 'ONLY' || scope === 'FUTURE') void this.router.navigate(['customer','agenda','new'], { queryParams: { recurrenceId:item.recurrenceId, originalDate:item.originalOccurrenceDate, scope, at:item.appointmentAt, typeId:item.type.id, title:item.title ?? '', notes:item.notes ?? '' } });
        else if (scope === 'ALL') void this.router.navigate(['customer','agenda','new'], {queryParams:{seriesId:item.recurrenceId}});
      });
      return;
    }
    void this.router.navigate(['customer', 'agenda', Number(item.id), 'edit']);
  }
  protected remove(item: PersonalAppointment): void {
    if (item.recurring && item.recurrenceId && item.originalOccurrenceDate) {
      this.dialog.open(RecurrenceScopeDialogComponent,{data:{operation:'delete'}}).afterClosed().subscribe((scope:RecurrenceScope|undefined)=>{
        if (!scope) return; const request=scope==='ALL'?this.recurrenceService.end(item.recurrenceId!):this.recurrenceService.skipOccurrence(item.recurrenceId!,item.originalOccurrenceDate!,scope);
        request.subscribe({next:()=>this.load(),error:()=>this.errorMessage.set('No pudimos cancelar el turno.')});
      }); return;
    }
    if (!confirm(`¿Eliminar el turno ${item.title || item.type.name}?`)) return;
    this.service.delete(Number(item.id)).subscribe({ next: () => this.load(), error: () => this.errorMessage.set('No pudimos eliminar el turno.') });
  }

  protected dayLabel(day: Date): string {
    const now = new Date();
    const isToday = day.getFullYear() === now.getFullYear() && day.getMonth() === now.getMonth() && day.getDate() === now.getDate();
    const formatted = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'long' }).format(day).replace('.', '');
    return isToday ? `Hoy, ${formatted}` : formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  private group(items: PersonalAppointment[]): AppointmentGroup[] {
    const grouped = new Map<string, PersonalAppointment[]>();
    for (const item of items) {
      const date = new Date(item.appointmentAt); const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }
    return [...grouped.values()].map((appointments) => ({ day: new Date(appointments[0].appointmentAt), appointments }));
  }

  private pollUnreadNotifications(): void {
    timer(0,30000).pipe(switchMap(()=>this.notifications.unreadCount().pipe(catchError(()=>of({count:0})))),takeUntilDestroyed(this.destroyRef)).subscribe(result=>{this.unreadNotifications.set(result.count);if(this.notificationsOpen())this.loadNotifications();});
  }
  private loadNotifications():void{this.notificationsLoading.set(true);this.notifications.notifications().pipe(finalize(()=>this.notificationsLoading.set(false))).subscribe({next:items=>this.inboxNotifications.set(items),error:()=>this.inboxNotifications.set([])});}
}
