import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../shared/api-base-url.token';
import { AppointmentAction } from './appointment-action.models';
import { AppointmentActionService } from './appointment-action.service';

describe('AppointmentActionService', () => {
  let service: AppointmentActionService;
  let http: HttpTestingController;
  const appointment: AppointmentAction = {
    appointmentId: 'appointment-1',
    businessName: 'Centro Ejemplo',
    serviceName: 'Podología',
    date: '2026-09-15',
    time: '16:30',
    status: 'PENDING_CONFIRMATION',
    tokenValid: true,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AppointmentActionService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    });
    service = TestBed.inject(AppointmentActionService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads an appointment using its public token', () => {
    service
      .get('token con espacios')
      .subscribe((response) => expect(response).toEqual(appointment));

    const request = http.expectOne('/api/public/appointments/actions/token%20con%20espacios');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush(appointment);
  });

  it('confirms and cancels without a request body', () => {
    service.confirm('token-1').subscribe();
    const confirm = http.expectOne('/api/public/appointments/actions/token-1/confirm');
    expect(confirm.request.method).toBe('POST');
    expect(confirm.request.body).toBeNull();
    confirm.flush({ ...appointment, status: 'CONFIRMED', tokenValid: false });

    service.cancel('token-1').subscribe();
    const cancel = http.expectOne('/api/public/appointments/actions/token-1/cancel');
    expect(cancel.request.method).toBe('POST');
    expect(cancel.request.body).toBeNull();
    cancel.flush({ ...appointment, status: 'CANCELLED', tokenValid: false });
  });
});
