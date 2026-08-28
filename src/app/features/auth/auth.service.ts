import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, tap, timeout } from 'rxjs';
import { ApiUrlService } from '../../shared/api-url.service';
import { AuthResponse, AuthSession, AuthUser, LoginRequest, RegisterRequest } from './auth.models';

const STORAGE_KEY = 'turnero.auth.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly sessionSubject = new BehaviorSubject<AuthSession | null>(this.restoreSession());

  readonly session$ = this.sessionSubject.asObservable();

  get token(): string | null {
    return this.sessionSubject.value?.token ?? null;
  }

  get isAuthenticated(): boolean {
    const token = this.token;

    if (!token) {
      return false;
    }

    if (this.isTokenExpired(token)) {
      this.clearSession();
      return false;
    }

    return true;
  }

  get businessId(): string | null {
    return this.sessionSubject.value?.user.businessId ?? null;
  }

  login(request: LoginRequest): Observable<AuthSession> {
    return this.http.post<AuthResponse>(this.apiUrl.build('/auth/login'), request).pipe(
      timeout(10000),
      map((response) => this.toSession(response, request.email)),
      tap((session) => this.storeSession(session)),
    );
  }

  register(request: RegisterRequest): Observable<void> {
    return this.http.post<void>(this.apiUrl.build('/auth/register'), request).pipe(timeout(10000));
  }

  logout(): void {
    this.clearSession();
  }

  handleUnauthorized(): void {
    this.clearSession();
  }

  hasAnyRole(roles: string[] | undefined): boolean {
    if (!roles?.length) {
      return this.isAuthenticated;
    }

    const currentRoles = this.sessionSubject.value?.user.roles ?? [];

    return roles.some((role) => currentRoles.includes(role));
  }

  nextUrlForRole(): string {
    const roles = this.sessionSubject.value?.user.roles ?? [];

    if (roles.includes('ADMIN') || roles.includes('BUSINESS')) {
      return '/search';
    }

    if (roles.includes('CUSTOMER')) {
      return '/booking';
    }

    return '/public-search';
  }

  private storeSession(session: AuthSession): void {
    this.sessionSubject.next(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  private clearSession(): void {
    this.sessionSubject.next(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  private restoreSession(): AuthSession | null {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return null;
    }

    try {
      const session = JSON.parse(stored) as AuthSession;

      return session.token && session.user?.email ? session : null;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }

  private toSession(response: AuthResponse, fallbackEmail: string): AuthSession {
    const token = response.token ?? response.accessToken;

    if (!token) {
      throw new Error('Auth response without token');
    }

    return {
      token,
      user: this.toUser(response, fallbackEmail),
    };
  }

  private toUser(response: AuthResponse, fallbackEmail: string): AuthUser {
    const roles = response.user?.roles ?? response.roles ?? (response.role ? [response.role] : []);

    return {
      id: response.user?.id,
      name: response.user?.name ?? response.name,
      email: response.user?.email ?? response.email ?? fallbackEmail,
      roles,
      businessId: response.user?.businessId ?? response.businessId,
    };
  }

  private isTokenExpired(token: string): boolean {
    const [, payload] = token.split('.');

    if (!payload) {
      return false;
    }

    try {
      const normalizedPayload = payload
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(payload.length / 4) * 4, '=');
      const decodedPayload = JSON.parse(atob(normalizedPayload)) as { exp?: number };

      return typeof decodedPayload.exp === 'number' && decodedPayload.exp * 1000 <= Date.now();
    } catch {
      return false;
    }
  }
}
