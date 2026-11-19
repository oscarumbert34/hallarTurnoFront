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
        <strong>{{ appointment().title || appointment().type.name }}</strong>
        @if (appointment().title) { <span>{{ appointment().type.name }}</span> }
        @if (appointment().notes) { <small>{{ appointment().notes }}</small> }
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
    .appointment-card { --accent: #1769e0; display: grid; grid-template-columns: auto 48px 1fr auto; align-items: center; gap: 12px; min-height: 82px; padding: 12px 8px 12px 16px; background: #fff; border: 1px solid #e2e8f3; border-left: 5px solid var(--accent); border-radius: 18px; box-shadow: 0 8px 24px rgba(17, 42, 89, .07); }
    time { min-width: 52px; font-size: 1.15rem; font-weight: 800; color: #0b1739; }
    .type-icon { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, white); }
    .copy { display: grid; min-width: 0; gap: 2px; }
    strong { color: #0b1739; font-size: 1.05rem; }
    span, small { overflow: hidden; color: #56627a; text-overflow: ellipsis; white-space: nowrap; }
  `,
})
export class AppointmentCardComponent {
  readonly appointment = input.required<PersonalAppointment>();
  readonly edit = output<PersonalAppointment>();
  readonly remove = output<PersonalAppointment>();

  protected icon(): string {
    return ({ MEDICAL: 'stethoscope', DENTAL: 'dentistry', PSYCHOLOGY: 'psychology', HAIRDRESSER: 'content_cut', BEAUTY: 'spa', VETERINARY: 'pets', PROCEDURE: 'biotech', OTHER: 'event' } as Record<string, string>)[this.appointment().type.code] ?? 'event';
  }

  protected accent(): string {
    return ({ MEDICAL: '#1976d2', DENTAL: '#00a878', PSYCHOLOGY: '#7856d8', HAIRDRESSER: '#ec4f8a', BEAUTY: '#b552d1', VETERINARY: '#e58424', PROCEDURE: '#168da3', OTHER: '#607d8b' } as Record<string, string>)[this.appointment().type.code] ?? '#1976d2';
  }
}
