import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
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

  const businessUrl = authService.withBusinessSlug(state.url);

  if (businessUrl !== state.url) {
    return router.parseUrl(businessUrl);
  }

  if (!authService.businessSlug && authService.businessId) {
    return authService
      .ensureBusinessSlug()
      .pipe(
        map((businessSlug) =>
          businessSlug ? router.parseUrl(authService.withBusinessSlug(state.url)) : true,
        ),
      );
  }

  return true;
};
