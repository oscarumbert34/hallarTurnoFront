import { inject, Injectable } from '@angular/core';
import { map, Observable, switchMap } from 'rxjs';
import { AuthSession } from '../auth/auth.models';
import { AuthService } from '../auth/auth.service';
import { CustomerCredentials, CustomerRegistration } from './customer-auth.models';

/**
 * Customer authentication boundary.
 *
 * Customer pages depend only on this facade. When this feature moves to its own
 * frontend, this is the only adapter that needs to be replaced with that app's
 * API and session implementation.
 */
@Injectable({ providedIn: 'root' })
export class CustomerAuthService {
  private readonly auth = inject(AuthService);

  login(credentials: CustomerCredentials): Observable<AuthSession> {
    return this.auth.login(credentials).pipe(map((session) => this.requireCustomer(session)));
  }

  loginWithGoogle(credential: string): Observable<AuthSession> {
    return this.auth
      .loginWithGoogle(credential)
      .pipe(map((session) => this.requireCustomer(session)));
  }

  register(registration: CustomerRegistration): Observable<AuthSession> {
    return this.auth
      .register({
        ...registration,
        role: 'CUSTOMER',
      })
      .pipe(
        switchMap(() =>
          this.login({ email: registration.email, password: registration.password }),
        ),
      );
  }

  private requireCustomer(session: AuthSession): AuthSession {
    if (!session.user.roles.includes('CUSTOMER')) {
      this.auth.logout();
      throw new Error('La cuenta no corresponde a un cliente.');
    }

    return session;
  }
}
