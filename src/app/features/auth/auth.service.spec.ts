import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../shared/api-base-url.token';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    });

    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    localStorage.clear();
  });

  it('should login, keep the token, and avoid storing the password', () => {
    service.login({ email: 'user@test.com', password: 'supersecret' }).subscribe((session) => {
      expect(session.token).toBe('jwt-token');
      expect(session.user.roles).toEqual(['BUSINESS']);
      expect(session.user.businessId).toBe('business-1');
    });

    const request = httpTesting.expectOne('/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      email: 'user@test.com',
      password: 'supersecret',
    });

    request.flush({
      token: 'jwt-token',
      user: {
        email: 'user@test.com',
        roles: ['BUSINESS'],
        businessId: 'business-1',
      },
    });

    expect(service.token).toBe('jwt-token');
    expect(service.businessId).toBe('business-1');
    expect(localStorage.getItem('turnero.auth.session')).toContain('jwt-token');
    expect(localStorage.getItem('turnero.auth.session')).not.toContain('supersecret');
  });

  it('should register without storing credentials', () => {
    const payload = {
      name: 'Usuario',
      email: 'user@test.com',
      password: 'supersecret',
    };

    service.register(payload).subscribe();

    const request = httpTesting.expectOne('/api/auth/register');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);

    request.flush(null);

    expect(service.token).toBeNull();
    expect(localStorage.getItem('turnero.auth.session')).toBeNull();
  });

  it('should clear the persisted session on logout', () => {
    service.login({ email: 'user@test.com', password: 'supersecret' }).subscribe();
    httpTesting.expectOne('/api/auth/login').flush({
      token: 'jwt-token',
      email: 'user@test.com',
      roles: ['CUSTOMER'],
    });

    service.logout();

    expect(service.token).toBeNull();
    expect(localStorage.getItem('turnero.auth.session')).toBeNull();
  });

  it('should treat expired JWT sessions as unauthenticated', () => {
    service.login({ email: 'user@test.com', password: 'supersecret' }).subscribe();
    httpTesting.expectOne('/api/auth/login').flush({
      token: jwtWithPayload({ exp: 1 }),
      email: 'user@test.com',
      roles: ['BUSINESS'],
    });

    expect(service.isAuthenticated).toBe(false);
    expect(service.token).toBeNull();
    expect(localStorage.getItem('turnero.auth.session')).toBeNull();
  });
});

function jwtWithPayload(payload: object): string {
  return ['header', btoa(JSON.stringify(payload)), 'signature'].join('.');
}
