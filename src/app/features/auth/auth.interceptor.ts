import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.token;
  const shouldAttachToken = Boolean(token) && !request.url.includes('/auth/');
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
