import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { catchError, finalize, forkJoin, Observable, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { provideNativeDateAdapter } from '@angular/material/core';
import { UiStateComponent } from '../../shared/ui-state.component';
import { BookingService } from '../booking/booking.service';
import { AvailabilitySlot } from '../booking/booking.models';
import { BusinessDashboardService } from './business-dashboard.service';
import { dashboardErrorMessage } from './dashboard-error';
import {
  Booking,
  Branch,
  BranchSchedule,
  BranchScheduleException,
  BranchScheduleExceptionRequest,
  DayOfWeek,
  EntityCollection,
  Resource,
  ResourceAbsence,
  ResourceSchedule,
  ServiceCatalogItem,
} from './dashboard.models';

@Component({
  selector: 'app-business-dashboard-page',
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatDialogModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatTabsModule,
    NgTemplateOutlet,
    ReactiveFormsModule,
    UiStateComponent,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <section class="dashboard turnero-screen">
      <header class="dashboard-header">
        <div>
          <h1>{{ pageTitle() }}</h1>
          <p>{{ pageSubtitle() }}</p>
        </div>
        <button mat-stroked-button type="button" (click)="refreshAll()">
          <mat-icon aria-hidden="true">refresh</mat-icon>Actualizar
        </button>
      </header>

      <app-ui-state [loading]="loading()" [error]="errorMessage()" />

      @if (bookingsStandalone()) {
        <ng-container [ngTemplateOutlet]="bookingsPanel" />
      } @else {
        <mat-tab-group class="dashboard-tabs" mat-stretch-tabs="false">
          <mat-tab label="Sucursales">
            <section class="tab-panel">
              <div class="entity-toolbar">
                <button mat-flat-button type="button" (click)="startCreateBranch()">
                  <mat-icon aria-hidden="true">add_location_alt</mat-icon>
                  Crear sucursal
                </button>
              </div>

              <mat-accordion>
                <mat-expansion-panel [expanded]="branchFormExpanded()" (closed)="resetBranchForm()">
                  <mat-expansion-panel-header>
                    <mat-panel-title>{{
                      editingBranchId() ? 'Editar sucursal' : 'Nueva sucursal'
                    }}</mat-panel-title>
                  </mat-expansion-panel-header>

                  <form
                    class="form-grid expansion-form"
                    [formGroup]="branchForm"
                    (ngSubmit)="saveBranch()"
                  >
                    <mat-form-field appearance="outline">
                      <mat-label>Nombre</mat-label>
                      <mat-icon matPrefix class="field-icon" aria-hidden="true">badge</mat-icon>
                      <input matInput formControlName="name" />
                      <mat-error>El nombre es obligatorio.</mat-error>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Dirección</mat-label>
                      <mat-icon matPrefix class="field-icon" aria-hidden="true"
                        >location_on</mat-icon
                      >
                      <input matInput formControlName="address" />
                      <mat-error>La dirección es obligatoria.</mat-error>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Localidad</mat-label>
                      <mat-icon matPrefix class="field-icon" aria-hidden="true"
                        >location_city</mat-icon
                      >
                      <input matInput formControlName="locality" />
                      <mat-error>La localidad es obligatoria.</mat-error>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Provincia</mat-label>
                      <mat-icon matPrefix class="field-icon" aria-hidden="true">map</mat-icon>
                      <input matInput formControlName="province" />
                      <mat-error>La provincia es obligatoria.</mat-error>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>País</mat-label>
                      <mat-icon matPrefix class="field-icon" aria-hidden="true">public</mat-icon>
                      <input matInput formControlName="country" />
                      <mat-error>El país es obligatorio.</mat-error>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Latitud</mat-label>
                      <mat-icon matPrefix class="field-icon" aria-hidden="true"
                        >my_location</mat-icon
                      >
                      <input matInput type="number" formControlName="latitude" />
                      <mat-error>La latitud es obligatoria.</mat-error>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Longitud</mat-label>
                      <mat-icon matPrefix class="field-icon" aria-hidden="true"
                        >my_location</mat-icon
                      >
                      <input matInput type="number" formControlName="longitude" />
                      <mat-error>La longitud es obligatoria.</mat-error>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Zona horaria</mat-label>
                      <mat-icon matPrefix class="field-icon" aria-hidden="true">schedule</mat-icon>
                      <input matInput formControlName="zoneId" />
                      <mat-error>La zona horaria es obligatoria.</mat-error>
                    </mat-form-field>
                    <mat-checkbox formControlName="active">Activa</mat-checkbox>
                    <mat-expansion-panel
                      class="schedule-editor branch-schedule-panel"
                      [expanded]="branchScheduleExpanded()"
                      (opened)="branchScheduleExpanded.set(true)"
                      (closed)="branchScheduleExpanded.set(false)"
                    >
                      <mat-expansion-panel-header>
                        <mat-panel-title>Agenda semanal</mat-panel-title>
                        <mat-panel-description>
                          {{ branchScheduleSummary() }}
                        </mat-panel-description>
                      </mat-expansion-panel-header>
                      <div class="schedule-grid">
                        @for (day of branchSchedule(); track day.dayOfWeek) {
                          <div class="schedule-row">
                            <mat-checkbox
                              [checked]="day.active"
                              (change)="setBranchScheduleDayActive(day.dayOfWeek, $event.checked)"
                            >
                              {{ day.label }}
                            </mat-checkbox>
                            <div class="schedule-ranges">
                              @for (
                                range of day.timeRanges;
                                track $index;
                                let rangeIndex = $index
                              ) {
                                <div class="schedule-range">
                                  <mat-form-field appearance="outline">
                                    <mat-label>Abre</mat-label>
                                    <mat-icon matPrefix class="field-icon" aria-hidden="true"
                                      >schedule</mat-icon
                                    >
                                    <input
                                      matInput
                                      type="time"
                                      [value]="range.opensAt"
                                      [disabled]="!day.active"
                                      (input)="
                                        setBranchScheduleTime(
                                          day.dayOfWeek,
                                          'opensAt',
                                          $event,
                                          rangeIndex
                                        )
                                      "
                                    />
                                  </mat-form-field>
                                  <mat-form-field appearance="outline">
                                    <mat-label>Cierra</mat-label>
                                    <mat-icon matPrefix class="field-icon" aria-hidden="true"
                                      >schedule</mat-icon
                                    >
                                    <input
                                      matInput
                                      type="time"
                                      [value]="range.closesAt"
                                      [disabled]="!day.active"
                                      (input)="
                                        setBranchScheduleTime(
                                          day.dayOfWeek,
                                          'closesAt',
                                          $event,
                                          rangeIndex
                                        )
                                      "
                                    />
                                  </mat-form-field>
                                  <button
                                    mat-button
                                    type="button"
                                    [disabled]="!day.active || day.timeRanges.length === 1"
                                    (click)="removeBranchScheduleRange(day.dayOfWeek, rangeIndex)"
                                  >
                                    Quitar
                                  </button>
                                </div>
                              }
                              <button
                                mat-button
                                type="button"
                                [disabled]="!day.active"
                                (click)="addBranchScheduleRange(day.dayOfWeek)"
                              >
                                Agregar rango
                              </button>
                            </div>
                          </div>
                        }
                      </div>
                      @if (branchScheduleInvalid()) {
                        <p class="form-error">
                          Selecciona al menos un día y un rango horario válido.
                        </p>
                      }
                    </mat-expansion-panel>
                    <section
                      class="schedule-editor exception-editor"
                      aria-label="Excepciones de la sucursal"
                    >
                      <div class="subsection-header">
                        <h3>Excepciones</h3>
                        @if (editingBranchId()) {
                          <button mat-stroked-button type="button" (click)="startBranchException()">
                            <mat-icon aria-hidden="true">add</mat-icon> Agregar excepción
                          </button>
                        }
                      </div>
                      @if (!editingBranchId()) {
                        <p class="empty">Guardá la sucursal para poder agregar excepciones.</p>
                      } @else {
                        @if (showBranchExceptionForm()) {
                          <div class="exception-form" [formGroup]="branchExceptionForm">
                            <mat-form-field appearance="outline">
                              <mat-label>Fecha</mat-label>
                              <input
                                matInput
                                [matDatepicker]="exceptionDatePicker"
                                formControlName="date"
                              />
                              <mat-datepicker-toggle matIconSuffix [for]="exceptionDatePicker" />
                              <mat-datepicker #exceptionDatePicker />
                            </mat-form-field>
                            <mat-form-field appearance="outline">
                              <mat-label>Tipo</mat-label>
                              <mat-select formControlName="type">
                                <mat-option value="CLOSED">Cerrado todo el día</mat-option>
                                <mat-option value="CUSTOM_HOURS">Horario especial</mat-option>
                              </mat-select>
                            </mat-form-field>
                            @if (branchExceptionForm.controls.type.value === 'CUSTOM_HOURS') {
                              <mat-form-field appearance="outline"
                                ><mat-label>Desde</mat-label
                                ><input matInput type="time" formControlName="startTime"
                              /></mat-form-field>
                              <mat-form-field appearance="outline"
                                ><mat-label>Hasta</mat-label
                                ><input matInput type="time" formControlName="endTime"
                              /></mat-form-field>
                            }
                            <mat-form-field appearance="outline" class="reason-field">
                              <mat-label>Motivo (opcional)</mat-label>
                              <textarea
                                matInput
                                maxlength="500"
                                formControlName="reason"
                              ></textarea>
                            </mat-form-field>
                            <div class="form-actions">
                              <button
                                mat-flat-button
                                type="button"
                                [disabled]="savingException()"
                                (click)="saveBranchException()"
                              >
                                Guardar excepción
                              </button>
                              <button mat-button type="button" (click)="cancelBranchException()">
                                Cancelar
                              </button>
                            </div>
                          </div>
                        }
                        @if (branchExceptionError()) {
                          <p class="form-error">{{ branchExceptionError() }}</p>
                        }
                        <div class="exception-list">
                          @for (exception of branchExceptions(); track exception.id) {
                            <article>
                              <div>
                                <strong>{{ shortDateLabel(dateInputValue(exception.date)) }}</strong
                                ><span>{{ branchExceptionLabel(exception) }}</span>
                                @if (exception.reason) {
                                  <small>{{ exception.reason }}</small>
                                }
                              </div>
                              <div class="row-actions">
                                <button
                                  mat-button
                                  type="button"
                                  (click)="editBranchException(exception)"
                                >
                                  Editar</button
                                ><button
                                  mat-button
                                  type="button"
                                  (click)="removeBranchException(exception)"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </article>
                          } @empty {
                            <p class="empty">No hay excepciones cargadas.</p>
                          }
                        </div>
                      }
                    </section>
                    <div class="form-actions">
                      <button
                        mat-flat-button
                        type="submit"
                        [disabled]="branchForm.invalid || saving()"
                      >
                        Guardar
                      </button>
                      <button mat-button type="button" (click)="resetBranchForm()">Cancelar</button>
                    </div>
                  </form>
                </mat-expansion-panel>
              </mat-accordion>
              <div class="list">
                @for (branch of branches(); track branch.id) {
                  <article class="row-card">
                    <div>
                      <strong>{{ branch.name }}</strong>
                      <span>{{ branch.address }}</span>
                      <small>{{ branch.locality }}, {{ branch.province }}</small>
                      <small>{{ branch.zoneId }}</small>
                      <small>{{ branchScheduleLabel(branch) }}</small>
                    </div>
                    <div class="row-actions">
                      <button mat-button type="button" (click)="editBranch(branch)">Editar</button>
                      <button
                        mat-button
                        type="button"
                        (click)="deleteEntity('branches', branch.id)"
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                } @empty {
                  <p class="empty">No hay sucursales cargadas.</p>
                }
              </div>
            </section>
          </mat-tab>

          <mat-tab label="Servicios">
            <section class="tab-panel">
              <div class="entity-toolbar">
                <button mat-flat-button type="button" (click)="startCreateService()">
                  <mat-icon aria-hidden="true">design_services</mat-icon>
                  Crear servicio
                </button>
              </div>

              <mat-accordion>
                <mat-expansion-panel
                  [expanded]="serviceFormExpanded()"
                  (closed)="resetServiceForm()"
                >
                  <mat-expansion-panel-header>
                    <mat-panel-title>{{
                      editingServiceId() ? 'Editar servicio' : 'Nuevo servicio'
                    }}</mat-panel-title>
                  </mat-expansion-panel-header>

                  <form
                    class="form-grid expansion-form"
                    [formGroup]="serviceForm"
                    (ngSubmit)="saveService()"
                  >
                    <mat-form-field appearance="outline">
                      <mat-label>Nombre</mat-label>
                      <mat-icon matPrefix class="field-icon" aria-hidden="true">badge</mat-icon>
                      <input matInput formControlName="name" />
                      <mat-error>El nombre es obligatorio.</mat-error>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Duración minutos</mat-label>
                      <mat-icon matPrefix class="field-icon" aria-hidden="true">schedule</mat-icon>
                      <input matInput type="number" min="5" formControlName="durationMinutes" />
                      <mat-error>La duración mínima es 5 minutos.</mat-error>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Sucursal</mat-label>
                      <mat-icon matPrefix class="field-icon" aria-hidden="true"
                        >location_on</mat-icon
                      >
                      <mat-select formControlName="branchId">
                        @for (branch of branches(); track branch.id) {
                          <mat-option [value]="branch.id">{{ branch.name }}</mat-option>
                        }
                      </mat-select>
                      <mat-error>Selecciona la sucursal.</mat-error>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Precio</mat-label>
                      <mat-icon matPrefix class="field-icon" aria-hidden="true">sell</mat-icon>
                      <input matInput type="number" min="0" formControlName="price" />
                    </mat-form-field>
                    <mat-checkbox formControlName="active">Activo</mat-checkbox>
                    <div class="form-actions">
                      <button
                        mat-flat-button
                        type="submit"
                        [disabled]="serviceForm.invalid || saving()"
                      >
                        Guardar
                      </button>
                      <button mat-button type="button" (click)="resetServiceForm()">
                        Cancelar
                      </button>
                    </div>
                  </form>
                </mat-expansion-panel>
              </mat-accordion>
              <div class="list">
                @for (service of services(); track service.id) {
                  <article class="row-card">
                    <div>
                      <strong>{{ service.name }}</strong>
                      <small>{{ serviceBranchesLabel(service) }}</small>
                      <span>{{ service.durationMinutes }} min</span>
                      @if (service.price !== undefined && service.price !== null) {
                        <small>{{ service.price }}</small>
                      }
                    </div>
                    <div class="row-actions">
                      <button mat-button type="button" (click)="editService(service)">
                        Editar
                      </button>
                      <button
                        mat-button
                        type="button"
                        (click)="deleteEntity('services', service.id)"
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                } @empty {
                  <p class="empty">No hay servicios cargados.</p>
                }
              </div>
            </section>
          </mat-tab>

          <mat-tab label="Recursos">
            <section class="tab-panel">
              <div class="entity-toolbar">
                <button mat-flat-button type="button" (click)="startCreateResource()">
                  <mat-icon aria-hidden="true">person_add</mat-icon>
                  Crear recurso
                </button>
              </div>

              <mat-accordion>
                <mat-expansion-panel
                  [expanded]="resourceFormExpanded()"
                  (closed)="resetResourceForm()"
                >
                  <mat-expansion-panel-header>
                    <mat-panel-title>{{
                      editingResourceId() ? 'Editar recurso' : 'Nuevo recurso'
                    }}</mat-panel-title>
                  </mat-expansion-panel-header>

                  <form
                    class="form-grid expansion-form"
                    [formGroup]="resourceForm"
                    (ngSubmit)="saveResource()"
                  >
                    <mat-form-field appearance="outline">
                      <mat-label>Nombre</mat-label>
                      <mat-icon matPrefix class="field-icon" aria-hidden="true">badge</mat-icon>
                      <input matInput formControlName="name" />
                      <mat-error>El nombre es obligatorio.</mat-error>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Sucursal</mat-label>
                      <mat-icon matPrefix class="field-icon" aria-hidden="true"
                        >location_on</mat-icon
                      >
                      <mat-select formControlName="branchId">
                        <mat-option value="">Sin asignar</mat-option>
                        @for (branch of branches(); track branch.id) {
                          <mat-option [value]="branch.id">{{ branch.name }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Servicios que brinda</mat-label>
                      <mat-icon matPrefix class="field-icon service-icon" aria-hidden="true"
                        >design_services</mat-icon
                      >
                      <mat-select formControlName="serviceOfferingIds" multiple>
                        @for (service of resourceServices(); track service.id) {
                          <mat-option [value]="service.id">{{ service.name }}</mat-option>
                        }
                      </mat-select>
                      <mat-error>Selecciona al menos un servicio.</mat-error>
                    </mat-form-field>
                    <mat-checkbox formControlName="active">Activo</mat-checkbox>
                    <section class="schedule-editor" aria-label="Agenda semanal del recurso">
                      <h3>Agenda semanal</h3>
                      <div class="schedule-grid">
                        @for (day of resourceSchedule(); track day.dayOfWeek) {
                          <div class="schedule-row">
                            <mat-checkbox
                              [checked]="day.active"
                              (change)="setScheduleDayActive(day.dayOfWeek, $event.checked)"
                            >
                              {{ day.label }}
                            </mat-checkbox>
                            <div class="schedule-ranges">
                              @for (
                                range of day.timeRanges;
                                track $index;
                                let rangeIndex = $index
                              ) {
                                <div class="schedule-range">
                                  <mat-form-field appearance="outline">
                                    <mat-label>Desde</mat-label>
                                    <mat-icon matPrefix class="field-icon" aria-hidden="true"
                                      >schedule</mat-icon
                                    >
                                    <input
                                      matInput
                                      type="time"
                                      [value]="range.startsAt"
                                      [disabled]="!day.active"
                                      (input)="
                                        setScheduleTime(
                                          day.dayOfWeek,
                                          'startsAt',
                                          $event,
                                          rangeIndex
                                        )
                                      "
                                    />
                                  </mat-form-field>
                                  <mat-form-field appearance="outline">
                                    <mat-label>Hasta</mat-label>
                                    <mat-icon matPrefix class="field-icon" aria-hidden="true"
                                      >schedule</mat-icon
                                    >
                                    <input
                                      matInput
                                      type="time"
                                      [value]="range.endsAt"
                                      [disabled]="!day.active"
                                      (input)="
                                        setScheduleTime(day.dayOfWeek, 'endsAt', $event, rangeIndex)
                                      "
                                    />
                                  </mat-form-field>
                                  <button
                                    mat-button
                                    type="button"
                                    [disabled]="!day.active || day.timeRanges.length === 1"
                                    (click)="removeScheduleRange(day.dayOfWeek, rangeIndex)"
                                  >
                                    Quitar
                                  </button>
                                </div>
                              }
                              <button
                                mat-button
                                type="button"
                                [disabled]="!day.active"
                                (click)="addScheduleRange(day.dayOfWeek)"
                              >
                                Agregar rango
                              </button>
                            </div>
                          </div>
                        }
                      </div>
                      @if (scheduleInvalid()) {
                        <p class="form-error">
                          Selecciona al menos un día y un rango horario válido.
                        </p>
                      }
                    </section>
                    <section
                      class="schedule-editor exception-editor"
                      aria-label="Ausencias del recurso"
                    >
                      <div class="subsection-header">
                        <h3>Ausencias</h3>
                        <button mat-stroked-button type="button" (click)="startResourceAbsence()">
                          <mat-icon aria-hidden="true">add</mat-icon> Agregar ausencia
                        </button>
                      </div>
                      @if (showResourceAbsenceForm()) {
                        <div class="exception-form" [formGroup]="resourceAbsenceForm">
                          <mat-form-field appearance="outline"
                            ><mat-label>Fecha</mat-label
                            ><input
                              matInput
                              [matDatepicker]="absenceDatePicker"
                              formControlName="date"
                              [min]="today" /><mat-datepicker-toggle
                              matIconSuffix
                              [for]="absenceDatePicker" /><mat-datepicker #absenceDatePicker
                          /></mat-form-field>
                          <mat-checkbox formControlName="allDay">Día completo</mat-checkbox>
                          @if (!resourceAbsenceForm.controls.allDay.value) {
                            <mat-form-field appearance="outline"
                              ><mat-label>Desde</mat-label
                              ><input matInput type="time" formControlName="startsAt"
                            /></mat-form-field>
                            <mat-form-field appearance="outline"
                              ><mat-label>Hasta</mat-label
                              ><input matInput type="time" formControlName="endsAt"
                            /></mat-form-field>
                          }
                          <div class="form-actions">
                            <button mat-flat-button type="button" (click)="saveResourceAbsence()">
                              Guardar ausencia</button
                            ><button mat-button type="button" (click)="cancelResourceAbsence()">
                              Cancelar
                            </button>
                          </div>
                        </div>
                      }
                      @if (resourceAbsenceError()) {
                        <p class="form-error">{{ resourceAbsenceError() }}</p>
                      }
                      <div class="exception-list">
                        @for (
                          absence of futureResourceAbsences();
                          track absence.date + '-' + absence.startsAt
                        ) {
                          <article>
                            <div>
                              <strong>{{ shortDateLabel(dateInputValue(absence.date)) }}</strong
                              ><span>{{ resourceAbsenceLabel(absence) }}</span>
                            </div>
                            <div class="row-actions">
                              <button
                                mat-button
                                type="button"
                                (click)="editResourceAbsence(absence)"
                              >
                                Editar</button
                              ><button
                                mat-button
                                type="button"
                                (click)="removeResourceAbsence(absence)"
                              >
                                Eliminar
                              </button>
                            </div>
                          </article>
                        } @empty {
                          <p class="empty">No hay ausencias futuras.</p>
                        }
                      </div>
                    </section>
                    <div class="form-actions">
                      <button
                        mat-flat-button
                        type="submit"
                        [disabled]="resourceForm.invalid || saving()"
                      >
                        Guardar
                      </button>
                      <button mat-button type="button" (click)="resetResourceForm()">
                        Cancelar
                      </button>
                    </div>
                  </form>
                </mat-expansion-panel>
              </mat-accordion>
              <div class="list">
                @for (resource of resources(); track resource.id) {
                  <article class="row-card">
                    <div>
                      <strong>{{ resource.name }}</strong>
                      <small>{{ branchName(resource.branchId) }}</small>
                      <small>{{ resourceServicesLabel(resource) }}</small>
                      <small>{{ resourceScheduleLabel(resource) }}</small>
                    </div>
                    <div class="row-actions">
                      <button mat-button type="button" (click)="editResource(resource)">
                        Editar
                      </button>
                      <button
                        mat-button
                        type="button"
                        (click)="deleteEntity('resources', resource.id, resource.branchId)"
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                } @empty {
                  <p class="empty">No hay recursos cargados.</p>
                }
              </div>
            </section>
          </mat-tab>
          <mat-tab label="Configuración">
            <section class="tab-panel business-configuration">
              <mat-card appearance="outlined">
                <mat-card-header
                  ><mat-card-title>Configuración del negocio</mat-card-title></mat-card-header
                >
                <mat-card-content>
                  <mat-checkbox
                    [checked]="depositEnabled()"
                    (change)="depositEnabled.set($event.checked)"
                  >
                    Habilitar manejo de señas
                  </mat-checkbox>
                  <p class="configuration-help">
                    Al habilitarlo, las reservas podrán registrarse con la seña pagada o pendiente.
                  </p>
                  <section class="configuration-section" aria-labelledby="notifications-title">
                    <h3 id="notifications-title">Notificaciones</h3>
                    <mat-checkbox
                      [checked]="appointmentConfirmationEnabled()"
                      (change)="appointmentConfirmationEnabled.set($event.checked)"
                    >
                      Solicitar confirmación de turnos
                    </mat-checkbox>
                    <p class="configuration-help">
                      Si esta opción está activa, los emails programados solicitarán al cliente
                      confirmar su turno.
                    </p>
                    <p class="configuration-help">
                      Si está desactivada, se enviará el recordatorio habitual.
                    </p>
                  </section>
                  @if (configurationError()) {
                    <p class="form-error">{{ configurationError() }}</p>
                  }
                </mat-card-content>
                <mat-card-actions
                  ><button
                    mat-flat-button
                    type="button"
                    [disabled]="savingConfiguration()"
                    (click)="saveConfiguration()"
                  >
                    Guardar configuración
                  </button></mat-card-actions
                >
              </mat-card>
            </section>
          </mat-tab>
        </mat-tab-group>
      }

      <ng-template #bookingsPanel>
        <section class="tab-panel">
          <mat-card appearance="outlined">
            <mat-card-content>
              <form
                class="booking-filter"
                [formGroup]="bookingForm"
                (ngSubmit)="loadCurrentBookings(true)"
              >
                <mat-button-toggle-group
                  class="booking-view-toggle"
                  [value]="bookingViewMode()"
                  [hideSingleSelectionIndicator]="true"
                  aria-label="Vista de reservas"
                  (valueChange)="setBookingViewMode($event)"
                >
                  <mat-button-toggle value="day">Día</mat-button-toggle>
                  <mat-button-toggle value="week">Semana</mat-button-toggle>
                </mat-button-toggle-group>
                <mat-form-field appearance="outline">
                  <mat-label>{{ bookingViewMode() === 'week' ? 'Semana' : 'Fecha' }}</mat-label>
                  <mat-icon matPrefix class="field-icon" aria-hidden="true"
                    >calendar_today</mat-icon
                  >
                  <input
                    matInput
                    [matDatepicker]="bookingDatePicker"
                    formControlName="date"
                    (dateChange)="setBookingDate($event.value)"
                  />
                  <mat-datepicker-toggle matIconSuffix [for]="bookingDatePicker" />
                  <mat-datepicker #bookingDatePicker />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Estado</mat-label>
                  <mat-icon matPrefix class="field-icon" aria-hidden="true">fact_check</mat-icon>
                  <mat-select formControlName="status">
                    <mat-option value="ACTIVE">Activas</mat-option>
                    <mat-option value="CONFIRMED">Confirmadas</mat-option>
                    <mat-option value="PENDING">Pendientes</mat-option>
                    <mat-option value="CANCELLED">Canceladas</mat-option>
                    <mat-option value="ALL">Todas</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Sucursal</mat-label>
                  <mat-icon matPrefix class="field-icon" aria-hidden="true">location_on</mat-icon>
                  <mat-select formControlName="branchId">
                    <mat-option value="">Todas</mat-option>
                    @for (branch of branches(); track branch.id) {
                      <mat-option [value]="branch.id">{{ branch.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Servicio</mat-label>
                  <mat-icon matPrefix class="field-icon service-icon" aria-hidden="true"
                    >design_services</mat-icon
                  >
                  <mat-select formControlName="serviceOfferingId">
                    <mat-option value="">Todos</mat-option>
                    @for (service of bookingServices(); track service.id) {
                      <mat-option [value]="service.id">{{ service.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Recurso</mat-label>
                  <mat-icon matPrefix class="field-icon" aria-hidden="true">person</mat-icon>
                  <mat-select formControlName="resourceId">
                    <mat-option value="">Todos</mat-option>
                    @for (resource of bookingResources(); track resource.id) {
                      <mat-option [value]="resource.id">{{ resource.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <button
                  mat-flat-button
                  class="view-bookings-button"
                  type="submit"
                  [disabled]="bookingForm.invalid || loadingBookings()"
                >
                  <mat-icon aria-hidden="true">search</mat-icon>Ver reservas
                </button>
              </form>
            </mat-card-content>
          </mat-card>

          <app-ui-state [loading]="loadingBookings()" [error]="bookingError()" />
          @if (bookingSuccess()) {
            <p class="booking-success" role="status">{{ bookingSuccess() }}</p>
          }

          @if (bookingViewMode() === 'week') {
            <div class="week-nav">
              <button
                mat-stroked-button
                type="button"
                [disabled]="loadingBookings()"
                (click)="changeWeek(-1)"
              >
                Semana anterior
              </button>
              <strong>{{ weekRangeLabel() }}</strong>
              <button
                mat-stroked-button
                type="button"
                [disabled]="loadingBookings()"
                (click)="changeWeek(1)"
              >
                Semana siguiente
              </button>
            </div>
            <p class="swipe-week-hint">Deslizá hacia los lados para cambiar de semana</p>
            @if (weeklyBookingCopyEnabled()) {
              <div class="copy-week-toolbar">
                <button
                  mat-flat-button
                  type="button"
                  [disabled]="!canCopyWeek() || loadingBookings() || copyingWeek()"
                  (click)="openCopyWeekDialog()"
                >
                  Copiar semana
                </button>
                @if (!canCopyWeek()) {
                  <small>Seleccioná sucursal, servicio y recurso para copiar una semana.</small>
                }
              </div>
            }

            <div
              class="week-day-tabs"
              role="tablist"
              aria-label="Días de la semana"
              (touchstart)="onWeekTouchStart($event)"
              (touchend)="onWeekTouchEnd($event)"
            >
              @for (day of weeklyBookings(); track day.date) {
                <button
                  type="button"
                  class="week-day-card"
                  role="tab"
                  [class.active]="selectedWeekDate() === day.date"
                  [class.empty]="day.bookings.length === 0"
                  [attr.aria-selected]="selectedWeekDate() === day.date"
                  (click)="selectWeekDay(day.date)"
                >
                  <span class="week-day-accent"></span>
                  <span>{{ day.shortLabel }}</span>
                  <strong>{{ day.dayNumber }}</strong>
                  <small>{{ day.bookings.length }}</small>
                </button>
              }
            </div>

            @if (selectedWeekDay(); as day) {
              <section
                class="selected-week-day"
                (touchstart)="onWeekTouchStart($event)"
                (touchend)="onWeekTouchEnd($event)"
              >
                <header>
                  <div>
                    <h3>{{ day.fullLabel }}</h3>
                    <p>{{ reservationSummaryLabel(day.bookings) }}</p>
                  </div>
                  <span class="booking-count-pill">
                    {{ reservationCountLabel(day.bookings.length) }}
                  </span>
                </header>

                <div class="week-agenda-list">
                  @for (booking of day.bookings; track booking.id) {
                    <button
                      type="button"
                      class="week-booking-row"
                      [class.cancelled]="booking.status === 'CANCELLED'"
                      (click)="openBookingDetail(booking)"
                    >
                      <strong class="week-booking-time">
                        {{ timeOnlyLabel(booking.startsAt) }}
                      </strong>
                      <span class="week-booking-main">
                        <b>{{ booking.customerName }}</b>
                        <small
                          >{{ booking.serviceName }} · {{ bookingResourceName(booking) }}</small
                        >
                      </span>
                      <span class="booking-statuses">
                        <small
                          class="booking-status"
                          [class.pending]="
                            booking.status === 'PENDING' ||
                            booking.status === 'PENDING_CONFIRMATION'
                          "
                          [class.cancelled]="booking.status === 'CANCELLED'"
                        >
                          {{ statusLabel(booking.status) }}
                        </small>
                        @if (
                          depositEnabled() &&
                          (booking.depositStatus === 'PAID' || booking.depositStatus === 'PENDING')
                        ) {
                          <small
                            class="deposit-status"
                            [class.paid]="booking.depositStatus === 'PAID'"
                            >{{ depositStatusLabel(booking.depositStatus) }}</small
                          >
                        }
                      </span>
                    </button>
                  } @empty {
                    <p class="empty">No hay reservas para este día.</p>
                  }
                </div>
              </section>
            }
          } @else {
            <section class="selected-week-day">
              <header>
                <div>
                  <h3>{{ bookingDayLabel() }}</h3>
                  <p>{{ reservationSummaryLabel(filteredBookings()) }}</p>
                </div>
                <span class="booking-count-pill">
                  {{ reservationCountLabel(filteredBookings().length) }}
                </span>
              </header>

              <div class="week-agenda-list">
                @for (booking of filteredBookings(); track booking.id) {
                  <button
                    type="button"
                    class="week-booking-row"
                    [class.cancelled]="booking.status === 'CANCELLED'"
                    (click)="openBookingDetail(booking)"
                  >
                    <strong class="week-booking-time">
                      {{ timeOnlyLabel(booking.startsAt) }}
                    </strong>
                    <span class="week-booking-main">
                      <b>{{ booking.customerName }}</b>
                      <small>{{ booking.serviceName }} · {{ bookingResourceName(booking) }}</small>
                    </span>
                    <span class="booking-statuses">
                      <small
                        class="booking-status"
                        [class.pending]="
                          booking.status === 'PENDING' || booking.status === 'PENDING_CONFIRMATION'
                        "
                        [class.cancelled]="booking.status === 'CANCELLED'"
                      >
                        {{ statusLabel(booking.status) }}
                      </small>
                      @if (
                        depositEnabled() &&
                        (booking.depositStatus === 'PAID' || booking.depositStatus === 'PENDING')
                      ) {
                        <small
                          class="deposit-status"
                          [class.paid]="booking.depositStatus === 'PAID'"
                          >{{ depositStatusLabel(booking.depositStatus) }}</small
                        >
                      }
                    </span>
                  </button>
                } @empty {
                  <p class="empty">No hay reservas para la fecha seleccionada.</p>
                }
              </div>
            </section>

            @if (showBookingPager()) {
              <div class="load-more">
                <button
                  mat-stroked-button
                  type="button"
                  [disabled]="!canLoadPreviousBookings() || loadingBookings()"
                  (click)="loadPreviousBookings()"
                >
                  Anterior
                </button>
                <span>{{ bookingPageLabel() }}</span>
                <button
                  mat-stroked-button
                  type="button"
                  [disabled]="!canLoadNextBookings() || loadingBookings()"
                  (click)="loadNextBookings()"
                >
                  Siguiente
                </button>
              </div>
            }
          }
        </section>
      </ng-template>

      <ng-template #copyWeekDialog>
        <section class="copy-week-dialog">
          <h2 mat-dialog-title>Copiar semana</h2>
          <mat-dialog-content>
            <p class="copy-week-origin">
              Origen: <strong>{{ weekRangeLabel() }}</strong>
            </p>
            <form class="copy-week-form" [formGroup]="copyWeekForm">
              <mat-form-field appearance="outline">
                <mat-label>Semana destino</mat-label>
                <input
                  matInput
                  [matDatepicker]="copyWeekTargetPicker"
                  formControlName="targetWeekStart"
                />
                <mat-datepicker-toggle matIconSuffix [for]="copyWeekTargetPicker" />
                <mat-datepicker #copyWeekTargetPicker />
              </mat-form-field>
            </form>
            @if (copyWeekError()) {
              <p class="form-error">{{ copyWeekError() }}</p>
            }
          </mat-dialog-content>
          <mat-dialog-actions class="booking-detail-actions" align="end">
            <button mat-button type="button" mat-dialog-close>Cerrar</button>
            <button
              mat-flat-button
              type="button"
              [disabled]="copyWeekForm.invalid || copyingWeek()"
              (click)="copyWeek()"
            >
              Copiar semana
            </button>
          </mat-dialog-actions>
        </section>
      </ng-template>

      <ng-template #bookingDetailDialog>
        @if (selectedBooking(); as booking) {
          <section class="booking-detail">
            <h2 mat-dialog-title>Detalle de reserva</h2>
            <mat-dialog-content>
              <dl>
                <div>
                  <dt>Horario</dt>
                  <dd>{{ dateTimeLabel(booking.startsAt) }}</dd>
                </div>
                <div>
                  <dt>Cliente</dt>
                  <dd>{{ booking.customerName }}</dd>
                </div>
                <div>
                  <dt>Teléfono</dt>
                  <dd>{{ bookingCustomerPhone(booking) }}</dd>
                </div>
                <div>
                  <dt>Servicio</dt>
                  <dd>{{ booking.serviceName }}</dd>
                </div>
                <div>
                  <dt>Sucursal</dt>
                  <dd>{{ bookingBranchName(booking) }}</dd>
                </div>
                <div>
                  <dt>Recurso</dt>
                  <dd>{{ bookingResourceName(booking) }}</dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>
                    <span
                      class="booking-status"
                      [class.pending]="
                        booking.status === 'PENDING' || booking.status === 'PENDING_CONFIRMATION'
                      "
                      [class.cancelled]="booking.status === 'CANCELLED'"
                    >
                      {{ statusLabel(booking.status) }}
                    </span>
                  </dd>
                </div>
                @if (depositEnabled() && booking.depositStatus !== 'NOT_REQUIRED') {
                  <div>
                    <dt>Seña</dt>
                    <dd>{{ depositStatusLabel(booking.depositStatus ?? 'PENDING') }}</dd>
                  </div>
                }
              </dl>
            </mat-dialog-content>
            <mat-dialog-actions class="booking-detail-actions" align="end">
              <button mat-button type="button" mat-dialog-close>Cerrar</button>
              @if (booking.status !== 'CANCELLED') {
                @if (depositEnabled() && booking.depositStatus !== 'NOT_REQUIRED') {
                  <button
                    mat-stroked-button
                    type="button"
                    [disabled]="updatingDeposit()"
                    (click)="toggleDepositStatus(booking)"
                  >
                    {{
                      booking.depositStatus === 'PAID'
                        ? 'Marcar como pendiente'
                        : 'Marcar como señado'
                    }}
                  </button>
                }
                <button mat-stroked-button type="button" (click)="openRescheduleDialog(booking)">
                  Reprogramar turno
                </button>
                <button
                  mat-flat-button
                  type="button"
                  class="cancel-booking-button"
                  mat-dialog-close
                  (click)="cancelBooking(booking.id)"
                >
                  Cancelar reserva
                </button>
              }
            </mat-dialog-actions>
          </section>
        }
      </ng-template>

      <ng-template #rescheduleDialog>
        @if (selectedBooking(); as booking) {
          <section class="reschedule-dialog">
            <h2 mat-dialog-title>Reprogramar turno</h2>
            <mat-dialog-content>
              <div class="reschedule-context">
                <p>
                  <span>Turno actual</span><strong>{{ dateTimeLabel(booking.startsAt) }}</strong>
                </p>
                <p>
                  <span>Sucursal</span><strong>{{ bookingBranchName(booking) }}</strong>
                </p>
                <p>
                  <span>Servicio</span><strong>{{ booking.serviceName }}</strong>
                </p>
              </div>

              <form class="reschedule-form" [formGroup]="rescheduleForm">
                <mat-form-field appearance="outline">
                  <mat-label>Nueva fecha</mat-label>
                  <input
                    matInput
                    [matDatepicker]="rescheduleDatePicker"
                    formControlName="date"
                    [min]="today"
                  />
                  <mat-datepicker-toggle matIconSuffix [for]="rescheduleDatePicker" />
                  <mat-datepicker #rescheduleDatePicker />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Recurso</mat-label>
                  <mat-select formControlName="resourceId">
                    <mat-option value="">Cualquier recurso disponible</mat-option>
                    @for (resource of rescheduleResources(booking); track resource.id) {
                      <mat-option [value]="resource.id">{{ resource.name }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </form>

              @if (loadingSlots()) {
                <p class="reschedule-message">Consultando horarios disponibles…</p>
              }
              @if (rescheduleError()) {
                <p class="form-error" role="alert">{{ rescheduleError() }}</p>
              }
              @if (!loadingSlots()) {
                <div class="reschedule-slots" aria-label="Horarios disponibles">
                  @for (slot of availableRescheduleSlots(); track slot.id) {
                    <button
                      mat-stroked-button
                      type="button"
                      [class.selected]="selectedRescheduleSlot()?.id === slot.id"
                      (click)="selectedRescheduleSlot.set(slot)"
                    >
                      {{ timeOnlyLabel(slot.startsAt) }}
                      @if (slot.resourceName) {
                        <small>{{ slot.resourceName }}</small>
                      }
                    </button>
                  } @empty {
                    <p>No hay horarios disponibles para la fecha y el recurso seleccionados.</p>
                  }
                </div>
              }

              @if (selectedRescheduleSlot(); as slot) {
                <section class="reschedule-confirmation">
                  <h3>Confirmá el cambio</h3>
                  <p>
                    <span>Actual</span><strong>{{ dateTimeLabel(booking.startsAt) }}</strong>
                  </p>
                  <p>
                    <span>Nuevo</span><strong>{{ dateTimeLabel(slot.startsAt) }}</strong>
                  </p>
                </section>
              }
            </mat-dialog-content>
            <mat-dialog-actions class="booking-detail-actions" align="end">
              <button mat-button type="button" mat-dialog-close>Volver</button>
              <button
                mat-flat-button
                type="button"
                [disabled]="!selectedRescheduleSlot() || rescheduling()"
                (click)="confirmReschedule()"
              >
                Confirmar reprogramación
              </button>
            </mat-dialog-actions>
          </section>
        }
      </ng-template>
    </section>
  `,
  styleUrl: './business-dashboard.page.scss',
})
export class BusinessDashboardPage implements OnInit {
  @ViewChild('bookingDetailDialog') private bookingDetailDialog?: TemplateRef<unknown>;
  @ViewChild('copyWeekDialog') private copyWeekDialog?: TemplateRef<unknown>;
  @ViewChild('rescheduleDialog') private rescheduleDialog?: TemplateRef<unknown>;

  private readonly dashboardService = inject(BusinessDashboardService);
  private readonly bookingService = inject(BookingService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private activeBookingRequestKey = '';
  private lastBookingRequestKey = '';
  private lastBookingRequestStartedAt = 0;
  private lastCompletedBookingRequestKey = '';
  private bookingDefaultsInitialized = false;
  private weekTouchStartX: number | null = null;
  private weekTouchStartY: number | null = null;

  protected readonly branches = signal<Branch[]>([]);
  protected readonly services = signal<ServiceCatalogItem[]>([]);
  protected readonly resources = signal<Resource[]>([]);
  protected readonly bookings = signal<Booking[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadingBookings = signal(false);
  protected readonly saving = signal(false);
  protected readonly copyingWeek = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly bookingError = signal('');
  protected readonly bookingSuccess = signal('');
  protected readonly rescheduleError = signal('');
  protected readonly loadingSlots = signal(false);
  protected readonly rescheduling = signal(false);
  protected readonly rescheduleSlots = signal<AvailabilitySlot[]>([]);
  protected readonly selectedRescheduleSlot = signal<AvailabilitySlot | null>(null);
  protected readonly today = new Date();
  protected readonly copyWeekError = signal('');
  protected readonly bookingPage = signal(0);
  protected readonly bookingPageSize = signal(20);
  protected readonly bookingTotalElements = signal(0);
  protected readonly bookingTotalPages = signal(0);
  protected readonly bookingHasMore = signal(false);
  protected readonly bookingViewMode = signal<BookingViewMode>('day');
  protected readonly weeklyBookingCopyEnabled = signal(false);
  protected readonly depositEnabled = signal(false);
  protected readonly appointmentConfirmationEnabled = signal(false);
  protected readonly savingConfiguration = signal(false);
  protected readonly configurationError = signal('');
  protected readonly updatingDeposit = signal(false);
  protected readonly weeklyBookings = signal<WeekBookingDay[]>([]);
  protected readonly selectedWeekDate = signal(this.dateValue(new Date()));
  protected readonly selectedBooking = signal<Booking | null>(null);
  protected readonly editingBranchId = signal('');
  protected readonly editingServiceId = signal('');
  protected readonly editingResourceId = signal('');
  protected readonly branchFormExpanded = signal(false);
  protected readonly serviceFormExpanded = signal(false);
  protected readonly resourceFormExpanded = signal(false);
  protected readonly branchSchedule = signal<BranchScheduleDay[]>(this.defaultBranchScheduleDays());
  protected readonly branchScheduleExpanded = signal(false);
  protected readonly branchScheduleInvalid = signal(false);
  protected readonly branchExceptions = signal<BranchScheduleException[]>([]);
  protected readonly showBranchExceptionForm = signal(false);
  protected readonly editingBranchExceptionId = signal('');
  protected readonly branchExceptionError = signal('');
  protected readonly savingException = signal(false);
  protected readonly resourceSchedule = signal<ResourceScheduleDay[]>(this.defaultSchedule());
  protected readonly scheduleInvalid = signal(false);
  protected readonly resourceAbsences = signal<ResourceAbsence[]>([]);
  protected readonly showResourceAbsenceForm = signal(false);
  protected readonly editingResourceAbsenceKey = signal('');
  protected readonly resourceAbsenceError = signal('');
  protected readonly bookingsStandalone = signal(
    this.route.snapshot.data['section'] === 'bookings',
  );
  protected readonly pageTitle = signal(
    this.bookingsStandalone() ? 'Reservas' : 'Panel de negocio',
  );
  protected readonly pageSubtitle = signal(
    this.bookingsStandalone()
      ? 'Consulta y gestiona las reservas del negocio.'
      : 'Configura sucursales, servicios, recursos y reservas.',
  );

  protected readonly branchForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    address: ['', Validators.required],
    locality: ['Los Polvorines', Validators.required],
    province: ['Buenos Aires', Validators.required],
    country: ['Argentina', Validators.required],
    latitude: [-35.6037, Validators.required],
    longitude: [-58.3816, Validators.required],
    zoneId: ['America/Argentina/Buenos_Aires', Validators.required],
    active: [true],
  });
  protected readonly branchExceptionForm = this.formBuilder.nonNullable.group({
    date: [new Date() as Date | string, Validators.required],
    type: ['CLOSED' as 'CLOSED' | 'CUSTOM_HOURS', Validators.required],
    startTime: [''],
    endTime: [''],
    reason: ['', Validators.maxLength(500)],
  });
  protected readonly serviceForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    branchId: ['', Validators.required],
    durationMinutes: [30, [Validators.required, Validators.min(5)]],
    price: [0, [Validators.min(0)]],
    active: [true],
  });
  protected readonly resourceForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    branchId: ['', Validators.required],
    serviceOfferingIds: [[] as string[], Validators.required],
    active: [true],
  });
  protected readonly resourceAbsenceForm = this.formBuilder.nonNullable.group({
    date: [new Date() as Date | string, Validators.required],
    allDay: [true],
    startsAt: [''],
    endsAt: [''],
  });
  protected readonly bookingForm = this.formBuilder.nonNullable.group({
    date: [new Date() as Date | string, Validators.required],
    status: ['ACTIVE' as BookingStatusFilter],
    branchId: [''],
    resourceId: [''],
    serviceOfferingId: [''],
  });
  protected readonly copyWeekForm = this.formBuilder.nonNullable.group({
    targetWeekStart: [this.defaultTargetWeekStart(), Validators.required],
  });
  protected readonly rescheduleForm = this.formBuilder.nonNullable.group({
    date: [new Date() as Date | string, Validators.required],
    resourceId: [''],
  });

  ngOnInit(): void {
    this.bookingForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.bookingPage.set(0);
    });
    this.bookingForm.controls.branchId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.pruneBookingFiltersForBranch());
    this.bookingForm.controls.serviceOfferingId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.pruneBookingResourceForService());
    this.resourceForm.controls.branchId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.pruneResourceServicesForBranch());
    this.rescheduleForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadRescheduleSlots());

    this.refreshAll();
    this.loadCurrentBookings();
  }

  protected refreshAll(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    forkJoin({
      branches: this.dashboardService.listBranches().pipe(catchError(() => of([]))),
      services: this.dashboardService.listServices().pipe(catchError(() => of([]))),
      resources: this.dashboardService.listResources().pipe(catchError(() => of([]))),
      configuration: this.dashboardService.getConfiguration().pipe(
        catchError(() =>
          of({
            weeklyBookingCopyEnabled: false,
            depositEnabled: false,
            appointmentConfirmationEnabled: false,
          }),
        ),
      ),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          this.branches.set(result.branches);
          this.services.set(result.services);
          this.resources.set(result.resources);
          this.weeklyBookingCopyEnabled.set(result.configuration.weeklyBookingCopyEnabled);
          this.depositEnabled.set(result.configuration.depositEnabled ?? false);
          this.appointmentConfirmationEnabled.set(
            result.configuration.appointmentConfirmationEnabled ?? false,
          );
          this.pruneResourceServicesForBranch();
          if (!this.bookingDefaultsInitialized) {
            this.bookingDefaultsInitialized = true;
            this.selectFirstBookingFilters();
            this.loadCurrentBookings(true);
          }
        },
        error: (error) => this.errorMessage.set(dashboardErrorMessage(error)),
      });
  }

  protected saveBranch(): void {
    if (this.branchForm.invalid || this.invalidBranchSchedule()) {
      this.branchForm.markAllAsTouched();
      this.branchScheduleInvalid.set(true);
      return;
    }

    const editingBranchId = this.editingBranchId();
    const branchPayload = {
      ...this.branchForm.getRawValue(),
      weeklySchedule: this.validBranchSchedule(),
    };
    const request = editingBranchId
      ? this.dashboardService.updateBranch(editingBranchId, branchPayload)
      : this.dashboardService.createBranch(branchPayload);

    this.saveEntity(request, () => this.resetBranchForm());
  }

  protected startCreateBranch(): void {
    this.resetBranchFields();
    this.branchScheduleExpanded.set(true);
    this.branchFormExpanded.set(true);
  }

  protected editBranch(branch: Branch): void {
    this.editingBranchId.set(branch.id);
    this.branchFormExpanded.set(true);
    this.branchScheduleExpanded.set(false);
    this.branchForm.setValue({
      name: branch.name,
      address: branch.address,
      locality: branch.locality,
      province: branch.province,
      country: branch.country,
      latitude: branch.latitude,
      longitude: branch.longitude,
      zoneId: branch.zoneId,
      active: branch.active,
    });
    this.branchSchedule.set(this.scheduleDaysFromBranch(branch.weeklySchedule));
    this.branchScheduleInvalid.set(false);
    this.loadBranchExceptions(branch.id);
  }

  protected resetBranchForm(): void {
    this.resetBranchFields();
    this.branchFormExpanded.set(false);
  }

  private resetBranchFields(): void {
    this.editingBranchId.set('');
    this.branchForm.reset({
      name: '',
      address: '',
      locality: 'Los Polvorines',
      province: 'Buenos Aires',
      country: 'Argentina',
      latitude: -35.6037,
      longitude: -58.3816,
      zoneId: 'America/Argentina/Buenos_Aires',
      active: true,
    });
    this.branchSchedule.set(this.defaultBranchScheduleDays());
    this.branchScheduleInvalid.set(false);
    this.branchExceptions.set([]);
    this.cancelBranchException();
  }

  protected startBranchException(): void {
    this.editingBranchExceptionId.set('');
    this.branchExceptionError.set('');
    this.branchExceptionForm.reset({
      date: new Date(),
      type: 'CLOSED',
      startTime: '',
      endTime: '',
      reason: '',
    });
    this.showBranchExceptionForm.set(true);
  }

  protected editBranchException(exception: BranchScheduleException): void {
    this.editingBranchExceptionId.set(exception.id);
    this.branchExceptionError.set('');
    this.branchExceptionForm.setValue({
      date: this.dateInputValue(exception.date),
      type: exception.type,
      startTime: exception.startTime?.slice(0, 5) ?? '',
      endTime: exception.endTime?.slice(0, 5) ?? '',
      reason: exception.reason ?? '',
    });
    this.showBranchExceptionForm.set(true);
  }

  protected cancelBranchException(): void {
    this.showBranchExceptionForm.set(false);
    this.editingBranchExceptionId.set('');
    this.branchExceptionError.set('');
  }

  protected saveBranchException(): void {
    const branchId = this.editingBranchId();
    const value = this.branchExceptionForm.getRawValue();
    if (!branchId || this.branchExceptionForm.invalid) return;
    if (
      value.type === 'CUSTOM_HOURS' &&
      (!value.startTime || !value.endTime || value.startTime >= value.endTime)
    ) {
      this.branchExceptionError.set(
        'Ingresá un horario especial válido: desde debe ser anterior a hasta.',
      );
      return;
    }
    const payload: BranchScheduleExceptionRequest = {
      date: this.dateValue(value.date),
      type: value.type,
      ...(value.type === 'CUSTOM_HOURS'
        ? { startTime: value.startTime, endTime: value.endTime }
        : {}),
      ...(value.reason.trim() ? { reason: value.reason.trim() } : {}),
    };
    const exceptionId = this.editingBranchExceptionId();
    const request = exceptionId
      ? this.dashboardService.updateBranchScheduleException(branchId, exceptionId, payload)
      : this.dashboardService.createBranchScheduleException(branchId, payload);
    this.savingException.set(true);
    request.pipe(finalize(() => this.savingException.set(false))).subscribe({
      next: () => {
        this.cancelBranchException();
        this.loadBranchExceptions(branchId);
      },
      error: (error) => this.branchExceptionError.set(dashboardErrorMessage(error)),
    });
  }

  protected removeBranchException(exception: BranchScheduleException): void {
    if (!confirm('¿Deseas eliminar esta excepción?')) return;
    this.dashboardService
      .deleteBranchScheduleException(exception.branchId, exception.id)
      .subscribe({
        next: () => this.loadBranchExceptions(exception.branchId),
        error: (error) => this.branchExceptionError.set(dashboardErrorMessage(error)),
      });
  }

  protected branchExceptionLabel(exception: BranchScheduleException): string {
    return exception.type === 'CLOSED'
      ? 'Cerrado todo el día'
      : `Horario especial: ${exception.startTime?.slice(0, 5)}–${exception.endTime?.slice(0, 5)}`;
  }

  protected branchScheduleSummary(): string {
    const activeDays = this.branchSchedule().filter((day) => day.active).length;
    return activeDays === 1 ? '1 día con atención' : `${activeDays} días con atención`;
  }

  private loadBranchExceptions(branchId: string): void {
    this.dashboardService.listBranchScheduleExceptions(branchId).subscribe({
      next: (exceptions) => this.branchExceptions.set(exceptions),
      error: (error) => this.branchExceptionError.set(dashboardErrorMessage(error)),
    });
  }

  protected saveService(): void {
    if (this.serviceForm.invalid) {
      this.serviceForm.markAllAsTouched();
      return;
    }

    const editingServiceId = this.editingServiceId();
    const request = editingServiceId
      ? this.dashboardService.updateService(editingServiceId, this.serviceForm.getRawValue())
      : this.dashboardService.createService(this.serviceForm.getRawValue());

    this.saveEntity(request, () => this.resetServiceForm());
  }

  protected startCreateService(): void {
    this.resetServiceFields();
    this.serviceFormExpanded.set(true);
  }

  protected editService(service: ServiceCatalogItem): void {
    this.editingServiceId.set(service.id);
    this.serviceFormExpanded.set(true);
    this.serviceForm.setValue({
      name: service.name,
      branchId: service.branchId,
      durationMinutes: service.durationMinutes,
      price: service.price ?? 0,
      active: service.active,
    });
  }

  protected resetServiceForm(): void {
    this.resetServiceFields();
    this.serviceFormExpanded.set(false);
  }

  private resetServiceFields(): void {
    this.editingServiceId.set('');
    this.serviceForm.reset({
      name: '',
      branchId: '',
      durationMinutes: 30,
      price: 0,
      active: true,
    });
  }

  protected saveResource(): void {
    if (
      this.resourceForm.invalid ||
      this.invalidResourceSchedule() ||
      this.resourceAbsenceError()
    ) {
      this.resourceForm.markAllAsTouched();
      this.scheduleInvalid.set(true);
      return;
    }

    const editingResourceId = this.editingResourceId();
    const resource = {
      ...this.resourceForm.getRawValue(),
      weeklySchedule: this.resourceSchedulePayload(),
      absences: this.resourceAbsences(),
    };
    const request = editingResourceId
      ? this.dashboardService.updateResource(editingResourceId, resource)
      : this.dashboardService.createResource(resource);

    this.saveEntity(request, () => this.resetResourceForm());
  }

  protected startCreateResource(): void {
    this.resetResourceFields();
    this.resourceFormExpanded.set(true);
  }

  protected editResource(resource: Resource): void {
    this.editingResourceId.set(resource.id);
    this.resourceFormExpanded.set(true);
    this.resourceForm.setValue({
      name: resource.name,
      branchId: resource.branchId ?? '',
      serviceOfferingIds: resource.serviceOfferingIds,
      active: resource.active,
    });
    this.resourceSchedule.set(this.scheduleDaysFromResource(resource.weeklySchedule));
    this.resourceAbsences.set(resource.absences ?? []);
    this.scheduleInvalid.set(false);
  }

  protected resetResourceForm(): void {
    this.resetResourceFields();
    this.resourceFormExpanded.set(false);
  }

  private resetResourceFields(): void {
    this.editingResourceId.set('');
    this.resourceForm.reset({ name: '', branchId: '', serviceOfferingIds: [], active: true });
    this.resourceSchedule.set(this.defaultSchedule());
    this.resourceAbsences.set([]);
    this.cancelResourceAbsence();
    this.scheduleInvalid.set(false);
  }

  protected startResourceAbsence(): void {
    this.editingResourceAbsenceKey.set('');
    this.resourceAbsenceError.set('');
    this.resourceAbsenceForm.reset({ date: new Date(), allDay: true, startsAt: '', endsAt: '' });
    this.showResourceAbsenceForm.set(true);
  }

  protected editResourceAbsence(absence: ResourceAbsence): void {
    this.editingResourceAbsenceKey.set(this.absenceKey(absence));
    this.resourceAbsenceError.set('');
    this.resourceAbsenceForm.setValue({
      date: this.dateInputValue(absence.date),
      allDay: absence.allDay,
      startsAt: absence.startsAt ?? '',
      endsAt: absence.endsAt ?? '',
    });
    this.showResourceAbsenceForm.set(true);
  }

  protected cancelResourceAbsence(): void {
    this.showResourceAbsenceForm.set(false);
    this.editingResourceAbsenceKey.set('');
    this.resourceAbsenceError.set('');
  }

  protected saveResourceAbsence(): void {
    const value = this.resourceAbsenceForm.getRawValue();
    if (this.resourceAbsenceForm.invalid) return;
    if (!value.allDay && (!value.startsAt || !value.endsAt || value.startsAt >= value.endsAt)) {
      this.resourceAbsenceError.set('Ingresá un rango de ausencia válido.');
      return;
    }
    const absence: ResourceAbsence = {
      date: this.dateValue(value.date),
      allDay: value.allDay,
      ...(value.allDay ? {} : { startsAt: value.startsAt, endsAt: value.endsAt }),
    };
    const editingKey = this.editingResourceAbsenceKey();
    const others = this.resourceAbsences().filter((item) => this.absenceKey(item) !== editingKey);
    const sameDate = others.filter((item) => item.date === absence.date);
    const overlaps =
      absence.allDay || sameDate.some((item) => item.allDay || this.absencesOverlap(item, absence));
    if (sameDate.length && overlaps) {
      this.resourceAbsenceError.set('La ausencia se superpone con otra cargada para esa fecha.');
      return;
    }
    this.resourceAbsences.set(
      [...others, absence].sort(
        (a, b) =>
          a.date.localeCompare(b.date) || (a.startsAt ?? '').localeCompare(b.startsAt ?? ''),
      ),
    );
    this.cancelResourceAbsence();
  }

  protected removeResourceAbsence(absence: ResourceAbsence): void {
    this.resourceAbsences.update((items) =>
      items.filter((item) => this.absenceKey(item) !== this.absenceKey(absence)),
    );
  }

  protected futureResourceAbsences(): ResourceAbsence[] {
    const today = this.dateValue(new Date());
    return this.resourceAbsences().filter((absence) => absence.date >= today);
  }

  protected resourceAbsenceLabel(absence: ResourceAbsence): string {
    return absence.allDay ? 'Día completo' : `${absence.startsAt}–${absence.endsAt}`;
  }

  private absenceKey(absence: ResourceAbsence): string {
    return `${absence.date}|${absence.allDay}|${absence.startsAt ?? ''}|${absence.endsAt ?? ''}`;
  }

  private absencesOverlap(left: ResourceAbsence, right: ResourceAbsence): boolean {
    return (
      (left.startsAt ?? '') < (right.endsAt ?? '') && (right.startsAt ?? '') < (left.endsAt ?? '')
    );
  }

  protected setBranchScheduleDayActive(dayOfWeek: DayOfWeek, active: boolean): void {
    this.branchSchedule.update((days) =>
      days.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, active } : day)),
    );
    this.branchScheduleInvalid.set(false);
  }

  protected setBranchScheduleTime(
    dayOfWeek: DayOfWeek,
    field: 'opensAt' | 'closesAt',
    event: Event,
    rangeIndex = 0,
  ): void {
    const value = (event.target as HTMLInputElement).value;

    this.branchSchedule.update((days) =>
      days.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              timeRanges: day.timeRanges.map((range, index) =>
                index === rangeIndex ? { ...range, [field]: value } : range,
              ),
            }
          : day,
      ),
    );
    this.branchScheduleInvalid.set(false);
  }

  protected addBranchScheduleRange(dayOfWeek: DayOfWeek): void {
    this.branchSchedule.update((days) =>
      days.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? { ...day, timeRanges: [...day.timeRanges, { opensAt: '16:00', closesAt: '20:00' }] }
          : day,
      ),
    );
    this.branchScheduleInvalid.set(false);
  }

  protected removeBranchScheduleRange(dayOfWeek: DayOfWeek, rangeIndex: number): void {
    this.branchSchedule.update((days) =>
      days.map((day) =>
        day.dayOfWeek === dayOfWeek && day.timeRanges.length > 1
          ? { ...day, timeRanges: day.timeRanges.filter((_, index) => index !== rangeIndex) }
          : day,
      ),
    );
    this.branchScheduleInvalid.set(false);
  }

  protected setScheduleDayActive(dayOfWeek: DayOfWeek, active: boolean): void {
    this.resourceSchedule.update((days) =>
      days.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, active } : day)),
    );
    this.scheduleInvalid.set(false);
  }

  protected setScheduleTime(
    dayOfWeek: DayOfWeek,
    field: 'startsAt' | 'endsAt',
    event: Event,
    rangeIndex = 0,
  ): void {
    const value = (event.target as HTMLInputElement).value;

    this.resourceSchedule.update((days) =>
      days.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              timeRanges: day.timeRanges.map((range, index) =>
                index === rangeIndex ? { ...range, [field]: value } : range,
              ),
            }
          : day,
      ),
    );
    this.scheduleInvalid.set(false);
  }

  protected addScheduleRange(dayOfWeek: DayOfWeek): void {
    this.resourceSchedule.update((days) =>
      days.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? { ...day, timeRanges: [...day.timeRanges, { startsAt: '16:00', endsAt: '20:00' }] }
          : day,
      ),
    );
    this.scheduleInvalid.set(false);
  }

  protected removeScheduleRange(dayOfWeek: DayOfWeek, rangeIndex: number): void {
    this.resourceSchedule.update((days) =>
      days.map((day) =>
        day.dayOfWeek === dayOfWeek && day.timeRanges.length > 1
          ? { ...day, timeRanges: day.timeRanges.filter((_, index) => index !== rangeIndex) }
          : day,
      ),
    );
    this.scheduleInvalid.set(false);
  }

  protected deleteEntity(collection: EntityCollection, id: string, branchId = ''): void {
    if (!confirm('Esta acción no se puede deshacer. ¿Deseas continuar?')) {
      return;
    }

    const request = {
      branches: () => this.dashboardService.deleteBranch(id),
      services: () => this.dashboardService.deleteService(id),
      resources: () => this.dashboardService.deleteResource(branchId, id),
    }[collection]();

    this.saveEntity(request);
  }

  protected loadCurrentBookings(resetPage = false): void {
    if (this.bookingViewMode() === 'week') {
      this.loadWeeklyBookings(resetPage);
      return;
    }

    this.loadBookings(resetPage);
  }

  protected loadBookings(resetPage = false): void {
    if (this.bookingForm.invalid) {
      return;
    }

    if (resetPage) {
      this.bookingPage.set(0);
    }

    const requestKey = this.bookingRequestKey('day', [
      this.dateValue(this.bookingForm.controls.date.value),
      this.bookingPage(),
      this.bookingPageSize(),
      this.bookingForm.controls.branchId.value,
      this.bookingForm.controls.resourceId.value,
      this.bookingForm.controls.serviceOfferingId.value,
      this.bookingForm.controls.status.value,
    ]);

    if (!this.startBookingRequest(requestKey, resetPage)) {
      return;
    }

    this.dashboardService
      .listBookingsPage(
        this.dateValue(this.bookingForm.controls.date.value),
        this.bookingPage(),
        this.bookingPageSize(),
        this.bookingForm.controls.branchId.value,
        this.bookingForm.controls.resourceId.value,
        this.bookingForm.controls.serviceOfferingId.value,
      )
      .pipe(finalize(() => this.finishBookingRequest(requestKey)))
      .subscribe({
        next: (page) => {
          if (this.activeBookingRequestKey !== requestKey) {
            return;
          }

          this.bookings.set(page.results);
          this.bookingPage.set(page.page);
          this.bookingPageSize.set(page.size);
          this.bookingTotalElements.set(page.totalElements);
          this.bookingTotalPages.set(page.totalPages);
          this.bookingHasMore.set(page.hasMore);
        },
        error: (error) => {
          if (this.activeBookingRequestKey === requestKey) {
            this.bookingError.set(dashboardErrorMessage(error));
          }
        },
      });
  }

  protected setBookingDate(value: Date | null): void {
    if (!value) {
      return;
    }

    this.bookingForm.controls.date.setValue(value);
    this.bookingPage.set(0);
    this.selectedWeekDate.set(this.dateValue(value));
  }

  protected openBookingDetail(booking: Booking): void {
    if (!this.bookingDetailDialog) {
      return;
    }

    this.selectedBooking.set(booking);
    this.dialog.open(this.bookingDetailDialog, {
      panelClass: 'booking-detail-dialog',
      width: 'min(520px, calc(100vw - 24px))',
      maxWidth: 'calc(100vw - 24px)',
    });
  }

  protected openRescheduleDialog(booking: Booking): void {
    if (!this.rescheduleDialog) {
      return;
    }

    const currentResourceId =
      booking.resourceId ??
      this.resources().find((resource) => resource.name === booking.resourceName)?.id ??
      '';
    this.selectedBooking.set(booking);
    this.bookingSuccess.set('');
    this.rescheduleError.set('');
    this.rescheduleSlots.set([]);
    this.selectedRescheduleSlot.set(null);
    this.rescheduleForm.setValue(
      { date: this.dateInputValue(booking.startsAt), resourceId: currentResourceId },
      { emitEvent: false },
    );
    this.dialog.closeAll();
    this.dialog.open(this.rescheduleDialog, {
      panelClass: 'booking-detail-dialog',
      width: 'min(600px, calc(100vw - 24px))',
      maxWidth: 'calc(100vw - 24px)',
    });
    this.loadRescheduleSlots();
  }

  protected rescheduleResources(booking: Booking): Resource[] {
    const branchId = booking.branchId;
    const serviceId = this.bookingServiceId(booking);

    return this.resources().filter(
      (resource) =>
        (!branchId || resource.branchId === branchId) &&
        (!serviceId ||
          !resource.serviceOfferingIds.length ||
          resource.serviceOfferingIds.includes(serviceId)),
    );
  }

  protected availableRescheduleSlots(): AvailabilitySlot[] {
    const resourceId = this.rescheduleForm.controls.resourceId.value;
    const now = new Date();

    return this.rescheduleSlots().filter((slot) => {
      if (resourceId && slot.resourceId !== resourceId) {
        return false;
      }

      const startsAt = new Date(slot.startsAt);
      return Number.isNaN(startsAt.getTime()) || startsAt.getTime() > now.getTime();
    });
  }

  protected loadRescheduleSlots(preserveError = false): void {
    const booking = this.selectedBooking();
    const dateControl = this.rescheduleForm.controls.date;

    if (!booking || dateControl.invalid) {
      return;
    }

    const serviceId = this.bookingServiceId(booking);
    if (!booking.branchId || !serviceId) {
      this.rescheduleError.set('No pudimos identificar la sucursal o el servicio de la reserva.');
      return;
    }

    const selectedDate = this.dateValue(dateControl.value);
    const now = new Date();
    const timeFrom =
      selectedDate === this.dateValue(now)
        ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        : '00:00';

    this.loadingSlots.set(true);
    if (!preserveError) {
      this.rescheduleError.set('');
    }
    this.selectedRescheduleSlot.set(null);
    this.bookingService
      .listAvailabilitySlots(
        { branchId: booking.branchId, serviceId },
        {
          businessId: booking.businessId,
          branchId: booking.branchId,
          service: booking.serviceName,
          date: selectedDate,
          timeFrom,
          timeTo: '23:59',
        },
        { offset: 0, limit: 10 },
      )
      .pipe(finalize(() => this.loadingSlots.set(false)))
      .subscribe({
        next: (page) => this.rescheduleSlots.set(page.slots),
        error: () => {
          this.rescheduleSlots.set([]);
          this.rescheduleError.set(
            'No pudimos consultar los horarios disponibles. Intentá nuevamente.',
          );
        },
      });
  }

  protected confirmReschedule(): void {
    const booking = this.selectedBooking();
    const slot = this.selectedRescheduleSlot();
    if (!booking || !slot || this.rescheduling()) {
      return;
    }

    const resourceId =
      slot.resourceId || this.rescheduleForm.controls.resourceId.value || undefined;
    this.rescheduling.set(true);
    this.rescheduleError.set('');
    this.dashboardService
      .rescheduleBooking(booking.id, {
        date: this.dateValue(this.rescheduleForm.controls.date.value),
        startTime: slot.startsAt.slice(11, 16),
        ...(resourceId ? { resourceId } : {}),
      })
      .pipe(finalize(() => this.rescheduling.set(false)))
      .subscribe({
        next: (updated) => {
          this.selectedBooking.set(updated);
          this.bookings.update((bookings) =>
            bookings.map((item) => (item.id === updated.id ? updated : item)),
          );
          this.dialog.closeAll();
          this.bookingSuccess.set('El turno fue reprogramado correctamente.');
          this.loadCurrentBookings(true);
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 409) {
            this.rescheduleError.set(
              'Ese horario ya no está disponible. Elegí otro horario para continuar.',
            );
            this.loadRescheduleSlots(true);
            return;
          }
          this.rescheduleError.set(dashboardErrorMessage(error));
        },
      });
  }

  private bookingServiceId(booking: Booking): string {
    return (
      booking.serviceOfferingId ??
      this.services().find(
        (service) =>
          service.name === booking.serviceName &&
          (!booking.branchId || service.branchId === booking.branchId),
      )?.id ??
      ''
    );
  }

  protected setBookingViewMode(value: BookingViewMode): void {
    if (value === this.bookingViewMode()) {
      return;
    }

    this.bookingViewMode.set(value);
    this.loadCurrentBookings();
  }

  protected changeWeek(offset: number): void {
    const date = this.dateInputValue(this.bookingForm.controls.date.value);
    date.setDate(date.getDate() + offset * 7);
    this.bookingForm.controls.date.setValue(date);
    this.selectedWeekDate.set(this.dateValue(date));
    this.loadWeeklyBookings(true);
  }

  protected onWeekTouchStart(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    this.weekTouchStartX = touch?.clientX ?? null;
    this.weekTouchStartY = touch?.clientY ?? null;
  }

  protected onWeekTouchEnd(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    if (
      !touch ||
      this.weekTouchStartX === null ||
      this.weekTouchStartY === null ||
      this.loadingBookings()
    ) {
      this.resetWeekTouch();
      return;
    }

    const horizontalDistance = touch.clientX - this.weekTouchStartX;
    const verticalDistance = touch.clientY - this.weekTouchStartY;
    this.resetWeekTouch();

    if (
      Math.abs(horizontalDistance) < 60 ||
      Math.abs(horizontalDistance) <= Math.abs(verticalDistance)
    ) {
      return;
    }

    this.changeWeek(horizontalDistance < 0 ? 1 : -1);
  }

  private resetWeekTouch(): void {
    this.weekTouchStartX = null;
    this.weekTouchStartY = null;
  }

  protected canCopyWeek(): boolean {
    return Boolean(
      this.weeklyBookingCopyEnabled() &&
      this.bookingForm.controls.branchId.value &&
      this.bookingForm.controls.resourceId.value &&
      this.bookingForm.controls.serviceOfferingId.value,
    );
  }

  protected openCopyWeekDialog(): void {
    if (!this.copyWeekDialog || !this.canCopyWeek()) {
      return;
    }

    this.copyWeekError.set('');
    this.copyWeekForm.controls.targetWeekStart.setValue(this.defaultTargetWeekStart());
    this.dialog.open(this.copyWeekDialog, {
      panelClass: 'copy-week-dialog-panel',
      width: 'min(460px, calc(100vw - 24px))',
      maxWidth: 'calc(100vw - 24px)',
    });
  }

  protected copyWeek(): void {
    if (this.copyWeekForm.invalid || !this.canCopyWeek()) {
      return;
    }

    const sourceWeekStart = this.dateValue(
      this.startOfWeek(this.dateInputValue(this.bookingForm.controls.date.value)),
    );
    const targetWeekStartDate = this.startOfWeek(
      this.dateInputValue(this.copyWeekForm.controls.targetWeekStart.value),
    );
    const targetWeekStart = this.dateValue(targetWeekStartDate);

    this.copyingWeek.set(true);
    this.copyWeekError.set('');

    this.dashboardService
      .copyBookingsWeek({
        sourceWeekStart,
        targetWeekStart,
        branchId: this.bookingForm.controls.branchId.value,
        resourceId: this.bookingForm.controls.resourceId.value,
        serviceOfferingId: this.bookingForm.controls.serviceOfferingId.value,
      })
      .pipe(finalize(() => this.copyingWeek.set(false)))
      .subscribe({
        next: () => {
          this.dialog.closeAll();
          this.bookingForm.controls.date.setValue(targetWeekStartDate);
          this.selectedWeekDate.set(targetWeekStart);
          this.loadWeeklyBookings(true);
        },
        error: (error) => this.copyWeekError.set(dashboardErrorMessage(error)),
      });
  }

  protected selectWeekDay(date: string): void {
    this.selectedWeekDate.set(date);
    this.bookingForm.controls.date.setValue(this.dateInputValue(date));
  }

  protected cancelBooking(id: string): void {
    if (!confirm('¿Deseas cancelar esta reserva?')) {
      return;
    }

    this.dashboardService.cancelBooking(id).subscribe({
      next: () => this.loadCurrentBookings(),
      error: (error) => this.bookingError.set(dashboardErrorMessage(error)),
    });
  }

  protected saveConfiguration(): void {
    this.savingConfiguration.set(true);
    this.configurationError.set('');
    this.dashboardService
      .updateConfiguration({
        weeklyBookingCopyEnabled: this.weeklyBookingCopyEnabled(),
        depositEnabled: this.depositEnabled(),
        appointmentConfirmationEnabled: this.appointmentConfirmationEnabled(),
      })
      .pipe(finalize(() => this.savingConfiguration.set(false)))
      .subscribe({
        next: (configuration) => {
          this.weeklyBookingCopyEnabled.set(configuration.weeklyBookingCopyEnabled);
          this.depositEnabled.set(configuration.depositEnabled ?? false);
          this.appointmentConfirmationEnabled.set(
            configuration.appointmentConfirmationEnabled ?? false,
          );
        },
        error: (error) => this.configurationError.set(dashboardErrorMessage(error)),
      });
  }

  protected toggleDepositStatus(booking: Booking): void {
    const depositStatus = booking.depositStatus === 'PAID' ? 'PENDING' : 'PAID';
    this.updatingDeposit.set(true);
    this.bookingError.set('');
    this.dashboardService
      .updateBookingDepositStatus(booking.id, depositStatus)
      .pipe(finalize(() => this.updatingDeposit.set(false)))
      .subscribe({
        next: (updated) => {
          this.selectedBooking.set(updated);
          this.bookings.update((bookings) =>
            bookings.map((item) => (item.id === updated.id ? updated : item)),
          );
          this.weeklyBookings.update((days) =>
            days.map((day) => ({
              ...day,
              bookings: day.bookings.map((item) => (item.id === updated.id ? updated : item)),
            })),
          );
        },
        error: (error) => this.bookingError.set(dashboardErrorMessage(error)),
      });
  }

  protected depositStatusLabel(status: 'NOT_REQUIRED' | 'PENDING' | 'PAID'): string {
    return status === 'PAID' ? 'Señado' : status === 'PENDING' ? 'Seña pendiente' : '';
  }

  protected filteredBookings(): Booking[] {
    return this.filterBookingsByStatus(this.bookings());
  }

  protected weekRangeLabel(): string {
    const days = this.weekDays();
    const first = days[0];
    const last = days[days.length - 1];

    return `${this.shortDateLabel(first)} - ${this.shortDateLabel(last)}`;
  }

  protected timeOnlyLabel(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value.slice(11, 16) || value;
    }

    return new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }

  protected selectedWeekDay(): WeekBookingDay | undefined {
    return this.weeklyBookings().find((day) => day.date === this.selectedWeekDate());
  }

  protected bookingDayLabel(): string {
    const date = this.dateInputValue(this.bookingForm.controls.date.value);
    const weekday = new Intl.DateTimeFormat('es-AR', { weekday: 'long' })
      .format(date)
      .replace('.', '');

    return `${weekday} ${this.shortDateLabel(date)}`;
  }

  protected reservationCountLabel(count: number): string {
    return `${count} ${count === 1 ? 'reserva' : 'reservas'}`;
  }

  protected reservationSummaryLabel(bookings: Booking[]): string {
    if (bookings.length === 0) {
      return 'Sin reservas cargadas';
    }

    const confirmed = bookings.filter((booking) => booking.status === 'CONFIRMED').length;
    const pending = bookings.filter(
      (booking) => booking.status === 'PENDING' || booking.status === 'PENDING_CONFIRMATION',
    ).length;

    return `${this.reservationCountLabel(bookings.length)} · ${confirmed} confirmadas · ${pending} pendientes`;
  }

  protected loadPreviousBookings(): void {
    if (!this.canLoadPreviousBookings()) {
      return;
    }

    this.bookingPage.update((page) => page - 1);
    this.loadBookings();
  }

  protected loadNextBookings(): void {
    if (!this.canLoadNextBookings()) {
      return;
    }

    this.bookingPage.update((page) => page + 1);
    this.loadBookings();
  }

  protected canLoadPreviousBookings(): boolean {
    return this.bookingPage() > 0;
  }

  protected canLoadNextBookings(): boolean {
    return this.bookingHasMore();
  }

  protected showBookingPager(): boolean {
    return this.bookingTotalElements() > this.bookingPageSize();
  }

  protected bookingPageLabel(): string {
    const currentPage = this.bookingPage() + 1;
    const totalPages = Math.max(this.bookingTotalPages(), currentPage);

    return `Página ${currentPage} de ${totalPages} · ${this.bookingTotalElements()} reservas`;
  }

  protected branchName(branchId: string | undefined): string {
    return this.branches().find((branch) => branch.id === branchId)?.name ?? 'Sin sucursal';
  }

  protected bookingBranchName(booking: Booking): string {
    return booking.branchName ?? this.branchName(booking.branchId);
  }

  protected bookingCustomerPhone(booking: Booking): string {
    return booking.customerPhone ?? 'Sin teléfono';
  }

  protected bookingResourceName(booking: Booking): string {
    return booking.resourceName ?? 'Sin recurso';
  }

  protected branchScheduleLabel(branch: Branch): string {
    const days = this.scheduleDaysFromBranch(branch.weeklySchedule)
      .filter((day) => day.active)
      .map(
        (day) =>
          `${day.label} ${day.timeRanges
            .map((range) => `${range.opensAt}-${range.closesAt}`)
            .join(', ')}`,
      );

    return days.length ? days.join(', ') : 'Sin agenda semanal';
  }

  protected resourceServicesLabel(resource: Resource): string {
    const serviceNames = resource.serviceOfferingIds
      .map((serviceId) => this.services().find((service) => service.id === serviceId)?.name)
      .filter((name): name is string => Boolean(name));

    return serviceNames.length ? serviceNames.join(', ') : 'Sin servicios asignados';
  }

  protected serviceBranchesLabel(service: ServiceCatalogItem): string {
    return this.branchName(service.branchId);
  }

  protected resourceServices(): ServiceCatalogItem[] {
    const branchId = this.resourceForm.controls.branchId.value;

    if (!branchId) {
      return [];
    }

    return this.services().filter((service) => service.branchId === branchId);
  }

  protected bookingResources(): Resource[] {
    const branchId = this.bookingForm.controls.branchId.value;
    const serviceOfferingId = this.bookingForm.controls.serviceOfferingId.value;
    let resources = this.resources();

    if (branchId) {
      resources = resources.filter((resource) => resource.branchId === branchId);
    }

    if (serviceOfferingId) {
      resources = resources.filter((resource) =>
        resource.serviceOfferingIds.includes(serviceOfferingId),
      );
    }

    return resources;
  }

  protected bookingServices(): ServiceCatalogItem[] {
    const branchId = this.bookingForm.controls.branchId.value;

    if (!branchId) {
      return this.services();
    }

    return this.services().filter((service) => service.branchId === branchId);
  }

  protected resourceScheduleLabel(resource: Resource): string {
    const days = this.scheduleDaysFromResource(resource.weeklySchedule)
      .filter((day) => day.active)
      .map(
        (day) =>
          `${day.label} ${day.timeRanges
            .map((range) => `${range.startsAt}-${range.endsAt}`)
            .join(', ')}`,
      );

    return days.length ? days.join(', ') : 'Sin agenda semanal';
  }

  protected bookingTitle(booking: Booking): string {
    return booking.customerName === 'Sin nombre'
      ? booking.serviceName
      : `${booking.customerName} · ${booking.serviceName}`;
  }

  protected dateTimeLabel(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      hour12: false,
    }).format(date);
  }

  protected statusLabel(status: string): string {
    const labels: Record<string, string> = {
      CANCELLED: 'Cancelada',
      CONFIRMED: 'Confirmada',
      PENDING: 'Pendiente',
      PENDING_CONFIRMATION: 'Confirmación pendiente',
    };

    return labels[status] ?? status;
  }

  private dateValue(value: Date | string): string {
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    }

    return value;
  }

  protected dateInputValue(value: Date | string): Date {
    if (value instanceof Date) {
      return new Date(value);
    }

    const [year, month, day] = value.split('-').map(Number);

    if (!year || !month || !day) {
      return new Date();
    }

    return new Date(year, month - 1, day);
  }

  private defaultTargetWeekStart(): Date {
    const target = this.startOfWeek(this.dateInputValue(this.bookingForm.controls.date.value));
    target.setDate(target.getDate() + 7);

    return target;
  }

  private loadWeeklyBookings(force = false): void {
    if (this.bookingForm.invalid) {
      return;
    }

    this.selectedWeekDate.set(
      this.dateValue(this.dateInputValue(this.bookingForm.controls.date.value)),
    );
    const days = this.weekDays();
    const [firstDay] = days;
    const lastDay = days[days.length - 1];
    const requestKey = this.bookingRequestKey('week', [
      this.dateValue(firstDay),
      this.dateValue(lastDay),
      this.bookingForm.controls.branchId.value,
      this.bookingForm.controls.resourceId.value,
      this.bookingForm.controls.serviceOfferingId.value,
      this.bookingForm.controls.status.value,
    ]);

    if (!this.startBookingRequest(requestKey, force)) {
      return;
    }

    this.weeklyBookings.set(days.map((date) => this.emptyWeekDay(date)));

    this.dashboardService
      .listBookingsRange(
        this.dateValue(firstDay),
        this.dateValue(lastDay),
        0,
        50,
        this.bookingForm.controls.branchId.value,
        this.bookingForm.controls.resourceId.value,
        this.bookingForm.controls.serviceOfferingId.value,
      )
      .pipe(finalize(() => this.finishBookingRequest(requestKey)))
      .subscribe({
        next: (page) => {
          if (this.activeBookingRequestKey !== requestKey) {
            return;
          }

          const bookingsByDate = new Map<string, Booking[]>();

          for (const booking of this.filterBookingsByStatus(page.results)) {
            const date = this.bookingDateKey(booking.startsAt);
            bookingsByDate.set(date, [...(bookingsByDate.get(date) ?? []), booking]);
          }

          this.weeklyBookings.set(
            days.map((date) => ({
              ...this.emptyWeekDay(date),
              bookings: (bookingsByDate.get(this.dateValue(date)) ?? []).sort((a, b) =>
                a.startsAt.localeCompare(b.startsAt),
              ),
            })),
          );
        },
        error: (error) => {
          if (this.activeBookingRequestKey === requestKey) {
            this.bookingError.set(dashboardErrorMessage(error));
          }
        },
      });
  }

  private weekDays(): Date[] {
    const firstDay = this.startOfWeek(this.dateInputValue(this.bookingForm.controls.date.value));

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(firstDay);
      date.setDate(firstDay.getDate() + index);

      return date;
    });
  }

  private startOfWeek(date: Date): Date {
    const firstDay = new Date(date);
    const day = firstDay.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    firstDay.setDate(firstDay.getDate() + diff);
    firstDay.setHours(0, 0, 0, 0);

    return firstDay;
  }

  private emptyWeekDay(date: Date): WeekBookingDay {
    return {
      date: this.dateValue(date),
      shortLabel: new Intl.DateTimeFormat('es-AR', { weekday: 'short' })
        .format(date)
        .replace('.', ''),
      fullLabel: new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
      })
        .format(date)
        .replace('.', '')
        .concat(` ${this.shortDateLabel(date)}`),
      dayNumber: new Intl.DateTimeFormat('es-AR', {
        day: 'numeric',
      }).format(date),
      bookings: [],
    };
  }

  protected shortDateLabel(date: Date): string {
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'short',
    })
      .format(date)
      .replace('.', '');
  }

  private bookingDateKey(startsAt: string): string {
    const datePart = startsAt.slice(0, 10);

    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return datePart;
    }

    return this.dateValue(new Date(startsAt));
  }

  private bookingRequestKey(scope: 'day' | 'week', parts: unknown[]): string {
    return [scope, ...parts].join('|');
  }

  private startBookingRequest(requestKey: string, force = false): boolean {
    const now = Date.now();

    if (this.loadingBookings() && this.activeBookingRequestKey === requestKey) {
      return false;
    }

    if (!force && this.lastCompletedBookingRequestKey === requestKey) {
      return false;
    }

    if (
      this.lastBookingRequestKey === requestKey &&
      now - this.lastBookingRequestStartedAt < 1000
    ) {
      return false;
    }

    this.activeBookingRequestKey = requestKey;
    this.lastBookingRequestKey = requestKey;
    this.lastBookingRequestStartedAt = now;
    this.loadingBookings.set(true);
    this.bookingError.set('');

    return true;
  }

  private finishBookingRequest(requestKey: string): void {
    if (this.activeBookingRequestKey !== requestKey) {
      return;
    }

    this.activeBookingRequestKey = '';
    this.lastCompletedBookingRequestKey = requestKey;
    this.loadingBookings.set(false);
  }

  private filterBookingsByStatus(bookings: Booking[]): Booking[] {
    const status = this.bookingForm.controls.status.value;

    if (status === 'ALL') {
      return bookings;
    }

    if (status === 'ACTIVE') {
      return bookings.filter((booking) => booking.status !== 'CANCELLED');
    }

    return bookings.filter((booking) => booking.status === status);
  }

  private validBranchSchedule(): BranchSchedule[] {
    return this.branchSchedule()
      .map((day) => ({
        ...day,
        timeRanges: day.timeRanges.filter(
          (range) => range.opensAt && range.closesAt && range.opensAt < range.closesAt,
        ),
      }))
      .filter((day) => day.active && day.timeRanges.length)
      .map((day) => ({
        day: day.dayOfWeek,
        timeRanges: day.timeRanges.map((range) => ({
          start: range.opensAt,
          end: range.closesAt,
        })),
      }));
  }

  private validResourceSchedule(): ResourceSchedule[] {
    return this.resourceSchedulePayload().filter((day) => day.timeRanges.length);
  }

  private resourceSchedulePayload(): ResourceSchedule[] {
    return this.resourceSchedule().map((day) => ({
      day: day.dayOfWeek,
      timeRanges: day.active
        ? day.timeRanges
            .filter((range) => range.startsAt && range.endsAt && range.startsAt < range.endsAt)
            .map((range) => ({
              start: range.startsAt,
              end: range.endsAt,
            }))
        : [],
    }));
  }

  private invalidBranchSchedule(): boolean {
    return (
      !this.validBranchSchedule().length ||
      this.branchSchedule().some(
        (day) =>
          day.active &&
          day.timeRanges.some(
            (range) => !range.opensAt || !range.closesAt || range.opensAt >= range.closesAt,
          ),
      )
    );
  }

  private invalidResourceSchedule(): boolean {
    return (
      !this.validResourceSchedule().length ||
      this.resourceSchedule().some(
        (day) =>
          day.active &&
          day.timeRanges.some(
            (range) => !range.startsAt || !range.endsAt || range.startsAt >= range.endsAt,
          ),
      )
    );
  }

  private pruneResourceServicesForBranch(): void {
    const serviceIds = new Set(this.resourceServices().map((service) => service.id));
    const selectedServiceIds = this.resourceForm.controls.serviceOfferingIds.value;
    const filteredServiceIds = selectedServiceIds.filter((serviceId) => serviceIds.has(serviceId));

    if (filteredServiceIds.length !== selectedServiceIds.length) {
      this.resourceForm.controls.serviceOfferingIds.setValue(filteredServiceIds);
    }
  }

  private pruneBookingFiltersForBranch(): void {
    const selectedResourceId = this.bookingForm.controls.resourceId.value;
    const selectedServiceOfferingId = this.bookingForm.controls.serviceOfferingId.value;

    if (
      selectedServiceOfferingId &&
      !this.bookingServices().some((service) => service.id === selectedServiceOfferingId)
    ) {
      this.bookingForm.controls.serviceOfferingId.setValue('');
    }

    if (
      selectedResourceId &&
      !this.bookingResources().some((resource) => resource.id === selectedResourceId)
    ) {
      this.bookingForm.controls.resourceId.setValue('');
    }
  }

  private selectFirstBookingFilters(): void {
    const firstBranch = this.branches()[0];
    if (firstBranch) {
      this.bookingForm.controls.branchId.setValue(firstBranch.id, { emitEvent: false });
    }

    const firstResource = this.bookingResources()[0];
    if (firstResource) {
      this.bookingForm.controls.resourceId.setValue(firstResource.id, { emitEvent: false });
    }
  }

  private pruneBookingResourceForService(): void {
    const selectedResourceId = this.bookingForm.controls.resourceId.value;

    if (
      selectedResourceId &&
      !this.bookingResources().some((resource) => resource.id === selectedResourceId)
    ) {
      this.bookingForm.controls.resourceId.setValue('');
    }
  }

  private defaultBranchScheduleDays(): BranchScheduleDay[] {
    return RESOURCE_WEEK_DAYS.map((day) => ({
      ...day,
      active: day.dayOfWeek !== 'SUNDAY',
      timeRanges: [{ opensAt: '09:00', closesAt: '14:00' }],
    }));
  }

  private defaultSchedule(): ResourceScheduleDay[] {
    return RESOURCE_WEEK_DAYS.map((day) => ({
      ...day,
      active: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].includes(day.dayOfWeek),
      timeRanges: [{ startsAt: '09:00', endsAt: '18:00' }],
    }));
  }

  private scheduleDaysFromResource(schedule: ResourceSchedule[]): ResourceScheduleDay[] {
    return this.defaultSchedule().map((day) => {
      const savedDay = schedule.find((item) => item.day === day.dayOfWeek);
      const ranges = savedDay?.timeRanges ?? [];

      if (!ranges.length) {
        return { ...day, active: false };
      }

      return {
        ...day,
        active: true,
        timeRanges: ranges.map((range) => ({
          startsAt: range.start.slice(0, 5),
          endsAt: range.end.slice(0, 5),
        })),
      };
    });
  }

  private scheduleDaysFromBranch(schedule: BranchSchedule[]): BranchScheduleDay[] {
    return this.defaultBranchScheduleDays().map((day) => {
      const savedDay = schedule.find((item) => item.day === day.dayOfWeek);
      const ranges = savedDay?.timeRanges ?? [];

      if (!ranges.length) {
        return { ...day, active: false };
      }

      return {
        ...day,
        active: true,
        timeRanges: ranges.map((range) => ({
          opensAt: range.start.slice(0, 5),
          closesAt: range.end.slice(0, 5),
        })),
      };
    });
  }

  private saveEntity<T>(request: Observable<T>, reset?: () => void): void {
    this.saving.set(true);
    this.errorMessage.set('');

    request.subscribe({
      next: () => {
        reset?.();
        this.refreshAll();
      },
      error: (error: unknown) => {
        this.errorMessage.set(dashboardErrorMessage(error));
        this.saving.set(false);
      },
      complete: () => this.saving.set(false),
    });
  }
}

interface BranchScheduleDay {
  dayOfWeek: DayOfWeek;
  label: string;
  active: boolean;
  timeRanges: BranchScheduleRange[];
}

interface BranchScheduleRange {
  opensAt: string;
  closesAt: string;
}

interface ResourceScheduleDay {
  dayOfWeek: DayOfWeek;
  label: string;
  active: boolean;
  timeRanges: ResourceScheduleRange[];
}

interface ResourceScheduleRange {
  startsAt: string;
  endsAt: string;
}

type BookingStatusFilter = 'ACTIVE' | 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'ALL';
type BookingViewMode = 'day' | 'week';

interface WeekBookingDay {
  date: string;
  shortLabel: string;
  fullLabel: string;
  dayNumber: string;
  bookings: Booking[];
}

const RESOURCE_WEEK_DAYS: Array<Pick<ResourceScheduleDay, 'dayOfWeek' | 'label'>> = [
  { dayOfWeek: 'MONDAY', label: 'Lunes' },
  { dayOfWeek: 'TUESDAY', label: 'Martes' },
  { dayOfWeek: 'WEDNESDAY', label: 'Miércoles' },
  { dayOfWeek: 'THURSDAY', label: 'Jueves' },
  { dayOfWeek: 'FRIDAY', label: 'Viernes' },
  { dayOfWeek: 'SATURDAY', label: 'Sábado' },
  { dayOfWeek: 'SUNDAY', label: 'Domingo' },
];
