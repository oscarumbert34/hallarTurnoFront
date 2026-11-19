import { Component, inject, OnInit } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, finalize } from 'rxjs';
import { AppointmentType } from '../../models/appointment-type.model';
import { AppointmentTypeService } from '../../services/appointment-type.service';
import { PersonalAppointmentService } from '../../services/personal-appointment.service';

@Component({
  selector: 'app-appointment-form-page',
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, ReactiveFormsModule, RouterLink],
  template: `
    <main class="form-shell">
      <nav><a mat-icon-button routerLink="/customer/agenda"><mat-icon>arrow_back</mat-icon></a><strong>{{ appointmentId ? 'Editar turno' : 'Nuevo turno' }}</strong></nav>
      <header><div><h1>{{ appointmentId ? 'Editá tu turno' : 'Nuevo turno' }}</h1><p>Cargá un turno en segundos.</p></div><span><mat-icon>event_available</mat-icon></span></header>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline"><mat-label>Tipo de turno</mat-label><mat-select formControlName="appointmentTypeId">
          @for (type of types; track type.id) { <mat-option [value]="type.id">{{ type.name }}</mat-option> }
        </mat-select><mat-error>Elegí un tipo de turno.</mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Título (opcional)</mat-label><input matInput formControlName="title" placeholder="Ej: Control anual" maxlength="150" /></mat-form-field>
        <div class="date-row">
          <mat-form-field appearance="outline"><mat-label>Fecha</mat-label><input matInput type="date" formControlName="date" /><mat-error>Elegí una fecha.</mat-error></mat-form-field>
          <mat-form-field appearance="outline"><mat-label>Hora</mat-label><input matInput type="time" formControlName="time" /><mat-error>Elegí una hora.</mat-error></mat-form-field>
        </div>
        <mat-form-field appearance="outline"><mat-label>Notas</mat-label><textarea matInput rows="3" formControlName="notes" placeholder="Opcional"></textarea></mat-form-field>
        @if (errorMessage) { <p class="error" role="alert">{{ errorMessage }}</p> }
        <button mat-flat-button class="save" type="submit" [disabled]="form.invalid || saving"><mat-icon>check</mat-icon>Guardar turno</button>
        <a mat-button class="cancel" routerLink="/customer/agenda">Cancelar</a>
      </form>
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100dvh; background: linear-gradient(180deg, #f5f9ff, #eaf3ff); }
    .form-shell { box-sizing: border-box; width: min(100%, 680px); min-height: 100dvh; margin: auto; padding: 20px 18px 36px; }
    nav { display: grid; grid-template-columns: 48px 1fr 48px; align-items: center; color: #0b1739; text-align: center; } nav strong { font-size: 1.15rem; }
    header { display: flex; align-items: center; justify-content: space-between; margin: 30px 4px 24px; } h1 { margin: 0; color: #071531; font-size: 2.25rem; } header p { margin: 8px 0 0; color: #5d687b; }
    header span { display: grid; place-items: center; width: 76px; height: 70px; border-radius: 35px 16px; background: #d9eaff; color: #1769e0; } header mat-icon { width: 40px; height: 40px; font-size: 40px; }
    form { display: grid; gap: 8px; padding: 22px 18px; border: 1px solid #e0e8f4; border-radius: 24px; background: rgba(255,255,255,.92); box-shadow: 0 18px 45px rgba(18, 60, 120, .08); }
    mat-form-field { width: 100%; }.date-row { display: grid; grid-template-columns: 1.4fr 1fr; gap: 12px; }
    .save, .cancel { height: 56px; border-radius: 16px; font-size: 1rem; font-weight: 800; }.save { margin-top: 8px; background: linear-gradient(135deg, #087af1, #1654c5); color: #fff; }.cancel { color: #1564ca; background: #eaf3ff; }.error { color: #b42318; }
    @media (max-width: 420px) { .date-row { grid-template-columns: 1fr; } h1 { font-size: 1.9rem; } }
  `,
})
export class AppointmentFormPage implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly typeService = inject(AppointmentTypeService);
  private readonly service = inject(PersonalAppointmentService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected types: AppointmentType[] = [];
  protected appointmentId: number | null = null;
  protected saving = false;
  protected errorMessage = '';
  protected readonly form = this.formBuilder.group({ appointmentTypeId: [0, [Validators.required, Validators.min(1)]], title: [''], date: ['', Validators.required], time: ['', Validators.required], notes: [''] });

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('id'); this.appointmentId = rawId ? Number(rawId) : null;
    if (this.appointmentId) {
      forkJoin({ types: this.typeService.list(), appointment: this.service.get(this.appointmentId) }).subscribe({ next: ({ types, appointment }) => { this.types = types; const value = this.localParts(appointment.appointmentAt); this.form.patchValue({ appointmentTypeId: appointment.type.id, title: appointment.title ?? '', notes: appointment.notes ?? '', ...value }); }, error: () => (this.errorMessage = 'No pudimos cargar el turno.') });
    } else { this.typeService.list().subscribe({ next: (types) => (this.types = types), error: () => (this.errorMessage = 'No pudimos cargar los tipos de turno.') }); }
  }

  protected submit(): void {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue(); const payload = { appointmentTypeId: value.appointmentTypeId, appointmentAt: new Date(`${value.date}T${value.time}:00`).toISOString(), title: value.title.trim() || null, notes: value.notes.trim() || null };
    this.saving = true; this.errorMessage = '';
    const request = this.appointmentId ? this.service.update(this.appointmentId, payload) : this.service.create(payload);
    request.pipe(finalize(() => (this.saving = false))).subscribe({ next: () => void this.router.navigateByUrl('/customer/agenda'), error: () => (this.errorMessage = 'No pudimos guardar el turno. Revisá los datos e intentá de nuevo.') });
  }

  private localParts(value: string): { date: string; time: string } {
    const date = new Date(value); const pad = (part: number) => String(part).padStart(2, '0');
    return { date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`, time: `${pad(date.getHours())}:${pad(date.getMinutes())}` };
  }
}
