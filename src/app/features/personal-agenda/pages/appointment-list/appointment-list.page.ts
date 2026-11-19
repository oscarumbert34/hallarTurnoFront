import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AppointmentCardComponent } from '../../components/appointment-card/appointment-card.component';
import { PersonalAppointment } from '../../models/personal-appointment.model';
import { PersonalAppointmentService } from '../../services/personal-appointment.service';

interface AppointmentGroup { day: Date; appointments: PersonalAppointment[]; }

@Component({
  selector: 'app-appointment-list-page',
  imports: [AppointmentCardComponent, DatePipe, MatButtonModule, MatIconModule, RouterLink],
  template: `
    <main class="agenda-shell">
      <header>
        <a class="brand" routerLink="/customer/agenda"><mat-icon>event_available</mat-icon>HallarTurno</a>
        <div class="heading"><div><h1>Mi agenda</h1><p>Mis próximos turnos</p></div><span class="hero-icon"><mat-icon>calendar_month</mat-icon></span></div>
      </header>

      @if (loading()) { <section class="state">Cargando tu agenda…</section> }
      @else if (errorMessage()) { <section class="state error">{{ errorMessage() }}<button mat-button (click)="load()">Reintentar</button></section> }
      @else if (!groups().length) {
        <section class="state empty"><mat-icon>event_note</mat-icon><h2>Tu agenda está vacía</h2><p>Agregá tu primer turno para tenerlo siempre a mano.</p></section>
      } @else {
        <section class="groups">
          @for (group of groups(); track group.day.toISOString()) {
            <div class="group"><h2>{{ group.day | date: "EEEE d 'de' MMMM" }}</h2>
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
    :host { display: block; min-height: 100dvh; background: linear-gradient(180deg, #f7faff 0%, #eef5ff 100%); }
    .agenda-shell { box-sizing: border-box; width: min(100%, 720px); min-height: 100dvh; margin: auto; padding: 24px 18px 112px; }
    .brand { display: inline-flex; align-items: center; gap: 8px; color: #145fc1; font-size: 1.25rem; font-weight: 800; text-decoration: none; }
    .heading { display: flex; align-items: center; justify-content: space-between; margin: 28px 0 26px; }
    h1 { margin: 0; color: #071531; font-size: clamp(2.1rem, 8vw, 3rem); line-height: 1; }
    p { margin: 8px 0 0; color: #59657a; font-size: 1.05rem; }
    .hero-icon { display: grid; place-items: center; width: 82px; height: 72px; border-radius: 40px 18px 40px 18px; background: #dceaff; color: #1769e0; }
    .hero-icon mat-icon { width: 42px; height: 42px; font-size: 42px; }
    .groups, .group { display: grid; gap: 12px; }
    .group { margin-bottom: 12px; }
    .group h2 { margin: 0; padding: 8px 14px; border-radius: 12px; background: #dfeafb; color: #173b78; font-size: .95rem; text-transform: capitalize; }
    .state { display: grid; justify-items: center; gap: 8px; padding: 60px 20px; color: #56627a; text-align: center; }
    .state mat-icon { width: 52px; height: 52px; color: #7aa9e8; font-size: 52px; }
    .state h2 { margin: 8px 0 0; color: #14264b; }.error { color: #b42318; }
    .add-button { position: fixed; z-index: 2; right: max(18px, calc((100vw - 684px) / 2)); bottom: 24px; left: max(18px, calc((100vw - 684px) / 2)); height: 58px; border-radius: 18px; background: linear-gradient(135deg, #0d75ed, #1654c5); color: #fff; font-size: 1.05rem; font-weight: 800; box-shadow: 0 12px 30px rgba(20, 95, 193, .3); }
  `,
})
export class AppointmentListPage implements OnInit {
  private readonly service = inject(PersonalAppointmentService);
  private readonly router = inject(Router);
  protected readonly groups = signal<AppointmentGroup[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

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

  private group(items: PersonalAppointment[]): AppointmentGroup[] {
    const grouped = new Map<string, PersonalAppointment[]>();
    for (const item of items) {
      const date = new Date(item.appointmentAt); const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }
    return [...grouped.values()].map((appointments) => ({ day: new Date(appointments[0].appointmentAt), appointments }));
  }
}
