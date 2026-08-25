import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, finalize, Observable, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { provideNativeDateAdapter } from '@angular/material/core';
import { UiStateComponent } from '../../shared/ui-state.component';
import { BusinessDashboardService } from './business-dashboard.service';
import { dashboardErrorMessage } from './dashboard-error';
import {
  Booking,
  Branch,
  BranchSchedule,
  DayOfWeek,
  EntityCollection,
  Resource,
  ResourceSchedule,
  ServiceCatalogItem,
} from './dashboard.models';

@Component({
  selector: 'app-business-dashboard-page',
  imports: [
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    ReactiveFormsModule,
    UiStateComponent,
  ],
  providers: [provideNativeDateAdapter()],
  template: `
    <section class="dashboard">
      <header class="dashboard-header">
        <div>
          <h1>Panel de negocio</h1>
          <p>Configura sucursales, servicios, recursos y reservas.</p>
        </div>
        <button mat-stroked-button type="button" (click)="refreshAll()">Actualizar</button>
      </header>

      <app-ui-state [loading]="loading()" [error]="errorMessage()" />

      <mat-tab-group class="dashboard-tabs" mat-stretch-tabs="false">
        <mat-tab label="Sucursales">
          <section class="tab-panel">
            <div class="entity-toolbar">
              <button mat-flat-button type="button" (click)="startCreateBranch()">
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
                    <input matInput formControlName="name" />
                    <mat-error>El nombre es obligatorio.</mat-error>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Dirección</mat-label>
                    <input matInput formControlName="address" />
                    <mat-error>La dirección es obligatoria.</mat-error>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Localidad</mat-label>
                    <input matInput formControlName="locality" />
                    <mat-error>La localidad es obligatoria.</mat-error>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Provincia</mat-label>
                    <input matInput formControlName="province" />
                    <mat-error>La provincia es obligatoria.</mat-error>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>País</mat-label>
                    <input matInput formControlName="country" />
                    <mat-error>El país es obligatorio.</mat-error>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Latitud</mat-label>
                    <input matInput type="number" formControlName="latitude" />
                    <mat-error>La latitud es obligatoria.</mat-error>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Longitud</mat-label>
                    <input matInput type="number" formControlName="longitude" />
                    <mat-error>La longitud es obligatoria.</mat-error>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Zona horaria</mat-label>
                    <input matInput formControlName="zoneId" />
                    <mat-error>La zona horaria es obligatoria.</mat-error>
                  </mat-form-field>
                  <mat-checkbox formControlName="active">Activa</mat-checkbox>
                  <section class="schedule-editor" aria-label="Agenda semanal de la sucursal">
                    <h3>Agenda semanal</h3>
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
                            @for (range of day.timeRanges; track $index; let rangeIndex = $index) {
                              <div class="schedule-range">
                                <mat-form-field appearance="outline">
                                  <mat-label>Abre</mat-label>
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
                    <button mat-button type="button" (click)="deleteEntity('branches', branch.id)">
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
                Crear servicio
              </button>
            </div>

            <mat-accordion>
              <mat-expansion-panel [expanded]="serviceFormExpanded()" (closed)="resetServiceForm()">
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
                    <input matInput formControlName="name" />
                    <mat-error>El nombre es obligatorio.</mat-error>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Duración minutos</mat-label>
                    <input matInput type="number" min="5" formControlName="durationMinutes" />
                    <mat-error>La duración mínima es 5 minutos.</mat-error>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Sucursal</mat-label>
                    <mat-select formControlName="branchId">
                      @for (branch of branches(); track branch.id) {
                        <mat-option [value]="branch.id">{{ branch.name }}</mat-option>
                      }
                    </mat-select>
                    <mat-error>Selecciona la sucursal.</mat-error>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Precio</mat-label>
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
                    <button mat-button type="button" (click)="resetServiceForm()">Cancelar</button>
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
                    <button mat-button type="button" (click)="editService(service)">Editar</button>
                    <button mat-button type="button" (click)="deleteEntity('services', service.id)">
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
                    <input matInput formControlName="name" />
                    <mat-error>El nombre es obligatorio.</mat-error>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Sucursal</mat-label>
                    <mat-select formControlName="branchId">
                      <mat-option value="">Sin asignar</mat-option>
                      @for (branch of branches(); track branch.id) {
                        <mat-option [value]="branch.id">{{ branch.name }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Servicios que brinda</mat-label>
                    <mat-select formControlName="serviceOfferingIds" multiple>
                      @for (service of services(); track service.id) {
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
                            @for (range of day.timeRanges; track $index; let rangeIndex = $index) {
                              <div class="schedule-range">
                                <mat-form-field appearance="outline">
                                  <mat-label>Desde</mat-label>
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
                  <div class="form-actions">
                    <button
                      mat-flat-button
                      type="submit"
                      [disabled]="resourceForm.invalid || saving()"
                    >
                      Guardar
                    </button>
                    <button mat-button type="button" (click)="resetResourceForm()">Cancelar</button>
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

        <mat-tab label="Reservas">
          <section class="tab-panel">
            <mat-card appearance="outlined">
              <mat-card-content>
                <form
                  class="booking-filter"
                  [formGroup]="bookingForm"
                  (ngSubmit)="loadBookings(true)"
                >
                  <mat-form-field appearance="outline">
                    <mat-label>Fecha</mat-label>
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
                    <mat-select formControlName="branchId">
                      <mat-option value="">Todas</mat-option>
                      @for (branch of branches(); track branch.id) {
                        <mat-option [value]="branch.id">{{ branch.name }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <button
                    mat-flat-button
                    type="submit"
                    [disabled]="bookingForm.invalid || loadingBookings()"
                  >
                    Ver reservas
                  </button>
                </form>
              </mat-card-content>
            </mat-card>

            <app-ui-state [loading]="loadingBookings()" [error]="bookingError()" />

            <div class="list">
              @for (booking of filteredBookings(); track booking.id) {
                <article class="row-card">
                  <div>
                    <strong>{{ bookingTitle(booking) }}</strong>
                    <span>{{ bookingCustomerPhone(booking) }}</span>
                    <span>{{ dateTimeLabel(booking.startsAt) }}</span>
                    <small
                      >{{ bookingBranchName(booking) }} · {{ statusLabel(booking.status) }}</small
                    >
                  </div>
                  @if (booking.status !== 'CANCELLED') {
                    <button mat-button type="button" (click)="cancelBooking(booking.id)">
                      Cancelar
                    </button>
                  }
                </article>
              } @empty {
                <p class="empty">No hay reservas para la fecha seleccionada.</p>
              }
            </div>

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
          </section>
        </mat-tab>
      </mat-tab-group>
    </section>
  `,
  styleUrl: './business-dashboard.page.scss',
})
export class BusinessDashboardPage implements OnInit {
  private readonly dashboardService = inject(BusinessDashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly branches = signal<Branch[]>([]);
  protected readonly services = signal<ServiceCatalogItem[]>([]);
  protected readonly resources = signal<Resource[]>([]);
  protected readonly bookings = signal<Booking[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadingBookings = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly bookingError = signal('');
  protected readonly bookingPage = signal(0);
  protected readonly bookingPageSize = signal(20);
  protected readonly bookingTotalElements = signal(0);
  protected readonly bookingTotalPages = signal(0);
  protected readonly bookingHasMore = signal(false);
  protected readonly editingBranchId = signal('');
  protected readonly editingServiceId = signal('');
  protected readonly editingResourceId = signal('');
  protected readonly branchFormExpanded = signal(false);
  protected readonly serviceFormExpanded = signal(false);
  protected readonly resourceFormExpanded = signal(false);
  protected readonly branchSchedule = signal<BranchScheduleDay[]>(this.defaultBranchScheduleDays());
  protected readonly branchScheduleInvalid = signal(false);
  protected readonly resourceSchedule = signal<ResourceScheduleDay[]>(this.defaultSchedule());
  protected readonly scheduleInvalid = signal(false);

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
  protected readonly bookingForm = this.formBuilder.nonNullable.group({
    date: [new Date() as Date | string, Validators.required],
    status: ['ACTIVE' as BookingStatusFilter],
    branchId: [''],
  });

  ngOnInit(): void {
    this.bookingForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.bookingPage.set(0);
    });

    this.refreshAll();
    this.loadBookings();
  }

  protected refreshAll(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    forkJoin({
      branches: this.dashboardService.listBranches().pipe(catchError(() => of([]))),
      services: this.dashboardService.listServices().pipe(catchError(() => of([]))),
      resources: this.dashboardService.listResources().pipe(catchError(() => of([]))),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          this.branches.set(result.branches);
          this.services.set(result.services);
          this.resources.set(result.resources);
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
    this.branchFormExpanded.set(true);
  }

  protected editBranch(branch: Branch): void {
    this.editingBranchId.set(branch.id);
    this.branchFormExpanded.set(true);
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
    if (this.resourceForm.invalid || this.invalidResourceSchedule()) {
      this.resourceForm.markAllAsTouched();
      this.scheduleInvalid.set(true);
      return;
    }

    const editingResourceId = this.editingResourceId();
    const resource = {
      ...this.resourceForm.getRawValue(),
      weeklySchedule: this.resourceSchedulePayload(),
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
    this.scheduleInvalid.set(false);
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

  protected loadBookings(resetPage = false): void {
    if (this.bookingForm.invalid) {
      return;
    }

    if (resetPage) {
      this.bookingPage.set(0);
    }

    this.loadingBookings.set(true);
    this.bookingError.set('');

    this.dashboardService
      .listBookingsPage(
        this.dateValue(this.bookingForm.controls.date.value),
        this.bookingPage(),
        this.bookingPageSize(),
        this.bookingForm.controls.branchId.value,
      )
      .pipe(finalize(() => this.loadingBookings.set(false)))
      .subscribe({
        next: (page) => {
          this.bookings.set(page.results);
          this.bookingPage.set(page.page);
          this.bookingPageSize.set(page.size);
          this.bookingTotalElements.set(page.totalElements);
          this.bookingTotalPages.set(page.totalPages);
          this.bookingHasMore.set(page.hasMore);
        },
        error: (error) => this.bookingError.set(dashboardErrorMessage(error)),
      });
  }

  protected setBookingDate(value: Date | null): void {
    if (!value) {
      return;
    }

    this.bookingForm.controls.date.setValue(value);
    this.bookingPage.set(0);
  }

  protected cancelBooking(id: string): void {
    if (!confirm('¿Deseas cancelar esta reserva?')) {
      return;
    }

    this.dashboardService.cancelBooking(id).subscribe({
      next: () => this.loadBookings(),
      error: (error) => this.bookingError.set(dashboardErrorMessage(error)),
    });
  }

  protected filteredBookings(): Booking[] {
    const status = this.bookingForm.controls.status.value;

    if (status === 'ALL') {
      return this.bookings();
    }

    if (status === 'ACTIVE') {
      return this.bookings().filter((booking) => booking.status !== 'CANCELLED');
    }

    return this.bookings().filter((booking) => booking.status === status);
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
    }).format(date);
  }

  protected statusLabel(status: string): string {
    const labels: Record<string, string> = {
      CANCELLED: 'Cancelada',
      CONFIRMED: 'Confirmada',
      PENDING: 'Pendiente',
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

const RESOURCE_WEEK_DAYS: Array<Pick<ResourceScheduleDay, 'dayOfWeek' | 'label'>> = [
  { dayOfWeek: 'MONDAY', label: 'Lunes' },
  { dayOfWeek: 'TUESDAY', label: 'Martes' },
  { dayOfWeek: 'WEDNESDAY', label: 'Miércoles' },
  { dayOfWeek: 'THURSDAY', label: 'Jueves' },
  { dayOfWeek: 'FRIDAY', label: 'Viernes' },
  { dayOfWeek: 'SATURDAY', label: 'Sábado' },
  { dayOfWeek: 'SUNDAY', label: 'Domingo' },
];
