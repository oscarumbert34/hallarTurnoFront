import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { CustomerAuthService } from './customer-auth.service';

describe('CustomerAuthService', () => {
  const customerSession = {
    token: 'token',
    user: { email: 'client@example.com', roles: ['CUSTOMER'] },
  };
  let auth: {
    login: ReturnType<typeof vi.fn>;
    loginWithGoogle: ReturnType<typeof vi.fn>;
    nextUrlForRole: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
  let service: CustomerAuthService;

  beforeEach(() => {
    auth = {
      login: vi.fn().mockReturnValue(of(customerSession)),
      loginWithGoogle: vi.fn().mockReturnValue(of(customerSession)),
      nextUrlForRole: vi.fn().mockReturnValue('/business-slug/bookings'),
      register: vi.fn().mockReturnValue(of(undefined)),
      logout: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        CustomerAuthService,
        { provide: AuthService, useValue: auth },
      ],
    });
    service = TestBed.inject(CustomerAuthService);
  });

  it('starts a customer session with a Google credential', () => {
    service
      .loginWithGoogle('google-id-token')
      .subscribe((session) => expect(session).toEqual(customerSession));

    expect(auth.loginWithGoogle).toHaveBeenCalledWith('google-id-token');
  });

  it('keeps a business Google session and exposes its role destination', () => {
    const businessSession = {
      token: 'business-token',
      user: { email: 'owner@example.com', roles: ['BUSINESS'] },
    };
    auth.loginWithGoogle.mockReturnValue(of(businessSession));

    service
      .loginWithGoogle('business-google-token')
      .subscribe((session) => expect(session).toEqual(businessSession));

    expect(auth.logout).not.toHaveBeenCalled();
    expect(service.nextUrlForRole()).toBe('/business-slug/bookings');
  });

  it('registers exclusively with the CUSTOMER role and starts a session', () => {
    service
      .register({ name: 'Ana', email: 'client@example.com', password: 'password1' })
      .subscribe((session) => expect(session).toEqual(customerSession));

    expect(auth.register).toHaveBeenCalledWith({
      name: 'Ana',
      email: 'client@example.com',
      password: 'password1',
      role: 'CUSTOMER',
    });
    expect(auth.login).toHaveBeenCalledWith({
      email: 'client@example.com',
      password: 'password1',
    });
  });

  it('rejects a non-customer account and clears its session', () => {
    auth.login.mockReturnValue(
      of({ token: 'token', user: { email: 'owner@example.com', roles: ['BUSINESS'] } }),
    );

    let emittedSession = false;
    service.login({ email: 'owner@example.com', password: 'password1' }).subscribe({
      next: () => (emittedSession = true),
      error: (error) => expect(error.message).toContain('no corresponde a un cliente'),
    });

    expect(emittedSession).toBe(false);
    expect(auth.logout).toHaveBeenCalledOnce();
  });
});
