import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../shared/api-base-url.token';
import { AuthService } from '../auth/auth.service';
import { EmailStatus } from './business-emails.models';
import { BusinessEmailsService } from './business-emails.service';

describe('BusinessEmailsService', () => {
  let service: BusinessEmailsService;
  let http: HttpTestingController;
  const status = { addon: 'ESSENTIAL' } as EmailStatus;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api/v1' },
        { provide: AuthService, useValue: { businessId: 'business-1' } },
      ],
    });
    service = TestBed.inject(BusinessEmailsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads the email status for the authenticated business', () => {
    service.getStatus().subscribe((result) => expect(result).toBe(status));
    const request = http.expectOne('/api/v1/businesses/business-1/emails');
    expect(request.request.method).toBe('GET');
    request.flush(status);
  });

  it('updates typed preferences', () => {
    const preferences = {
      confirmationEnabled: true,
      dailyAgendaEnabled: false,
      reminderActionEnabled: false,
      cancellationEnabled: true,
    };
    service.updatePreferences(preferences).subscribe();
    const request = http.expectOne('/api/v1/businesses/business-1/emails/preferences');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(preferences);
    request.flush(status);
  });

  it('selects an addon with an audit reason', () => {
    service.selectAddon('COMPLETE').subscribe();
    const request = http.expectOne('/api/v1/businesses/business-1/emails/addon');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      addon: 'COMPLETE',
      reason: 'Selección desde Mis correos',
    });
    request.flush(status);
  });
});
