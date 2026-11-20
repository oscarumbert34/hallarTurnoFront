import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { PersonalAppointment } from '../../models/personal-appointment.model';

@Component({
  selector: 'app-personal-appointment-card',
  imports: [DatePipe, MatButtonModule, MatIconModule, MatMenuModule],
  template: `
    <article class="appointment-card" [style.--accent]="accent()">
      <time>{{ appointment().appointmentAt | date: 'HH:mm' }}</time>
      <span class="type-icon"><mat-icon>{{ icon() }}</mat-icon></span>
      <div class="copy">
        <strong>{{ appointment().type.name }}</strong>
        @if (appointment().title || appointment().notes) {
          <span>{{ appointment().title || appointment().notes }}</span>
        }
        @if (appointment().recurring) {
          <small><mat-icon>repeat</mat-icon>{{ appointment().modified ? 'Horario modificado' : appointment().recurrenceLabel }}</small>
        }
      </div>
      <button mat-icon-button [matMenuTriggerFor]="actions" aria-label="Acciones del turno">
        <mat-icon>more_vert</mat-icon>
      </button>
      <mat-menu #actions="matMenu">
        <button mat-menu-item (click)="edit.emit(appointment())"><mat-icon>edit</mat-icon>Editar</button>
        <button mat-menu-item (click)="remove.emit(appointment())"><mat-icon>delete</mat-icon>Eliminar</button>
      </mat-menu>
    </article>
  `,
  styles: `
    :host { display: block; }
    .appointment-card { --accent: #1769e0; display: grid; grid-template-columns: 66px 46px 1fr auto; align-items: center; gap: 10px; min-height: 68px; padding: 8px 4px 8px 10px; background: #fff; border: 1px solid #dce5f2; border-left: 5px solid var(--accent); border-radius: 13px; box-shadow: 0 5px 14px rgba(17, 42, 89, .13); }
    time { box-sizing: border-box; min-width: 62px; padding: 10px 8px; border-radius: 11px; background: #edf4ff; color: #0b1739; font-size: 1.12rem; font-weight: 800; text-align: center; }
    .type-icon { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 11px; color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, white); }
    .copy { display: grid; min-width: 0; gap: 2px; }
    strong { color: #0b1739; font-size: 1.02rem; }
    span { overflow: hidden; color: #56627a; font-size: .9rem; text-overflow: ellipsis; white-space: nowrap; }
    small { display:flex;align-items:center;gap:3px;color:#1565c0;font-size:.74rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
    small mat-icon { width:14px;height:14px;font-size:14px; }
  `,
})
export class AppointmentCardComponent {
  readonly appointment = input.required<PersonalAppointment>();
  readonly edit = output<PersonalAppointment>();
  readonly remove = output<PersonalAppointment>();

  protected icon(): string {
    return ({ MEDICAL: 'stethoscope', DENTAL: 'dentistry', PSYCHOLOGY: 'psychology', HAIRDRESSER: 'content_cut', BEAUTY: 'spa', VETERINARY: 'pets', PROCEDURE: 'biotech', MATCH: 'sports_soccer', MEETING: 'groups', REIKI: 'self_improvement', OTHER: 'event' } as Record<string, string>)[this.appointment().type.code] ?? 'event';
  }

  protected accent(): string {
    return ({ MEDICAL: '#1976d2', DENTAL: '#00a878', PSYCHOLOGY: '#7856d8', HAIRDRESSER: '#ec4f8a', BEAUTY: '#b552d1', VETERINARY: '#e58424', PROCEDURE: '#168da3', MATCH: '#16a05d', MEETING: '#3867d6', REIKI: '#8e5cc7', OTHER: '#607d8b' } as Record<string, string>)[this.appointment().type.code] ?? '#1976d2';
  }
}
