import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let router: Router;
  let authService: {
    isAuthenticated: boolean;
    hasAnyRole: (roles: string[] | undefined) => boolean;
    nextUrlForRole: () => string;
    withBusinessSlug: (url: string) => string;
    ensureBusinessSlug: () => Observable<string | null>;
    businessId: string | null;
    businessSlug: string | null;
  };

  beforeEach(() => {
    authService = {
      isAuthenticated: false,
      hasAnyRole: () => false,
      nextUrlForRole: () => '/public-search',
      withBusinessSlug: (url) => url,
      ensureBusinessSlug: () => of(null),
      businessId: null,
      businessSlug: null,
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    });

    router = TestBed.inject(Router);
  });

  it('should redirect anonymous users to login', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard(
        { data: { roles: ['BUSINESS'] } } as never,
        { url: '/business-dashboard' } as never,
      ),
    );

    expect(router.serializeUrl(result as never)).toBe(
      '/auth/login?returnUrl=%2Fbusiness-dashboard',
    );
  });

  it('should allow authenticated users with the required role', () => {
    authService.isAuthenticated = true;
    authService.hasAnyRole = () => true;

    const result = TestBed.runInInjectionContext(() =>
      authGuard(
        { data: { roles: ['BUSINESS'] } } as never,
        { url: '/business-dashboard' } as never,
      ),
    );

    expect(result).toBe(true);
  });

  it('should redirect an authenticated legacy business URL to its slug route', () => {
    authService.isAuthenticated = true;
    authService.hasAnyRole = () => true;
    authService.withBusinessSlug = (url) => `/barberia-1981${url}`;
    authService.businessSlug = 'barberia-1981';

    const result = TestBed.runInInjectionContext(() =>
      authGuard({ data: { roles: ['BUSINESS'] } } as never, { url: '/bookings' } as never),
    );

    expect(router.serializeUrl(result as never)).toBe('/barberia-1981/bookings');
  });

  it('should recover the slug for an already persisted legacy session', async () => {
    authService.isAuthenticated = true;
    authService.hasAnyRole = () => true;
    authService.businessId = 'business-1';
    authService.ensureBusinessSlug = () => {
      authService.businessSlug = 'barberia-1981';
      authService.withBusinessSlug = (url) => `/barberia-1981${url}`;
      return of('barberia-1981');
    };

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({ data: { roles: ['BUSINESS'] } } as never, { url: '/bookings' } as never),
    );

    const urlTree = await new Promise<unknown>((resolve) =>
      (result as ReturnType<typeof of>).subscribe(resolve),
    );
    expect(router.serializeUrl(urlTree as never)).toBe('/barberia-1981/bookings');
  });

  it('should redirect authenticated users without the required role', () => {
    authService.isAuthenticated = true;
    authService.hasAnyRole = () => false;
    authService.nextUrlForRole = () => '/booking';

    const result = TestBed.runInInjectionContext(() =>
      authGuard(
        { data: { roles: ['BUSINESS'] } } as never,
        { url: '/business-dashboard' } as never,
      ),
    );

    expect(router.serializeUrl(result as never)).toBe('/booking');
  });
});
