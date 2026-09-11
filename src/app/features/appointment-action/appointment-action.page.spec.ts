import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { vi } from 'vitest';
import { AppointmentAction } from './appointment-action.models';
import { AppointmentActionPage } from './appointment-action.page';
import { AppointmentActionService } from './appointment-action.service';

describe('AppointmentActionPage', () => {
  const pending: AppointmentAction = {
    appointmentId: 'appointment-1',
    businessName: 'Centro Ejemplo',
    serviceName: 'Podología',
    date: '2026-09-15',
    time: '16:30',
    status: 'PENDING_CONFIRMATION',
    tokenValid: true,
  };
  let api: {
    get: ReturnType<typeof vi.fn>;
    confirm: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    api = {
      get: vi.fn(() => of(pending)),
      confirm: vi.fn(() => of({ ...pending, status: 'CONFIRMED', tokenValid: false })),
      cancel: vi.fn(() => of({ ...pending, status: 'CANCELLED', tokenValid: false })),
    };
    TestBed.configureTestingModule({
      imports: [AppointmentActionPage],
      providers: [
        { provide: AppointmentActionService, useValue: api },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ token: 'token-1' })) },
        },
      ],
    });
  });

  it('loads and displays the appointment without modifying it', () => {
    const fixture = TestBed.createComponent(AppointmentActionPage);
    fixture.detectChanges();

    expect(api.get).toHaveBeenCalledWith('token-1');
    expect(api.confirm).not.toHaveBeenCalled();
    expect(api.cancel).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Centro Ejemplo');
    expect(fixture.nativeElement.textContent).toContain('Podología');
    expect(fixture.nativeElement.textContent).toContain('martes 15 de septiembre');
    expect(fixture.nativeElement.textContent).toContain('16:30 hs');
  });

  it('confirms the appointment and shows the success state', () => {
    const fixture = TestBed.createComponent(AppointmentActionPage);
    fixture.detectChanges();

    button(fixture, 'Confirmar turno').click();
    fixture.detectChanges();

    expect(api.confirm).toHaveBeenCalledWith('token-1');
    expect(fixture.nativeElement.textContent).toContain('Tu turno fue confirmado');
    expect(fixture.nativeElement.textContent).toContain(
      'Te esperamos el martes 15 de septiembre a las 16:30.',
    );
  });

  it('asks for confirmation before cancelling', () => {
    const fixture = TestBed.createComponent(AppointmentActionPage);
    fixture.detectChanges();

    button(fixture, 'Cancelar turno').click();
    fixture.detectChanges();
    expect(api.cancel).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('¿Seguro que querés cancelar este turno?');

    button(fixture, 'Sí, cancelar').click();
    fixture.detectChanges();
    expect(api.cancel).toHaveBeenCalledWith('token-1');
    expect(fixture.nativeElement.textContent).toContain('Tu turno fue cancelado');
  });

  it('shows the current status when the token was already used', () => {
    api.get.mockReturnValue(of({ ...pending, status: 'CONFIRMED', tokenValid: false }));
    const fixture = TestBed.createComponent(AppointmentActionPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Este turno ya fue gestionado.');
    expect(fixture.nativeElement.textContent).toContain('Turno confirmado');
    expect(fixture.nativeElement.textContent).not.toContain('Confirmar turno');
  });

  it('refreshes the final status after a concurrent action conflict', () => {
    const refreshed = new Subject<AppointmentAction>();
    api.get.mockReturnValueOnce(of(pending)).mockReturnValueOnce(refreshed);
    api.confirm.mockReturnValue(throwError(() => ({ status: 409 })));
    const fixture = TestBed.createComponent(AppointmentActionPage);
    fixture.detectChanges();

    button(fixture, 'Confirmar turno').click();
    refreshed.next({ ...pending, status: 'CANCELLED', tokenValid: false });
    refreshed.complete();
    fixture.detectChanges();

    expect(api.get).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Turno cancelado');
  });

  it('shows controlled messages for invalid and expired tokens', () => {
    api.get.mockReturnValue(throwError(() => ({ status: 404 })));
    const invalidFixture = TestBed.createComponent(AppointmentActionPage);
    invalidFixture.detectChanges();
    expect(invalidFixture.nativeElement.textContent).toContain('El enlace no es válido');

    api.get.mockReturnValue(throwError(() => ({ status: 410 })));
    const expiredFixture = TestBed.createComponent(AppointmentActionPage);
    expiredFixture.detectChanges();
    expect(expiredFixture.nativeElement.textContent).toContain('Este enlace venció');
  });
});

function button(
  fixture: ComponentFixture<AppointmentActionPage>,
  label: string,
): HTMLButtonElement {
  const buttons = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
  return buttons.find((candidate) => candidate.textContent?.includes(label))!;
}
