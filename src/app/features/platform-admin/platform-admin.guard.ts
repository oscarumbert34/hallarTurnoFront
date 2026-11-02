import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { PlatformAdminService } from './platform-admin.service';

export const platformAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return inject(PlatformAdminService)
    .checkAccess()
    .pipe(map(({ allowed }) => (allowed ? true : router.createUrlTree([auth.nextUrlForRole()]))));
};
