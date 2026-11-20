import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AppointmentCardComponent } from '../../components/appointment-card/appointment-card.component';
import { PersonalAppointment } from '../../models/personal-appointment.model';
import { PersonalAppointmentService } from '../../services/personal-appointment.service';

interface AppointmentGroup { day: Date; appointments: PersonalAppointment[]; }
type AgendaFilter = 'upcoming' | 'week' | 'all';

@Component({
  selector: 'app-appointment-list-page',
  imports: [AppointmentCardComponent, MatButtonModule, MatIconModule, RouterLink],
  template: `
    <main class="agenda-shell">
      <header>
        <div class="topbar">
          <a class="brand" routerLink="/customer/agenda"><mat-icon>event_available</mat-icon>HallarTurno</a>
          <button mat-icon-button aria-label="Mi perfil"><mat-icon>account_circle</mat-icon></button>
        </div>
        <div class="heading"><div><h1>Mi agenda</h1><p>Mis próximos turnos</p></div><span class="hero-icon"><mat-icon>calendar_month</mat-icon></span></div>
        <nav class="filters" aria-label="Filtrar agenda">
          <button [class.active]="filter() === 'upcoming'" (click)="filter.set('upcoming')">Próximos</button>
          <button [class.active]="filter() === 'week'" (click)="filter.set('week')">Esta semana</button>
          <button [class.active]="filter() === 'all'" (click)="filter.set('all')">Todos</button>
        </nav>
      </header>

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
  protected readonly groups = signal<AppointmentGroup[]>([]);
  protected readonly filter = signal<AgendaFilter>('upcoming');
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
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

  ngOnInit(): void { this.load(); }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.service.list().pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (items) => this.groups.set(this.group(items)),
      error: () => this.errorMessage.set('No pudimos cargar tus turnos.'),
    });
  }

  protected edit(item: PersonalAppointment): void { void this.router.navigate(['customer', 'agenda', item.id, 'edit']); }
  protected remove(item: PersonalAppointment): void {
    if (!confirm(`¿Eliminar el turno ${item.title || item.type.name}?`)) return;
    this.service.delete(item.id).subscribe({ next: () => this.load(), error: () => this.errorMessage.set('No pudimos eliminar el turno.') });
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
}
