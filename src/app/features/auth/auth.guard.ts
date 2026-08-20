import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const roles = route.data['roles'] as string[] | undefined;

  if (!authService.isAuthenticated) {
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  if (!authService.hasAnyRole(roles)) {
    return router.createUrlTree([authService.nextUrlForRole()]);
  }

  return true;
};
