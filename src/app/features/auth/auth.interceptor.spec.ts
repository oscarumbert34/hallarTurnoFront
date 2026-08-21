import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpClient, HttpContext } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { authInterceptor, SKIP_AUTH } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let authService: { token: string | null; handleUnauthorized: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authService = {
      token: 'jwt-token',
      handleUnauthorized: vi.fn(),
    };
    router = {
      navigate: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should attach bearer token when available', () => {
    http.get('/api/protected').subscribe();

    const request = httpTesting.expectOne('/api/protected');

    expect(request.request.headers.get('Authorization')).toBe('Bearer jwt-token');

    request.flush({});
  });

  it('should not attach bearer token to auth endpoints', () => {
    http.post('http://localhost:8080/api/v1/auth/login', {}).subscribe();

    const request = httpTesting.expectOne('http://localhost:8080/api/v1/auth/login');

    expect(request.request.headers.has('Authorization')).toBe(false);

    request.flush({});
  });

  it('should clear auth state on 401 responses', () => {
    http.get('/api/protected').subscribe({
      error: () => undefined,
    });

    httpTesting.expectOne('/api/protected').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.handleUnauthorized).toHaveBeenCalledOnce();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('should not redirect anonymous public requests on 401 responses', () => {
    authService.token = null;

    http.get('/api/public/businesses/business-1').subscribe({
      error: () => undefined,
    });

    const request = httpTesting.expectOne('/api/public/businesses/business-1');

    expect(request.request.headers.has('Authorization')).toBe(false);

    request.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.handleUnauthorized).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should not attach stale tokens or redirect for public booking requests', () => {
    http.get('/api/public/businesses/business-1').subscribe({
      error: () => undefined,
    });

    const request = httpTesting.expectOne('/api/public/businesses/business-1');

    expect(request.request.headers.has('Authorization')).toBe(false);

    request.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.handleUnauthorized).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('should not attach stale tokens or redirect when auth is explicitly skipped', () => {
    http
      .get('/api/businesses', {
        context: new HttpContext().set(SKIP_AUTH, true),
      })
      .subscribe({
        error: () => undefined,
      });

    const request = httpTesting.expectOne('/api/businesses');

    expect(request.request.headers.has('Authorization')).toBe(false);

    request.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.handleUnauthorized).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
