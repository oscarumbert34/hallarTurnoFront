import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { BookingImportDialogComponent, BookingImportDialogData } from './booking-import-dialog.component';
import { BusinessDashboardService } from './business-dashboard.service';

describe('BookingImportDialogComponent', () => {
  const data: BookingImportDialogData = {
    branches: [
      {
        id: 'branch-1', name: 'Centro', address: '', locality: '', province: '', country: '',
        latitude: 0, longitude: 0, zoneId: 'America/Argentina/Buenos_Aires', weeklySchedule: [], active: true,
      },
    ],
    services: [
      { id: 'service-1', name: 'Corte', branchId: 'branch-1', durationMinutes: 30, active: true },
    ],
    resources: [
      { id: 'resource-1', name: 'Ana', branchId: 'branch-1', serviceOfferingIds: ['service-1'], weeklySchedule: [], active: true },
    ],
  };

  it('preselects the only branch and shows the image input', async () => {
    await TestBed.configureTestingModule({
      imports: [BookingImportDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: BusinessDashboardService, useValue: { analyzeBookingImage: vi.fn(), confirmBookingImport: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(BookingImportDialogComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Importar turnos desde una imagen');
    expect(fixture.nativeElement.querySelector('input[type="file"]')?.accept).toContain('image/webp');
  });

  it('renders every recognized booking as an editable row', async () => {
    const service = {
      analyzeBookingImage: vi.fn(() => of({
        analysisId: 'analysis-1', total: 2, valid: 1, pending: 1,
        rows: [
          { rowNumber: 1, date: '2026-11-10', time: '09:00', customerName: 'María', phone: null,
            serviceName: 'Corte', resourceName: 'Ana', serviceOfferingId: 'service-1', resourceId: 'resource-1', status: 'READY', issues: [] },
          { rowNumber: 2, date: null, time: '10:00', customerName: 'Juan', phone: null,
            serviceName: null, resourceName: null, serviceOfferingId: null, resourceId: null, status: 'REVIEW', issues: ['Completá la fecha'] },
        ],
      })),
      confirmBookingImport: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [BookingImportDialogComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close: vi.fn() } },
        { provide: BusinessDashboardService, useValue: service },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(BookingImportDialogComponent);
    const component = fixture.componentInstance as unknown as { file: File; analyze(): void };
    component.file = new File(['image'], 'agenda.png', { type: 'image/png' });
    component.analyze();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.import-row')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('1 listos');
    expect(fixture.nativeElement.textContent).toContain('Completá la fecha');
  });
});
