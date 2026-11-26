import { Component, inject, OnInit } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, finalize, Observable } from 'rxjs';
import { AppointmentType } from '../../models/appointment-type.model';
import { AppointmentTypeService } from '../../services/appointment-type.service';
import { PersonalAppointmentService } from '../../services/personal-appointment.service';
import { AppointmentRecurrenceService } from '../../services/appointment-recurrence.service';
import { RecurrenceFrequency } from '../../models/appointment-recurrence.model';

@Component({
  selector: 'app-appointment-form-page',
  imports: [MatButtonModule, MatDatepickerModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSelectModule, MatTimepickerModule, ReactiveFormsModule, RouterLink],
  providers: [{ provide: MAT_DATE_LOCALE, useValue: 'es-AR' }, provideNativeDateAdapter()],
  template: `
    <main class="form-shell">
      <nav><a mat-icon-button routerLink="/customer/agenda"><mat-icon>arrow_back</mat-icon></a><strong>{{ isEditing() ? 'Editar turno' : 'Nuevo turno' }}</strong></nav>
      <header><div><h1>{{ isEditing() ? 'Editá tu turno' : 'Nuevo turno' }}</h1><p>{{ seriesId ? 'Actualizá la configuración de la serie.' : 'Cargá un turno en segundos.' }}</p></div><span><mat-icon>event_available</mat-icon></span></header>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline"><mat-label>Tipo de turno</mat-label><mat-select formControlName="appointmentTypeId">
          @for (type of types; track type.id) { <mat-option [value]="type.id">{{ type.name }}</mat-option> }
        </mat-select><mat-error>Elegí un tipo de turno.</mat-error></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Título (opcional)</mat-label><input matInput formControlName="title" placeholder="Ej: Control anual" maxlength="150" /></mat-form-field>
        <div class="date-row">
          <mat-form-field appearance="outline">
            <mat-label>Fecha</mat-label>
            <input matInput [matDatepicker]="datePicker" formControlName="date" readonly (click)="datePicker.open()" />
            <mat-datepicker-toggle matIconSuffix [for]="datePicker" />
            <mat-datepicker #datePicker />
            <mat-error>Elegí una fecha.</mat-error>
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Hora</mat-label>
            <input
              matInput
              [matTimepicker]="timePicker"
              formControlName="time"
              placeholder="HH:mm"
              [matTimepickerOpenOnClick]="false"
            />
            <mat-timepicker-toggle matIconSuffix [for]="timePicker" />
            <mat-timepicker #timePicker interval="1m" aria-label="Seleccionar hora y minutos" />
            <mat-error>Elegí una hora.</mat-error>
          </mat-form-field>
        </div>
        @if (!appointmentId && !recurrenceId || seriesId) {
          <mat-form-field appearance="outline">
            <mat-label>Repetir</mat-label>
            <mat-icon matPrefix>repeat</mat-icon>
            <mat-select formControlName="repeat">
              <mat-option value="NONE">No repetir</mat-option>
              <mat-option value="DAILY">Todos los días</mat-option>
              <mat-option value="WEEKLY">Todas las semanas</mat-option>
              <mat-option value="BIWEEKLY">Cada 2 semanas</mat-option>
              <mat-option value="MONTHLY">Todos los meses</mat-option>
            </mat-select>
          </mat-form-field>
          @if (form.controls.repeat.value !== 'NONE') {
            <mat-form-field appearance="outline">
              <mat-label>Finalización</mat-label>
              <mat-select formControlName="endMode">
                <mat-option value="NEVER">Sin fecha de finalización</mat-option>
                <mat-option value="DATE">Hasta una fecha</mat-option>
              </mat-select>
            </mat-form-field>
            @if (form.controls.endMode.value === 'DATE') {
              <mat-form-field appearance="outline">
                <mat-label>Repetir hasta</mat-label>
                <input matInput [matDatepicker]="endPicker" formControlName="endDate" readonly (click)="endPicker.open()" />
                <mat-datepicker-toggle matIconSuffix [for]="endPicker" />
                <mat-datepicker #endPicker />
              </mat-form-field>
            }
          }
        }
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
  private readonly recurrenceService = inject(AppointmentRecurrenceService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected types: AppointmentType[] = [];
  protected appointmentId: number | null = null;
  protected recurrenceId: number | null = null;
  protected seriesId: number | null = null;
  private originalOccurrenceDate: string | null = null;
  private occurrenceScope: 'ONLY' | 'FUTURE' = 'ONLY';
  private recurrenceTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Argentina/Buenos_Aires';
  protected saving = false;
  protected errorMessage = '';
  protected readonly form = this.formBuilder.group({ appointmentTypeId: [0, [Validators.required, Validators.min(1)]], title: [''], date: [this.initialDate(), Validators.required], time: [this.initialTime(), Validators.required], notes: [''], repeat: ['NONE'], endMode: ['NEVER'], endDate: [this.initialEndDate()] });

  ngOnInit(): void {
    const rawId = this.route.snapshot.paramMap.get('id'); this.appointmentId = rawId ? Number(rawId) : null;
    this.recurrenceId = Number(this.route.snapshot.queryParamMap.get('recurrenceId')) || null;
    this.seriesId = Number(this.route.snapshot.queryParamMap.get('seriesId')) || null;
    this.occurrenceScope = this.route.snapshot.queryParamMap.get('scope') === 'FUTURE' ? 'FUTURE' : 'ONLY';
    this.originalOccurrenceDate = this.route.snapshot.queryParamMap.get('originalDate');
    if (this.recurrenceId && this.originalOccurrenceDate) {
      const at = this.route.snapshot.queryParamMap.get('at');
      this.typeService.list().subscribe({ next: (types) => { this.types = types; if (at) { const parts=this.localParts(at); this.form.patchValue({ appointmentTypeId:Number(this.route.snapshot.queryParamMap.get('typeId')), title:this.route.snapshot.queryParamMap.get('title') ?? '', notes:this.route.snapshot.queryParamMap.get('notes') ?? '', ...parts }); } }, error: () => (this.errorMessage='No pudimos cargar el turno.') });
      return;
    }
    if (this.seriesId) {
      forkJoin({types:this.typeService.list(),recurrence:this.recurrenceService.get(this.seriesId)}).subscribe({next:({types,recurrence})=>{this.types=types;this.recurrenceTimeZone=recurrence.timeZone;const date=new Date(`${recurrence.startDate}T00:00:00`);const time=new Date(`${recurrence.startDate}T${recurrence.appointmentTime}`);const endDate=recurrence.endDate?new Date(`${recurrence.endDate}T00:00:00`):this.initialEndDate();const repeat=recurrence.frequency==='WEEKLY'&&recurrence.intervalValue===2?'BIWEEKLY':recurrence.frequency;this.form.patchValue({appointmentTypeId:recurrence.type.id,title:recurrence.title??'',notes:recurrence.notes??'',date,time,repeat,endMode:recurrence.endDate?'DATE':'NEVER',endDate});},error:()=>this.errorMessage='No pudimos cargar la serie.'});return;
    }
    if (this.appointmentId) {
      forkJoin({ types: this.typeService.list(), appointment: this.service.get(this.appointmentId) }).subscribe({ next: ({ types, appointment }) => { this.types = types; const value = this.localParts(appointment.appointmentAt); this.form.patchValue({ appointmentTypeId: appointment.type.id, title: appointment.title ?? '', notes: appointment.notes ?? '', ...value }); }, error: () => (this.errorMessage = 'No pudimos cargar el turno.') });
    } else { this.typeService.list().subscribe({ next: (types) => (this.types = types), error: () => (this.errorMessage = 'No pudimos cargar los tipos de turno.') }); }
  }

  protected submit(): void {
    if (this.form.invalid || this.saving) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    const appointmentAt = new Date(value.date);
    appointmentAt.setHours(value.time.getHours(), value.time.getMinutes(), 0, 0);
    const payload = { appointmentTypeId: value.appointmentTypeId, appointmentAt: appointmentAt.toISOString(), title: value.title.trim() || null, notes: value.notes.trim() || null };
    this.saving = true; this.errorMessage = '';
    const recurrencePayload = { appointmentTypeId: value.appointmentTypeId, startDate: this.localDate(value.date), appointmentTime: this.localTime(value.time), frequency: this.frequency(value.repeat), intervalValue: value.repeat === 'BIWEEKLY' ? 2 : 1, endDate: value.endMode === 'DATE' ? this.localDate(value.endDate) : null, timeZone: this.recurrenceTimeZone, title: payload.title, notes: payload.notes };
    const request: Observable<unknown> = this.recurrenceId && this.originalOccurrenceDate
      ? this.recurrenceService.updateOccurrence(this.recurrenceId, this.originalOccurrenceDate, { appointmentAt: payload.appointmentAt, title: payload.title, notes: payload.notes }, this.occurrenceScope)
      : this.seriesId
      ? this.recurrenceService.update(this.seriesId, recurrencePayload)
      : !this.appointmentId && value.repeat !== 'NONE'
      ? this.recurrenceService.create(recurrencePayload)
      : this.appointmentId ? this.service.update(this.appointmentId, payload) : this.service.create(payload);
    request.pipe(finalize(() => (this.saving = false))).subscribe({ next: () => void this.router.navigateByUrl('/customer/agenda'), error: () => (this.errorMessage = 'No pudimos guardar el turno. Revisá los datos e intentá de nuevo.') });
  }

  private localParts(value: string): { date: Date; time: Date } {
    const appointment = new Date(value);
    return { date: new Date(appointment), time: new Date(appointment) };
  }

  private initialDate(): Date {
    return new Date();
  }

  private initialTime(): Date {
    const time = new Date();
    time.setSeconds(0, 0);
    return time;
  }

  private initialEndDate(): Date { const date = new Date(); date.setMonth(date.getMonth() + 1); return date; }
  private localDate(date: Date): string { const p=(v:number)=>String(v).padStart(2,'0');return `${date.getFullYear()}-${p(date.getMonth()+1)}-${p(date.getDate())}`; }
  private localTime(date: Date): string { const p=(v:number)=>String(v).padStart(2,'0');return `${p(date.getHours())}:${p(date.getMinutes())}`; }
  private frequency(repeat: string): RecurrenceFrequency { return repeat === 'DAILY' ? 'DAILY' : repeat === 'MONTHLY' ? 'MONTHLY' : 'WEEKLY'; }
  protected isEditing(): boolean { return !!(this.appointmentId || this.recurrenceId || this.seriesId); }
}
