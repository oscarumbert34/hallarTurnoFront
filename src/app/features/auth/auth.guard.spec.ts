import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  let router: Router;
  let authService: {
    isAuthenticated: boolean;
    hasAnyRole: (roles: string[] | undefined) => boolean;
    nextUrlForRole: () => string;
  };

  beforeEach(() => {
    authService = {
      isAuthenticated: false,
      hasAnyRole: () => false,
      nextUrlForRole: () => '/public-search',
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
