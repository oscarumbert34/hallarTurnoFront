import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';
import { vi } from 'vitest';
import { BookingService } from '../booking/booking.service';
import { ServiceAvailabilityDialogComponent } from './service-availability-dialog.component';

describe('ServiceAvailabilityDialogComponent', () => {
  const slot = {
    id: 'slot-1',
    startsAt: '2026-09-09T17:00:00',
    endsAt: '2026-09-09T17:30:00',
    resourceId: 'resource-1',
    resourceName: 'María',
  };
  const page = { offset: 0, limit: 10, hasMore: false, slots: [slot] };
  const listAvailabilitySlots = vi.fn();
  const navigate = vi.fn();
  const close = vi.fn();
  beforeEach(() => {
    sessionStorage.clear();
    listAvailabilitySlots.mockReset().mockReturnValue(of(page));
    TestBed.configureTestingModule({
      imports: [ServiceAvailabilityDialogComponent],
      providers: [
        { provide: BookingService, useValue: { listAvailabilitySlots } },
        { provide: Router, useValue: { navigate } },
        { provide: MatDialogRef, useValue: { close } },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            business: { id: 'b', name: 'Negocio' },
            branch: { id: 'branch', name: 'Centro', city: 'San Miguel' },
            service: { id: 'service', name: 'Consulta', price: 15000, durationMinutes: 30 },
          },
        },
      ],
    });
  });
  it('preserves resource and booking selection through the shared navigation', () => {
    const fixture = TestBed.createComponent(ServiceAvailabilityDialogComponent);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.slots button').click();
    expect(close).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(
      ['/booking'],
      expect.objectContaining({
        queryParams: expect.objectContaining({
          resourceId: 'resource-1',
          startsAt: slot.startsAt,
          serviceId: 'service',
          branchId: 'branch',
        }),
      }),
    );
    expect(JSON.parse(sessionStorage.getItem('turnero.selectedSlot')!).resourceId).toBe(
      'resource-1',
    );
  });
  it('cancels outdated requests when advancing the date and shows empty availability', () => {
    const pending = new Subject<any>();
    listAvailabilitySlots
      .mockReturnValueOnce(pending)
      .mockReturnValueOnce(of({ ...page, slots: [] }));
    const fixture = TestBed.createComponent(ServiceAvailabilityDialogComponent);
    fixture.detectChanges();
    const buttons = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    buttons.find((button) => button.textContent?.includes('Día siguiente'))!.click();
    pending.next(page);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'No encontramos turnos disponibles para esta fecha.',
    );
    expect(fixture.nativeElement.querySelectorAll('.slots button').length).toBe(0);
    expect(listAvailabilitySlots).toHaveBeenCalledTimes(2);
  });
});
