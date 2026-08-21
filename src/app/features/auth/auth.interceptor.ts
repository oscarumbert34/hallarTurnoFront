import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const SKIP_AUTH = new HttpContextToken(() => false);

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.token;
  const shouldSkipAuth =
    request.context.get(SKIP_AUTH) || isAuthUrl(request.url) || isPublicUrl(request.url);
  const shouldAttachToken = Boolean(token) && !shouldSkipAuth;
  const authRequest = shouldAttachToken
    ? request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : request;

  return next(authRequest).pipe(
    catchError((error) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && shouldAttachToken) {
        authService.handleUnauthorized();
        router.navigate(['/auth/login']);
      }

      return throwError(() => error);
    }),
  );
};

function isAuthUrl(url: string): boolean {
  return pathName(url).includes('/auth/');
}

function isPublicUrl(url: string): boolean {
  return /\/public(\/|$)/.test(pathName(url));
}

function pathName(url: string): string {
  try {
    return new URL(url, 'http://localhost').pathname;
  } catch {
    return url;
  }
}
